begin;

alter table public.evidence
  add column if not exists source text not null default 'dashboard',
  add column if not exists external_message_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.evidence
  drop constraint if exists evidence_source_check;

alter table public.evidence
  add constraint evidence_source_check
  check (source in ('dashboard', 'jelou', 'whatsapp'));

create unique index if not exists evidence_source_message_unique
  on public.evidence(source, external_message_id)
  where external_message_id is not null;

create index if not exists evidence_dose_event_created_idx
  on public.evidence(dose_event_id, created_at desc);

commit;
