-- ============================================================================
-- OHS Builder Victoria — Schema v1 (go-live build)
-- Applied to Supabase project bbbtqhypdjrmlrdabumm on 2026-07-03
-- ============================================================================

-- ---------- profiles (one row per auth user) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  role text not null default 'worker'
    check (role in ('builder_admin','hse_manager','site_supervisor','worker')),
  status text not null default 'Active',
  worker_id bigint,
  project_ids bigint[],            -- null = all projects
  read_notifications text[] not null default '{}',
  last_login timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- org settings (single row) ----------
create table public.org_settings (
  id int primary key default 1 check (id = 1),
  name text not null,
  abn text not null default '',
  state text not null default 'Victoria',
  plan text not null default 'Professional',
  billing_contact text not null default '',
  tagline text not null default '',
  built_by text not null default '',
  notifications jsonb not null default '{"incident":true,"compliance":true,"swms":true,"toolbox":false,"worksafe":true}'
);

-- ---------- projects ----------
create table public.projects (
  id bigint generated always as identity primary key,
  name text not null,
  address text not null default '',
  status text not null default 'Planning'
    check (status in ('Planning','Active','On Hold','Completed')),
  build_percent int not null default 0 check (build_percent between 0 and 100),
  compliance int not null default 100 check (compliance between 0 and 100),
  contract_type text not null default 'Lump Sum',
  contract_value numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- workers (site personnel / stakeholders) ----------
create table public.workers (
  id bigint generated always as identity primary key,
  name text not null,
  trade text not null default '',
  employer text not null default '',
  project_id bigint references public.projects(id) on delete set null,
  induction text not null default 'Missing' check (induction in ('Verified','Pending','Missing')),
  quiz text not null default 'Missing' check (quiz in ('Verified','Pending','Missing')),
  white_card text not null default 'Missing' check (white_card in ('Verified','Pending','Missing')),
  insurance text not null default 'Missing' check (insurance in ('Verified','Pending','Missing')),
  medical text not null default 'Missing' check (medical in ('Verified','Pending','Missing')),
  swms text not null default 'Missing' check (swms in ('Verified','Pending','Missing')),
  status text not null default 'Site Access Pending',
  created_at timestamptz not null default now()
);

-- ---------- SWMS templates (live, signable, version-controlled) ----------
create table public.swms_templates (
  id bigint generated always as identity primary key,
  trade text not null,
  ref text not null unique,
  version text not null default 'v1.0',
  signed int not null default 0,
  total int not null default 0,
  status text not null default 'Pending',
  legislation text not null default '',
  hrcw text[] not null default '{}',
  ppe text[] not null default '{}',
  equipment text[] not null default '{}',
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- incidents & corrective actions ----------
create table public.incidents (
  id bigint generated always as identity primary key,
  type text not null,
  description text not null default '',
  project_id bigint references public.projects(id) on delete set null,
  reported_by text not null default '',
  date date not null default current_date,
  status text not null default 'Open',
  severity text not null default 'Low',
  location text not null default '',
  involved text not null default '',
  witnesses text not null default '',
  immediate_action text not null default '',
  notifiable boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.corrective_actions (
  id bigint generated always as identity primary key,
  incident_id bigint not null references public.incidents(id) on delete cascade,
  description text not null,
  assigned_to text not null default '',
  due date,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

-- ---------- site diary ----------
create table public.diary_entries (
  id bigint generated always as identity primary key,
  project_id bigint references public.projects(id) on delete set null,
  date date not null default current_date,
  weather text not null default '',
  wind text not null default '',
  labour int not null default 0,
  hours text not null default '',
  contacts text not null default '',
  deliveries text[] not null default '{}',
  notes text not null default '',
  author text not null default '',
  photos int not null default 0,
  tags text[] not null default '{}',
  has_audio boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- toolbox meetings ----------
create table public.toolbox_meetings (
  id bigint generated always as identity primary key,
  project_id bigint references public.projects(id) on delete set null,
  topic text not null,
  date date not null default current_date,
  presenter text not null default '',
  attendees int not null default 0,
  total int not null default 0,
  duration text not null default '',
  points text[] not null default '{}',
  signatures int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- policies register ----------
create table public.policies (
  id bigint generated always as identity primary key,
  name text not null,
  version text not null default 'v1.0',
  category text not null default '',
  status text not null default 'Active',
  updated date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Helper: current user's role (security definer avoids RLS recursion)
-- ============================================================================
create or replace function public.my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_builder_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('builder_admin','hse_manager','site_supervisor')
       from public.profiles where id = auth.uid()),
    false)
$$;

-- ============================================================================
-- Auto-create a profile when an auth user is created
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Worker self-service RPCs (keep RLS strict for the worker role)
-- ============================================================================

-- Worker updates one of their own compliance categories (induction/quiz/swms)
create or replace function public.update_my_compliance(category text, value text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  wid bigint;
begin
  if category not in ('induction','quiz','swms') then
    raise exception 'category not allowed';
  end if;
  if value not in ('Verified','Pending','Missing') then
    raise exception 'value not allowed';
  end if;
  select worker_id into wid from public.profiles where id = auth.uid();
  if wid is null then
    raise exception 'no linked worker record';
  end if;
  execute format('update public.workers set %I = $1 where id = $2', category)
    using value, wid;
  -- recompute status
  update public.workers w set status =
    case
      when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s = 'Missing') > 0
        then 'Site Access Pending'
      when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s <> 'Verified') > 0
        then 'Action Required'
      else 'Active'
    end
  where w.id = wid;
end;
$$;

-- Worker (or staff) records a SWMS sign-off against a template
create or replace function public.sign_swms(template_id bigint)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.swms_templates
     set signed = least(signed + 1, greatest(total, signed + 1))
   where id = template_id and locked = false;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.org_settings enable row level security;
alter table public.projects enable row level security;
alter table public.workers enable row level security;
alter table public.swms_templates enable row level security;
alter table public.incidents enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.diary_entries enable row level security;
alter table public.toolbox_meetings enable row level security;
alter table public.policies enable row level security;

-- profiles
create policy "profiles: read all (authenticated)" on public.profiles
  for select to authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin manage" on public.profiles
  for all to authenticated using (public.my_role() = 'builder_admin')
  with check (public.my_role() = 'builder_admin');

-- org settings
create policy "org: read (authenticated)" on public.org_settings
  for select to authenticated using (true);
create policy "org: admin write" on public.org_settings
  for update to authenticated using (public.my_role() = 'builder_admin')
  with check (public.my_role() = 'builder_admin');

-- content tables: read for all authenticated, write for builder staff
create policy "projects: read" on public.projects for select to authenticated using (true);
create policy "projects: staff write" on public.projects for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());

create policy "workers: read" on public.workers for select to authenticated using (true);
create policy "workers: staff write" on public.workers for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());

create policy "swms: read" on public.swms_templates for select to authenticated using (true);
create policy "swms: staff write" on public.swms_templates for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());

create policy "incidents: read" on public.incidents for select to authenticated using (true);
create policy "incidents: staff write" on public.incidents for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());
-- any authenticated user (incl. stakeholders) can report an incident
create policy "incidents: anyone report" on public.incidents for insert to authenticated
  with check (true);

create policy "actions: read" on public.corrective_actions for select to authenticated using (true);
create policy "actions: staff write" on public.corrective_actions for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());

create policy "diary: read" on public.diary_entries for select to authenticated using (true);
create policy "diary: staff write" on public.diary_entries for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());

create policy "toolbox: read" on public.toolbox_meetings for select to authenticated using (true);
create policy "toolbox: staff write" on public.toolbox_meetings for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());

create policy "policies: read" on public.policies for select to authenticated using (true);
create policy "policies: staff write" on public.policies for all to authenticated
  using (public.is_builder_staff()) with check (public.is_builder_staff());
