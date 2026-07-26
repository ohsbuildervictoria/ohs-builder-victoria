-- ============================================================================
-- DEACTIVATION THAT ACTUALLY REVOKES, AND FILES SCOPED LIKE THEIR RECORDS
-- (2026-07-26)
--
-- Two holes found by an independent audit of the product as a builder would
-- use it. Both are the same shape: the app says access was withdrawn, and the
-- database keeps handing it out.
--
-- 1. "Deactivate" in the Admin Portal only set profiles.status. Nothing in the
--    database ever read it — my_org(), my_role() and the role predicates all
--    answered for a deactivated account exactly as before. A tradie let go
--    after an incident, or a supervisor who left mid-job, kept a working
--    session against the whole organisation. The builder clicks Deactivate,
--    believes access is cut, and it is not. For a compliance product that is
--    the worst kind of defect: the record says one thing and the system does
--    another.
--
--    Identity now fails closed for anyone not Active. Their own profile row
--    stays readable so the app can tell them why they are locked out.
--
-- 2. Migration 009 scoped every ROW to the right people — a supervisor sees
--    only their sites, a tradie only their own records. The storage buckets
--    were still on the older, coarser rules from 004, which asked only "same
--    organisation?" or "any builder staff?". So the row policy said a tradie
--    could see only their own incident, while the bytes under
--    site-photos/incident/<id>/ were readable by anyone signed in to the
--    company — including the injury photos on someone else's incident. Same
--    story for medical certificates and project drawings against a supervisor
--    who was never assigned to that site.
--
--    The file predicates are rewritten to ask the same questions the row
--    policies ask. A document and the record it belongs to now have one
--    answer between them, not two.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Identity: a deactivated account is nobody.
--
-- Every policy in the schema routes through these. Making them fail closed
-- withdraws access everywhere at once, rather than needing each policy to
-- remember to check. coalesce() keeps historical rows with no status working.
-- ---------------------------------------------------------------------------
create or replace function public.is_active_account()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select coalesce(status, 'Active') = 'Active' from public.profiles where id = auth.uid()),
    false)
$$;
grant execute on function public.is_active_account() to authenticated, anon;

create or replace function public.my_org()
returns bigint language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles
   where id = auth.uid() and coalesce(status, 'Active') = 'Active'
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles
   where id = auth.uid() and coalesce(status, 'Active') = 'Active'
$$;

create or replace function public.my_worker_id()
returns bigint language sql stable security definer set search_path = public as $$
  select worker_id from public.profiles
   where id = auth.uid() and coalesce(status, 'Active') = 'Active'
$$;

create or replace function public.my_company_id()
returns bigint language sql stable security definer set search_path = public as $$
  select w.company_id
    from public.profiles p
    join public.workers w on w.id = p.worker_id
   where p.id = auth.uid() and coalesce(p.status, 'Active') = 'Active'
$$;

create or replace function public.is_builder_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('builder_admin','hse_manager','site_supervisor')
       from public.profiles
      where id = auth.uid() and coalesce(status, 'Active') = 'Active'),
    false)
$$;

create or replace function public.is_builder()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'builder_admin' from public.profiles
     where id = auth.uid() and coalesce(status, 'Active') = 'Active'), false)
$$;

create or replace function public.is_hse()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'hse_manager' from public.profiles
     where id = auth.uid() and coalesce(status, 'Active') = 'Active'), false)
$$;

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'site_supervisor' from public.profiles
     where id = auth.uid() and coalesce(status, 'Active') = 'Active'), false)
$$;

create or replace function public.is_org_safety()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('builder_admin','hse_manager') from public.profiles
     where id = auth.uid() and coalesce(status, 'Active') = 'Active'), false)
$$;

create or replace function public.my_project_ids()
returns bigint[] language sql stable security definer set search_path = public as $$
  select coalesce((select project_ids from public.profiles
     where id = auth.uid() and coalesce(status, 'Active') = 'Active'), '{}')
