begin;

create or replace function public.sync_dose_events(
  p_patient_id uuid,
  p_days_ahead integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_timezone text;
  local_day date;
  day_offset integer;
  schedule_row record;
  inserted_rows integer;
  total_inserted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_patient_member(p_patient_id) then
    raise exception 'Patient access denied' using errcode = '42501';
  end if;
  if p_days_ahead < 0 or p_days_ahead > 90 then
    raise exception 'Days ahead must be between 0 and 90' using errcode = '22023';
  end if;

  select p.timezone
  into patient_timezone
  from public.patients as p
  where p.id = p_patient_id;

  if not found then
    raise exception 'Patient not found' using errcode = 'P0002';
  end if;

  delete from public.dose_events as de
  where de.patient_id = p_patient_id
    and de.status = 'pending'
    and de.scheduled_for > now()
    and not exists (
      select 1
      from public.medications as m
      join public.medication_schedules as ms on ms.medication_id = m.id
      where m.id = de.medication_id
        and ms.id = de.schedule_id
        and m.active = true
        and ms.active = true
        and (
          m.starts_on is null
          or m.starts_on <= (de.scheduled_for at time zone ms.timezone)::date
        )
        and (
          m.ends_on is null
          or m.ends_on >= (de.scheduled_for at time zone ms.timezone)::date
        )
        and extract(
          dow from (de.scheduled_for at time zone ms.timezone)::date
        )::smallint = any(ms.days_of_week)
        and de.scheduled_for = (
          (de.scheduled_for at time zone ms.timezone)::date + ms.local_time
        ) at time zone ms.timezone
    )
    and not exists (
      select 1
      from public.evidence as e
      where e.dose_event_id = de.id
    );

  for day_offset in 0..p_days_ahead loop
    local_day := (now() at time zone patient_timezone)::date + day_offset;

    for schedule_row in
      select
        m.id as medication_id,
        ms.id as medication_schedule_id,
        ms.local_time,
        ms.days_of_week,
        ms.timezone
      from public.medications as m
      join public.medication_schedules as ms on ms.medication_id = m.id
      where m.patient_id = p_patient_id
        and m.active = true
        and ms.active = true
        and (m.starts_on is null or m.starts_on <= local_day)
        and (m.ends_on is null or m.ends_on >= local_day)
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
          p_patient_id,
          schedule_row.medication_id,
          schedule_row.medication_schedule_id,
          (local_day + schedule_row.local_time) at time zone schedule_row.timezone,
          'pending'
        )
        on conflict (schedule_id, scheduled_for) do nothing;

        get diagnostics inserted_rows = row_count;
        total_inserted := total_inserted + inserted_rows;
      end if;
    end loop;
  end loop;

  return total_inserted;
end;
$$;

revoke all on function public.sync_dose_events(uuid, integer) from public;
grant execute on function public.sync_dose_events(uuid, integer) to authenticated;

commit;
