-- BuildPlan Pro Phase 17 Supabase schema
-- Apply this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  full_name text,
  phone text,
  organization text,
  role text,
  member_status text not null default 'beta',
  beta_source text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  plan text,
  package_code text,
  billing_cycle text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled project',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer check (rating between 1 and 5),
  message text not null,
  feature_request text,
  project_context jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  source text,
  stack text,
  route text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.subscriptions add column if not exists package_code text;
alter table public.subscriptions add column if not exists billing_cycle text;
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.projects add column if not exists archived_at timestamptz;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists organization text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists member_status text not null default 'beta';
alter table public.profiles add column if not exists beta_source text;
alter table public.profiles add column if not exists last_seen_at timestamptz;

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists profiles_member_status_created_at_idx on public.profiles(member_status, created_at desc);
create index if not exists projects_user_id_updated_at_idx on public.projects(user_id, updated_at desc);
create index if not exists feedback_user_id_created_at_idx on public.feedback(user_id, created_at desc);
create index if not exists audit_logs_user_id_created_at_idx on public.audit_logs(user_id, created_at desc);
create index if not exists error_events_user_id_created_at_idx on public.error_events(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table public.error_events enable row level security;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert on public.feedback to authenticated;
grant select on public.audit_logs to authenticated;
grant select, insert on public.error_events to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects for select using (auth.uid() = user_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects for insert with check (auth.uid() = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects for delete using (auth.uid() = user_id);

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback for insert with check (auth.uid() = user_id);

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback for select using (auth.uid() = user_id);

drop policy if exists audit_logs_select_own on public.audit_logs;
create policy audit_logs_select_own on public.audit_logs for select using (auth.uid() = user_id);

drop policy if exists error_events_insert_own on public.error_events;
create policy error_events_insert_own on public.error_events for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists error_events_select_own on public.error_events;
create policy error_events_select_own on public.error_events for select using (auth.uid() = user_id);
