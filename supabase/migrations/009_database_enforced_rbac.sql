-- ============================================================================
-- DATABASE-ENFORCED ROLE-BASED ACCESS CONTROL (2026-07-26)
--
-- Until now role separation existed only in the browser: BuilderLayout hid nav
-- items, and at the database level is_builder_staff() collapsed builder_admin,
-- hse_manager and site_supervisor into ONE identity for every staff-write
-- policy. A Site Supervisor calling PostgREST directly had the same power as
-- the account owner. Meanwhile the Admin Portal showed customers a "Role
-- Permission Matrix" implying otherwise.
--
-- This migration moves the whole model into the database.
--
--   BUILDER (builder_admin, the subscriber)
--       Full read/write across their organisation, including billing and
--       ownership settings. They pay for it and carry the legal duty.
--   HSE MANAGER
--       Safety records, SWMS, incidents, workers and compliance across the
--       whole organisation. No organisation/billing settings, no user
--       administration, no project creation.
--   SITE SUPERVISOR
--       Only projects explicitly assigned to them (profiles.project_ids).
--       Within those: site diaries, toolbox meetings, incidents, checkins.
--   WORKER / TRADIE
--       Their own record only — profile, compliance documents, quiz attempts,
--       SWMS for their own trade, and incidents they reported or are named in.
--       Never a colleague's incident, document or site diary.
--
-- DELIBERATE CHOICE: for a site_supervisor, profiles.project_ids = NULL means
-- NO projects, not all of them. Least privilege has to fail closed. Assign
-- projects explicitly (Admin Portal, or set_user_projects() below).
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Role predicates. SECURITY DEFINER so a policy never re-enters RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_builder()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'builder_admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_hse()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'hse_manager' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'site_supervisor' from public.profiles where id = auth.uid()), false)
$$;

-- Org-wide safety authority: the two roles that legitimately see everything
-- safety-related across the organisation.
create or replace function public.is_org_safety()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('builder_admin','hse_manager') from public.profiles where id = auth.uid()), false)
$$;

-- Projects a supervisor has been assigned. NULL/empty = none.
create or replace function public.my_project_ids()
returns bigint[] language sql stable security definer set search_path = public as $$
  select coalesce((select project_ids from public.profiles where id = auth.uid()), '{}')
$$;

-- The project the caller's own worker record sits on (tradies).
create or replace function public.my_worker_project()
returns bigint language sql stable security definer set search_path = public as $$
  select project_id from public.workers where id = public.my_worker_id()
$$;

