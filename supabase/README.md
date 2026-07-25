# Supabase Setup

The frontend now uses Supabase Auth with email and password. Apply the migration
in `migrations/202607240001_initial_profiles_and_care.sql` before enabling the
new profile and patient screens.

## Apply the migration

Use one of these methods:

1. Open the Supabase dashboard, select the project, open **SQL Editor**, paste
   the migration, and run it once.
2. Install the Supabase CLI, link the project, then run:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The migration creates private tables, row-level security policies, profile
triggers, and the private `evidence` Storage bucket.

Apply every migration in filename order. Migration
`202607240004_sync_dose_events.sql` keeps a rolling 30-day window of scheduled
dose events whenever the authenticated dashboard loads or refreshes.
Migration `202607240005_multiple_medication_schedules.sql` adds transactional
support for several schedules per medication, weekday selection, instructions,
and treatment start/end dates.
Migration `202607240006_patient_invitations.sql` adds expiring, hashed
invitations and the RPCs used to accept access, list members, update roles, and
revoke pending invitations. Invitation links are shared by the owner; no
service-role key is exposed to the frontend.
Migration `202607240007_evidence_integration_hardening.sql` adds webhook
idempotency fields and indexes to evidence records.

## Jelou Edge Functions

The browser never calls Datum directly. Deploy both Edge Functions:

```bash
supabase functions deploy jelou-bridge
supabase functions deploy jelou-evidence-webhook --no-verify-jwt
supabase secrets set \
  JELOU_APPS_KEY="<apps-key>" \
  JELOU_WEBHOOK_SECRET="<long-random-secret>" \
  JELOU_MEDIA_HOSTS="<comma-separated-media-hosts>" \
  JELOU_MEDIA_TOKEN="<optional-media-token>"
```

`jelou-bridge` requires the user's Supabase JWT and verifies manager access.
`jelou-evidence-webhook` is called by Jelou and authenticates
`x-webhook-secret`. Configure Jelou to send evidence to:

```text
https://<project-ref>.supabase.co/functions/v1/jelou-evidence-webhook
```

The payload must include `doseEventId`, `patientId`, the unique WhatsApp
`messageId`, `type`, and either `text`, `mediaUrl`, or `mediaBase64`. Media URLs
must use HTTPS and their hostname must appear in `JELOU_MEDIA_HOSTS`.

## Auth configuration

In **Authentication > URL Configuration**, add the production application URL
and local development URL, for example `http://localhost:5173`, to the allowed
redirect URLs. Email/password sign-up and email confirmation must remain
enabled.

Never add the service-role key or database password to a `VITE_*` variable.
Those variables are compiled into the public browser bundle.

Rotate any Datum key that was previously included in frontend code or shared
documentation.
