-- ============================================================================
-- A RENEWED CERTIFICATE STOPS ERASING THE ONE BEFORE IT (2026-07-26)
--
-- compliance_documents carried a unique constraint on (worker_id, category)
-- and the app upserted onto it. So when a tradie's White Card was renewed, the
-- row for the old one was overwritten: the file path, the issue record and —
-- most importantly — the old expiry date were gone.
--
-- That is the exact history a builder needs when something goes wrong. "Was he
-- licensed on the day of the incident?" is answered by the certificate that
-- was in force *then*, not the one in force now. The product was destroying
-- the answer every time someone did the right thing and renewed.
--
-- Documents now supersede rather than replace. One current document per
-- category is still enforced — by a partial unique index over the current
-- rows only — so nothing downstream has to learn a new shape.
--
-- Deleting also changes. A superseded certificate cannot be removed by
-- anybody: it is the record. A current one can still be removed by the
-- builder or HSE manager, because someone will upload the wrong file and
-- needs to fix it — but a tradie can no longer delete their own lapsed
-- certificate to make the problem disappear.
--
-- Safe to re-run.
-- ============================================================================

alter table public.compliance_documents
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by bigint
    references public.compliance_documents(id) on delete set null;

-- The old constraint is what forced the overwrite. Its replacement keeps the
-- same guarantee where it matters — one CURRENT document per category — while
-- letting the history pile up behind it.
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.compliance_documents'::regclass
      and con.contype = 'u'
  loop
    execute format('alter table public.compliance_documents drop constraint %I', r.conname);
  end loop;
end $$;

drop index if exists compliance_documents_current_idx;
create unique index compliance_documents_current_idx
  on public.compliance_documents (worker_id, category)
  where superseded_at is null;

-- ---------------------------------------------------------------------------
-- Filing a document supersedes the current one instead of overwriting it.
-- ---------------------------------------------------------------------------
create or replace function public.file_compliance_document(
  p_worker_id bigint,
  p_category text,
  p_file_path text,
  p_file_name text,
  p_expiry date default null
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  w record; v_previous bigint; v_new bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into w from public.workers
    where id = p_worker_id and organization_id = public.my_org();
  if not found then raise exception 'That person is not on your crew.'; end if;

  -- Same rule as the row policy: safety staff for anyone, a tradie for
  -- themselves. Stated here too because this runs as definer.
  if not (public.is_org_safety() or public.my_worker_id() = p_worker_id) then
    raise exception 'You can only upload your own documents.';
  end if;

  select id into v_previous from public.compliance_documents
   where worker_id = p_worker_id and category = p_category and superseded_at is null;

  insert into public.compliance_documents
    (organization_id, worker_id, category, file_path, file_name, expiry_date)
  values (w.organization_id, p_worker_id, p_category, p_file_path, p_file_name, p_expiry)
  returning id into v_new;

  if v_previous is not null then
    update public.compliance_documents
       set superseded_at = now(), superseded_by = v_new
     where id = v_previous;
  end if;

  return json_build_object('id', v_new, 'supersededId', v_previous);
end $fn$;
grant execute on function public.file_compliance_document(bigint, text, text, text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Deletion: current documents only, and only by safety staff.
-- ---------------------------------------------------------------------------
drop policy if exists "compliance docs write" on public.compliance_documents;

create policy "compliance docs insert" on public.compliance_documents
  for insert to authenticated
  with check (
    organization_id = public.my_org()
    and (public.is_org_safety() or worker_id = public.my_worker_id())
  );

create policy "compliance docs update" on public.compliance_documents
  for update to authenticated
  using (
    organization_id = public.my_org()
    and superseded_at is null
    and (public.is_org_safety() or worker_id = public.my_worker_id())
  )
  with check (
    organization_id = public.my_org()
    and (public.is_org_safety() or worker_id = public.my_worker_id())
  );

-- A superseded certificate is the record of what was in force at the time.
-- Nobody removes it — not the tradie whose licence lapsed, not the builder.
create policy "compliance docs delete" on public.compliance_documents
  for delete to authenticated
  using (
    organization_id = public.my_org()
    and superseded_at is null
    and public.is_org_safety()
  );

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from information_schema.columns
    where table_name = 'compliance_documents'
      and column_name in ('superseded_at','superseded_by'))            as history_cols,
  (select count(*) from pg_indexes
    where indexname = 'compliance_documents_current_idx')              as current_index,
  (select count(*) from pg_constraint
    where conrelid = 'public.compliance_documents'::regclass
      and contype = 'u')                                               as old_unique_constraints,
  (select count(*) from pg_proc where proname = 'file_compliance_document') as file_fn;