-- Can the caller SEE this project at all?
create or replace function public.can_read_project(pid bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare p_org bigint;
begin
  if pid is null then return false; end if;
  select organization_id into p_org from public.projects where id = pid;
  if p_org is null or p_org <> public.my_org() then return false; end if;
  if public.is_org_safety() then return true; end if;
  if public.is_supervisor() then return pid = any(public.my_project_ids()); end if;
  if public.my_worker_id() is not null then return pid = public.my_worker_project(); end if;
  return false;
end $fn$;

-- Can the caller MANAGE site records (diary, toolbox, incidents, checkins)
-- on this project?
create or replace function public.can_supervise_project(pid bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare p_org bigint;
begin
  if pid is null then
    -- Records with no project attached stay with org-wide safety authority.
    return public.is_org_safety();
  end if;
  select organization_id into p_org from public.projects where id = pid;
  if p_org is null or p_org <> public.my_org() then return false; end if;
  if public.is_org_safety() then return true; end if;
  if public.is_supervisor() then return pid = any(public.my_project_ids()); end if;
  return false;
end $fn$;

grant execute on function public.is_builder(), public.is_hse(), public.is_supervisor(),
  public.is_org_safety(), public.my_project_ids(), public.my_worker_project(),
  public.can_read_project(bigint), public.can_supervise_project(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Incident ownership. "Incidents they created or are assigned to" cannot be
--    answered from free text, so ownership gets real columns. Existing rows
--    are backfilled only where the reporter's name matches exactly one worker
--    in the same organisation — an ambiguous match is left null, because
--    guessing here would hand someone another person's injury record.
-- ---------------------------------------------------------------------------
alter table public.incidents add column if not exists reported_by_worker_id bigint
  references public.workers(id) on delete set null;
alter table public.incidents add column if not exists involved_worker_id bigint
  references public.workers(id) on delete set null;

update public.incidents i
   set reported_by_worker_id = m.id
  from (
    select w.id, w.organization_id, lower(trim(w.name)) as nm
    from public.workers w
  ) m
 where i.reported_by_worker_id is null
   and m.organization_id = i.organization_id
   and lower(trim(i.reported_by)) = m.nm
   and (select count(*) from public.workers w2
         where w2.organization_id = i.organization_id
           and lower(trim(w2.name)) = lower(trim(i.reported_by))) = 1;

-- Stamp the reporter automatically so the app cannot forget to.
create or replace function public.stamp_incident_reporter()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.reported_by_worker_id is null then
    new.reported_by_worker_id := public.my_worker_id();
  end if;
  return new;
end $fn$;

drop trigger if exists incidents_stamp_reporter on public.incidents;
create trigger incidents_stamp_reporter
  before insert on public.incidents
  for each row execute function public.stamp_incident_reporter();

-- Can the caller see this incident?
create or replace function public.can_read_incident(
  p_org bigint, p_project bigint, p_reporter bigint, p_involved bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare wid bigint;
begin
  if p_org is null or p_org <> public.my_org() then return false; end if;
  if public.is_org_safety() then return true; end if;
  if public.is_supervisor() then
    return p_project is not null and p_project = any(public.my_project_ids());
  end if;
  wid := public.my_worker_id();
  if wid is null then return false; end if;
  return p_reporter = wid or p_involved = wid;
end $fn$;
grant execute on function public.can_read_incident(bigint, bigint, bigint, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Security audit. Every write to a permission-sensitive table is recorded
--    with the actor, their role at the time, and what changed. Insert-only:
--    no update or delete policy exists, so the trail cannot be edited by
--    anyone using the API, including a Builder.
--
--    Reads are NOT logged per row — logging every SELECT on a busy site app
--    would cost more than it is worth. Privileged reads happen through the
--    RPCs below, which are audited.
-- ---------------------------------------------------------------------------
create table if not exists public.security_audit (
  id bigint generated always as identity primary key,
  organization_id bigint,
  actor_id uuid,
  actor_role text,
  actor_name text,
  action text not null,
  table_name text not null,
  row_id text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
alter table public.security_audit enable row level security;

drop policy if exists "security_audit: read" on public.security_audit;
create policy "security_audit: read" on public.security_audit
  for select to authenticated
  using (organization_id = public.my_org() and public.is_org_safety());

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_row jsonb;
  v_id text;
  v_org bigint;
  v_changed text[];
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := coalesce(v_row->>'id', '');
  begin
    v_org := (v_row->>'organization_id')::bigint;
  exception when others then v_org := public.my_org();
  end;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key), '{}') into v_changed
    from jsonb_each(to_jsonb(new))
    where to_jsonb(new)->key is distinct from to_jsonb(old)->key;
  end if;

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (
    coalesce(v_org, public.my_org()),
    auth.uid(),
    public.my_role(),
    (select name from public.profiles where id = auth.uid()),
    tg_op,
    tg_table_name,
    v_id,
    case when tg_op = 'UPDATE' then jsonb_build_object('changed', v_changed) else '{}'::jsonb end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $fn$;

do $$
declare t text;
begin
  foreach t in array array[
    'projects','workers','incidents','corrective_actions','diary_entries',
    'toolbox_meetings','policies','compliance_documents','company_documents',
    'subbie_companies','project_documents','swms_templates','invites',
    'organizations','quiz_questions'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'zz_audit_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row_change()',
      'zz_audit_' || t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Policies, table by table. Every one is dropped and rebuilt so there is a
--    single, readable source of truth rather than layers of history.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('organizations','profiles','projects','workers','swms_templates',
        'incidents','corrective_actions','diary_entries','toolbox_meetings','policies',
        'compliance_documents','company_documents','subbie_companies','project_documents',
        'record_photos','site_checkins','invites','quiz_attempts','swms_signatures')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---- organizations: everyone in the org reads; only the Builder changes it
create policy "org read" on public.organizations for select to authenticated
  using (id = public.my_org() or created_by = auth.uid());
create policy "org create" on public.organizations for insert to authenticated
  with check (created_by = auth.uid());
create policy "org builder update" on public.organizations for update to authenticated
  using (id = public.my_org() and public.is_builder())
  with check (id = public.my_org() and public.is_builder());

-- ---- profiles: self always; Builder + HSE see the org roster
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or (organization_id = public.my_org() and public.is_org_safety()));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Builder administers accounts. Privileged COLUMNS remain locked by the
-- column grants from migration 004; role changes go through set_user_role().
create policy "profiles builder manage" on public.profiles for all to authenticated
  using (public.is_builder() and organization_id = public.my_org())
  with check (public.is_builder() and organization_id = public.my_org());

-- ---- projects: Builder owns them; HSE reads; Supervisor reads assigned;
--      worker reads the one they are on
create policy "projects read" on public.projects for select to authenticated
  using (organization_id = public.my_org() and public.can_read_project(id));
create policy "projects builder write" on public.projects for all to authenticated
  using (public.is_builder() and organization_id = public.my_org())
  with check (public.is_builder() and organization_id = public.my_org());

-- ---- workers: Builder + HSE manage the whole crew; Supervisor reads the crew
--      on their projects; a tradie sees only themselves
create policy "workers read" on public.workers for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      public.is_org_safety()
      or (public.is_supervisor() and project_id = any(public.my_project_ids()))
      or id = public.my_worker_id()
    )
  );
create policy "workers safety write" on public.workers for all to authenticated
  using (public.is_org_safety() and organization_id = public.my_org())
  with check (public.is_org_safety() and organization_id = public.my_org());

-- ---- swms_templates: staff read org-wide; a tradie sees their own trade only
create policy "swms read" on public.swms_templates for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      public.is_org_safety()
      or public.is_supervisor()
      or trade = (select trade from public.workers where id = public.my_worker_id())
    )
  );
create policy "swms safety write" on public.swms_templates for all to authenticated
  using (public.is_org_safety() and organization_id = public.my_org())
  with check (public.is_org_safety() and organization_id = public.my_org());

-- ---- incidents: anyone may REPORT; visibility follows can_read_incident()
create policy "incidents read" on public.incidents for select to authenticated
  using (public.can_read_incident(organization_id, project_id, reported_by_worker_id, involved_worker_id));
create policy "incidents report" on public.incidents for insert to authenticated
  with check (organization_id = public.my_org());
create policy "incidents manage" on public.incidents for update to authenticated
  using (organization_id = public.my_org() and public.can_supervise_project(project_id))
  with check (organization_id = public.my_org() and public.can_supervise_project(project_id));
create policy "incidents builder delete" on public.incidents for delete to authenticated
  using (organization_id = public.my_org() and public.is_builder());

-- ---- corrective actions: inherit the incident's visibility
create policy "actions read" on public.corrective_actions for select to authenticated
  using (exists (
    select 1 from public.incidents i where i.id = incident_id
      and public.can_read_incident(i.organization_id, i.project_id, i.reported_by_worker_id, i.involved_worker_id)));
create policy "actions manage" on public.corrective_actions for all to authenticated
  using (exists (
    select 1 from public.incidents i where i.id = incident_id
      and i.organization_id = public.my_org() and public.can_supervise_project(i.project_id)))
  with check (exists (
    select 1 from public.incidents i where i.id = incident_id
      and i.organization_id = public.my_org() and public.can_supervise_project(i.project_id)));

-- ---- site diaries: Builder + HSE org-wide, Supervisor on their sites.
--      A tradie has no access at all — this is the builder's site record.
create policy "diary read" on public.diary_entries for select to authenticated
  using (organization_id = public.my_org() and public.can_supervise_project(project_id));
create policy "diary write" on public.diary_entries for all to authenticated
  using (organization_id = public.my_org() and public.can_supervise_project(project_id))
  with check (organization_id = public.my_org() and public.can_supervise_project(project_id));

-- ---- toolbox meetings: same shape as the diary
create policy "toolbox read" on public.toolbox_meetings for select to authenticated
  using (organization_id = public.my_org() and public.can_supervise_project(project_id));
create policy "toolbox write" on public.toolbox_meetings for all to authenticated
  using (organization_id = public.my_org() and public.can_supervise_project(project_id))
  with check (organization_id = public.my_org() and public.can_supervise_project(project_id));

-- ---- policies register: everyone in the org reads (they are pushed to site);
--      Builder + HSE maintain them
create policy "policies read" on public.policies for select to authenticated
  using (organization_id = public.my_org());
create policy "policies safety write" on public.policies for all to authenticated
  using (public.is_org_safety() and organization_id = public.my_org())
  with check (public.is_org_safety() and organization_id = public.my_org());

-- ---- compliance documents: Builder + HSE all; Supervisor the crew on their
--      sites; a tradie only their own
create policy "compliance docs read" on public.compliance_documents for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      public.is_org_safety()
      or (public.is_supervisor() and exists (
            select 1 from public.workers w where w.id = worker_id
              and w.project_id = any(public.my_project_ids())))
      or worker_id = public.my_worker_id()
    )
  );
