-- 030 — Revoke the legacy pilot RPCs (security audit 2026-09-04)
--
-- Finding (P0, confirmed on staging with an ordinary builder login):
--   public.pilot_update_compliance(wid, category, value)  and
--   public.pilot_save_profile(wid, p)
-- are SECURITY DEFINER functions from the 2025 pilot that check only
-- `auth.uid() is not null`. They never look at the caller's organisation, so
-- ANY signed-in user of ANY organisation can set induction / quiz / swms to
-- 'Verified' on ANY worker id, or overwrite any worker's profile. Postgres
-- grants EXECUTE on new functions to PUBLIC by default, and 001_schema.sql
-- only left a comment ("drop when the pilot flag goes") — so they stayed
-- callable. The app has not called them since 011 (update_my_compliance /
-- record_compliance_signoff replaced them).
--
-- find_worker_by_handle(handle) is also a misnamed leftover (it writes the
-- caller's own worker profile). Nothing in src/ or functions/ references any
-- of the three.
--
-- Fix: make them non-executable for every client role. (Revoke rather than
-- drop so a rollback is a one-line grant if a forgotten caller surfaces.)

revoke all on function public.pilot_update_compliance(bigint, text, text) from public, anon, authenticated;
revoke all on function public.pilot_save_profile(bigint, jsonb) from public, anon, authenticated;
revoke all on function public.find_worker_by_handle(text) from public, anon, authenticated;

-- Belt and braces: even if EXECUTE were granted again, the two write RPCs
-- must refuse anyone who is not org safety staff for that worker's org.
create or replace function public.pilot_update_compliance(wid bigint, category text, value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  raise exception 'pilot_update_compliance is retired (use record_compliance_signoff / update_my_compliance)';
end $$;

create or replace function public.pilot_save_profile(wid bigint, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  raise exception 'pilot_save_profile is retired (use save_my_profile / the workers UPDATE grant)';
end $$;

revoke all on function public.pilot_update_compliance(bigint, text, text) from public, anon, authenticated;
revoke all on function public.pilot_save_profile(bigint, jsonb) from public, anon, authenticated;

-- Verification (run as any authenticated user):
--   select public.pilot_update_compliance(1, 'quiz', 'Verified');
--   -> ERROR: permission denied for function pilot_update_compliance