$$;

-- Deactivating an account is an access decision, so it belongs in the audit
-- trail next to role changes. 009 already audits profiles; this names it.
create or replace function public.set_user_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_before text; v_org bigint;
begin
  if not public.is_builder() then
    raise exception 'Only the account owner can activate or deactivate people.';
  end if;
  if p_status not in ('Active','Deactivated') then
    raise exception 'status not allowed';
  end if;
  select status, organization_id into v_before, v_org
    from public.profiles where id = p_user;
  if v_org is null or v_org <> public.my_org() then
    raise exception 'That account is not in your organisation.';
  end if;
  if p_user = auth.uid() and p_status = 'Deactivated' then
    raise exception 'You cannot deactivate your own account.';
  end if;

  update public.profiles set status = p_status where id = p_user;

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (v_org, auth.uid(), public.my_role(),
          (select name from public.profiles where id = auth.uid()),
          'ACCOUNT_STATUS', 'profiles', p_user::text,
          jsonb_build_object('from', v_before, 'to', p_status));
end $fn$;
grant execute on function public.set_user_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Files answer to the same rules as the records they belong to.
--
-- The policies must go first: Postgres will not let a function be dropped
-- while a policy references it.
-- ---------------------------------------------------------------------------
drop policy if exists "compliance-docs read"   on storage.objects;
drop policy if exists "compliance-docs insert" on storage.objects;
drop policy if exists "compliance-docs update" on storage.objects;
drop policy if exists "compliance-docs delete" on storage.objects;
drop policy if exists "site-photos read"       on storage.objects;
drop policy if exists "site-photos insert"     on storage.objects;
drop policy if exists "site-photos delete"     on storage.objects;
drop policy if exists "project-docs read"      on storage.objects;
drop policy if exists "project-docs insert"    on storage.objects;
drop policy if exists "project-docs delete"    on storage.objects;

drop function if exists public.can_touch_record_photo(text, bigint);
drop function if exists public.can_touch_project_file(bigint);

-- Tradie certificates: compliance-docs/{worker_id}/{category}/...
-- Mirrors the compliance_documents policies in 009 — Builder and HSE manage
-- the whole crew, a supervisor may only READ the crew on their own sites, and
-- a tradie owns their own documents.
create or replace function public.can_touch_worker_file(wid bigint, write boolean default false)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare w_org bigint; w_project bigint;
begin
  if wid is null then return false; end if;
  select organization_id, project_id into w_org, w_project
    from public.workers where id = wid;
  if w_org is null or w_org <> public.my_org() then return false; end if;

  if public.is_org_safety() then return true; end if;
  if public.my_worker_id() = wid then return true; end if;
  if public.is_supervisor() then
    -- Read-only, and only for crew on a site they run.
    return not write and w_project = any(public.my_project_ids());
  end if;
  -- A builder account with no linked worker record previewing the crew is
  -- covered by is_org_safety above; anyone else gets nothing.
  return false;
end $fn$;

-- Subbie certificates: compliance-docs/company/{company_id}/...
-- Builder and HSE maintain them; a supervisor and the subbie themselves read.
create or replace function public.can_touch_company_file(cid bigint, write boolean default false)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare c_org bigint;
begin
  if cid is null then return false; end if;
  select organization_id into c_org from public.subbie_companies where id = cid;
  if c_org is null or c_org <> public.my_org() then return false; end if;
  if public.is_org_safety() then return true; end if;
  if write then return false; end if;
  return public.is_supervisor() or public.my_company_id() = cid;
end $fn$;

