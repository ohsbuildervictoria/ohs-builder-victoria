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

-- ---------- invitations recorded from the Admin Portal ----------
create table public.invites (
  id bigint generated always as identity primary key,
  name text not null default '',
  email text not null,
  role text not null default 'worker'
    check (role in ('builder_admin','hse_manager','site_supervisor','worker')),
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;
create policy "invites read" on public.invites for select to authenticated using (true);
create policy "invites admin write" on public.invites for all to authenticated
  using (public.my_role() = 'builder_admin') with check (public.my_role() = 'builder_admin');

-- ---------- TEMPORARY pilot bypass flag (see src/lib/pilotBypass.js) ----------
-- bypass_auth=true auto-signs visitors in as Builder Admin (2-3 week pilot).
-- MUST be set back to false before any other real client's data enters
-- this system. Readable pre-login; writable only via the dashboard.
create table public.app_config (
  id int primary key default 1 check (id = 1),
  bypass_auth boolean not null default false,
  note text not null default ''
);
alter table public.app_config enable row level security;
create policy "config readable pre-login" on public.app_config for select to anon, authenticated using (true);

-- ---------- Pilot go-live additions (2026-07-04) ----------
-- Per-tradie pilot usernames; project management fields; LTIFR inputs.
alter table public.workers add column login_handle text unique;
alter table public.projects add column project_manager text not null default '';
alter table public.projects add column start_date date;
alter table public.projects drop constraint projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('Planning','Active','On Hold','Completed','Archived'));
alter table public.incidents add column lost_time boolean not null default false;
alter table public.diary_entries alter column hours type numeric using coalesce(nullif(hours,''),'0')::numeric;

-- PILOT ONLY: tradies share one auth account, so worker id is explicit.
-- Same category restrictions as update_my_compliance. Remove after pilot.
create or replace function public.pilot_update_compliance(wid bigint, category text, value text)
returns void
language plpgsql security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if category not in ('induction','quiz','swms') then raise exception 'category not allowed'; end if;
  if value not in ('Verified','Pending','Missing') then raise exception 'value not allowed'; end if;
  execute format('update public.workers set %I = $1 where id = $2', category) using value, wid;
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
$fn$;

-- ---------- Registration profile (2026-07-06) ----------
-- The stakeholder "My Profile" form (contact, emergency, quals) persists here.
alter table public.workers add column profile jsonb not null default '{}'::jsonb;

-- PILOT ONLY: shared tradie auth account, so the worker id is explicit.
-- Remove with the other pilot RPCs after the pilot.
create or replace function public.pilot_save_profile(wid bigint, p jsonb)
returns void
language plpgsql security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.workers set profile = coalesce(p, '{}'::jsonb) where id = wid;
end;
$fn$;

-- ---------- Compliance evidence documents (2026-07-06) ----------
-- Uploaded files (photo/PDF) per stakeholder per category, with expiry dates
-- for time-bound documents (White Card / Insurance / Medical). Files live in
-- the private 'compliance-docs' Storage bucket; this table holds the metadata.
-- The app derives compliance status from these rows (see src/lib/compliance.js):
-- Missing (no file) -> Verified (valid) -> Expiring (<=30d) -> Expired.
create table public.compliance_documents (
  id bigint generated always as identity primary key,
  worker_id bigint not null references public.workers(id) on delete cascade,
  category text not null
    check (category in ('induction','white_card','insurance','medical','swms')),
  file_path text not null,
  file_name text not null default '',
  expiry_date date,
  uploaded_at timestamptz not null default now(),
  unique (worker_id, category)
);
alter table public.compliance_documents enable row level security;

-- PILOT: tradies share one auth account, so per-tradie isolation is enforced
-- app-side (each tradie only queries their own worker id), consistent with the
-- rest of the pilot data. Any authenticated user may read/write. Tighten to
-- per-user ownership when real per-tradie auth replaces the shared account.
create policy "compliance_documents read" on public.compliance_documents
  for select to authenticated using (true);
create policy "compliance_documents write" on public.compliance_documents
  for all to authenticated using (true) with check (true);

-- Private Storage bucket for the actual files.
insert into storage.buckets (id, name, public)
values ('compliance-docs', 'compliance-docs', false)
on conflict (id) do nothing;

