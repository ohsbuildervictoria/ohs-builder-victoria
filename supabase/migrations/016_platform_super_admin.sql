-- ============================================================================
-- PLATFORM SUPER ADMIN, PRESENCE, AND THE WELCOME FIX (2026-08-09)
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Idempotent — safe to re-run. Run 015 first if it hasn't been.
--
-- 1. A platform-level privilege, SEPARATE from tenant roles. Builder Admin /
--    HSE / Supervisor / Worker stay exactly as they are; platform access is
--    an explicit allow-list keyed to the auth user id, readable by nobody
--    through the API, consulted only inside SECURITY DEFINER functions.
--
-- 2. Cross-org read RPCs for the platform admin: organisations, users and an
--    overview. They expose account METADATA only — never passwords, hashes,
--    tokens or secrets (none of those are even selected). Every call is
--    written to security_audit (organization_id null = platform-level).
--
-- 3. Presence: an authenticated heartbeat upsert. "Online now" is defined as
--    a heartbeat within the last 5 MINUTES — a real signal, not a guess from
--    last_sign_in_at. The client sends one on load and every 2 minutes.
--
-- 4. Welcome fix: my_permissions() granted 'welcome' on my_org() IS NOT NULL
--    alone — the only org-gated entry in an otherwise role-gated menu. An
--    account with a builder-side role but no organisation row linked (e.g. a
--    hand-created admin) got every menu item EXCEPT Welcome. Welcome is now
--    also granted by role, like everything else it sits beside.
--
-- 5. Assigns nexxtsitesolutions@gmail.com as the platform super admin, by
--    auth-user lookup at run time (no duplicate account is created; if the
--    email has no auth user, nothing is inserted and the verification block
--    at the end says so).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The allow-list
-- ---------------------------------------------------------------------------
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- Deliberately NO policies: the table is invisible to PostgREST for everyone.
-- Membership is consulted only via the definer function below and edited only
-- in the SQL editor by the operator.

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;
grant execute on function public.is_platform_admin() to authenticated;

-- Log every platform-level administrative read; org null marks it platform-wide.
create or replace function public._platform_audit(p_action text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, details)
  values
    (null, auth.uid(), 'platform_super_admin',
     (select name from public.profiles where id = auth.uid()),
     p_action, 'platform', p_details)
$$;

-- ---------------------------------------------------------------------------
-- 2. Presence heartbeat — "online now" means last_seen within 5 minutes
-- ---------------------------------------------------------------------------
create table if not exists public.presence_heartbeats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id bigint,
  last_seen timestamptz not null default now()
);
alter table public.presence_heartbeats enable row level security;
-- No policies — written and read through functions only. No session tokens
-- are stored; this is a timestamp per user, nothing more.

create or replace function public.heartbeat()
returns void language sql security definer set search_path = public as $$
  insert into public.presence_heartbeats (user_id, organization_id, last_seen)
  select auth.uid(), public.my_org(), now()
  where auth.uid() is not null
  on conflict (user_id) do update
    set last_seen = now(), organization_id = excluded.organization_id
$$;
grant execute on function public.heartbeat() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Platform read RPCs — metadata only, guarded, audited
-- ---------------------------------------------------------------------------
create or replace function public.platform_orgs()
returns table (
  id bigint, name text, plan text, state text, is_internal boolean,
  created_at timestamptz, user_count bigint, worker_count bigint,
  project_count bigint, active_project_count bigint, pending_invites bigint
) language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required.';
  end if;
  perform public._platform_audit('PLATFORM_READ_ORGS');
  return query
  select o.id, o.name, o.plan, o.state, coalesce(o.is_internal, false), o.created_at,
    (select count(*) from public.profiles p where p.organization_id = o.id),
    (select count(*) from public.workers w where w.organization_id = o.id),
    (select count(*) from public.projects pr where pr.organization_id = o.id),
    (select count(*) from public.projects pr where pr.organization_id = o.id and pr.status = 'Active'),
    (select count(*) from public.invites i where i.organization_id = o.id and i.status = 'invited')
  from public.organizations o
  order by coalesce(o.is_internal, false), o.id;
end $fn$;
grant execute on function public.platform_orgs() to authenticated;

