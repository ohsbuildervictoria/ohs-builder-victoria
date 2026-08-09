-- ============================================================================
-- POLICY REGISTER: BUILDER-SUPPLIED SOURCE DOCUMENTS (2026-08-09)
--
-- Apply via CLI (supabase db push) to project bbbtqhypdjrmlrdabumm. Idempotent.
--
-- Lets a register entry record that it is a builder-supplied document and hold
-- a reference to the original file:
--   · source     — provenance label, e.g. 'Builder supplied'
--   · file_name  — the original filename, preserved as given
--   · file_path  — storage object path (private policy-docs bucket), nullable
--
-- No RLS change: the existing org-scoped policies from 009 ("policies read" /
-- "policies safety write") already govern every column — org members read,
-- Builder Admin + HSE Manager write, and no other organisation can see the row.
--
-- Also creates a PRIVATE storage bucket 'policy-docs' with org-scoped access
-- so an original document (e.g. a builder's OHS program PDF) can be stored and
-- retrieved only by that organisation, mirroring the register's tenancy.
-- ============================================================================

alter table public.policies
  add column if not exists source text,
  add column if not exists file_name text,
  add column if not exists file_path text;

-- Private bucket for builder-supplied policy documents.
insert into storage.buckets (id, name, public)
values ('policy-docs', 'policy-docs', false)
on conflict (id) do nothing;

-- Access mirrors the policies register: a user may touch an object only under
-- their own organisation's folder (path is '<organization_id>/...'). Read is
-- any org member; write/delete is Builder Admin + HSE Manager (is_org_safety).
drop policy if exists "policy-docs read" on storage.objects;
create policy "policy-docs read" on storage.objects for select to authenticated
  using (
    bucket_id = 'policy-docs'
    and (storage.foldername(name))[1] = public.my_org()::text
  );

drop policy if exists "policy-docs write" on storage.objects;
create policy "policy-docs write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'policy-docs'
    and public.is_org_safety()
    and (storage.foldername(name))[1] = public.my_org()::text
  );

drop policy if exists "policy-docs update" on storage.objects;
create policy "policy-docs update" on storage.objects for update to authenticated
  using (
    bucket_id = 'policy-docs'
    and public.is_org_safety()
    and (storage.foldername(name))[1] = public.my_org()::text
  );

drop policy if exists "policy-docs delete" on storage.objects;
create policy "policy-docs delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'policy-docs'
    and public.is_org_safety()
    and (storage.foldername(name))[1] = public.my_org()::text
  );

-- Verification
select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='policies'
       and column_name in ('source','file_name','file_path')) as new_columns,
  (select count(*) from storage.buckets where id='policy-docs')  as bucket_present,
  (select count(*) from pg_policies where schemaname='storage'
     and tablename='objects' and policyname like 'policy-docs%')  as bucket_policies;
