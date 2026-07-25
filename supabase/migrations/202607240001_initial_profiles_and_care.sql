begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  timezone text not null default 'America/Guayaquil',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_phone_unique
  on public.profiles(phone)
  where phone is not null and phone <> '';

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_date date,
  notes text,
  timezone text not null default 'America/Guayaquil',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_members (
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'manager', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (patient_id, user_id)
);

create table if not exists public.caregivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists caregivers_phone_unique on public.caregivers(phone);

create table if not exists public.patient_caregivers (
  patient_id uuid not null references public.patients(id) on delete cascade,
  caregiver_id uuid not null references public.caregivers(id) on delete cascade,
  whatsapp_status text not null default 'pending'
    check (whatsapp_status in ('pending', 'connected', 'failed', 'disabled')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (patient_id, caregiver_id)
);

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  name text not null,
  dose text,
  instructions text,
  active boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create unique index if not exists medications_id_patient_unique
  on public.medications(id, patient_id);

create table if not exists public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  local_time time not null,
  days_of_week smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  timezone text not null default 'America/Guayaquil',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[])
);

create table if not exists public.dose_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  medication_id uuid not null,
  schedule_id uuid references public.medication_schedules(id) on delete set null,
  caregiver_id uuid references public.caregivers(id) on delete set null,
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'missed', 'skipped', 'snoozed')),
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, scheduled_for),
  foreign key (medication_id, patient_id)
    references public.medications(id, patient_id) on delete cascade
);

