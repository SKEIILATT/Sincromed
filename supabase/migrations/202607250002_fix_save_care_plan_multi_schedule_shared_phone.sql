-- FIX: la migracion 202607250001 recreo save_care_plan usando una version
-- ANTIGUA (esperaba 'hora' plano) y rompio el soporte de multiples horarios
-- ('horarios') + sync_dose_events que agrego la migracion 005. Esto causaba
-- "Each medication requires name and time" aunque el formulario estuviera lleno.
--
-- Aqui restauramos la version 005 de save_care_plan (con 'horarios') PERO
-- manteniendo el fix de telefono compartido: se elimina el bloqueo
-- "Caregiver phone is already linked to another account" para que un familiar
-- pueda usar su propio numero como cuidador aunque otra cuenta ya lo use.
-- La unicidad por-usuario (caregivers_creator_phone_unique) sigue vigente.

begin;

create or replace function public.save_care_plan(
  p_patient_name text,
  p_timezone text,
  p_caregiver_name text,
  p_caregiver_phone text,
  p_medications jsonb,
  p_patient_id uuid default null,
  p_caregiver_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_patient public.patients%rowtype;
  saved_caregiver public.caregivers%rowtype;
  medication_item jsonb;
  schedule_item jsonb;
  schedule_items jsonb;
  saved_medication public.medications%rowtype;
  current_medication_id uuid;
  current_schedule_id uuid;
  active_medication_ids uuid[] := array[]::uuid[];
  active_schedule_ids uuid[];
  schedule_times time[];
  schedule_days smallint[];
  schedule_time time;
  saved_medications jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(trim(p_patient_name), '') is null then
    raise exception 'Patient name is required' using errcode = '22023';
  end if;
  if nullif(trim(p_caregiver_name), '') is null
     or nullif(trim(p_caregiver_phone), '') is null then
    raise exception 'Caregiver name and phone are required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_medications) <> 'array'
     or jsonb_array_length(p_medications) = 0 then
    raise exception 'At least one medication is required' using errcode = '22023';
  end if;

  if p_patient_id is null then
    insert into public.patients (full_name, timezone, created_by)
    values (
      trim(p_patient_name),
      coalesce(nullif(p_timezone, ''), 'America/Guayaquil'),
      current_user_id
    )
    returning * into saved_patient;
  else
    if not public.can_manage_patient(p_patient_id) then
      raise exception 'Patient access denied' using errcode = '42501';
    end if;

    update public.patients as p
    set full_name = trim(p_patient_name),
        timezone = coalesce(nullif(p_timezone, ''), p.timezone)
    where p.id = p_patient_id
    returning * into saved_patient;

    if not found then
      raise exception 'Patient not found' using errcode = 'P0002';
    end if;
  end if;

  if p_caregiver_id is not null then
    select c.*
    into saved_caregiver
    from public.caregivers as c
    where c.id = p_caregiver_id;

    if not found then
      raise exception 'Caregiver not found' using errcode = 'P0002';
    end if;
    if saved_caregiver.created_by <> current_user_id
       and not exists (
         select 1
         from public.patient_caregivers as pc
         where pc.caregiver_id = saved_caregiver.id
           and public.can_manage_patient(pc.patient_id)
       ) then
      raise exception 'Caregiver access denied' using errcode = '42501';
    end if;

    update public.caregivers as c
    set full_name = trim(p_caregiver_name),
        phone = trim(p_caregiver_phone)
    where c.id = saved_caregiver.id
    returning * into saved_caregiver;
  else
    select c.*
    into saved_caregiver
    from public.caregivers as c
    where c.phone = trim(p_caregiver_phone)
      and c.created_by = current_user_id
    limit 1;

    if found then
      update public.caregivers as c
      set full_name = trim(p_caregiver_name)
      where c.id = saved_caregiver.id
      returning * into saved_caregiver;
    else
      -- Sin bloqueo de telefono ajeno: cada usuario tiene su propio cuidador
      -- (unicidad por created_by, phone).
      insert into public.caregivers (full_name, phone, created_by)
      values (trim(p_caregiver_name), trim(p_caregiver_phone), current_user_id)
      returning * into saved_caregiver;
    end if;
  end if;

  insert into public.patient_caregivers (
    patient_id,
    caregiver_id,
    active,
    whatsapp_status
  )
  values (saved_patient.id, saved_caregiver.id, true, 'pending')
  on conflict (patient_id, caregiver_id)
  do update set active = true;

  for medication_item in
    select item.value
    from jsonb_array_elements(p_medications) as item(value)
  loop
    if nullif(trim(medication_item ->> 'nombre'), '') is null then
      raise exception 'Each medication requires a name' using errcode = '22023';
    end if;

    schedule_items := medication_item -> 'horarios';
    if jsonb_typeof(schedule_items) <> 'array' then
      schedule_items := jsonb_build_array(jsonb_build_object(
        'id', coalesce(
          medication_item ->> 'scheduleId',
          medication_item ->> 'idHorario'
        ),
        'hora', medication_item ->> 'hora',
        'daysOfWeek', coalesce(
          medication_item -> 'daysOfWeek',
          '[0,1,2,3,4,5,6]'::jsonb
        )
      ));
    end if;
    if jsonb_array_length(schedule_items) = 0 then
      raise exception 'Each medication requires at least one schedule'
        using errcode = '22023';
    end if;

    current_medication_id := nullif(medication_item ->> 'id', '')::uuid;

    if current_medication_id is null then
      insert into public.medications (
        patient_id,
        name,
        dose,
        instructions,
        starts_on,
        ends_on,
        active
      )
      values (
        saved_patient.id,
        trim(medication_item ->> 'nombre'),
        nullif(trim(coalesce(medication_item ->> 'dosis', '')), ''),
        nullif(trim(coalesce(medication_item ->> 'instrucciones', '')), ''),
        nullif(medication_item ->> 'startsOn', '')::date,
        nullif(medication_item ->> 'endsOn', '')::date,
        true
      )
      returning * into saved_medication;
    else
      update public.medications as m
      set name = trim(medication_item ->> 'nombre'),
          dose = nullif(trim(coalesce(medication_item ->> 'dosis', '')), ''),
          instructions = nullif(
            trim(coalesce(medication_item ->> 'instrucciones', '')),
            ''
          ),
          starts_on = nullif(medication_item ->> 'startsOn', '')::date,
          ends_on = nullif(medication_item ->> 'endsOn', '')::date,
          active = true
      where m.id = current_medication_id
        and m.patient_id = saved_patient.id
      returning * into saved_medication;

      if not found then
        raise exception 'Medication not found or access denied'
          using errcode = '42501';
      end if;
    end if;

    active_schedule_ids := array[]::uuid[];
    schedule_times := array[]::time[];

    for schedule_item in
      select item.value
      from jsonb_array_elements(schedule_items) as item(value)
    loop
      if nullif(schedule_item ->> 'hora', '') is null then
        raise exception 'Each schedule requires a time' using errcode = '22023';
      end if;

      schedule_time := (schedule_item ->> 'hora')::time;
      if schedule_time = any(schedule_times) then
        raise exception 'A medication cannot repeat the same time'
          using errcode = '22023';
      end if;
      schedule_times := array_append(schedule_times, schedule_time);

      if schedule_item ? 'daysOfWeek' then
        select array_agg(day_value::smallint order by day_value::smallint)
        into schedule_days
        from jsonb_array_elements_text(
          schedule_item -> 'daysOfWeek'
        ) as days(day_value);
      else
        schedule_days := array[0,1,2,3,4,5,6]::smallint[];
      end if;

      if coalesce(cardinality(schedule_days), 0) = 0
         or not schedule_days <@ array[0,1,2,3,4,5,6]::smallint[] then
        raise exception 'Each schedule requires valid weekdays'
          using errcode = '22023';
      end if;

      current_schedule_id := nullif(
        coalesce(
          schedule_item ->> 'id',
          schedule_item ->> 'scheduleId'
        ),
        ''
      )::uuid;

      if current_schedule_id is null then
        insert into public.medication_schedules (
          medication_id,
          local_time,
          days_of_week,
          timezone,
          active
        )
        values (
          saved_medication.id,
          schedule_time,
          schedule_days,
          saved_patient.timezone,
          true
        )
        returning id into current_schedule_id;
      else
        update public.medication_schedules as ms
        set local_time = schedule_time,
            days_of_week = schedule_days,
            timezone = saved_patient.timezone,
            active = true
        where ms.id = current_schedule_id
          and ms.medication_id = saved_medication.id;

        if not found then
          raise exception 'Medication schedule not found or access denied'
            using errcode = '42501';
        end if;
      end if;

      active_schedule_ids := array_append(
        active_schedule_ids,
        current_schedule_id
      );
    end loop;

    update public.medication_schedules as ms
    set active = false
    where ms.medication_id = saved_medication.id
      and ms.active = true
      and not (ms.id = any(active_schedule_ids));

    active_medication_ids := array_append(
      active_medication_ids,
      saved_medication.id
    );
  end loop;

  update public.medications as m
  set active = false
  where m.patient_id = saved_patient.id
    and m.active = true
    and not (m.id = any(active_medication_ids));

  perform public.sync_dose_events(saved_patient.id, 30);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'nombre', m.name,
        'dosis', coalesce(m.dose, ''),
        'instrucciones', coalesce(m.instructions, ''),
        'startsOn', m.starts_on,
        'endsOn', m.ends_on,
        'horarios', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ms.id,
              'hora', to_char(ms.local_time, 'HH24:MI'),
              'daysOfWeek', ms.days_of_week
            )
            order by ms.local_time
          )
          from public.medication_schedules as ms
          where ms.medication_id = m.id
            and ms.active = true
        ), '[]'::jsonb)
      )
      order by m.created_at
    ),
    '[]'::jsonb
  )
  into saved_medications
  from public.medications as m
  where m.patient_id = saved_patient.id
    and m.active = true;

  return jsonb_build_object(
    'patient', to_jsonb(saved_patient),
    'caregiver', to_jsonb(saved_caregiver),
    'medications', saved_medications
  );
end;
$$;

revoke all on function public.save_care_plan(
  text, text, text, text, jsonb, uuid, uuid
) from public;
grant execute on function public.save_care_plan(
  text, text, text, text, jsonb, uuid, uuid
) to authenticated;

commit;