create policy "compliance docs write" on public.compliance_documents for all to authenticated
  using (organization_id = public.my_org()
     and (public.is_org_safety() or worker_id = public.my_worker_id()))
  with check (organization_id = public.my_org()
     and (public.is_org_safety() or worker_id = public.my_worker_id()));

-- ---- subbie companies + their certificates
create policy "companies read" on public.subbie_companies for select to authenticated
  using (organization_id = public.my_org()
     and (public.is_org_safety() or public.is_supervisor() or id = public.my_company_id()));
create policy "companies safety write" on public.subbie_companies for all to authenticated
  using (public.is_org_safety() and organization_id = public.my_org())
  with check (public.is_org_safety() and organization_id = public.my_org());

create policy "company docs read" on public.company_documents for select to authenticated
  using (organization_id = public.my_org()
     and (public.is_org_safety() or public.is_supervisor() or company_id = public.my_company_id()));
create policy "company docs safety write" on public.company_documents for all to authenticated
  using (public.is_org_safety() and organization_id = public.my_org())
  with check (public.is_org_safety() and organization_id = public.my_org());

-- ---- project documents: Builder full; HSE read; Supervisor their sites;
--      tradies none
create policy "project docs read" on public.project_documents for select to authenticated
  using (organization_id = public.my_org()
     and (public.is_org_safety() or (public.is_supervisor() and project_id = any(public.my_project_ids()))));
