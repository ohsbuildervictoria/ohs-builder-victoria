-- ============================================================================
-- OHS Builder Victoria — Schema v3 (2026-07-25)
--
--   1. incidents.body_map      — where on the body the injury/impact happened
--   2. project_documents       — real file storage for Project → Documents
--   3. organizations.logo_url  — client branding on PDFs / letterheads / UI
--
-- Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Incident body map
-- Points marked on the front/back body diagram of the incident form. Shape:
--   [{ "view": "front", "x": 0.42, "y": 0.31, "region": "Left shoulder" }, …]
-- x/y are 0–1 fractions of the diagram box, so the mark renders identically at
-- any size (screen, PDF, print). Empty array = no body mark recorded, which is
-- normal for non-injury incidents (property damage, environmental, near miss).
-- ---------------------------------------------------------------------------
alter table public.incidents
  add column if not exists body_map jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Project documents
-- Working drawings, permits, certificates and other project files. Same
-- mechanism as compliance evidence and site photos: the bytes live in a
-- PRIVATE Storage bucket, this table holds org-scoped metadata, and the app
-- hands out short-lived signed URLs. Reads are builder-staff only — these are
-- the builder's own project files, not tradie-facing documents.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-docs', 'project-docs', false)
on conflict (id) do nothing;

create table if not exists public.project_documents (
  id bigint generated always as identity primary key,
  organization_id bigint not null default public.my_org() references public.organizations(id),
  project_id bigint not null references public.projects(id) on delete cascade,
  category text not null default 'General',
  file_path text not null,
  file_name text not null default '',
  file_size bigint not null default 0,
  mime_type text not null default '',
  uploaded_by text not null default '',
  created_at timestamptz not null default now()
);
alter table public.project_documents enable row level security;

drop policy if exists "project_documents: staff read" on public.project_documents;
create policy "project_documents: staff read" on public.project_documents
  for select to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org());

drop policy if exists "project_documents: staff write" on public.project_documents;
create policy "project_documents: staff write" on public.project_documents
  for all to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org())
  with check (public.is_builder_staff() and organization_id = public.my_org());

-- Storage RLS for the private bucket. Files are keyed {org}/{project}/… so a
-- future tightening can scope by path prefix; for now, matching the posture of
-- the existing compliance-docs bucket, access is builder-staff only.
drop policy if exists "project-docs read" on storage.objects;
create policy "project-docs read" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-docs' and public.is_builder_staff());

drop policy if exists "project-docs insert" on storage.objects;
create policy "project-docs insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-docs' and public.is_builder_staff());

drop policy if exists "project-docs delete" on storage.objects;
create policy "project-docs delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-docs' and public.is_builder_staff());

-- ---------------------------------------------------------------------------
-- 3. Organisation branding
-- The builder's own logo, shown on their PDFs/letterheads and anywhere client
-- branding displays. Stored in a PUBLIC bucket: a company logo is public by
-- nature, and a plain URL is what a PDF generator and an <img> both need
-- without a signing round-trip. Only Builder Admins can change it.
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists logo_url text not null default '';

insert into storage.buckets (id, name, public)
values ('org-branding', 'org-branding', true)
on conflict (id) do update set public = true;

drop policy if exists "org-branding read" on storage.objects;
create policy "org-branding read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'org-branding');

drop policy if exists "org-branding admin insert" on storage.objects;
create policy "org-branding admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-branding' and public.my_role() = 'builder_admin');

drop policy if exists "org-branding admin update" on storage.objects;
create policy "org-branding admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'org-branding' and public.my_role() = 'builder_admin');

drop policy if exists "org-branding admin delete" on storage.objects;
create policy "org-branding admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'org-branding' and public.my_role() = 'builder_admin');

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from information_schema.columns
     where table_name = 'incidents' and column_name = 'body_map')      as incidents_body_map,
  (select count(*) from information_schema.tables
     where table_name = 'project_documents')                            as project_documents_table,
  (select count(*) from information_schema.columns
     where table_name = 'organizations' and column_name = 'logo_url')  as organizations_logo_url,
  (select count(*) from storage.buckets where id = 'project-docs')      as project_docs_bucket,
  (select count(*) from storage.buckets where id = 'org-branding')      as org_branding_bucket;
