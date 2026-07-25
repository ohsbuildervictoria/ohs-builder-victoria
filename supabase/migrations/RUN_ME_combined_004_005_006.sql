-- ============================================================================
-- OHS Builder Victoria — COMBINED PENDING MIGRATIONS (004 + 005 + 006)
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Every statement is idempotent, so re-running is safe.
--
-- 004 closes a critical cross-tenant hole: any signup could escalate to
--     admin of another organisation, and every tenant's medical
--     certificates and site photos were readable by any authenticated user.
-- 005 stops tradies reading colleagues' fitness declarations and profiles.
-- 006 makes SWMS signatures real records and lets the policy register work.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────
-- 004_security_tenancy_hardening.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- SECURITY / TENANCY HARDENING (2026-07-25)
--
-- A security audit against production found that the table-level RLS design is
-- sound, but two classes of gap defeat it at the edges:
--
--   1. public.profiles allowed a user to UPDATE their own row with no
--      restriction on WHICH COLUMNS. A signed-up trial user could set
--      role='builder_admin' and organization_id=<any org>, becoming an
--      administrator of another builder's data. Verified by probe.
--
--   2. Storage policies constrained the BUCKET but never the PATH. Any
--      authenticated user could list, download, overwrite and delete every
--      tenant's files. Verified by probe: a QA worker downloaded another
--      organisation's tradie medical certificate and White Card from
--      compliance-docs, and another tenant's diary photo from site-photos.
--
-- This migration closes both. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles — stop privilege self-escalation
--
-- RLS cannot restrict columns, so this uses column-level GRANTs, which RLS
-- policies sit on top of. A user may still update their own row, but the
-- privileged columns (role, organization_id, worker_id) are simply not
-- grantable to them. SECURITY DEFINER functions run as the owner and are
-- unaffected, so signup_create_org / accept_worker_invite / accept_staff_invite
-- keep working — those remain the ONLY ways role and org membership change.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (name, read_notifications, last_login, status) on public.profiles to authenticated;

-- `status` stays writable because the Admin Portal's activate/deactivate uses
-- it. Note it is presentational today, not an access control — deactivating a
-- user does not revoke their session or their RLS access. Treat it as such
-- until it is enforced server-side.

-- ---------------------------------------------------------------------------
-- 2. Storage access helpers
--
-- SECURITY DEFINER so a storage policy never has to query an RLS-protected
-- table from inside another policy. Each answers one question: "may the
-- current caller touch a file that belongs to this record?"
-- ---------------------------------------------------------------------------

-- Personal compliance evidence lives at {worker_id}/{category}/...
create or replace function public.can_touch_worker_file(wid bigint, write boolean default false)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare w_org bigint;
begin
  if wid is null then return false; end if;
  select organization_id into w_org from public.workers where id = wid;
  if w_org is null or w_org <> public.my_org() then return false; end if;
  -- Builder staff manage their whole crew. A linked tradie may only touch
  -- their own. (my_worker_id() is null covers builder accounts previewing.)
  if public.is_builder_staff() then return true; end if;
  if write then return public.my_worker_id() = wid; end if;
  return public.my_worker_id() is null or public.my_worker_id() = wid;
end $fn$;

-- Company certificates live at company/{company_id}/{category}/...
create or replace function public.can_touch_company_file(cid bigint, write boolean default false)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare c_org bigint;
begin
  if cid is null then return false; end if;
  select organization_id into c_org from public.subbie_companies where id = cid;
  if c_org is null or c_org <> public.my_org() then return false; end if;
  if public.is_builder_staff() then return true; end if;
  if write then return false; end if;                 -- crew read, staff write
  return public.my_company_id() = cid;
end $fn$;

