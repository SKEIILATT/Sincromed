begin;

create or replace function public.create_patient(
  p_full_name text,
  p_timezone text default 'America/Guayaquil'
)
returns setof public.patients
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Patient name is required'
      using errcode = '22023';
  end if;

  return query
    insert into public.patients (full_name, timezone, created_by)
    values (trim(p_full_name), coalesce(nullif(p_timezone, ''), 'America/Guayaquil'), current_user_id)
    returning *;
end;
$$;

revoke all on function public.create_patient(text, text) from public;
grant execute on function public.create_patient(text, text) to authenticated;

commit;