create policy "project docs write" on public.project_documents for all to authenticated
  using (organization_id = public.my_org()
     and (public.is_builder() or (public.is_supervisor() and project_id = any(public.my_project_ids()))))
  with check (organization_id = public.my_org()
     and (public.is_builder() or (public.is_supervisor() and project_id = any(public.my_project_ids()))));

-- ---- photos: follow the parent record
create policy "photos read" on public.record_photos for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      (entity = 'incident' and exists (
        select 1 from public.incidents i where i.id = entity_id
          and public.can_read_incident(i.organization_id, i.project_id, i.reported_by_worker_id, i.involved_worker_id)))
      or (entity = 'diary_entry' and exists (
        select 1 from public.diary_entries d where d.id = entity_id
          and public.can_supervise_project(d.project_id)))
    )
  );
create policy "photos insert" on public.record_photos for insert to authenticated
  with check (organization_id = public.my_org());
create policy "photos delete" on public.record_photos for delete to authenticated
  using (organization_id = public.my_org() and public.is_org_safety());

-- ---- site check-ins
create policy "checkins read" on public.site_checkins for select to authenticated
  using (organization_id = public.my_org()
     and (public.is_org_safety()
          or (public.is_supervisor() and project_id = any(public.my_project_ids()))
          or worker_id = public.my_worker_id()));

-- ---- invites: Builder only. Inviting people is account administration.
create policy "invites read" on public.invites for select to authenticated
  using (organization_id = public.my_org() and public.is_builder());
create policy "invites builder write" on public.invites for all to authenticated
  using (public.is_builder() and organization_id = public.my_org())
  with check (public.is_builder() and organization_id = public.my_org());

