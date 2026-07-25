-- Permite que varias cuentas usen el mismo numero de cuidador (p. ej. un
-- familiar que se registro con su numero y lo pone tambien como cuidador).
-- Antes: caregivers.phone era unico GLOBAL + save_care_plan bloqueaba con
-- "Caregiver phone is already linked to another account". Ahora la unicidad
-- es POR USUARIO (created_by, phone) y el RPC ya no bloquea telefonos ajenos.

begin;

-- 1) quitar la unicidad global del telefono
drop index if exists public.caregivers_phone_unique;

-- 2) unicidad por dueño: un mismo usuario no duplica su cuidador, pero dos
--    cuentas distintas pueden usar el mismo numero.
create unique index if not exists caregivers_creator_phone_unique
  on public.caregivers(created_by, phone);

-- 3) save_care_plan: quitar el bloqueo de "telefono ya vinculado a otra cuenta".
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
  saved_medication public.medications%rowtype;
  saved_schedule public.medication_schedules%rowtype;
  current_medication_id uuid;
  current_schedule_id uuid;
  active_medication_ids uuid[] := array[]::uuid[];
  schedule_days smallint[];
  schedule_time time;
  local_day date;
  day_offset integer;
  schedule_row record;
  saved_medications jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(trim(p_patient_name), '') is null then
    raise exception 'Patient name is required' using errcode = '22023';
  end if;
  if nullif(trim(p_caregiver_name), '') is null or nullif(trim(p_caregiver_phone), '') is null then
    raise exception 'Caregiver name and phone are required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_medications) <> 'array' or jsonb_array_length(p_medications) = 0 then
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
    update public.patients
    set full_name = trim(p_patient_name),
        timezone = coalesce(nullif(p_timezone, ''), timezone)
    where id = p_patient_id
    returning * into saved_patient;
    if not found then
      raise exception 'Patient not found' using errcode = 'P0002';
    end if;
  end if;

  if p_caregiver_id is not null then
    select * into saved_caregiver
    from public.caregivers
    where id = p_caregiver_id;
    if not found then
      raise exception 'Caregiver not found' using errcode = 'P0002';
    end if;
    if saved_caregiver.created_by <> current_user_id
       and not exists (
         select 1
         from public.patient_caregivers pc
         where pc.caregiver_id = saved_caregiver.id
           and public.can_manage_patient(pc.patient_id)
       ) then
      raise exception 'Caregiver access denied' using errcode = '42501';
    end if;
    update public.caregivers
    set full_name = trim(p_caregiver_name),
        phone = trim(p_caregiver_phone)
    where id = saved_caregiver.id
    returning * into saved_caregiver;
  else
    select * into saved_caregiver
    from public.caregivers
    where phone = trim(p_caregiver_phone)
      and created_by = current_user_id
    limit 1;

    if found then
      update public.caregivers
      set full_name = trim(p_caregiver_name)
      where id = saved_caregiver.id
      returning * into saved_caregiver;
    else
      -- Ya NO se bloquea si el telefono existe para otra cuenta: cada usuario
      -- puede tener su propio cuidador con ese numero (unicidad por created_by).
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
    select value from jsonb_array_elements(p_medications)
  loop
    if nullif(trim(medication_item ->> 'nombre'), '') is null
       or nullif(medication_item ->> 'hora', '') is null then
      raise exception 'Each medication requires name and time' using errcode = '22023';
    end if;

    current_medication_id := nullif(medication_item ->> 'id', '')::uuid;
    current_schedule_id := nullif(medication_item ->> 'scheduleId', '')::uuid;
    schedule_time := (medication_item ->> 'hora')::time;

    select coalesce(array_agg(day_value::smallint), array[0,1,2,3,4,5,6]::smallint[])
    into schedule_days
    from jsonb_array_elements_text(
      coalesce(medication_item -> 'daysOfWeek', '[0,1,2,3,4,5,6]'::jsonb)
    ) as days(day_value);

    if current_medication_id is null then
      insert into public.medications (patient_id, name, dose, active)
      values (
        saved_patient.id,
        trim(medication_item ->> 'nombre'),
        trim(coalesce(medication_item ->> 'dosis', '')),
        true
      )
      returning * into saved_medication;
    else
      update public.medications as m
      set name = trim(medication_item ->> 'nombre'),
          dose = trim(coalesce(medication_item ->> 'dosis', '')),
          active = true
      where m.id = current_medication_id
        and m.patient_id = saved_patient.id
      returning * into saved_medication;
      if not found then
        raise exception 'Medication not found or access denied' using errcode = '42501';
      end if;
    end if;

    if current_schedule_id is null then
      select ms.id into current_schedule_id
      from public.medication_schedules as ms
      where ms.medication_id = saved_medication.id
      order by ms.created_at asc
      limit 1;
    end if;

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
      returning * into saved_schedule;
    else
      update public.medication_schedules as ms
      set local_time = schedule_time,
          days_of_week = schedule_days,
          timezone = saved_patient.timezone,
          active = true
      where ms.id = current_schedule_id
        and ms.medication_id = saved_medication.id
      returning * into saved_schedule;
      if not found then
        raise exception 'Medication schedule not found or access denied' using errcode = '42501';
      end if;
    end if;

    active_medication_ids := array_append(active_medication_ids, saved_medication.id);
  end loop;

  update public.medications
  set active = false
  where patient_id = saved_patient.id
    and active = true
    and not (id = any(active_medication_ids));

  for day_offset in 0..1 loop
    local_day := (now() at time zone saved_patient.timezone)::date + day_offset;
    for schedule_row in
      select
        m.id as medication_id,
        s.id as schedule_id,
        s.local_time,
        s.days_of_week,
        s.timezone
      from public.medications m
      join public.medication_schedules s on s.medication_id = m.id
      where m.patient_id = saved_patient.id
        and m.active = true
        and s.active = true
    loop
      if extract(dow from local_day)::smallint = any(schedule_row.days_of_week) then
        insert into public.dose_events (
          patient_id,
          medication_id,
          schedule_id,
          scheduled_for,
          status
        )
        values (
          saved_patient.id,
          schedule_row.medication_id,
          schedule_row.schedule_id,
          (local_day + schedule_row.local_time) at time zone schedule_row.timezone,
          'pending'
        )
        on conflict (schedule_id, scheduled_for) do nothing;
      end if;
    end loop;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'scheduleId', s.id,
        'nombre', m.name,
        'dosis', coalesce(m.dose, ''),
        'hora', to_char(s.local_time, 'HH24:MI'),
        'daysOfWeek', s.days_of_week
      )
      order by s.local_time
    ),
    '[]'::jsonb
  )
  into saved_medications
  from public.medications m
  join lateral (
    select ms.*
    from public.medication_schedules ms
    where ms.medication_id = m.id and ms.active = true
    order by ms.created_at asc
    limit 1
  ) s on true
  where m.patient_id = saved_patient.id
    and m.active = true;

  return jsonb_build_object(
    'patient', to_jsonb(saved_patient),
    'caregiver', to_jsonb(saved_caregiver),
    'medications', saved_medications
  );
end;
$$;

commit;