create index if not exists dose_events_patient_scheduled_idx
  on public.dose_events(patient_id, scheduled_for desc);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  dose_event_id uuid not null references public.dose_events(id) on delete cascade,
  type text not null check (type in ('photo', 'audio', 'text')),
  storage_path text,
  original_name text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  text_content text,
  created_at timestamptz not null default now(),
  check (
    (type in ('photo', 'audio') and storage_path is not null)
    or (type = 'text' and text_content is not null)
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists caregivers_set_updated_at on public.caregivers;
create trigger caregivers_set_updated_at before update on public.caregivers
for each row execute function public.set_updated_at();

drop trigger if exists patient_caregivers_set_updated_at on public.patient_caregivers;
create trigger patient_caregivers_set_updated_at before update on public.patient_caregivers
for each row execute function public.set_updated_at();

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at before update on public.medications
for each row execute function public.set_updated_at();

drop trigger if exists medication_schedules_set_updated_at on public.medication_schedules;
create trigger medication_schedules_set_updated_at before update on public.medication_schedules
for each row execute function public.set_updated_at();

drop trigger if exists dose_events_set_updated_at on public.dose_events;
create trigger dose_events_set_updated_at before update on public.dose_events
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_patient_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.patient_members (patient_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (patient_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_patient_created on public.patients;
create trigger on_patient_created
after insert on public.patients
for each row execute function public.add_patient_owner();

create or replace function public.is_patient_member(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_members
    where patient_id = target_patient_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_members
    where patient_id = target_patient_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.patient_members enable row level security;
alter table public.caregivers enable row level security;
alter table public.patient_caregivers enable row level security;
alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.dose_events enable row level security;
alter table public.evidence enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "patients_select_members" on public.patients
for select using (public.is_patient_member(id));
create policy "patients_insert_authenticated" on public.patients
for insert with check (created_by = auth.uid());
create policy "patients_update_managers" on public.patients
for update using (public.can_manage_patient(id)) with check (public.can_manage_patient(id));
create policy "patients_delete_owners" on public.patients
for delete using (
  exists (
    select 1 from public.patient_members
    where patient_id = id and user_id = auth.uid() and role = 'owner'
  )
);

create policy "members_select_patient_members" on public.patient_members
for select using (public.is_patient_member(patient_id));
create policy "members_insert_managers" on public.patient_members
for insert with check (public.can_manage_patient(patient_id));
create policy "members_update_managers" on public.patient_members
for update using (public.can_manage_patient(patient_id))
with check (public.can_manage_patient(patient_id));
create policy "members_delete_managers" on public.patient_members
for delete using (public.can_manage_patient(patient_id));

create policy "caregivers_select_related" on public.caregivers
for select using (
  created_by = auth.uid()
  or exists (
    select 1 from public.patient_caregivers pc
    where pc.caregiver_id = id and public.is_patient_member(pc.patient_id)
  )
);
create policy "caregivers_insert_authenticated" on public.caregivers
for insert with check (created_by = auth.uid());
create policy "caregivers_update_creator" on public.caregivers
for update using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "patient_caregivers_select_members" on public.patient_caregivers
for select using (public.is_patient_member(patient_id));
create policy "patient_caregivers_insert_managers" on public.patient_caregivers
for insert with check (public.can_manage_patient(patient_id));
create policy "patient_caregivers_update_managers" on public.patient_caregivers
for update using (public.can_manage_patient(patient_id))
with check (public.can_manage_patient(patient_id));
create policy "patient_caregivers_delete_managers" on public.patient_caregivers
for delete using (public.can_manage_patient(patient_id));

create policy "medications_select_members" on public.medications
for select using (public.is_patient_member(patient_id));
create policy "medications_insert_managers" on public.medications
for insert with check (public.can_manage_patient(patient_id));
create policy "medications_update_managers" on public.medications
for update using (public.can_manage_patient(patient_id))
with check (public.can_manage_patient(patient_id));
create policy "medications_delete_managers" on public.medications
for delete using (public.can_manage_patient(patient_id));

create policy "schedules_select_members" on public.medication_schedules
for select using (
  exists (
    select 1 from public.medications m
    where m.id = medication_id and public.is_patient_member(m.patient_id)
  )
);
create policy "schedules_insert_managers" on public.medication_schedules
for insert with check (
  exists (
    select 1 from public.medications m
    where m.id = medication_id and public.can_manage_patient(m.patient_id)
  )
);
create policy "schedules_update_managers" on public.medication_schedules
for update using (
  exists (
    select 1 from public.medications m
    where m.id = medication_id and public.can_manage_patient(m.patient_id)
  )
);
create policy "schedules_delete_managers" on public.medication_schedules
for delete using (
  exists (
    select 1 from public.medications m
    where m.id = medication_id and public.can_manage_patient(m.patient_id)
  )
);

create policy "dose_events_select_members" on public.dose_events
for select using (public.is_patient_member(patient_id));
create policy "dose_events_insert_managers" on public.dose_events
for insert with check (public.can_manage_patient(patient_id));
create policy "dose_events_update_managers" on public.dose_events
for update using (public.can_manage_patient(patient_id))
with check (public.can_manage_patient(patient_id));
create policy "dose_events_delete_managers" on public.dose_events
for delete using (public.can_manage_patient(patient_id));

create policy "evidence_select_members" on public.evidence
for select using (
  exists (
    select 1 from public.dose_events d
    where d.id = dose_event_id and public.is_patient_member(d.patient_id)
  )
);
create policy "evidence_insert_managers" on public.evidence
for insert with check (
  exists (
    select 1 from public.dose_events d
    where d.id = dose_event_id and public.can_manage_patient(d.patient_id)
  )
);
create policy "evidence_delete_managers" on public.evidence
for delete using (
  exists (
    select 1 from public.dose_events d
    where d.id = dose_event_id and public.can_manage_patient(d.patient_id)
  )
);

revoke all on public.profiles from anon;
revoke all on public.patients from anon;
revoke all on public.patient_members from anon;
revoke all on public.caregivers from anon;
revoke all on public.patient_caregivers from anon;
revoke all on public.medications from anon;
revoke all on public.medication_schedules from anon;
revoke all on public.dose_events from anon;
revoke all on public.evidence from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
grant select, insert, update, delete on public.patient_members to authenticated;
grant select, insert, update, delete on public.caregivers to authenticated;
grant select, insert, update, delete on public.patient_caregivers to authenticated;
grant select, insert, update, delete on public.medications to authenticated;
grant select, insert, update, delete on public.medication_schedules to authenticated;
grant select, insert, update, delete on public.dose_events to authenticated;
grant select, insert, delete on public.evidence to authenticated;

revoke all on function public.is_patient_member(uuid) from public;
revoke all on function public.can_manage_patient(uuid) from public;
grant execute on function public.is_patient_member(uuid) to authenticated;
grant execute on function public.can_manage_patient(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "evidence_objects_select_members" on storage.objects
for select using (
  bucket_id = 'evidence'
  and public.is_patient_member(((storage.foldername(name))[1])::uuid)
);
create policy "evidence_objects_insert_managers" on storage.objects
for insert with check (
  bucket_id = 'evidence'
  and public.can_manage_patient(((storage.foldername(name))[1])::uuid)
);
create policy "evidence_objects_delete_managers" on storage.objects
for delete using (
  bucket_id = 'evidence'
  and public.can_manage_patient(((storage.foldername(name))[1])::uuid)
);

commit;
