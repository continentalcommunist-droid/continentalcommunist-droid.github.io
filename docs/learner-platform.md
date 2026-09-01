# Learner accounts and Supabase

Continental Communist remains fully readable without an account. Pathway
completion is stored in the browser by default. When a learner creates an
account, completed steps synchronize through Supabase so they can resume on
another device.

## What is implemented

- Email/password sign-up, confirmation, sign-in, sign-out, and password recovery.
- A private learner profile with a display name and time zone.
- Private pathway enrollments, completion timestamps, and completed step keys.
- Automatic import of existing anonymous browser progress on sign-in.
- Per-user browser caches and queued retry when synchronization is interrupted.
- A private `/account/` dashboard summarizing active and completed pathways.
- Row-level security and explicit database grants for every learner table.

The browser receives only the Supabase project URL and public publishable key.
Never put a `service_role` JWT, an `sb_secret_` key, database password, or access
token in `_config.yml` or any other committed site file.

## Connect a Supabase project

1. Create a Supabase project and record its project URL and publishable key.
2. In the Supabase SQL editor, run
   `supabase/migrations/20260901090000_create_learner_platform.sql`. If the
   Supabase CLI is linked to the project, `supabase db push` applies the same
   migration.
3. In **Authentication → URL Configuration**, set the site URL to
   `https://www.continentalcommunist.com`.
4. Add these redirect URLs:
   - `https://www.continentalcommunist.com/account/`
   - `https://www.continentalcommunist.com/account/?confirmed=1`
   - `https://www.continentalcommunist.com/account/?mode=recovery`
   - `http://127.0.0.1:4000/account/**` for local testing only.
5. Keep email/password authentication enabled. Configure a branded confirmation
   sender before inviting learners; Supabase's default sender is for initial
   testing and is rate-limited.
6. Add the two public values in `_config.yml`:

   ```yaml
   supabase:
     url: "https://PROJECT_REF.supabase.co"
     publishable_key: "sb_publishable_..."
     javascript_version: "2.112.4"
   ```

7. Build and validate the site, then test sign-up, confirmation, sign-in,
   password recovery, profile editing, progress sync, reset, sign-out, and a
   second browser session.

## Database boundaries

`learner_profiles` contains a learner's Auth user ID, display name, and time
zone. `learner_pathways` contains one record per started pathway and its summary
timestamps. `learner_progress` contains one record per completed pathway item.
Deleting an Auth user cascades through all three tables.

The migration revokes all learner-table access from unauthenticated requests.
Authenticated requests receive only the operations required by the interface,
and each select, insert, update, and delete policy compares `auth.uid()` with
the row's `user_id`. The profile trigger is the only security-definer entry
point and its direct execution permission is revoked.

The current schema deliberately does not collect notes, browsing history,
political opinions, location, or public profile information. Add new learner
data only with a defined product purpose, retention policy, and matching RLS
tests.

## Operational checks

Run the repository contract validator before release:

```sh
ruby scripts/validate_learner_platform.rb
```

In Supabase, review the Auth audit log, API logs, and database advisors after
launch. Keep leaked-password protection enabled when the project's plan makes
it available, require email confirmation, and periodically verify that the
`anon` role cannot read any learner table.
