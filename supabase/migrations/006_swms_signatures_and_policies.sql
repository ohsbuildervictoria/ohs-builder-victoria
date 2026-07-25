-- ============================================================================
-- SWMS SIGNATURES AND A USABLE POLICY REGISTER (2026-07-25)
--
-- Two gaps a builder-role audit found, both in features the product sells.
--
--   1. SWMS sign-off recorded nothing but a counter. swms_templates holds
--      `signed` and `total` integers, so "who signed which version, when"
--      — the entire evidentiary point of a SWMS — existed nowhere. Worse, the
--      builder's "+ Sign" button incremented that counter with no dialog, so
--      a builder could "sign" on a tradie's behalf and the record could not
--      tell the difference.
--
--   2. The Policy Register had no insert path anywhere in the codebase. The
--      page header promises "OHS policy register … pushed to all stakeholders
--      on site" and a new customer could never add a single policy.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SWMS signatures — one row per person per template version.
--
-- The version is stored ON the signature: re-issuing a SWMS as v1.1 must not
-- silently inherit v1.0's sign-offs, because the whole point is that the
-- person signed the document as it read that day.
-- ---------------------------------------------------------------------------
create table if not exists public.swms_signatures (
  id bigint generated always as identity primary key,
  organization_id bigint not null default public.my_org() references public.organizations(id),
  template_id bigint not null references public.swms_templates(id) on delete cascade,
  worker_id bigint references public.workers(id) on delete set null,
  signed_name text not null,
  template_version text not null default '',
  signed_by_staff boolean not null default false,
  signed_at timestamptz not null default now(),
  unique (template_id, worker_id, template_version)
);
alter table public.swms_signatures enable row level security;

drop policy if exists "swms_signatures: read" on public.swms_signatures;
create policy "swms_signatures: read" on public.swms_signatures
  for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      public.is_builder_staff()
      or public.my_worker_id() is null
      or worker_id = public.my_worker_id()
    )
  );

-- A tradie signs for themselves and nobody else. Builder staff may record a
-- sign-off (paper SWMS collected on site), but it is stamped signed_by_staff
-- so the register never implies the tradie signed in the app when they didn't.
drop policy if exists "swms_signatures: sign own" on public.swms_signatures;
create policy "swms_signatures: sign own" on public.swms_signatures
  for insert to authenticated
  with check (
    organization_id = public.my_org()
    and (
      (public.my_worker_id() is not null and worker_id = public.my_worker_id() and signed_by_staff = false)
      or (public.is_builder_staff() and signed_by_staff = true)
    )
  );

-- Signatures are evidence: no update or delete policy exists, so once written
-- a row cannot be altered or removed, the same rule audit_log follows.

-- Records the signature AND keeps the template counter in step, so the old
-- counter stays truthful instead of drifting from the new table.
create or replace function public.sign_swms_v2(
  template_id bigint,
  p_signed_name text,
  p_worker_id bigint default null
)
returns json language plpgsql security definer set search_path = public as $fn$
declare t record; wid bigint; staff boolean; nm text; sig record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into t from public.swms_templates
    where id = template_id and organization_id = public.my_org();
  if t.id is null then raise exception 'That SWMS is not available.'; end if;
  if t.locked then raise exception 'That SWMS is locked and cannot be signed.'; end if;

  staff := public.is_builder_staff();
  wid := coalesce(public.my_worker_id(), case when staff then p_worker_id else null end);

  if wid is not null then
    perform 1 from public.workers where id = wid and organization_id = public.my_org();
    if not found then raise exception 'That worker is not in your organisation.'; end if;
  elsif not staff then
    raise exception 'no linked worker record';
  end if;

  select name into nm from public.workers where id = wid;
  nm := coalesce(nullif(trim(p_signed_name), ''), nm, 'Unnamed');

  insert into public.swms_signatures
    (organization_id, template_id, worker_id, signed_name, template_version, signed_by_staff)
  values
    (t.organization_id, t.id, wid, nm, coalesce(t.version, ''), staff and public.my_worker_id() is null)
  on conflict (template_id, worker_id, template_version) do nothing
  returning * into sig;

  -- Counter reflects real signatures for this version, never more than total.
  update public.swms_templates s
     set signed = least(
           (select count(*) from public.swms_signatures g
             where g.template_id = s.id and g.template_version = coalesce(s.version, '')),
           greatest(s.total, 0))
   where s.id = t.id;

  return json_build_object(
    'recorded', sig.id is not null,
    'signedName', nm,
    'version', coalesce(t.version, ''),
    'alreadySigned', sig.id is null
  );
end $fn$;
grant execute on function public.sign_swms_v2(bigint, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Policy register — builder staff can actually add and retire a policy.
--    The table already existed with read + staff-write policies from 001; what
--    was missing was any application path. Nothing to change server-side
--    except confirming the write policy is present, which this asserts.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'policies' and cmd = 'ALL'
  ) then
    execute $p$create policy "policies: staff write" on public.policies for all to authenticated
      using (public.is_builder_staff() and organization_id = public.my_org())
      with check (public.is_builder_staff() and organization_id = public.my_org())$p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from information_schema.tables
     where table_name = 'swms_signatures')                                as signatures_table,
  (select count(*) from pg_proc where proname = 'sign_swms_v2')           as sign_rpc,
  (select count(*) from pg_policies where schemaname = 'public'
     and tablename = 'swms_signatures')                                    as signature_policies,
  (select count(*) from pg_policies where schemaname = 'public'
     and tablename = 'policies' and cmd = 'ALL')                           as policy_write_policy;