-- Storage RLS (pilot-level: any authenticated user). Post-pilot, scope by the
-- {worker_id}/ path prefix once tradies have individual accounts.
create policy "compliance-docs read" on storage.objects
  for select to authenticated using (bucket_id = 'compliance-docs');
create policy "compliance-docs insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'compliance-docs');
create policy "compliance-docs update" on storage.objects
  for update to authenticated using (bucket_id = 'compliance-docs');
create policy "compliance-docs delete" on storage.objects
  for delete to authenticated using (bucket_id = 'compliance-docs');

-- ============================================================================
-- Multi-tenant organisations (2026-07-06)
-- Every builder-scoped row belongs to exactly one organization. RLS scopes all
-- reads/writes to the signed-in user's organization_id (public.my_org()), so a
-- builder's queries structurally cannot return another org's rows. David's
-- existing pilot data was backfilled into the seed org (Arlington Homes).
-- ============================================================================
create table public.organizations (
  id bigint generated always as identity primary key,
  name text not null,
  plan text not null default 'Trial',
  state text not null default 'Victoria',
  abn text not null default '',
  tagline text not null default '',
  built_by text not null default '',
  billing_contact text not null default '',
  notifications jsonb not null default '{"incident":true,"compliance":true,"swms":true,"toolbox":false,"worksafe":true}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- Seed org from the legacy single org_settings row (David / Arlington Homes).
insert into public.organizations (name, plan, state, abn, tagline, built_by, billing_contact, notifications)
select name, plan, state, abn, tagline, built_by, billing_contact, notifications
from public.org_settings where id = 1
and not exists (select 1 from public.organizations);

-- Current user's org (security definer avoids RLS recursion).
alter table public.profiles add column if not exists organization_id bigint references public.organizations(id);
update public.profiles set organization_id = (select id from public.organizations order by id limit 1) where organization_id is null;

create or replace function public.my_org()
returns bigint language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;
grant execute on function public.my_org() to authenticated, anon;

-- organization_id on every builder-scoped table. Backfilled to the seed org,
-- then defaulted to my_org() so app inserts are auto-stamped, and made NOT NULL.
do $$
declare t text; seed bigint := (select id from public.organizations order by id limit 1);
begin
  foreach t in array array['projects','workers','swms_templates','incidents','corrective_actions',
    'diary_entries','toolbox_meetings','policies','compliance_documents','invites']
  loop
    execute format('alter table public.%I add column if not exists organization_id bigint references public.organizations(id)', t);
    execute format('update public.%I set organization_id = %L where organization_id is null', t, seed);
    execute format('alter table public.%I alter column organization_id set default public.my_org()', t);
    execute format('alter table public.%I alter column organization_id set not null', t);
  end loop;
end $$;

-- Replace all data-table policies with org-scoped ones (clean slate).
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname='public'
    and tablename in ('organizations','profiles','org_settings','projects','workers','swms_templates',
      'incidents','corrective_actions','diary_entries','toolbox_meetings','policies','compliance_documents','invites')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "orgs: read own" on public.organizations for select to authenticated
  using (id = public.my_org() or created_by = auth.uid());
create policy "orgs: create" on public.organizations for insert to authenticated
  with check (created_by = auth.uid());
create policy "orgs: admin update" on public.organizations for update to authenticated
  using (id = public.my_org() and public.my_role() = 'builder_admin')
  with check (id = public.my_org() and public.my_role() = 'builder_admin');

create policy "profiles: read same org" on public.profiles for select to authenticated
  using (organization_id = public.my_org() or id = auth.uid());
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin manage" on public.profiles for all to authenticated
  using (public.my_role() = 'builder_admin' and organization_id = public.my_org())
  with check (public.my_role() = 'builder_admin' and organization_id = public.my_org());

-- Org-read + builder-staff-write for the standard data tables.
do $$
declare t text;
begin
  foreach t in array array['projects','workers','swms_templates','diary_entries','toolbox_meetings','policies','corrective_actions']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (organization_id = public.my_org())', t||': read org', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_builder_staff() and organization_id = public.my_org()) with check (public.is_builder_staff() and organization_id = public.my_org())', t||': staff write', t);
  end loop;
end $$;

create policy "incidents: read org" on public.incidents for select to authenticated
  using (organization_id = public.my_org());
create policy "incidents: staff write" on public.incidents for all to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org())
  with check (public.is_builder_staff() and organization_id = public.my_org());
create policy "incidents: anyone report" on public.incidents for insert to authenticated
  with check (organization_id = public.my_org());