create or replace function public.platform_users()
returns table (
  id uuid, name text, email text, role text, status text,
  organization_id bigint, organization_name text, org_is_internal boolean,
  worker_id bigint, project_ids bigint[],
  created_at timestamptz, last_login timestamptz, auth_last_sign_in timestamptz,
  email_confirmed boolean, last_seen timestamptz, online_now boolean,
  sees_welcome boolean, is_platform_admin boolean
) language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required.';
  end if;
  perform public._platform_audit('PLATFORM_READ_USERS');
  return query
  select p.id, p.name, p.email, p.role, p.status,
    p.organization_id, o.name, coalesce(o.is_internal, false),
    p.worker_id, p.project_ids,
    p.created_at, p.last_login, u.last_sign_in_at,
    u.email_confirmed_at is not null,
    hb.last_seen, coalesce(hb.last_seen > now() - interval '5 minutes', false),
    -- mirrors the my_permissions() welcome predicate, post-fix
    (p.organization_id is not null or p.role in ('builder_admin','hse_manager','site_supervisor')),
    exists (select 1 from public.platform_admins pa where pa.user_id = p.id)
  from public.profiles p
  left join public.organizations o on o.id = p.organization_id
  left join auth.users u on u.id = p.id
  left join public.presence_heartbeats hb on hb.user_id = p.id
  order by coalesce(o.is_internal, false), p.organization_id nulls first, p.role, p.created_at;
end $fn$;
grant execute on function public.platform_users() to authenticated;

create or replace function public.platform_overview()
returns json language plpgsql stable security definer set search_path = public as $fn$
declare result json;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required.';
  end if;
  perform public._platform_audit('PLATFORM_READ_OVERVIEW');
  select json_build_object(
    'organisations', (select count(*) from public.organizations),
    'customerOrgs', (select count(*) from public.organizations where not coalesce(is_internal,false)),
    'internalOrgs', (select count(*) from public.organizations where coalesce(is_internal,false)),
    'totalUsers', (select count(*) from public.profiles),
    'usersSignedInEver', (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.last_sign_in_at is not null),
    'onlineNow', (select count(*) from public.presence_heartbeats where last_seen > now() - interval '5 minutes'),
    'active24h', (select count(distinct p.id) from public.profiles p
                    left join auth.users u on u.id = p.id
                    left join public.presence_heartbeats hb on hb.user_id = p.id
                    where greatest(coalesce(u.last_sign_in_at,'epoch'), coalesce(hb.last_seen,'epoch')) > now() - interval '24 hours'),
    'active7d', (select count(distinct p.id) from public.profiles p
                    left join auth.users u on u.id = p.id
                    left join public.presence_heartbeats hb on hb.user_id = p.id
                    where greatest(coalesce(u.last_sign_in_at,'epoch'), coalesce(hb.last_seen,'epoch')) > now() - interval '7 days'),
    'active30d', (select count(distinct p.id) from public.profiles p
                    left join auth.users u on u.id = p.id
                    left join public.presence_heartbeats hb on hb.user_id = p.id
                    where greatest(coalesce(u.last_sign_in_at,'epoch'), coalesce(hb.last_seen,'epoch')) > now() - interval '30 days'),
    'totalProjects', (select count(*) from public.projects),
    'activeProjects', (select count(*) from public.projects where status = 'Active'),
    'pendingInvites', (select count(*) from public.invites where status = 'invited'),
    'recentAudit', (select coalesce(json_agg(row_to_json(a)), '[]'::json) from (
        select actor_name, actor_role, action, table_name, occurred_at
        from public.security_audit order by occurred_at desc limit 15) a)
  ) into result;
  return result;
end $fn$;
grant execute on function public.platform_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. my_permissions(): the Welcome fix + the platform flag
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
    -- Welcome: role-gated OR org-gated. Previously org-only, which hid
    -- exactly this one item from any builder-side account without an
    -- organisation linked.
    'welcome', public.my_org() is not null
               or public.is_org_safety() or public.is_supervisor(),
    'billing', public.is_builder(),
    'manageUsers', public.is_builder(),
    'orgSettings', public.is_builder(),
    'platform', public.is_platform_admin()
  )
$$;
grant execute on function public.my_permissions() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Assign the platform super admin (no duplicate accounts; lookup by email)
-- ---------------------------------------------------------------------------
insert into public.platform_admins (user_id, note)
select u.id, 'Owner — assigned 2026-08-09'
from auth.users u
where lower(u.email) = 'nexxtsitesolutions@gmail.com'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Verification — read the output of this block
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.platform_admins)                          as platform_admins,
  (select string_agg(u.email, ', ') from public.platform_admins pa
     join auth.users u on u.id = pa.user_id)                             as platform_admin_emails,
  (select count(*) from pg_proc where proname in
     ('is_platform_admin','heartbeat','platform_orgs','platform_users',
      'platform_overview'))                                              as new_functions,
  -- diagnostic for the Welcome case: builder-side accounts with no org
  (select string_agg(p.email || ' (' || p.role || ')', ', ')
     from public.profiles p
     where p.organization_id is null and p.role <> 'worker')             as builder_accounts_without_org,
  (select count(*) from information_schema.columns
     where table_name = 'policies' and column_name = 'content')          as migration_015_applied;
