-- ============================================================================
-- 020 — Project Risk Register (2026-08-15)
--
-- WorkSafe-standard OHS practice expects a project-level risk register; until
-- now the only risk content lived task-level inside SWMS. One row per
-- identified hazard, with a 5x5 likelihood x consequence assessment before and
-- after controls. The rating itself (Low/Medium/High/Extreme) is derived from
-- the two numbers, so it is not stored — there is nothing to get out of sync.
--
-- Access follows the platform's existing shape:
--   read  = anyone who can see the project (org safety roles everywhere,
--           supervisors on assigned sites, a tradie on their own site)
--   write = whoever can manage site records on the project
--           (builder_admin / hse_manager everywhere, supervisors on assigned)
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.project_risks (
  id bigint generated always as identity primary key,
  organization_id bigint not null default public.my_org() references public.organizations(id),
  project_id bigint not null references public.projects(id) on delete cascade,
  hazard text not null,
  category text not null default 'General',
  likelihood int not null default 3 check (likelihood between 1 and 5),
  consequence int not null default 3 check (consequence between 1 and 5),
  controls text not null default '',
  residual_likelihood int check (residual_likelihood between 1 and 5),
  residual_consequence int check (residual_consequence between 1 and 5),
  owner_worker_id bigint references public.workers(id) on delete set null,
  status text not null default 'Open' check (status in ('Open','Controlled','Closed')),
  review_date date,
  -- Where the row came from: hand-entered, or seeded from the SWMS library
  -- (source_ref then holds the library ref, e.g. SWMS-FRAMER-01).
  source text not null default 'manual' check (source in ('manual','swms_library')),
  source_ref text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_risks_project_idx on public.project_risks (project_id);
create index if not exists project_risks_org_idx on public.project_risks (organization_id);

-- Keep updated_at honest without trusting the client.
create or replace function public.touch_project_risk()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  new.updated_at := now();
  return new;
end $fn$;

drop trigger if exists project_risks_touch on public.project_risks;
create trigger project_risks_touch
  before update on public.project_risks
  for each row execute function public.touch_project_risk();

alter table public.project_risks enable row level security;

drop policy if exists "project_risks: read" on public.project_risks;
create policy "project_risks: read" on public.project_risks
  for select using (
    organization_id = public.my_org() and public.can_read_project(project_id)
  );

drop policy if exists "project_risks: insert" on public.project_risks;
create policy "project_risks: insert" on public.project_risks
  for insert with check (
    organization_id = public.my_org() and public.can_supervise_project(project_id)
  );

drop policy if exists "project_risks: update" on public.project_risks;
create policy "project_risks: update" on public.project_risks
  for update using (
    organization_id = public.my_org() and public.can_supervise_project(project_id)
  ) with check (
    organization_id = public.my_org() and public.can_supervise_project(project_id)
  );

drop policy if exists "project_risks: delete" on public.project_risks;
create policy "project_risks: delete" on public.project_risks
  for delete using (
    organization_id = public.my_org() and public.can_supervise_project(project_id)
  );

-- Sanity readout when run in the SQL editor.
select
  (select count(*) from pg_policies where tablename = 'project_risks') as policies,
  (select relrowsecurity from pg_class where relname = 'project_risks') as rls_enabled;
