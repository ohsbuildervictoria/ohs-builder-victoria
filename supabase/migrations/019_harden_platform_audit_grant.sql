-- ============================================================================
-- HARDENING: restrict the internal _platform_audit helper (2026-08-10)
--
-- Apply via CLI (supabase db push). Idempotent.
--
-- _platform_audit(text, jsonb) is an internal SECURITY DEFINER helper used only
-- by the platform read RPCs to write a security_audit row. Postgres grants
-- EXECUTE to PUBLIC by default, so any authenticated tenant user could call it
-- directly and insert arbitrary rows into public.security_audit (actor = self,
-- organization_id = NULL, action = attacker-chosen). That does not expose data
-- or escalate privilege, but it lets a user pollute/spoof the platform audit
-- trail — which weakens the log's evidentiary value.
--
-- Fix: revoke EXECUTE from PUBLIC/authenticated. The callers are themselves
-- SECURITY DEFINER and run as the function owner, so they can still call it.
-- ============================================================================

revoke execute on function public._platform_audit(text, jsonb) from public;
revoke execute on function public._platform_audit(text, jsonb) from authenticated;

-- Verification: authenticated must NOT be able to execute it any more.
select
  has_function_privilege('authenticated',
    'public._platform_audit(text, jsonb)', 'execute') as authed_can_exec_should_be_false;
