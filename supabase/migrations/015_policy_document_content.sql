-- ============================================================================
-- POLICY REGISTER: DOCUMENT CONTENT AND A REAL DRAFT STATE (2026-08-09)
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Idempotent — safe to re-run.
--
-- The Policies page gains a Templates tab: a builder copies a starting
-- template into their register as a DRAFT, customises the text, and only a
-- deliberate "publish" makes it an adopted document. That needs somewhere for
-- the text to live. `status` already exists ('Active' by default) and now
-- also carries 'Draft'; nothing about existing rows changes.
--
-- No RLS change: the existing org-scoped policies ("policies read" /
-- "policies safety write" from 009) already cover the new column — everyone
-- in the org can read, only Builder Admin + HSE Manager can write.
-- ============================================================================

alter table public.policies
  add column if not exists content text;

-- Verification
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'policies'
       and column_name = 'content') as content_column_present,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'policies') as policies_rls_count;
