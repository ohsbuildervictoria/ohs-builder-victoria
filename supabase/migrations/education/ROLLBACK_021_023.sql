-- ============================================================================
-- ROLLBACK for migrations 021–023 (OHS Builder Education)
--
-- Removes every Education object and restores the pre-021 definitions of the
-- two shared functions this layer replaced (my_permissions) / widened
-- (profiles.role CHECK). Industry data is untouched. Sandbox organisations
-- (organizations.kind = 'education_sandbox') are NOT deleted automatically —
-- they are ordinary tenants with evidence in them; delete them deliberately
-- afterwards if that is the decision (see the commented block at the end).
--
-- Run only after a decision to withdraw the Education layer. Not part of the
-- normal migration sequence (this folder is outside supabase/migrations/*.sql
-- ordering on purpose).
-- ============================================================================

-- 1. my_permissions(): back to the migration 016 body.
create or replace function public.my_permissions()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'role', public.my_role(),
    'organizationId', public.my_org(),
    'projectIds', public.my_project_ids(),
    'isBuilder', public.is_builder(),
    'isHse', public.is_hse(),
    'isSupervisor', public.is_supervisor(),
    'dashboard', public.is_org_safety() or public.is_supervisor(),
    'projects', public.is_builder(),
    'compliance', public.is_org_safety(),
    'swms', public.is_org_safety(),
    'diary', public.is_org_safety() or public.is_supervisor(),
    'incidents', public.is_org_safety() or public.is_supervisor(),
    'toolbox', public.is_org_safety() or public.is_supervisor(),
    'reports', public.is_org_safety(),
    'admin', public.is_builder(),
    'policies', public.is_org_safety(),
    'welcome', public.my_org() is not null
               or public.is_org_safety() or public.is_supervisor(),
    'billing', public.is_builder(),
    'manageUsers', public.is_builder(),
    'orgSettings', public.is_builder(),
    'platform', public.is_platform_admin()
  )
$$;

-- 2. Storage policies added by 021
drop policy if exists "edu assessor read site-photos" on storage.objects;
drop policy if exists "edu assessor read project-docs" on storage.objects;
drop policy if exists "edu assessor read compliance-docs" on storage.objects;
drop policy if exists "edu-branding read" on storage.objects;
drop policy if exists "edu-branding admin insert" on storage.objects;
drop policy if exists "edu-branding admin update" on storage.objects;
drop policy if exists "edu-branding admin delete" on storage.objects;
-- The bucket itself stays unless empty; remove by hand: delete from storage.objects where bucket_id='edu-branding'; delete from storage.buckets where id='edu-branding';

-- 3. Sandbox read policies on Industry tables
do $$
declare r record;
begin
  for r in select tablename from pg_policies where schemaname = 'public' and policyname = 'edu assessor view' loop
    execute format('drop policy if exists %I on public.%I', 'edu assessor view', r.tablename);
  end loop;
end $$;

-- 4. Functions (policies referencing them are dropped with their tables below,
--    so drop tables first, then functions).
drop table if exists public.edu_assessment_results cascade;
drop table if exists public.edu_submissions cascade;
drop table if exists public.edu_student_events cascade;
drop table if exists public.edu_stage_progress cascade;
drop table if exists public.edu_criteria_mappings cascade;
alter table public.organizations drop constraint if exists organizations_edu_enrolment_fkey;
drop table if exists public.edu_enrolments cascade;
drop table if exists public.edu_cohort_assessors cascade;
drop table if exists public.edu_cohorts cascade;
drop table if exists public.edu_programs cascade;
drop table if exists public.edu_scenario_events cascade;
drop table if exists public.edu_scenario_stages cascade;
drop table if exists public.edu_scenarios cascade;
drop table if exists public.edu_unit_criteria cascade;
drop table if exists public.edu_units cascade;
drop table if exists public.edu_qualifications cascade;
drop table if exists public.edu_memberships cascade;
drop table if exists public.edu_institutions cascade;

do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and (p.proname like 'edu\_%' or p.proname in ('is_sandbox_org','touch_edu_institution')) loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end $$;

-- 5. Columns / constraint on existing tables
alter table public.organizations drop column if exists edu_enrolment_id;
alter table public.organizations drop constraint if exists organizations_kind_check;
alter table public.organizations drop column if exists kind;

-- Only safe once no profile holds an Education role:
--   update public.profiles set role = 'worker' where role in ('institution_admin','assessor');
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('builder_admin','hse_manager','site_supervisor','worker'));

-- 6. Optional: remove sandbox organisations (DESTRUCTIVE — decide explicitly)
-- delete from public.organizations where kind = 'education_sandbox';   -- cascades are NOT defined; clear child rows first.
