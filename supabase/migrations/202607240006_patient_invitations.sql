begin;

create table if not exists public.patient_invitations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email)))
);

create unique index if not exists patient_invitations_active_email_unique
  on public.patient_invitations(patient_id, email)
  where accepted_at is null and revoked_at is null;

create index if not exists patient_invitations_patient_created_idx
  on public.patient_invitations(patient_id, created_at desc);

alter table public.patient_invitations enable row level security;

create policy "invitations_select_managers" on public.patient_invitations
for select using (public.can_manage_patient(patient_id));

revoke all on public.patient_invitations from anon;
revoke all on public.patient_invitations from authenticated;
grant select on public.patient_invitations to authenticated;

create or replace function public.create_patient_invitation(
  p_patient_id uuid,
  p_email text,
  p_role text default 'viewer'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_member_role text;
  normalized_email text := lower(trim(p_email));
  plain_token text;
  saved_invitation public.patient_invitations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;
  if p_role not in ('manager', 'viewer') then
    raise exception 'Invalid invitation role' using errcode = '22023';
  end if;

  select pm.role
  into current_member_role
  from public.patient_members as pm
  where pm.patient_id = p_patient_id
    and pm.user_id = current_user_id;

  if current_member_role not in ('owner', 'manager') then
    raise exception 'Patient access denied' using errcode = '42501';
  end if;
  if current_member_role = 'manager' and p_role <> 'viewer' then
    raise exception 'Managers can only invite viewers' using errcode = '42501';
  end if;
  if exists (
    select 1
    from public.patient_members as pm
    join auth.users as au on au.id = pm.user_id
    where pm.patient_id = p_patient_id
      and lower(au.email) = normalized_email
  ) then
    raise exception 'This person is already a patient member'
      using errcode = '23505';
  end if;

  update public.patient_invitations as pi
  set revoked_at = now()
  where pi.patient_id = p_patient_id
    and pi.email = normalized_email
    and pi.accepted_at is null
    and pi.revoked_at is null;

  plain_token := encode(gen_random_bytes(32), 'hex');

  insert into public.patient_invitations (
    patient_id,
    email,
    role,
    token_hash,
    invited_by
  )
  values (
    p_patient_id,
    normalized_email,
    p_role,
    encode(digest(plain_token, 'sha256'), 'hex'),
    current_user_id
  )
  returning * into saved_invitation;

  return jsonb_build_object(
    'id', saved_invitation.id,
    'patientId', saved_invitation.patient_id,
    'email', saved_invitation.email,
    'role', saved_invitation.role,
    'expiresAt', saved_invitation.expires_at,
    'token', plain_token
  );
end;
$$;

create or replace function public.accept_patient_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invitation_row public.patient_invitations%rowtype;
  patient_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(trim(p_token), '') is null then
    raise exception 'Invitation token is required' using errcode = '22023';
  end if;

  select pi.*
  into invitation_row
  from public.patient_invitations as pi
  where pi.token_hash = encode(digest(trim(p_token), 'sha256'), 'hex')
    and pi.accepted_at is null
    and pi.revoked_at is null
    and pi.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired' using errcode = 'P0002';
  end if;
  if current_email = '' or current_email <> invitation_row.email then
    raise exception 'Sign in with the email address that received this invitation'
      using errcode = '42501';
  end if;

  insert into public.patient_members (patient_id, user_id, role)
  values (
    invitation_row.patient_id,
    current_user_id,
    invitation_row.role
  )
  on conflict (patient_id, user_id)
  do update set role = case
    when patient_members.role = 'owner' then 'owner'
    when patient_members.role = 'manager' then 'manager'
    else excluded.role
  end;

  update public.patient_invitations as pi
  set accepted_at = now(),
      accepted_by = current_user_id
  where pi.id = invitation_row.id;

  select p.full_name
  into patient_name
  from public.patients as p
  where p.id = invitation_row.patient_id;

  return jsonb_build_object(
    'patientId', invitation_row.patient_id,
    'patientName', patient_name,
    'role', invitation_row.role
  );
end;
$$;

create or replace function public.get_patient_access(p_patient_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_member_role text;
  member_rows jsonb;
  invitation_rows jsonb := '[]'::jsonb;
begin
  select pm.role
  into current_member_role
  from public.patient_members as pm
  where pm.patient_id = p_patient_id
    and pm.user_id = current_user_id;

  if current_member_role is null then
    raise exception 'Patient access denied' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'userId', pm.user_id,
      'name', coalesce(nullif(pr.full_name, ''), split_part(au.email, '@', 1)),
      'email', au.email,
      'role', pm.role,
      'joinedAt', pm.created_at
    )
    order by
      case pm.role when 'owner' then 1 when 'manager' then 2 else 3 end,
      pr.full_name
  ), '[]'::jsonb)
  into member_rows
  from public.patient_members as pm
  join auth.users as au on au.id = pm.user_id
  left join public.profiles as pr on pr.id = pm.user_id
  where pm.patient_id = p_patient_id;

  if current_member_role in ('owner', 'manager') then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', pi.id,
        'email', pi.email,
        'role', pi.role,
        'expiresAt', pi.expires_at,
        'createdAt', pi.created_at
      )
      order by pi.created_at desc
    ), '[]'::jsonb)
    into invitation_rows
    from public.patient_invitations as pi
    where pi.patient_id = p_patient_id
      and pi.accepted_at is null
      and pi.revoked_at is null
      and pi.expires_at > now();
  end if;

  return jsonb_build_object(
    'currentRole', current_member_role,
    'members', member_rows,
    'invitations', invitation_rows
  );
end;
$$;

create or replace function public.update_patient_member_role(
  p_patient_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('manager', 'viewer') then
    raise exception 'Invalid member role' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.patient_members as pm
    where pm.patient_id = p_patient_id
      and pm.user_id = auth.uid()
      and pm.role = 'owner'
  ) then
    raise exception 'Only the owner can change roles' using errcode = '42501';
  end if;

  update public.patient_members as pm
  set role = p_role
  where pm.patient_id = p_patient_id
    and pm.user_id = p_user_id
    and pm.role <> 'owner';

  if not found then
    raise exception 'Member not found or owner role cannot be changed'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.revoke_patient_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.patient_invitations%rowtype;
  current_member_role text;
begin
  select pi.*
  into invitation_row
  from public.patient_invitations as pi
  where pi.id = p_invitation_id
    and pi.accepted_at is null
    and pi.revoked_at is null;

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  select pm.role
  into current_member_role
  from public.patient_members as pm
  where pm.patient_id = invitation_row.patient_id
    and pm.user_id = auth.uid();

  if current_member_role <> 'owner'
     and not (
       current_member_role = 'manager'
       and invitation_row.invited_by = auth.uid()
       and invitation_row.role = 'viewer'
     ) then
    raise exception 'Invitation access denied' using errcode = '42501';
  end if;

  update public.patient_invitations as pi
  set revoked_at = now()
  where pi.id = invitation_row.id;
end;
$$;

revoke all on function public.create_patient_invitation(uuid, text, text) from public;
revoke all on function public.accept_patient_invitation(text) from public;
revoke all on function public.get_patient_access(uuid) from public;
revoke all on function public.update_patient_member_role(uuid, uuid, text) from public;
revoke all on function public.revoke_patient_invitation(uuid) from public;

grant execute on function public.create_patient_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_patient_invitation(text) to authenticated;
grant execute on function public.get_patient_access(uuid) to authenticated;
grant execute on function public.update_patient_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.revoke_patient_invitation(uuid) to authenticated;

commit;