create policy "compliance_documents: read org" on public.compliance_documents for select to authenticated
  using (organization_id = public.my_org());
create policy "compliance_documents: write org" on public.compliance_documents for all to authenticated
  using (organization_id = public.my_org()) with check (organization_id = public.my_org());

create policy "invites: read org" on public.invites for select to authenticated
  using (organization_id = public.my_org());
create policy "invites: admin write" on public.invites for all to authenticated
  using (public.my_role() = 'builder_admin' and organization_id = public.my_org())
  with check (public.my_role() = 'builder_admin' and organization_id = public.my_org());

-- Signup: create an org and make the caller its Builder Admin (atomic + safe).
create or replace function public.signup_create_org(org_name text)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare new_org bigint; existing bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select organization_id into existing from public.profiles where id = auth.uid();
  if existing is not null then return existing; end if;
  insert into public.organizations (name, created_by)
    values (coalesce(nullif(trim(org_name),''), 'My Company'), auth.uid())
    returning id into new_org;
  update public.profiles set organization_id = new_org, role = 'builder_admin', status = 'Active'
    where id = auth.uid();
  return new_org;
end $fn$;
grant execute on function public.signup_create_org(text) to authenticated;

-- NOTE: Supabase Auth email auto-confirm was enabled (mailer_autoconfirm=true)
-- so trial signups get an immediate session. The pilot bypass now fires ONLY
-- via the explicit "View live demo" entry (David's Arlington org); it no longer
-- auto-logs-in every visitor. See src/context/AuthContext.jsx + src/lib/pilotBypass.js.

-- ============================================================================
-- Real per-tradie authentication (2026-07-08)
-- Each tradie gets their own account (email + password) via a one-time invite
-- link, linked to their worker record + org. David's 3 existing pilot tradies
-- stay on the legacy shared-account username login (account_status='legacy').
-- ============================================================================
alter table public.workers add column if not exists email text;
alter table public.workers add column if not exists invite_token uuid;
alter table public.workers add column if not exists account_status text not null default 'invited';

-- Existing workers -> legacy shared-account login (no per-tradie account).
update public.workers set account_status = 'legacy' where account_status = 'invited';
-- New workers auto-get a fresh invite token.
alter table public.workers alter column invite_token set default gen_random_uuid();
update public.workers set invite_token = gen_random_uuid()
  where account_status = 'invited' and invite_token is null;

-- Caller's linked worker id (null for builders and the shared pilot account).
create or replace function public.my_worker_id()
returns bigint language sql stable security definer set search_path = public as $$
  select worker_id from public.profiles where id = auth.uid()
$$;
grant execute on function public.my_worker_id() to authenticated, anon;

-- Public invite preview (anon): what a tradie sees before setting a password.
create or replace function public.worker_invite_info(token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'workerName', w.name, 'trade', w.trade, 'orgName', o.name,
    'projectName', p.name, 'claimed', (w.account_status = 'active')
  )
  from public.workers w
  left join public.organizations o on o.id = w.organization_id
  left join public.projects p on p.id = w.project_id
  where w.invite_token = token
$$;
grant execute on function public.worker_invite_info(uuid) to anon, authenticated;

-- Claim an invite: link the signed-in account to the worker + org, role worker.
create or replace function public.accept_worker_invite(token uuid)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare w record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into w from public.workers where invite_token = token;
  if w.id is null then raise exception 'This invite link is invalid or has already been used.'; end if;
  update public.profiles
    set organization_id = w.organization_id, role = 'worker', worker_id = w.id, status = 'Active'
    where id = auth.uid();
  update public.workers
    set account_status = 'active', invite_token = null,
        email = coalesce(nullif(email,''), (select email from public.profiles where id = auth.uid()))
    where id = w.id;
  return w.id;
end $fn$;
grant execute on function public.accept_worker_invite(uuid) to authenticated;

-- Legacy shared-account username lookup, org-scoped (RLS now hides other
-- workers from a linked tradie, so this must run as definer).
create or replace function public.find_worker_by_handle(handle text)
returns setof public.workers language sql stable security definer set search_path = public as $$
  select * from public.workers
  where login_handle = lower(trim(handle)) and organization_id = public.my_org()
  limit 1
$$;
grant execute on function public.find_worker_by_handle(text) to authenticated;

-- Worker self-service profile save (real tradie; RLS blocks direct writes).
create or replace function public.save_my_profile(p jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
declare wid bigint;
begin
  select worker_id into wid from public.profiles where id = auth.uid();
  if wid is null then raise exception 'no linked worker record'; end if;
  update public.workers set profile = coalesce(p, '{}'::jsonb) where id = wid;
end $fn$;
grant execute on function public.save_my_profile(jsonb) to authenticated;

-- Harden SWMS sign-off to the caller's own org.
create or replace function public.sign_swms(template_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.swms_templates
     set signed = least(signed + 1, greatest(total, signed + 1))
   where id = template_id and locked = false and organization_id = public.my_org();
end;
$$;

-- Retighten workers + compliance_documents so a LINKED tradie sees only their
-- own record. The "my_worker_id() is null" clause is the narrow escape hatch
-- that keeps David's shared pilot account (role worker, no linked worker)
-- working; every real tradie has a worker_id and is therefore restricted.
drop policy if exists "workers: read org" on public.workers;
drop policy if exists "workers: staff write" on public.workers;
create policy "workers: read" on public.workers for select to authenticated
  using (organization_id = public.my_org()
    and (public.is_builder_staff() or public.my_worker_id() is null or id = public.my_worker_id()));
create policy "workers: staff write" on public.workers for all to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org())
  with check (public.is_builder_staff() and organization_id = public.my_org());

drop policy if exists "compliance_documents: read org" on public.compliance_documents;
drop policy if exists "compliance_documents: write org" on public.compliance_documents;
create policy "compliance_documents: read" on public.compliance_documents for select to authenticated
  using (organization_id = public.my_org()
    and (public.is_builder_staff() or public.my_worker_id() is null or worker_id = public.my_worker_id()));
create policy "compliance_documents: write" on public.compliance_documents for all to authenticated
  using (organization_id = public.my_org()
    and (public.is_builder_staff() or public.my_worker_id() is null or worker_id = public.my_worker_id()))
  with check (organization_id = public.my_org()
    and (public.is_builder_staff() or public.my_worker_id() is null or worker_id = public.my_worker_id()));

select
  (select count(*) from public.workers where account_status='legacy') legacy_workers,
  (select count(*) from public.workers where invite_token is not null) with_token;

-- ============================================================================
-- Edit audit trail (2026-07-08)
-- Immutable log of corrections to diary entries and incidents. The app writes
-- an "edited by X, was: Y" row BEFORE updating the record, so safety records
-- are correctable but never silently overwritten. No update/delete policies =>
-- rows can never be altered or removed once written.
-- ============================================================================
create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id bigint not null default public.my_org() references public.organizations(id),
  entity text not null check (entity in ('diary_entry','incident')),
  entity_id bigint not null,
  action text not null default 'edit',
  changed_by text not null default '',
  changes jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy "audit: read org" on public.audit_log for select to authenticated
  using (organization_id = public.my_org());
create policy "audit: staff insert" on public.audit_log for insert to authenticated
  with check (public.is_builder_staff() and organization_id = public.my_org());

-- ============================================================================
-- QR-code site sign-in (2026-07-08)
-- Each project has a scannable check-in code. A tradie scans the poster at the
-- gate and checks in for the day; the diary's crew count and LTIFR man-hours
-- can then use real attendance instead of a guess.
-- ============================================================================
alter table public.projects add column if not exists checkin_token uuid;
update public.projects set checkin_token = gen_random_uuid() where checkin_token is null;
alter table public.projects alter column checkin_token set default gen_random_uuid();

create table if not exists public.site_checkins (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id),
  project_id bigint not null references public.projects(id) on delete cascade,
  worker_id bigint references public.workers(id) on delete set null,
  name text not null default '',
  date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.site_checkins enable row level security;
drop policy if exists "checkins: read org" on public.site_checkins;
create policy "checkins: read org" on public.site_checkins for select to authenticated
  using (organization_id = public.my_org());
-- Inserts happen only through the definer RPC below.

-- Public preview for the scan page (anon): which site am I signing in to?
create or replace function public.checkin_info(token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('projectName', p.name, 'orgName', o.name, 'address', p.address)
  from public.projects p left join public.organizations o on o.id = p.organization_id
  where p.checkin_token = token
$$;
grant execute on function public.checkin_info(uuid) to anon, authenticated;

-- Record a check-in. Works for an anonymous scan (name only) or a signed-in
-- tradie (linked to their worker). Idempotent per project + person + day.
create or replace function public.site_checkin(token uuid, p_name text)
returns json language plpgsql security definer set search_path = public as $fn$
declare proj record; wid bigint; nm text; existing bigint;
begin
  select * into proj from public.projects where checkin_token = token;
  if proj.id is null then raise exception 'This site sign-in code is not valid.'; end if;
  if auth.uid() is not null then
    select worker_id into wid from public.profiles where id = auth.uid();
    if wid is not null and not exists (
      select 1 from public.workers w where w.id = wid and w.organization_id = proj.organization_id
    ) then
      wid := null;
    end if;
  end if;
  select name into nm from public.workers where id = wid;
  nm := coalesce(nullif(nm, ''), nullif(trim(p_name), ''), 'Site worker');
  select id into existing from public.site_checkins
    where project_id = proj.id and date = current_date
      and ((wid is not null and worker_id = wid) or (wid is null and lower(name) = lower(nm)));
  if existing is null then
    insert into public.site_checkins (organization_id, project_id, worker_id, name)
      values (proj.organization_id, proj.id, wid, nm);
  end if;
  return json_build_object('projectName', proj.name, 'name', nm,
    'date', current_date, 'alreadyCheckedIn', existing is not null);
end $fn$;
grant execute on function public.site_checkin(uuid, text) to anon, authenticated;

select (select count(*) from information_schema.tables where table_name='site_checkins') tbl,
       (select count(*) from public.projects where checkin_token is not null) projects_with_token;

-- ============================================================================
-- Subcontractor companies (2026-07-09)
-- A subbie company (e.g. "Scope Plumbing") is now a first-class record holding
-- company-level details (ABN, contact, insurance certificates). Individual
-- workers link to it via workers.company_id and keep only personal items
-- (White Card, induction, quiz, medical, SWMS). The company's Public Liability
-- certificate is mirrored into each crew member's Insurance slot app-side.
-- Existing free-text workers.employer values are migrated below: one company
-- per distinct employer name per org (except names matching the builder's own
-- org — those are direct staff), workers linked, and the best (latest-expiry)
-- personal insurance certificate promoted to the company. workers.employer
-- stays populated (synced to the company name) for display/CSV back-compat.
-- ============================================================================
create table public.subbie_companies (
  id bigint generated always as identity primary key,
  organization_id bigint not null default public.my_org() references public.organizations(id),
  name text not null,
  abn text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.subbie_companies enable row level security;

-- Company-level evidence: Public Liability + WorkCover certificates (expiry-
-- driven, same statuses as personal docs). Files live in the same private
-- compliance-docs bucket under company/{id}/...
create table public.company_documents (
  id bigint generated always as identity primary key,
  organization_id bigint not null default public.my_org() references public.organizations(id),
  company_id bigint not null references public.subbie_companies(id) on delete cascade,
  category text not null check (category in ('public_liability','workcover')),
  file_path text not null,
  file_name text not null default '',
  expiry_date date,
  uploaded_at timestamptz not null default now(),
  unique (company_id, category)
);
alter table public.company_documents enable row level security;

alter table public.workers
  add column company_id bigint references public.subbie_companies(id) on delete set null;

-- A linked tradie may read their own company (who covers them + status);
-- builder staff manage all companies in their org.
create or replace function public.my_company_id()
returns bigint language sql stable security definer set search_path = public as $$
  select company_id from public.workers where id = public.my_worker_id()
$$;
grant execute on function public.my_company_id() to authenticated;

create policy "companies: read" on public.subbie_companies for select to authenticated
  using (organization_id = public.my_org()
    and (public.is_builder_staff() or public.my_worker_id() is null or id = public.my_company_id()));
create policy "companies: staff write" on public.subbie_companies for all to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org())
  with check (public.is_builder_staff() and organization_id = public.my_org());

create policy "company_documents: read" on public.company_documents for select to authenticated
  using (organization_id = public.my_org()
    and (public.is_builder_staff() or public.my_worker_id() is null or company_id = public.my_company_id()));
create policy "company_documents: staff write" on public.company_documents for all to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org())
  with check (public.is_builder_staff() and organization_id = public.my_org());

-- ---- Migrate existing free-text employers -> company records ----
insert into public.subbie_companies (organization_id, name)
select w.organization_id, min(trim(w.employer))
from public.workers w
join public.organizations o on o.id = w.organization_id
where trim(coalesce(w.employer,'')) <> ''
  and lower(trim(w.employer)) <> lower(trim(o.name))
group by w.organization_id, lower(trim(w.employer));

update public.workers w
set company_id = c.id, employer = c.name
from public.subbie_companies c
where c.organization_id = w.organization_id
  and lower(trim(w.employer)) = lower(trim(c.name));

-- Promote the best (latest expiry, newest upload) personal insurance
-- certificate among each company's crew to the company's Public Liability
-- slot, then retire the personal insurance rows for linked workers (their
-- insurance is company-level from now on; storage files are kept).
insert into public.company_documents
  (organization_id, company_id, category, file_path, file_name, expiry_date, uploaded_at)
select distinct on (w.company_id)
  w.organization_id, w.company_id, 'public_liability',
  d.file_path, d.file_name, d.expiry_date, d.uploaded_at
from public.compliance_documents d
join public.workers w on w.id = d.worker_id
where d.category = 'insurance' and w.company_id is not null
order by w.company_id, d.expiry_date desc nulls last, d.uploaded_at desc;

delete from public.compliance_documents d
using public.workers w
where d.worker_id = w.id and d.category = 'insurance' and w.company_id is not null;

select (select count(*) from public.subbie_companies) companies,
       (select count(*) from public.workers where company_id is not null) linked_workers,
       (select count(*) from public.company_documents) company_docs;

-- ============================================================================
-- Builder-customisable induction (2026-07-09)
-- Each project carries its builder's own induction content: site rules text,
-- an optional video link, muster point and site contact. Shape:
--   { rules, videoUrl, musterPoint, contactName, contactPhone }
-- Blank fields fall back to the generic defaults app-side (see
-- src/data/constants.js inductionDefaults) so a tradie never gets an empty
-- screen. No new RLS needed: projects are already org-scoped for reads
-- (tradies see their own builder's projects only) and staff-only for writes.
-- ============================================================================
alter table public.projects add column induction jsonb not null default '{}'::jsonb;

-- ============================================================================
-- Fitness-for-work declaration gate (2026-07-09)
-- Before a tradie can open their Site Induction they must declare, once per
-- day per project, that they are fit for work and unimpaired. Every outcome
-- (confirmed or declined) is an immutable audit_log row — insert-only, no
-- update/delete policies exist, so records can never be altered or removed.
-- If an incident is ever investigated, "was this person cleared to work that
-- day" is answerable from data.
-- Tradies cannot insert audit rows directly (staff-only insert policy), and a
-- direct insert could claim to be anyone — so declarations go through a
-- security-definer RPC that pins the record to the caller's OWN linked
-- worker. p_worker_id is honoured only for the legacy shared pilot account
-- (profile has no linked worker), same trust model as the other pilot_*
-- RPCs, and is still confined to the caller's own organisation.
-- The declaration day (p_local_date) is the tradie's LOCAL calendar date —
-- Victorian sites start early, and a UTC date would be yesterday until
-- mid-morning, causing false re-prompts around midnight.
-- ============================================================================
alter table public.audit_log drop constraint audit_log_entity_check;
alter table public.audit_log add constraint audit_log_entity_check
  check (entity in ('diary_entry','incident','fitness_declaration'));

create or replace function public.record_fitness_declaration(outcome text, p_local_date date, p_worker_id bigint default null)
returns json language plpgsql security definer set search_path = public as $fn$
declare wid bigint; w record; saved record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if outcome not in ('confirmed','declined') then raise exception 'outcome not allowed'; end if;
  wid := public.my_worker_id();
  if wid is null then wid := p_worker_id; end if;
  select * into w from public.workers where id = wid and organization_id = public.my_org();
  if w.id is null then raise exception 'no linked worker record'; end if;
  insert into public.audit_log (organization_id, entity, entity_id, action, changed_by, changes)
  values (w.organization_id, 'fitness_declaration', w.id, outcome, w.name,
          jsonb_build_object('localDate', p_local_date, 'projectId', w.project_id))
  returning * into saved;
  return json_build_object('id', saved.id, 'entity', saved.entity, 'entity_id', saved.entity_id,
    'action', saved.action, 'changed_by', saved.changed_by, 'changes', saved.changes,
    'created_at', saved.created_at);
end $fn$;
grant execute on function public.record_fitness_declaration(text, date, bigint) to authenticated;
