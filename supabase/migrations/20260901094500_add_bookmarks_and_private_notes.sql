-- Private saved-content tools for authenticated Continental Communist learners.

create table public.learner_bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_key text not null
    check (char_length(content_key) between 1 and 320),
  content_url text not null
    check (
      char_length(content_url) between 1 and 500
      and left(content_url, 1) = '/'
    ),
  content_title text not null
    check (char_length(trim(content_title)) between 1 and 240),
  content_type text not null
    check (char_length(trim(content_type)) between 1 and 80),
  bookmarked_at timestamptz not null default now(),
  primary key (user_id, content_key)
);

create index learner_bookmarks_recent_idx
  on public.learner_bookmarks (user_id, bookmarked_at desc);

create table public.learner_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_key text not null
    check (char_length(content_key) between 1 and 320),
  content_url text not null
    check (
      char_length(content_url) between 1 and 500
      and left(content_url, 1) = '/'
    ),
  content_title text not null
    check (char_length(trim(content_title)) between 1 and 240),
  content_type text not null
    check (char_length(trim(content_type)) between 1 and 80),
  note_body text not null
    check (char_length(trim(note_body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, content_key)
);

create index learner_notes_recent_idx
  on public.learner_notes (user_id, updated_at desc);

create or replace function public.set_learner_note_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger learner_notes_set_updated_at
before update on public.learner_notes
for each row execute function public.set_learner_note_updated_at();

alter table public.learner_bookmarks enable row level security;
alter table public.learner_notes enable row level security;

revoke all on table public.learner_bookmarks from anon, authenticated;
revoke all on table public.learner_notes from anon, authenticated;

grant select, insert, update, delete on table public.learner_bookmarks to authenticated;
grant select, insert, update, delete on table public.learner_notes to authenticated;

create policy "Learners can read their own bookmarks"
on public.learner_bookmarks for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can create their own bookmarks"
on public.learner_bookmarks for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners can update their own bookmarks"
on public.learner_bookmarks for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners can delete their own bookmarks"
on public.learner_bookmarks for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can read their own notes"
on public.learner_notes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can create their own notes"
on public.learner_notes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners can update their own notes"
on public.learner_notes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners can delete their own notes"
on public.learner_notes for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on function public.set_learner_note_updated_at() from public;
