-- Change-log table for public product updates page.

create extension if not exists pgcrypto;

-- Compatibility: rename the old releases table if it already exists.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'releases'
  )
  and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'change_logs'
  ) then
    alter table public.releases rename to change_logs;
  end if;
end $$;

create table if not exists public.change_logs (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  description text not null check (char_length(trim(description)) > 0),
  released_on date not null,
  improvements jsonb not null default '[]'::jsonb,
  fixes jsonb not null default '[]'::jsonb,
  patches jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Ensure new columns exist on migrated tables.
alter table public.change_logs add column if not exists title text;
alter table public.change_logs add column if not exists released_on date;
alter table public.change_logs add column if not exists improvements jsonb default '[]'::jsonb;
alter table public.change_logs add column if not exists fixes jsonb default '[]'::jsonb;
alter table public.change_logs add column if not exists patches jsonb default '[]'::jsonb;
alter table public.change_logs alter column improvements set default '[]'::jsonb;
alter table public.change_logs alter column fixes set default '[]'::jsonb;
alter table public.change_logs alter column patches set default '[]'::jsonb;

-- If both tables exist, copy rows once before removing legacy table.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'releases'
  ) and exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'change_logs'
  ) then
    insert into public.change_logs (
      version,
      title,
      description,
      released_on,
      improvements,
      fixes,
      patches,
      created_at
    )
    select
      r.version,
      'Product update',
      r.description,
      r.created_at::date,
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      r.created_at
    from public.releases r
    on conflict (version) do nothing;
  end if;
end $$;

drop table if exists public.releases;

update public.change_logs
set
  title = coalesce(nullif(trim(title), ''), 'Product update'),
  released_on = coalesce(released_on, created_at::date),
  improvements = case
    when jsonb_typeof(improvements) is distinct from 'array' then '[]'::jsonb
    else improvements
  end,
  fixes = case
    when jsonb_typeof(fixes) is distinct from 'array' then '[]'::jsonb
    else fixes
  end,
  patches = case
    when jsonb_typeof(patches) is distinct from 'array' then '[]'::jsonb
    else patches
  end;

alter table public.change_logs alter column title set not null;
alter table public.change_logs alter column released_on set not null;
alter table public.change_logs alter column improvements set not null;
alter table public.change_logs alter column fixes set not null;
alter table public.change_logs alter column patches set not null;

create index if not exists change_logs_released_on_idx
  on public.change_logs (released_on desc, created_at desc);

alter table public.change_logs enable row level security;

drop policy if exists "Public can read releases" on public.change_logs;
drop policy if exists "Public can read change logs" on public.change_logs;
create policy "Public can read change logs"
  on public.change_logs
  for select
  using (true);

-- Backfill existing versions with structured change-log entries.
insert into public.change_logs (
  version,
  title,
  description,
  released_on,
  improvements,
  fixes,
  patches,
  created_at
)
values
  (
    '0.1.0',
    'Initial launch',
    'First public release of B-Track7 core budgeting experience.',
    (now() - interval '8 day')::date,
    '["Launched baseline dashboard and transaction tracking."]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    now() - interval '8 day'
  ),
  (
    '0.1.1',
    'Stability and fixes',
    'Improved reliability after initial launch.',
    (now() - interval '7 day')::date,
    '["Improved data sync reliability for dashboard widgets."]'::jsonb,
    '["Resolved edge-case crashes on startup."]'::jsonb,
    '["Minor UI polish for form controls."]'::jsonb,
    now() - interval '7 day'
  ),
  (
    '0.1.2',
    'UI polish',
    'Refined landing and dashboard visual consistency.',
    (now() - interval '6 day')::date,
    '["Improved UI hierarchy and readability on key views."]'::jsonb,
    '[]'::jsonb,
    '["Small spacing and alignment corrections."]'::jsonb,
    now() - interval '6 day'
  ),
  (
    '0.1.3',
    'Build reliability',
    'Deployment and build process hardening.',
    (now() - interval '5 day')::date,
    '["Improved build pipeline consistency across environments."]'::jsonb,
    '["Fixed deployment-time configuration issue."]'::jsonb,
    '[]'::jsonb,
    now() - interval '5 day'
  ),
  (
    '0.1.4',
    'Auth upgrade',
    'Authentication and social sign-in improvements.',
    (now() - interval '4 day')::date,
    '["Expanded social authentication support."]'::jsonb,
    '["Resolved auth callback edge case."]'::jsonb,
    '[]'::jsonb,
    now() - interval '4 day'
  ),
  (
    '0.1.5',
    'Landing refresh',
    'Landing page redesign and visual polish.',
    (now() - interval '3 day')::date,
    '["Redesigned key sections of the landing page."]'::jsonb,
    '[]'::jsonb,
    '["Improved typography and spacing rhythm."]'::jsonb,
    now() - interval '3 day'
  ),
  (
    '0.1.6',
    'Auth flow improvements',
    'More reliable sign-in and sign-up transitions.',
    (now() - interval '2 day')::date,
    '["Improved account onboarding UX flow."]'::jsonb,
    '["Fixed intermittent redirect issue after auth."]'::jsonb,
    '[]'::jsonb,
    now() - interval '2 day'
  ),
  (
    '0.1.7',
    'Latest platform patch',
    'Recent fixes and UI improvements.',
    (now() - interval '1 day')::date,
    '["Improved dashboard update responsiveness."]'::jsonb,
    '["Resolved transaction list display inconsistency."]'::jsonb,
    '["Applied latest visual consistency patch."]'::jsonb,
    now() - interval '1 day'
  )
on conflict (version) do update
set
  title = excluded.title,
  description = excluded.description,
  released_on = excluded.released_on,
  improvements = excluded.improvements,
  fixes = excluded.fixes,
  patches = excluded.patches;
