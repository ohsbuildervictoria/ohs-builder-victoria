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