-- Diary/incident photos live at {entity}/{entity_id}/...
create or replace function public.can_touch_record_photo(entity text, eid bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare e_org bigint;
begin
  if eid is null then return false; end if;
  if entity = 'incident' then
    select organization_id into e_org from public.incidents where id = eid;
  elsif entity = 'diary_entry' then
    select organization_id into e_org from public.diary_entries where id = eid;
  else
    return false;
  end if;
  return e_org is not null and e_org = public.my_org();
end $fn$;

-- Project files live at {project_id}/...
create or replace function public.can_touch_project_file(pid bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare p_org bigint;
begin
  if pid is null then return false; end if;
  select organization_id into p_org from public.projects where id = pid;
  return p_org is not null and p_org = public.my_org() and public.is_builder_staff();
end $fn$;

-- Safely turn a path segment into a bigint (returns null for 'company', etc.)
create or replace function public.path_id(seg text)
returns bigint language plpgsql immutable as $fn$
begin
  if seg is null or seg !~ '^\d+$' then return null; end if;
  return seg::bigint;
exception when others then return null;
end $fn$;

grant execute on function public.can_touch_worker_file(bigint, boolean) to authenticated;
grant execute on function public.can_touch_company_file(bigint, boolean) to authenticated;
grant execute on function public.can_touch_record_photo(text, bigint) to authenticated;
grant execute on function public.can_touch_project_file(bigint) to authenticated;
grant execute on function public.path_id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. compliance-docs — the worst of the three. Medical certificates, White
--    Cards and insurance certificates for every tenant were readable,
--    overwritable and deletable by any authenticated user.
--    Paths: {worker_id}/{category}/...  and  company/{company_id}/{category}/...
-- ---------------------------------------------------------------------------
drop policy if exists "compliance-docs read" on storage.objects;
drop policy if exists "compliance-docs insert" on storage.objects;
drop policy if exists "compliance-docs update" on storage.objects;
drop policy if exists "compliance-docs delete" on storage.objects;

create policy "compliance-docs read" on storage.objects for select to authenticated
using (
  bucket_id = 'compliance-docs' and (
    case when (storage.foldername(name))[1] = 'company'
      then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), false)
      else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), false)
    end
  )
);

create policy "compliance-docs insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'compliance-docs' and (
    case when (storage.foldername(name))[1] = 'company'
      then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
      else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
    end
  )
);

create policy "compliance-docs update" on storage.objects for update to authenticated
using (
  bucket_id = 'compliance-docs' and (
    case when (storage.foldername(name))[1] = 'company'
      then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
      else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
    end
  )
)
with check (
  bucket_id = 'compliance-docs' and (
    case when (storage.foldername(name))[1] = 'company'
      then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
      else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
    end
  )
);

create policy "compliance-docs delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'compliance-docs' and (
    case when (storage.foldername(name))[1] = 'company'
      then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
      else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
    end
  )
);

-- ---------------------------------------------------------------------------
-- 4. site-photos — incident and diary photographs, including injury and
--    near-miss evidence. Paths: {entity}/{entity_id}/...
-- ---------------------------------------------------------------------------
drop policy if exists "site-photos read" on storage.objects;
drop policy if exists "site-photos insert" on storage.objects;
drop policy if exists "site-photos delete" on storage.objects;

create policy "site-photos read" on storage.objects for select to authenticated
using (
  bucket_id = 'site-photos'
  and public.can_touch_record_photo((storage.foldername(name))[1], public.path_id((storage.foldername(name))[2]))
);

create policy "site-photos insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-photos'
  and public.can_touch_record_photo((storage.foldername(name))[1], public.path_id((storage.foldername(name))[2]))
);

create policy "site-photos delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'site-photos'
  and public.is_builder_staff()
  and public.can_touch_record_photo((storage.foldername(name))[1], public.path_id((storage.foldername(name))[2]))
);

-- ---------------------------------------------------------------------------
-- 5. project-docs — my own migration 003 gated on is_builder_staff(), which is
--    org-agnostic: it is true for builder staff of EVERY organisation. The
--    header claimed these were "the builder's own project files". Fixed here
--    while the bucket is still empty, so no re-keying is needed.
--    Paths: {project_id}/...
-- ---------------------------------------------------------------------------
drop policy if exists "project-docs read" on storage.objects;
drop policy if exists "project-docs insert" on storage.objects;
drop policy if exists "project-docs delete" on storage.objects;

create policy "project-docs read" on storage.objects for select to authenticated
using (
  bucket_id = 'project-docs'
  and public.can_touch_project_file(public.path_id((storage.foldername(name))[1]))
);

create policy "project-docs insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-docs'
  and public.can_touch_project_file(public.path_id((storage.foldername(name))[1]))
);

create policy "project-docs delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'project-docs'
  and public.can_touch_project_file(public.path_id((storage.foldername(name))[1]))
);