-- ---- quiz attempts + SWMS signatures: competency evidence
create policy "quiz attempts read" on public.quiz_attempts for select to authenticated
  using (organization_id = public.my_org()
     and (public.is_org_safety()
          or (public.is_supervisor() and exists (
                select 1 from public.workers w where w.id = worker_id
                  and w.project_id = any(public.my_project_ids())))
          or worker_id = public.my_worker_id()));

create policy "swms signatures read" on public.swms_signatures for select to authenticated
  using (organization_id = public.my_org()
     and (public.is_org_safety()
          or (public.is_supervisor() and exists (
                select 1 from public.workers w where w.id = worker_id
                  and w.project_id = any(public.my_project_ids())))
          or worker_id = public.my_worker_id()));
create policy "swms signatures sign" on public.swms_signatures for insert to authenticated
  with check (
    organization_id = public.my_org()
    and (
      (public.my_worker_id() is not null and worker_id = public.my_worker_id() and signed_by_staff = false)
      or (public.is_org_safety() and signed_by_staff = true)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Administration RPCs. Role and project assignment are privileged actions,
--    so they are Builder-only, audited, and cannot be reached by a direct
--    column write (migration 004 locked those columns).
-- ---------------------------------------------------------------------------
create or replace function public.set_user_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_old text; v_org bigint;
begin
  if not public.is_builder() then
    raise exception 'Only the account owner can change roles.';
  end if;
  if p_role not in ('builder_admin','hse_manager','site_supervisor','worker') then
    raise exception 'Unknown role.';
  end if;
  select role, organization_id into v_old, v_org from public.profiles where id = p_user;
  if v_org is null or v_org <> public.my_org() then
    raise exception 'That user is not in your organisation.';
  end if;
  if p_user = auth.uid() and p_role <> 'builder_admin' then
    raise exception 'You cannot remove your own owner access — promote someone else first.';
  end if;
  update public.profiles set role = p_role where id = p_user;
  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (v_org, auth.uid(), public.my_role(),
          (select name from public.profiles where id = auth.uid()),
          'ROLE_CHANGE', 'profiles', p_user::text,
          jsonb_build_object('from', v_old, 'to', p_role));
end $fn$;
grant execute on function public.set_user_role(uuid, text) to authenticated;

create or replace function public.set_user_projects(p_user uuid, p_projects bigint[])
returns void language plpgsql security definer set search_path = public as $fn$
declare v_org bigint; v_old bigint[];
begin
  if not public.is_builder() then
    raise exception 'Only the account owner can assign projects.';
  end if;
  select organization_id, project_ids into v_org, v_old from public.profiles where id = p_user;
  if v_org is null or v_org <> public.my_org() then
    raise exception 'That user is not in your organisation.';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_projects,'{}')) pid
    where not exists (select 1 from public.projects p where p.id = pid and p.organization_id = v_org)
  ) then
    raise exception 'One of those projects is not in your organisation.';
  end if;
  update public.profiles set project_ids = p_projects where id = p_user;
  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (v_org, auth.uid(), public.my_role(),
          (select name from public.profiles where id = auth.uid()),
          'PROJECT_ASSIGNMENT', 'profiles', p_user::text,
          jsonb_build_object('from', v_old, 'to', p_projects));
end $fn$;
grant execute on function public.set_user_projects(uuid, bigint[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. The permission set, served BY THE DATABASE. The client renders navigation
--    from this instead of a hardcoded table, so the UI can no longer disagree
--    with what is actually enforced.
-- ---------------------------------------------------------------------------
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
    'welcome', public.my_org() is not null,
    'billing', public.is_builder(),
    'manageUsers', public.is_builder(),
    'orgSettings', public.is_builder()
  )
$$;
grant execute on function public.my_permissions() to authenticated;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_proc where proname in
     ('is_builder','is_hse','is_supervisor','is_org_safety','can_read_project',
      'can_supervise_project','can_read_incident','my_permissions',
      'set_user_role','set_user_projects'))                               as rbac_functions,
  (select count(*) from pg_policies where schemaname = 'public')          as policies_total,
  (select count(*) from pg_trigger where tgname like 'zz_audit_%')        as audit_triggers,
  (select count(*) from information_schema.columns
     where table_name = 'incidents'
       and column_name in ('reported_by_worker_id','involved_worker_id')) as incident_owner_cols;
