-- ============================================================================
-- 021 — OHS BUILDER EDUCATION: FOUNDATION (2026-08-22)
--
-- Adds the Education product layer (institutions, programs, cohorts,
-- assessors, students, scenarios, submissions, assessment) ON TOP of the
-- existing Industry tenancy. Nothing about Industry access changes:
--
--   * A student's "simulated builder workspace" is an ordinary organisations
--     row (kind = 'education_sandbox') in which the student is builder_admin.
--     Every existing RLS policy, helper, trigger and evidence RPC applies to it
--     unchanged, and Student A structurally cannot read Student B (different
--     my_org()).
--   * Institution admins and assessors hold NO organisation. Their
--     profiles.role is a new value no Industry predicate recognises, so every
--     org-scoped Industry policy evaluates false for them.
--   * Assessors get READ-ONLY access to the sandboxes of cohorts they are
--     assigned to, via one ADDITIONAL select policy per table that calls
--     public.edu_can_view_org(). Permissive policies OR together, so this can
--     only widen access for Education assessors — never narrow or change it
--     for anyone else — and the predicate is false for every account without
--     an edu_memberships row.
--
-- Additive and idempotent. Rollback: supabase/migrations/education/ROLLBACK_021_023.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Existing tables: two small, defaulted additions
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists kind text not null default 'industry';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_kind_check') then
    alter table public.organizations
      add constraint organizations_kind_check check (kind in ('industry','education_sandbox'));
  end if;
end $$;
alter table public.organizations add column if not exists edu_enrolment_id bigint;

-- Education roles. set_user_role() (migration 009) still accepts only the four
-- Industry roles, so Industry admins cannot hand these out; they are set only
-- by edu_accept_invite() in migration 022.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('builder_admin','hse_manager','site_supervisor','worker','institution_admin','assessor'));