-- ---------------------------------------------------------------------------
-- 6. org-branding — public read is intended (a logo on a PDF needs a plain
--    URL), but writes were gated only on "is a builder_admin", with no path
--    constraint: any trial admin could overwrite or delete another builder's
--    logo, which renders on that builder's letterheads. Anonymous LISTING is
--    also dropped — it exposed the customer list via filenames.
--    Paths: {org_id}/logo-...
-- ---------------------------------------------------------------------------
drop policy if exists "org-branding read" on storage.objects;
drop policy if exists "org-branding admin insert" on storage.objects;
drop policy if exists "org-branding admin update" on storage.objects;
drop policy if exists "org-branding admin delete" on storage.objects;

-- Public buckets serve object URLs without a select policy; granting select
-- only to authenticated stops anonymous enumeration of the bucket contents
-- while leaving the published logo URLs working.
create policy "org-branding read" on storage.objects for select to authenticated
using (bucket_id = 'org-branding');

create policy "org-branding admin insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'org-branding'
  and public.my_role() = 'builder_admin'
  and public.path_id((storage.foldername(name))[1]) = public.my_org()
);

create policy "org-branding admin update" on storage.objects for update to authenticated
using (
  bucket_id = 'org-branding'
  and public.my_role() = 'builder_admin'
  and public.path_id((storage.foldername(name))[1]) = public.my_org()
)
with check (
  bucket_id = 'org-branding'
  and public.my_role() = 'builder_admin'
  and public.path_id((storage.foldername(name))[1]) = public.my_org()
);

create policy "org-branding admin delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'org-branding'
  and public.my_role() = 'builder_admin'
  and public.path_id((storage.foldername(name))[1]) = public.my_org()
);

-- ---------------------------------------------------------------------------
-- 7. accept_worker_invite — bring it up to the standard of its staff sibling.
--    It previously moved ANY signed-in account into the inviting org and set
--    role='worker' with no checks, so a forwarded invite link could attach the
--    wrong account to a builder, and a builder_admin who opened one was
--    silently demoted into someone else's organisation.
-- ---------------------------------------------------------------------------
create or replace function public.accept_worker_invite(token uuid)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare w record; my_email text; existing_org bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into w from public.workers where invite_token = token;
  if w.id is null then
    raise exception 'This invite link is invalid or has already been used.';
  end if;

  -- Guard 1: if the invite names an email, only that person may claim it.
  select email into my_email from auth.users where id = auth.uid();
  if nullif(trim(coalesce(w.email, '')), '') is not null
     and lower(trim(my_email)) <> lower(trim(w.email)) then
    raise exception 'This invite was issued to % — sign in with that email address.', w.email;
  end if;

  -- Guard 2: never silently move an account between companies.
  select organization_id into existing_org from public.profiles where id = auth.uid();
  if existing_org is not null and existing_org <> w.organization_id then
    raise exception 'Your account already belongs to another company. Ask your administrator to resolve this — accounts are not moved between companies by invite link.';
  end if;

  update public.profiles
    set organization_id = w.organization_id, role = 'worker', worker_id = w.id, status = 'Active'
    where id = auth.uid();
  update public.workers
    set account_status = 'active', invite_token = null,
        email = coalesce(nullif(email, ''), my_email)
    where id = w.id;
  return w.id;
end $fn$;
grant execute on function public.accept_worker_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Verification — every line should read TRUE / 0.
-- ---------------------------------------------------------------------------
select
  -- privileged columns no longer grantable to end users
  not exists (
    select 1 from information_schema.column_privileges
    where grantee = 'authenticated' and table_name = 'profiles'
      and privilege_type = 'UPDATE'
      and column_name in ('role','organization_id','worker_id')
  ) as profiles_privileged_columns_locked,
  -- every storage policy for our buckets now references a path check
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'compliance-docs%'
      and qual not like '%can_touch%' and coalesce(with_check,'') not like '%can_touch%'
  ) as compliance_policies_missing_path_check,
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'site-photos%'
      and qual not like '%can_touch%' and coalesce(with_check,'') not like '%can_touch%'
  ) as sitephoto_policies_missing_path_check,
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'project-docs%'
      and qual not like '%can_touch%' and coalesce(with_check,'') not like '%can_touch%'
  ) as projectdoc_policies_missing_path_check,
  -- anonymous listing of branding is gone
  not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'org-branding read' and 'anon' = any(roles)
  ) as branding_anon_listing_removed;

