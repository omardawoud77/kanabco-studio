-- ═══════════════════════════════════════════════════════════
-- KANABCO STUDIO · SUPABASE SCHEMA
-- Run this in your Supabase SQL editor after creating a project
-- ═══════════════════════════════════════════════════════════

-- Teams: a workspace; each user has at least one (their default)
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Team members: many-to-many between users and teams
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz default now(),
  unique (team_id, user_id)
);

-- Library entries: saved prompts (and optional generated images), scoped to a team
create table if not exists library_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete set null,
  title text not null,
  subtitle text,
  prompt text not null,
  state jsonb,
  image_url text,
  source_name text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_team_members_user on team_members(user_id);
create index if not exists idx_team_members_team on team_members(team_id);
create index if not exists idx_library_team on library_entries(team_id);
create index if not exists idx_library_created on library_entries(created_at desc);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table teams enable row level security;
alter table team_members enable row level security;
alter table library_entries enable row level security;

-- Helper: is the calling user a member of this team?
create or replace function is_team_member(team uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from team_members
    where team_id = team and user_id = auth.uid()
  );
$$;

-- TEAMS policies
drop policy if exists "members can read teams" on teams;
create policy "members can read teams"
  on teams for select
  using (is_team_member(id));

drop policy if exists "users can create teams" on teams;
create policy "users can create teams"
  on teams for insert
  with check (owner_id = auth.uid());

drop policy if exists "owners can update teams" on teams;
create policy "owners can update teams"
  on teams for update
  using (owner_id = auth.uid());

drop policy if exists "owners can delete teams" on teams;
create policy "owners can delete teams"
  on teams for delete
  using (owner_id = auth.uid());

-- TEAM_MEMBERS policies
drop policy if exists "members can read team_members" on team_members;
create policy "members can read team_members"
  on team_members for select
  using (is_team_member(team_id));

drop policy if exists "owners can add team_members" on team_members;
create policy "owners can add team_members"
  on team_members for insert
  with check (
    exists (select 1 from teams where id = team_id and owner_id = auth.uid())
    or user_id = auth.uid()  -- allow self-join on team creation
  );

drop policy if exists "owners can remove team_members" on team_members;
create policy "owners can remove team_members"
  on team_members for delete
  using (
    exists (select 1 from teams where id = team_id and owner_id = auth.uid())
    or user_id = auth.uid()  -- allow self-leave
  );

-- LIBRARY_ENTRIES policies
drop policy if exists "team members can read entries" on library_entries;
create policy "team members can read entries"
  on library_entries for select
  using (is_team_member(team_id));

drop policy if exists "team members can insert entries" on library_entries;
create policy "team members can insert entries"
  on library_entries for insert
  with check (is_team_member(team_id) and user_id = auth.uid());

drop policy if exists "team members can update own entries" on library_entries;
create policy "team members can update own entries"
  on library_entries for update
  using (is_team_member(team_id) and user_id = auth.uid());

drop policy if exists "team members can delete own entries" on library_entries;
create policy "team members can delete own entries"
  on library_entries for delete
  using (is_team_member(team_id) and user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- AUTO-CREATE DEFAULT TEAM ON SIGNUP
-- ═══════════════════════════════════════════════════════════

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  new_team_id uuid;
begin
  insert into teams (name, owner_id)
  values ('My Workspace', new.id)
  returning id into new_team_id;

  insert into team_members (team_id, user_id, email, role)
  values (new_team_id, new.id, new.email, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKET FOR GENERATED IMAGES
-- Run separately in Storage tab: create bucket "generated-images" (public)
-- ═══════════════════════════════════════════════════════════