-- ---------------------------------------------------------------------------
-- 1. Institutions and memberships (the Education identity layer)
-- ---------------------------------------------------------------------------
create table if not exists public.edu_institutions (
  id bigint generated always as identity primary key,
  name text not null,
  legal_name text not null default '',
  rto_number text not null default '',
  website text not null default '',
  address text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  support_email text not null default '',
  department text not null default '',
  campus text not null default '',
  logo_url text not null default '',
  primary_colour text not null default '#1e3a8a',
  secondary_colour text not null default '#fbbf24',
  status text not null default 'active' check (status in ('active','suspended')),
  is_demo boolean not null default false,
  onboarding jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.edu_memberships (
  id bigint generated always as identity primary key,
  institution_id bigint not null references public.edu_institutions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  edu_role text not null check (edu_role in ('institution_admin','assessor','student')),
  name text not null default '',
  email text not null,
  invite_token uuid default gen_random_uuid(),
  status text not null default 'invited' check (status in ('invited','active','deactivated')),
  accepted_at timestamptz,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  unique (institution_id, email, edu_role)
);
create index if not exists edu_memberships_user_idx on public.edu_memberships (user_id);
create index if not exists edu_memberships_inst_idx on public.edu_memberships (institution_id);
create unique index if not exists edu_memberships_token_idx on public.edu_memberships (invite_token) where invite_token is not null;

-- ---------------------------------------------------------------------------
-- 2. Curriculum: qualifications, units, criteria (library rows have
--    institution_id null; an institution may add its own)
-- ---------------------------------------------------------------------------
create table if not exists public.edu_qualifications (
  id bigint generated always as identity primary key,
  institution_id bigint references public.edu_institutions(id) on delete cascade,
  code text not null,
  title text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists edu_qualifications_code_idx
  on public.edu_qualifications (coalesce(institution_id, 0), code);

create table if not exists public.edu_units (
  id bigint generated always as identity primary key,
  institution_id bigint references public.edu_institutions(id) on delete cascade,
  qualification_id bigint references public.edu_qualifications(id) on delete set null,
  code text not null,
  title text not null,
  release text not null default '',
  source_note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists edu_units_code_idx
  on public.edu_units (coalesce(institution_id, 0), code);

create table if not exists public.edu_unit_criteria (
  id bigint generated always as identity primary key,
  unit_id bigint not null references public.edu_units(id) on delete cascade,
  code text not null,
  element text not null default '',
  text text not null,
  evidence_hint text not null default '',
  position int not null default 0,
  unique (unit_id, code)
);

-- ---------------------------------------------------------------------------
-- 3. Scenarios: the reusable simulation content
-- ---------------------------------------------------------------------------
create table if not exists public.edu_scenarios (
  id bigint generated always as identity primary key,
  institution_id bigint references public.edu_institutions(id) on delete cascade,
  code text not null,
  title text not null,
  summary text not null default '',
  description text not null default '',
  project_brief jsonb not null default '{}'::jsonb,
  student_role text not null default '',
  supporting_docs jsonb not null default '[]'::jsonb,
  assessor_notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists edu_scenarios_code_idx
  on public.edu_scenarios (coalesce(institution_id, 0), code);

create table if not exists public.edu_scenario_stages (
  id bigint generated always as identity primary key,
  scenario_id bigint not null references public.edu_scenarios(id) on delete cascade,
  position int not null default 0,
  code text not null,
  title text not null,
  objective text not null default '',
  why_it_matters text not null default '',
  instructions text not null default '',
  feature_route text not null default '',
  feature_label text not null default '',
  evidence_label text not null default '',
  evidence_rule jsonb not null default '{}'::jsonb,
  assessor_notes text not null default '',
  unique (scenario_id, code)
);

create table if not exists public.edu_scenario_events (
  id bigint generated always as identity primary key,
  scenario_id bigint not null references public.edu_scenarios(id) on delete cascade,
  stage_id bigint references public.edu_scenario_stages(id) on delete set null,
  position int not null default 0,
  code text not null,
  title text not null,
  body text not null default '',
  trigger jsonb not null default '{}'::jsonb,
  response_hint text not null default '',
  unique (scenario_id, code)
);

-- ---------------------------------------------------------------------------
-- 4. Programs, cohorts, assessors, enrolments
-- ---------------------------------------------------------------------------
create table if not exists public.edu_programs (
  id bigint generated always as identity primary key,
  institution_id bigint not null references public.edu_institutions(id) on delete cascade,
  name text not null,
  qualification_id bigint references public.edu_qualifications(id) on delete set null,
  unit_id bigint references public.edu_units(id) on delete set null,
  intake text not null default '',
  campus text not null default '',
  department text not null default '',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);
create index if not exists edu_programs_inst_idx on public.edu_programs (institution_id);

create table if not exists public.edu_cohorts (
  id bigint generated always as identity primary key,
  institution_id bigint not null references public.edu_institutions(id) on delete cascade,
  program_id bigint not null references public.edu_programs(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  campus text not null default '',
  expected_students int not null default 0,
  scenario_id bigint references public.edu_scenarios(id) on delete set null,
  status text not null default 'planned' check (status in ('planned','active','closed')),
  created_at timestamptz not null default now()
);
create index if not exists edu_cohorts_inst_idx on public.edu_cohorts (institution_id);

create table if not exists public.edu_cohort_assessors (
  cohort_id bigint not null references public.edu_cohorts(id) on delete cascade,
  membership_id bigint not null references public.edu_memberships(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (cohort_id, membership_id)
);
create index if not exists edu_cohort_assessors_member_idx on public.edu_cohort_assessors (membership_id);

create table if not exists public.edu_enrolments (
  id bigint generated always as identity primary key,
  institution_id bigint not null references public.edu_institutions(id) on delete cascade,
  cohort_id bigint not null references public.edu_cohorts(id) on delete cascade,
  membership_id bigint not null references public.edu_memberships(id) on delete cascade,
  student_name text not null default '',
  student_email text not null default '',
  status text not null default 'invited'
    check (status in ('invited','not_started','in_progress','ready_for_assessment','action_required','completed','withdrawn')),
  sandbox_org_id bigint references public.organizations(id) on delete set null,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cohort_id, membership_id)
);
create index if not exists edu_enrolments_cohort_idx on public.edu_enrolments (cohort_id);
create index if not exists edu_enrolments_sandbox_idx on public.edu_enrolments (sandbox_org_id);
create index if not exists edu_enrolments_member_idx on public.edu_enrolments (membership_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_edu_enrolment_fkey') then
    alter table public.organizations
      add constraint organizations_edu_enrolment_fkey
      foreign key (edu_enrolment_id) references public.edu_enrolments(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Assessment mapping, progress, events, submissions, results
-- ---------------------------------------------------------------------------
-- Which scenario stage evidences which unit criterion. institution_id null =
-- the indicative default shipped with the scenario; an institution's own rows
-- (same unit + scenario) REPLACE the default for that institution. Always
-- presented as institution / RTO controlled.
create table if not exists public.edu_criteria_mappings (
  id bigint generated always as identity primary key,
  institution_id bigint references public.edu_institutions(id) on delete cascade,
  unit_id bigint not null references public.edu_units(id) on delete cascade,
  scenario_id bigint not null references public.edu_scenarios(id) on delete cascade,
  criterion_id bigint not null references public.edu_unit_criteria(id) on delete cascade,
  stage_id bigint not null references public.edu_scenario_stages(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists edu_criteria_mappings_uidx
  on public.edu_criteria_mappings (coalesce(institution_id, 0), unit_id, scenario_id, criterion_id, stage_id);

-- Cache of the evidence evaluator's latest answer per stage. Written only by
-- edu_evaluate_progress(); a status is a consequence of the records, never an
-- input anyone can click.
create table if not exists public.edu_stage_progress (
  enrolment_id bigint not null references public.edu_enrolments(id) on delete cascade,
  stage_id bigint not null references public.edu_scenario_stages(id) on delete cascade,
  complete boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  first_completed_at timestamptz,
  evaluated_at timestamptz not null default now(),
  primary key (enrolment_id, stage_id)
);

create table if not exists public.edu_student_events (
  id bigint generated always as identity primary key,
  enrolment_id bigint not null references public.edu_enrolments(id) on delete cascade,
  event_id bigint not null references public.edu_scenario_events(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  response jsonb not null default '{}'::jsonb,
  unique (enrolment_id, event_id)
);

-- A submission is an immutable, versioned snapshot. No update/delete policies:
-- rows are created by edu_submit_for_assessment() and their status advanced
-- only by the assessor RPCs.
create table if not exists public.edu_submissions (
  id bigint generated always as identity primary key,
  enrolment_id bigint not null references public.edu_enrolments(id) on delete restrict,
  institution_id bigint not null references public.edu_institutions(id) on delete restrict,
  cohort_id bigint not null references public.edu_cohorts(id) on delete restrict,
  version int not null,
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz not null default now(),
  student_note text not null default '',
  snapshot jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  status text not null default 'submitted'
    check (status in ('submitted','under_review','returned_nys','completed')),
  outcome_comment text not null default '',
  decided_by uuid references auth.users(id),
  decided_by_name text not null default '',
  decided_at timestamptz,
  unique (enrolment_id, version)
);
create index if not exists edu_submissions_enrolment_idx on public.edu_submissions (enrolment_id);

create table if not exists public.edu_assessment_results (
  id bigint generated always as identity primary key,
  submission_id bigint not null references public.edu_submissions(id) on delete restrict,
  criterion_id bigint not null references public.edu_unit_criteria(id) on delete restrict,
  result text not null check (result in ('satisfactory','not_yet_satisfactory')),
  comment text not null default '',
  assessed_by uuid references auth.users(id),
  assessed_by_name text not null default '',
  assessed_at timestamptz not null default now(),
  unique (submission_id, criterion_id)
);

-- ---------------------------------------------------------------------------
-- 6. Identity helpers — SECURITY DEFINER, fail closed, cheap for non-Education
--    accounts (one indexed lookup on edu_memberships.user_id).
-- ---------------------------------------------------------------------------
create or replace function public.edu_has_membership()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_account()
     and exists (select 1 from public.edu_memberships m
                  where m.user_id = auth.uid() and m.status = 'active')
$$;

create or replace function public.edu_is_admin_of(p_inst bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_account()
     and exists (select 1 from public.edu_memberships m
                  where m.user_id = auth.uid() and m.status = 'active'
                    and m.edu_role = 'institution_admin' and m.institution_id = p_inst)
$$;

create or replace function public.edu_is_assessor_of(p_inst bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_account()
     and exists (select 1 from public.edu_memberships m
                  where m.user_id = auth.uid() and m.status = 'active'
                    and m.edu_role = 'assessor' and m.institution_id = p_inst)
$$;

create or replace function public.edu_is_member_of(p_inst bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_account()
     and exists (select 1 from public.edu_memberships m
                  where m.user_id = auth.uid() and m.status = 'active'
                    and m.institution_id = p_inst)
$$;

-- Cohorts the caller assesses (via edu_cohort_assessors). Empty for everyone else.
create or replace function public.edu_assessor_cohort_ids()
returns bigint[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(ca.cohort_id), '{}')
    from public.edu_cohort_assessors ca
    join public.edu_memberships m on m.id = ca.membership_id
   where m.user_id = auth.uid() and m.status = 'active' and m.edu_role = 'assessor'
     and public.is_active_account()
$$;

-- The caller's own (single, Phase 1) enrolment as a student.
create or replace function public.edu_my_enrolment_id()
returns bigint language sql stable security definer set search_path = public as $$
  select e.id
    from public.edu_enrolments e
    join public.edu_memberships m on m.id = e.membership_id
   where m.user_id = auth.uid() and m.status = 'active' and m.edu_role = 'student'
     and e.status <> 'withdrawn' and public.is_active_account()
   order by e.created_at desc
   limit 1
$$;

create or replace function public.edu_can_manage_cohort(p_cohort bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.edu_cohorts c
                  where c.id = p_cohort and public.edu_is_admin_of(c.institution_id))
$$;

-- May the caller SEE this enrolment (student themself, assessor of its cohort,
-- admin of its institution)?
create or replace function public.edu_can_view_enrolment(p_enr bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare e record;
begin
  if auth.uid() is null or p_enr is null then return false; end if;
  select id, cohort_id, institution_id, membership_id into e from public.edu_enrolments where id = p_enr;
  if not found then return false; end if;
  if p_enr = public.edu_my_enrolment_id() then return true; end if;
  if e.cohort_id = any(public.edu_assessor_cohort_ids()) then return true; end if;
  return public.edu_is_admin_of(e.institution_id);
end $fn$;

-- May the caller READ a sandbox organisation's records? Only an assessor
-- assigned to the cohort the sandbox's enrolment belongs to. Deliberately
-- narrow: Industry accounts have no memberships and exit at the first check.
create or replace function public.edu_can_view_org(p_org bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare v_cohorts bigint[];
begin
  if p_org is null or auth.uid() is null then return false; end if;
  if not exists (select 1 from public.edu_memberships m
                  where m.user_id = auth.uid() and m.status = 'active' and m.edu_role = 'assessor') then
    return false;
  end if;
  if not public.is_active_account() then return false; end if;
  v_cohorts := public.edu_assessor_cohort_ids();
  if coalesce(array_length(v_cohorts, 1), 0) = 0 then return false; end if;
  return exists (
    select 1 from public.edu_enrolments e
      join public.organizations o on o.id = e.sandbox_org_id
     where e.sandbox_org_id = p_org
       and o.kind = 'education_sandbox'
       and e.cohort_id = any(v_cohorts)
  );
end $fn$;

grant execute on function public.edu_has_membership(), public.edu_is_admin_of(bigint),
  public.edu_is_assessor_of(bigint), public.edu_is_member_of(bigint), public.edu_assessor_cohort_ids(),
  public.edu_my_enrolment_id(), public.edu_can_manage_cohort(bigint), public.edu_can_view_enrolment(bigint),
  public.edu_can_view_org(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RLS on the Education tables
-- ---------------------------------------------------------------------------
alter table public.edu_institutions enable row level security;
alter table public.edu_memberships enable row level security;
alter table public.edu_qualifications enable row level security;
alter table public.edu_units enable row level security;
alter table public.edu_unit_criteria enable row level security;
alter table public.edu_scenarios enable row level security;
alter table public.edu_scenario_stages enable row level security;
alter table public.edu_scenario_events enable row level security;
alter table public.edu_programs enable row level security;
alter table public.edu_cohorts enable row level security;
alter table public.edu_cohort_assessors enable row level security;
alter table public.edu_enrolments enable row level security;
alter table public.edu_criteria_mappings enable row level security;
alter table public.edu_stage_progress enable row level security;
alter table public.edu_student_events enable row level security;
alter table public.edu_submissions enable row level security;
alter table public.edu_assessment_results enable row level security;

-- institutions: any active member reads their own institution; admins update
-- the non-privileged fields; platform admin reads all (writes via RPC).
drop policy if exists "edu_inst read" on public.edu_institutions;
create policy "edu_inst read" on public.edu_institutions for select to authenticated
  using (public.edu_is_member_of(id) or public.is_platform_admin());
drop policy if exists "edu_inst admin update" on public.edu_institutions;
create policy "edu_inst admin update" on public.edu_institutions for update to authenticated
  using (public.edu_is_admin_of(id)) with check (public.edu_is_admin_of(id));
-- Inserts only via edu_create_institution() (platform admin). No delete.

-- memberships: own row; institution admins manage their institution's rows;
-- assessors read the student memberships of their cohorts (names for boards).
drop policy if exists "edu_mem read" on public.edu_memberships;
create policy "edu_mem read" on public.edu_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.edu_is_admin_of(institution_id)
    or (public.edu_is_assessor_of(institution_id) and (
          edu_role = 'assessor'
          or exists (select 1 from public.edu_enrolments e
                      where e.membership_id = edu_memberships.id
                        and e.cohort_id = any(public.edu_assessor_cohort_ids()))))
    or public.is_platform_admin()
  );
drop policy if exists "edu_mem admin write" on public.edu_memberships;
create policy "edu_mem admin write" on public.edu_memberships for update to authenticated
  using (public.edu_is_admin_of(institution_id))
  with check (public.edu_is_admin_of(institution_id));
-- Inserts go through RPCs so tokens/roles are always set server-side.
drop policy if exists "edu_mem admin delete" on public.edu_memberships;
create policy "edu_mem admin delete" on public.edu_memberships for delete to authenticated
  using (public.edu_is_admin_of(institution_id) and status = 'invited');

-- curriculum + scenarios: library rows readable by every Education member;
-- an institution's own rows by its members; writes by institution admins on
-- their own rows. Platform admin writes library rows.
drop policy if exists "edu_qual read" on public.edu_qualifications;
create policy "edu_qual read" on public.edu_qualifications for select to authenticated
  using ((institution_id is null and public.edu_has_membership()) or public.edu_is_member_of(institution_id) or public.is_platform_admin());
drop policy if exists "edu_qual write" on public.edu_qualifications;
create policy "edu_qual write" on public.edu_qualifications for all to authenticated
  using ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()))
  with check ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()));

drop policy if exists "edu_unit read" on public.edu_units;
create policy "edu_unit read" on public.edu_units for select to authenticated
  using ((institution_id is null and public.edu_has_membership()) or public.edu_is_member_of(institution_id) or public.is_platform_admin());
drop policy if exists "edu_unit write" on public.edu_units;
create policy "edu_unit write" on public.edu_units for all to authenticated
  using ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()))
  with check ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()));

drop policy if exists "edu_crit read" on public.edu_unit_criteria;
create policy "edu_crit read" on public.edu_unit_criteria for select to authenticated
  using (exists (select 1 from public.edu_units u where u.id = unit_id
                   and ((u.institution_id is null and public.edu_has_membership()) or public.edu_is_member_of(u.institution_id) or public.is_platform_admin())));
drop policy if exists "edu_crit write" on public.edu_unit_criteria;
create policy "edu_crit write" on public.edu_unit_criteria for all to authenticated
  using (exists (select 1 from public.edu_units u where u.id = unit_id
                   and ((u.institution_id is not null and public.edu_is_admin_of(u.institution_id)) or (u.institution_id is null and public.is_platform_admin()))))
  with check (exists (select 1 from public.edu_units u where u.id = unit_id
                   and ((u.institution_id is not null and public.edu_is_admin_of(u.institution_id)) or (u.institution_id is null and public.is_platform_admin()))));

drop policy if exists "edu_scen read" on public.edu_scenarios;
create policy "edu_scen read" on public.edu_scenarios for select to authenticated
  using ((institution_id is null and public.edu_has_membership()) or public.edu_is_member_of(institution_id) or public.is_platform_admin());
drop policy if exists "edu_scen write" on public.edu_scenarios;
create policy "edu_scen write" on public.edu_scenarios for all to authenticated
  using ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()))
  with check ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()));

drop policy if exists "edu_stage read" on public.edu_scenario_stages;
create policy "edu_stage read" on public.edu_scenario_stages for select to authenticated
  using (exists (select 1 from public.edu_scenarios s where s.id = scenario_id
                   and ((s.institution_id is null and public.edu_has_membership()) or public.edu_is_member_of(s.institution_id) or public.is_platform_admin())));
drop policy if exists "edu_stage write" on public.edu_scenario_stages;
create policy "edu_stage write" on public.edu_scenario_stages for all to authenticated
  using (exists (select 1 from public.edu_scenarios s where s.id = scenario_id
                   and ((s.institution_id is not null and public.edu_is_admin_of(s.institution_id)) or (s.institution_id is null and public.is_platform_admin()))))
  with check (exists (select 1 from public.edu_scenarios s where s.id = scenario_id
                   and ((s.institution_id is not null and public.edu_is_admin_of(s.institution_id)) or (s.institution_id is null and public.is_platform_admin()))));

drop policy if exists "edu_event read" on public.edu_scenario_events;
create policy "edu_event read" on public.edu_scenario_events for select to authenticated
  using (exists (select 1 from public.edu_scenarios s where s.id = scenario_id
                   and ((s.institution_id is null and public.edu_has_membership()) or public.edu_is_member_of(s.institution_id) or public.is_platform_admin())));
drop policy if exists "edu_event write" on public.edu_scenario_events;
create policy "edu_event write" on public.edu_scenario_events for all to authenticated
  using (exists (select 1 from public.edu_scenarios s where s.id = scenario_id
                   and ((s.institution_id is not null and public.edu_is_admin_of(s.institution_id)) or (s.institution_id is null and public.is_platform_admin()))))
  with check (exists (select 1 from public.edu_scenarios s where s.id = scenario_id
                   and ((s.institution_id is not null and public.edu_is_admin_of(s.institution_id)) or (s.institution_id is null and public.is_platform_admin()))));

drop policy if exists "edu_map read" on public.edu_criteria_mappings;
create policy "edu_map read" on public.edu_criteria_mappings for select to authenticated
  using ((institution_id is null and public.edu_has_membership()) or public.edu_is_member_of(institution_id) or public.is_platform_admin());
drop policy if exists "edu_map write" on public.edu_criteria_mappings;
create policy "edu_map write" on public.edu_criteria_mappings for all to authenticated
  using ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()))
  with check ((institution_id is not null and public.edu_is_admin_of(institution_id)) or (institution_id is null and public.is_platform_admin()));

-- programs / cohorts: institution admins CRUD; assessors read their cohorts
-- (and the program behind them); students read their own cohort + program.
drop policy if exists "edu_prog read" on public.edu_programs;
create policy "edu_prog read" on public.edu_programs for select to authenticated
  using (public.edu_is_member_of(institution_id) or public.is_platform_admin());
drop policy if exists "edu_prog admin write" on public.edu_programs;
create policy "edu_prog admin write" on public.edu_programs for all to authenticated
  using (public.edu_is_admin_of(institution_id)) with check (public.edu_is_admin_of(institution_id));

drop policy if exists "edu_cohort read" on public.edu_cohorts;
create policy "edu_cohort read" on public.edu_cohorts for select to authenticated
  using (
    public.edu_is_admin_of(institution_id)
    or id = any(public.edu_assessor_cohort_ids())
    or exists (select 1 from public.edu_enrolments e where e.cohort_id = edu_cohorts.id and e.id = public.edu_my_enrolment_id())
    or public.is_platform_admin()
  );
drop policy if exists "edu_cohort admin write" on public.edu_cohorts;
create policy "edu_cohort admin write" on public.edu_cohorts for all to authenticated
  using (public.edu_is_admin_of(institution_id)) with check (public.edu_is_admin_of(institution_id));

drop policy if exists "edu_ca read" on public.edu_cohort_assessors;
create policy "edu_ca read" on public.edu_cohort_assessors for select to authenticated
  using (public.edu_can_manage_cohort(cohort_id)
     or cohort_id = any(public.edu_assessor_cohort_ids())
     or exists (select 1 from public.edu_enrolments e where e.cohort_id = edu_cohort_assessors.cohort_id and e.id = public.edu_my_enrolment_id()));
drop policy if exists "edu_ca admin write" on public.edu_cohort_assessors;
create policy "edu_ca admin write" on public.edu_cohort_assessors for all to authenticated
  using (public.edu_can_manage_cohort(cohort_id)) with check (public.edu_can_manage_cohort(cohort_id));

drop policy if exists "edu_enr read" on public.edu_enrolments;
create policy "edu_enr read" on public.edu_enrolments for select to authenticated
  using (public.edu_can_view_enrolment(id) or public.is_platform_admin());
drop policy if exists "edu_enr admin update" on public.edu_enrolments;
create policy "edu_enr admin update" on public.edu_enrolments for update to authenticated
  using (public.edu_is_admin_of(institution_id)) with check (public.edu_is_admin_of(institution_id));
drop policy if exists "edu_enr admin delete" on public.edu_enrolments;
create policy "edu_enr admin delete" on public.edu_enrolments for delete to authenticated
  using (public.edu_is_admin_of(institution_id) and status = 'invited');
-- Inserts only via edu_add_students() so the sandbox/token logic cannot be skipped.

drop policy if exists "edu_prog_cache read" on public.edu_stage_progress;
create policy "edu_prog_cache read" on public.edu_stage_progress for select to authenticated
  using (public.edu_can_view_enrolment(enrolment_id));
-- written only by edu_evaluate_progress()

drop policy if exists "edu_sev read" on public.edu_student_events;
create policy "edu_sev read" on public.edu_student_events for select to authenticated
  using (public.edu_can_view_enrolment(enrolment_id));
-- written only by edu_acknowledge_event()

drop policy if exists "edu_sub read" on public.edu_submissions;
create policy "edu_sub read" on public.edu_submissions for select to authenticated
  using (public.edu_can_view_enrolment(enrolment_id));
-- insert/status changes only via RPCs; no update/delete policy at all.

drop policy if exists "edu_res read" on public.edu_assessment_results;
create policy "edu_res read" on public.edu_assessment_results for select to authenticated
  using (exists (select 1 from public.edu_submissions s where s.id = submission_id
                   and public.edu_can_view_enrolment(s.enrolment_id)));
-- written only by edu_record_result()

-- ---------------------------------------------------------------------------
-- 8. Assessor read-only access to sandbox records — ONE additional select
--    policy per table. Nothing existing is dropped or altered.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'projects','workers','swms_templates','swms_signatures','swms_revisions','incidents',
    'corrective_actions','diary_entries','toolbox_meetings','toolbox_signatures',
    'induction_completions','policies','compliance_documents','company_documents',
    'subbie_companies','project_risks','project_documents','record_photos',
    'site_checkins','quiz_attempts','audit_log'
  ]
  loop
    if exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = t and column_name = 'organization_id') then
      execute format('drop policy if exists %I on public.%I', 'edu assessor view', t);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.edu_can_view_org(organization_id))',
        'edu assessor view', t);
    end if;
  end loop;