-- ─────────────────────────────────────────────────────────────────────────
-- 005_within_org_privacy.sql
-- ─────────────────────────────────────────────────────────────────────────
-- ============================================================================
-- WITHIN-ORG PRIVACY (2026-07-25)
--
-- Migration 004 closed cross-tenant access. This closes over-exposure INSIDE a
-- tenant, which two independent audits flagged: a signed-in tradie could read
-- every colleague's record on tables that were scoped to the organisation but
-- never to the person.
--
-- The two that matter most:
--
--   * audit_log carries fitness-for-work declarations, including who DECLINED.
--     A declined declaration means injured, unwell, or impaired — health
--     information. Any tradie in the org could read every other tradie's.
--     Probe: `audit_log?entity=eq.fitness_declaration` as a worker returned 6
--     rows for other people, including `action: "declined"`.
--
--   * profiles exposed every colleague's name, email and role — including the
--     builder admins' email addresses — to any tradie.
--
-- Builder staff are unaffected: they still see their whole organisation, which
-- is the job. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- audit_log — a linked tradie sees only their own fitness declarations.
--
-- The "my_worker_id() is null" arm keeps builder-side accounts that have no
-- linked worker record working, matching the pattern already used on workers
-- and compliance_documents. The app needs exactly this much for a tradie:
-- useAudit.fitnessConfirmedToday() only ever looks for the caller's own rows.
-- The builder-facing AuditTrail component runs on builder pages only.
-- ---------------------------------------------------------------------------
drop policy if exists "audit: read org" on public.audit_log;
create policy "audit: read org" on public.audit_log for select to authenticated
using (
  organization_id = public.my_org()
  and (
    public.is_builder_staff()
    or public.my_worker_id() is null
    or (entity = 'fitness_declaration' and entity_id = public.my_worker_id())
  )
);

-- ---------------------------------------------------------------------------
-- profiles — a linked tradie sees only their own row.
--
-- Read by the Admin Portal (builder staff) and by fetchProfile() for the
-- signed-in user, so nothing a tradie uses is affected.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: read same org" on public.profiles;
create policy "profiles: read same org" on public.profiles for select to authenticated
using (
  id = auth.uid()
  or (
    organization_id = public.my_org()
    and (public.is_builder_staff() or public.my_worker_id() is null)
  )
);

-- ---------------------------------------------------------------------------
-- Verification. Run the SELECTs below as a linked tradie to confirm:
--   select count(*) from public.profiles;    -- expect 1 (their own)
--   select count(*) from public.audit_log
--     where entity = 'fitness_declaration'
--       and entity_id <> public.my_worker_id();   -- expect 0
-- As builder staff both should still return the whole organisation.
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'audit_log'
      and policyname = 'audit: read org' and qual like '%my_worker_id%') as audit_scoped,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles: read same org' and qual like '%is_builder_staff%') as profiles_scoped;

-- ============================================================================
-- STILL OPEN — deliberate product decisions, not fixed here
--
-- 1. incidents / diary_entries / site_checkins remain readable by any member
--    of the organisation, so a tradie can read colleagues' injury detail
--    ("bruising to chest, back of knee and right forearm") and the site diary.
--    Restricting these could plausibly break intended behaviour, so it needs a
--    decision rather than a guess. If tradies should not see them, the same
--    `is_builder_staff() or my_worker_id() is null` arm applied above is the
--    pattern to use.
--
-- 2. The safety quiz is graded entirely in the browser and its correct answers
--    ship in the JS bundle (src/data/constants.js -> quizQuestions). Worse,
--    update_my_compliance() accepts quiz/induction/swms = 'Verified' for the
--    caller's own worker with no evidence of completion, so the compliance
--    gate is not enforceable — a determined tradie can mark themselves
--    verified from the console. Fixing this properly means grading
--    server-side: keep the answer key out of the client, submit responses to
--    a security-definer RPC, and let only that RPC set 'Verified'. That is a
--    product change, not a policy tweak, so it is written down rather than
--    done silently.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 006_swms_signatures_and_policies.sql
-- ─────────────────────────────────────────────────────────────────────────
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
