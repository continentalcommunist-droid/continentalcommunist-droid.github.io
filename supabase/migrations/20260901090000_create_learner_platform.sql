-- Continental Communist learner accounts and pathway progress.
-- Apply with `supabase db push` or paste this migration into the Supabase SQL
-- editor before enabling the browser configuration in _config.yml.

create table public.learner_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Learner'
    check (char_length(trim(display_name)) between 1 and 80),
  timezone text not null default 'UTC'
    check (char_length(trim(timezone)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learner_pathways (
  user_id uuid not null references auth.users (id) on delete cascade,
  pathway_slug text not null
    check (
      char_length(pathway_slug) between 1 and 120
      and pathway_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  total_steps integer not null default 0 check (total_steps >= 0),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, pathway_slug)
);

create table public.learner_progress (
  user_id uuid not null,
  pathway_slug text not null,
  item_key text not null
    check (
      char_length(item_key) between 1 and 160
      and item_key ~ '^[a-z][a-z0-9_-]*(?::[a-z0-9][a-z0-9_-]*)?$'
    ),
  completed_at timestamptz not null default now(),
  primary key (user_id, pathway_slug, item_key),
  foreign key (user_id, pathway_slug)
    references public.learner_pathways (user_id, pathway_slug)
    on delete cascade
);

create index learner_pathways_recent_activity_idx
  on public.learner_pathways (user_id, last_activity_at desc);

create or replace function public.set_learner_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger learner_profiles_set_updated_at
before update on public.learner_profiles
for each row execute function public.set_learner_profile_updated_at();

create or replace function public.create_learner_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.learner_profiles (user_id, display_name, timezone)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Learner'
      ),
      80
    ),
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'timezone'), ''),
        'UTC'
      ),
      80
    )
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger create_learner_profile_after_signup
after insert on auth.users
for each row execute function public.create_learner_profile();

-- Backfill a profile if Auth users existed before this migration was applied.
insert into public.learner_profiles (user_id, display_name, timezone)
select
  users.id,
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
      'Learner'
    ),
    80
  ),
  left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'timezone'), ''),
      'UTC'
    ),
    80
  )
from auth.users as users
on conflict (user_id) do nothing;

create or replace function public.refresh_learner_pathway_summary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  target_pathway_slug text;
  completed_steps integer;
begin
  if tg_op = 'DELETE' then
    target_user_id := old.user_id;
    target_pathway_slug := old.pathway_slug;
  else
    target_user_id := new.user_id;
    target_pathway_slug := new.pathway_slug;
  end if;

  select count(*)::integer
    into completed_steps
  from public.learner_progress
  where user_id = target_user_id
    and pathway_slug = target_pathway_slug;

  update public.learner_pathways
  set
    last_activity_at = now(),
    completed_at = case
      when total_steps > 0 and completed_steps >= total_steps
        then coalesce(completed_at, now())
      else null
    end
  where user_id = target_user_id
    and pathway_slug = target_pathway_slug;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger learner_progress_refresh_pathway
after insert or update or delete on public.learner_progress
for each row execute function public.refresh_learner_pathway_summary();

alter table public.learner_profiles enable row level security;
alter table public.learner_pathways enable row level security;
alter table public.learner_progress enable row level security;

revoke all on table public.learner_profiles from anon, authenticated;
revoke all on table public.learner_pathways from anon, authenticated;
revoke all on table public.learner_progress from anon, authenticated;

grant select, insert, update on table public.learner_profiles to authenticated;
grant select, insert, update, delete on table public.learner_pathways to authenticated;
grant select, insert, update, delete on table public.learner_progress to authenticated;

create policy "Learners can read their own profile"
on public.learner_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can create their own profile"
on public.learner_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners can update their own profile"
on public.learner_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners can read their own pathways"
on public.learner_pathways for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can create their own pathways"
on public.learner_pathways for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners can update their own pathways"
on public.learner_pathways for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners can delete their own pathways"
on public.learner_pathways for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can read their own progress"
on public.learner_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can create their own progress"
on public.learner_progress for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners can update their own progress"
on public.learner_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners can delete their own progress"
on public.learner_progress for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.set_learner_profile_updated_at() from public;
revoke all on function public.create_learner_profile() from public;
revoke all on function public.refresh_learner_pathway_summary() from public;
