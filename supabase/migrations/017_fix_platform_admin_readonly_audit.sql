-- ============================================================================
-- FIX: PLATFORM ADMIN READ RPCS FAIL IN A READ-ONLY TRANSACTION (2026-08-09)
--
-- Paste into the Supabase SQL editor / apply via CLI. Idempotent.
--
-- Migration 016's platform_orgs / platform_users / platform_overview each
-- called _platform_audit(), which INSERTs a row into security_audit. PostgREST
-- executes these RPCs inside a READ-ONLY transaction, so the INSERT raised
--   "cannot execute INSERT in a read-only transaction"
-- and the whole call returned nothing — the /platform page loaded but showed
-- no organisations or users.
--
-- Fix (smallest safe change): drop the audit INSERT from these THREE read-only
-- functions. They read metadata only; auditing a page view is not worth making
-- the query able to fail. Genuine administrative WRITES are audited where they
-- happen and keep doing so — set_user_role() and set_user_projects() (migration
-- 009) still write ROLE_CHANGE / PROJECT_ASSIGNMENT rows, because those run in
-- normal read-write transactions.
--
-- Everything else is preserved exactly:
--   * is_platform_admin() guard unchanged — tenants still refused
--   * identical return columns, ordering and predicates
--   * no password/hash/token/secret is selected
--   * _platform_audit() itself is left defined for future write-path use
-- ============================================================================

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
  return query
  select p.id, p.name, p.email, p.role, p.status,
    p.organization_id, o.name, coalesce(o.is_internal, false),
    p.worker_id, p.project_ids,
    p.created_at, p.last_login, u.last_sign_in_at,
    u.email_confirmed_at is not null,
    hb.last_seen, coalesce(hb.last_seen > now() - interval '5 minutes', false),
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

-- Verification
select
  (select count(*) from pg_proc where proname in
     ('platform_orgs','platform_users','platform_overview'))              as functions_present,
  (select count(*) from public.platform_admins)                          as platform_admins;