-- Incident and diary photos: site-photos/{entity}/{entity_id}/...
-- An incident photograph is the most sensitive thing in the system — it is
-- usually a picture of someone's injury. Visibility now follows the incident
-- itself, so a tradie reaches only the incidents they reported or were
-- involved in, and a supervisor only their own sites.
create or replace function public.can_touch_record_photo(entity text, eid bigint)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare i record; d record;
begin
  if eid is null then return false; end if;
  if entity = 'incident' then
    select organization_id, project_id, reported_by_worker_id, involved_worker_id
      into i from public.incidents where id = eid;
    if not found then return false; end if;
    return public.can_read_incident(i.organization_id, i.project_id,
                                    i.reported_by_worker_id, i.involved_worker_id);
  elsif entity = 'diary_entry' then
    select organization_id, project_id into d from public.diary_entries where id = eid;
    if not found or d.organization_id is distinct from public.my_org() then
      return false;
    end if;
    return public.can_supervise_project(d.project_id);
  end if;
  return false;
end $fn$;

-- Project documents: project-docs/{project_id}/...
-- Builder manages all sites, HSE reads all sites, a supervisor manages the
-- sites they are assigned to, a tradie has none.
create or replace function public.can_touch_project_file(pid bigint, write boolean default false)
returns boolean language plpgsql stable security definer set search_path = public as $fn$
declare p_org bigint;
begin
  if pid is null then return false; end if;
  select organization_id into p_org from public.projects where id = pid;
  if p_org is null or p_org <> public.my_org() then return false; end if;
  if public.is_builder() then return true; end if;
  if public.is_supervisor() and pid = any(public.my_project_ids()) then return true; end if;
  return not write and public.is_hse();
end $fn$;

grant execute on function public.can_touch_worker_file(bigint, boolean) to authenticated;
grant execute on function public.can_touch_company_file(bigint, boolean) to authenticated;
grant execute on function public.can_touch_record_photo(text, bigint) to authenticated;
grant execute on function public.can_touch_project_file(bigint, boolean) to authenticated;

-- ---- compliance-docs ------------------------------------------------------
create policy "compliance-docs read" on storage.objects for select to authenticated
using (
  bucket_id = 'compliance-docs'
  and case when (storage.foldername(name))[1] = 'company'
    then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), false)
    else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), false)
  end
);

create policy "compliance-docs insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'compliance-docs'
  and case when (storage.foldername(name))[1] = 'company'
    then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
    else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
  end
);

create policy "compliance-docs update" on storage.objects for update to authenticated
using (
  bucket_id = 'compliance-docs'
  and case when (storage.foldername(name))[1] = 'company'
    then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
    else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
  end
)
with check (
  bucket_id = 'compliance-docs'
  and case when (storage.foldername(name))[1] = 'company'
    then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
    else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
  end
);

create policy "compliance-docs delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'compliance-docs'
  and case when (storage.foldername(name))[1] = 'company'
    then public.can_touch_company_file(public.path_id((storage.foldername(name))[2]), true)
    else public.can_touch_worker_file(public.path_id((storage.foldername(name))[1]), true)
  end
);

-- ---- site-photos ----------------------------------------------------------
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

-- Removing evidence is not the same as adding it: only org-wide safety
-- authority may delete a photograph, matching record_photos in 009.
create policy "site-photos delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'site-photos'
  and public.is_org_safety()
  and public.can_touch_record_photo((storage.foldername(name))[1], public.path_id((storage.foldername(name))[2]))
);

-- ---- project-docs ---------------------------------------------------------
create policy "project-docs read" on storage.objects for select to authenticated
using (
  bucket_id = 'project-docs'
  and public.can_touch_project_file(public.path_id((storage.foldername(name))[1]), false)
);

create policy "project-docs insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-docs'
  and public.can_touch_project_file(public.path_id((storage.foldername(name))[1]), true)
);

create policy "project-docs delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'project-docs'
  and public.can_touch_project_file(public.path_id((storage.foldername(name))[1]), true)
);

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_proc where proname = 'is_active_account')      as active_check_fn,
  (select count(*) from pg_proc where proname = 'set_user_status')        as status_rpc,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like 'compliance-docs%'
        or policyname like 'site-photos%'
        or policyname like 'project-docs%')                               as storage_policies;