end $$;

drop policy if exists "edu assessor view" on public.organizations;
create policy "edu assessor view" on public.organizations for select to authenticated
  using (kind = 'education_sandbox' and public.edu_can_view_org(id));

-- corrective_actions carry organization_id since 001's tenancy block, but the
-- 009 read policy goes through the incident; the loop above added the direct
-- one. Nothing else to do.

-- ---------------------------------------------------------------------------
-- 9. Storage: assessors read (never write) the evidence files of a sandbox
--    they may view. Paths follow the existing conventions.
-- ---------------------------------------------------------------------------
create or replace function public.edu_can_view_storage(p_bucket text, p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare seg1 text; seg2 text; v_org bigint; v_id bigint;
begin
  if auth.uid() is null then return false; end if;
  -- Cheap exit for every non-assessor account.
  if not exists (select 1 from public.edu_memberships m
                  where m.user_id = auth.uid() and m.status = 'active' and m.edu_role = 'assessor') then
    return false;
  end if;
  seg1 := (storage.foldername(p_name))[1];
  seg2 := (storage.foldername(p_name))[2];
  if p_bucket = 'site-photos' then
    v_id := public.path_id(seg2);
    if seg1 = 'incident' then
      select organization_id into v_org from public.incidents where id = v_id;
    elsif seg1 = 'diary_entry' then
      select organization_id into v_org from public.diary_entries where id = v_id;
    end if;
  elsif p_bucket = 'project-docs' then
    select organization_id into v_org from public.projects where id = public.path_id(seg1);
  elsif p_bucket = 'compliance-docs' then
    if seg1 = 'company' then
      select organization_id into v_org from public.subbie_companies where id = public.path_id(seg2);
    else
      select organization_id into v_org from public.workers where id = public.path_id(seg1);
    end if;
  else
    return false;
  end if;
  return v_org is not null and public.edu_can_view_org(v_org);
end $fn$;
grant execute on function public.edu_can_view_storage(text, text) to authenticated;

drop policy if exists "edu assessor read site-photos" on storage.objects;
create policy "edu assessor read site-photos" on storage.objects for select to authenticated
  using (bucket_id = 'site-photos' and public.edu_can_view_storage(bucket_id, name));
drop policy if exists "edu assessor read project-docs" on storage.objects;
create policy "edu assessor read project-docs" on storage.objects for select to authenticated
  using (bucket_id = 'project-docs' and public.edu_can_view_storage(bucket_id, name));
drop policy if exists "edu assessor read compliance-docs" on storage.objects;
create policy "edu assessor read compliance-docs" on storage.objects for select to authenticated
  using (bucket_id = 'compliance-docs' and public.edu_can_view_storage(bucket_id, name));

-- Institution branding: public bucket (a logo on a PDF needs a plain URL),
-- select for authenticated only (no anonymous listing), writes by the
-- institution's admins under {institution_id}/...
insert into storage.buckets (id, name, public)
values ('edu-branding', 'edu-branding', true)
on conflict (id) do update set public = true;

drop policy if exists "edu-branding read" on storage.objects;
create policy "edu-branding read" on storage.objects for select to authenticated
  using (bucket_id = 'edu-branding');
drop policy if exists "edu-branding admin insert" on storage.objects;
create policy "edu-branding admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'edu-branding' and public.edu_is_admin_of(public.path_id((storage.foldername(name))[1])));
drop policy if exists "edu-branding admin update" on storage.objects;
create policy "edu-branding admin update" on storage.objects for update to authenticated
  using (bucket_id = 'edu-branding' and public.edu_is_admin_of(public.path_id((storage.foldername(name))[1])))
  with check (bucket_id = 'edu-branding' and public.edu_is_admin_of(public.path_id((storage.foldername(name))[1])));
drop policy if exists "edu-branding admin delete" on storage.objects;
create policy "edu-branding admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'edu-branding' and public.edu_is_admin_of(public.path_id((storage.foldername(name))[1])));

-- ---------------------------------------------------------------------------
-- 10. Audit: assessment decisions and submissions join the security audit.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  -- edu_submissions is deliberately absent: its snapshot column is large and
  -- the submit/finalise RPCs write explicit audit rows instead.
  foreach t in array array['edu_institutions','edu_memberships','edu_enrolments','edu_assessment_results','edu_cohorts','edu_programs']
  loop
    execute format('drop trigger if exists %I on public.%I', 'zz_audit_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row_change()',
      'zz_audit_' || t, t);
  end loop;
end $$;

-- Keep institutions.updated_at honest.
create or replace function public.touch_edu_institution()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin new.updated_at := now(); return new; end $fn$;
drop trigger if exists edu_institutions_touch on public.edu_institutions;
create trigger edu_institutions_touch before update on public.edu_institutions
  for each row execute function public.touch_edu_institution();

-- Institution admins may edit profile/branding fields but never the
-- platform-controlled ones (status, is_demo, created_by).
revoke update on public.edu_institutions from authenticated;
grant update (name, legal_name, rto_number, website, address, contact_name, contact_email,
              support_email, department, campus, logo_url, primary_colour, secondary_colour, onboarding)
  on public.edu_institutions to authenticated;

-- Memberships: admins may rename/deactivate; never retarget user_id/role/token.
revoke update on public.edu_memberships from authenticated;
grant update (name, status) on public.edu_memberships to authenticated;

-- Enrolments: admins may withdraw / rename; never move a sandbox or status forwards.
revoke update on public.edu_enrolments from authenticated;
grant update (student_name, student_email) on public.edu_enrolments to authenticated;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_tables where schemaname = 'public' and tablename like 'edu\_%')       as edu_tables,
  (select count(*) from pg_policies where schemaname = 'public' and policyname = 'edu assessor view') as sandbox_view_policies,
  (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'edu%')       as storage_policies,
  (select count(*) from pg_proc where proname like 'edu\_%')                                         as edu_functions,
  (select count(*) from storage.buckets where id = 'edu-branding')                                  as branding_bucket,
  (select count(*) from pg_constraint where conname = 'profiles_role_check'
     and pg_get_constraintdef(oid) like '%institution_admin%')                                      as role_check_widened;
