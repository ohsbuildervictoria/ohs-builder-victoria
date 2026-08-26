-- ============================================================================
-- 029 — Returning stakeholders: one person, many sites, no dead ends.
--
-- Found in production 26 Aug (David's Builders Academy class): two stakeholders
-- who had completed a project the week before could not join the new project.
-- The 024 model already makes a `workers` row a PROJECT MEMBERSHIP and links
-- every membership to one auth account (workers.user_id) — but three gaps made
-- a returning person hit a wall:
--
--   1. A person could only READ their *current* membership row and its
--      documents (profiles.worker_id), never their other memberships — so
--      nothing person-level could be shown or shared across sites.
--   2. Personal evidence (White Card / Insurance / Medical) hung off one
--      membership. A second site demanded a re-upload of documents that are
--      about the PERSON, not the site — and the re-upload didn't supersede the
--      copy on the first site.
--   3. Adding a person the builder already knows (same email, same org)
--      created an unclaimed invited row; nothing connected it to the account
--      the person already signs in with.
--
-- This migration is ADDITIVE. Per-site things stay per-site: induction, quiz,
-- SWMS signatures, toolbox attendance and diary records all stay keyed by the
-- membership they were earned on. Only personal evidence becomes person-level.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. A person can see their own memberships (all of them) and the personal
--    documents held on any of them. Additive policies — staff/supervisor
--    scoping from 009–011 is untouched.
-- ---------------------------------------------------------------------------
drop policy if exists "workers read own memberships" on public.workers;
create policy "workers read own memberships" on public.workers
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "compliance docs read own person" on public.compliance_documents;
create policy "compliance docs read own person" on public.compliance_documents
  for select to authenticated
  using (exists (
    select 1 from public.workers w
     where w.id = compliance_documents.worker_id and w.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 2. Person-level document resolution. For every membership, the documents of
--    every sibling membership of the same person (same org, same account) are
--    visible as that membership's documents. The app reads THIS view wherever
--    it derives compliance status; writes still go through
--    file_compliance_document / verify_compliance_document on the base table.
--    security_invoker: the caller's own RLS decides what the view can see.
-- ---------------------------------------------------------------------------
create or replace view public.person_compliance_documents
  with (security_invoker = true) as
select
  m.id as worker_id,          -- the membership this row is presented under
  d.worker_id as source_worker_id,
  d.id, d.organization_id, d.category, d.file_path, d.file_name,
  d.expiry_date, d.uploaded_at, d.superseded_at, d.superseded_by,
  d.verified_at, d.verified_by, d.verified_by_name, d.verification_note
from public.workers m
join public.workers s
  on s.organization_id = m.organization_id
 and (s.id = m.id or (m.user_id is not null and s.user_id = m.user_id))
join public.compliance_documents d on d.worker_id = s.id;

grant select on public.person_compliance_documents to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Replacing a personal document supersedes the person's previous one on
--    EVERY sibling membership — one current document per person per category,
--    instead of one per site. (Unlinked rows — user_id null — behave exactly
--    as before: per-membership.)
-- ---------------------------------------------------------------------------
create or replace function public.file_compliance_document(p_worker_id bigint, p_category text, p_file_path text, p_file_name text, p_expiry date default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  w record; v_previous bigint; v_new bigint; v_staff boolean; v_actor text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into w from public.workers
    where id = p_worker_id and organization_id = public.my_org();
  if not found then raise exception 'That person is not on your crew.'; end if;

  v_staff := public.is_org_safety();
  if not (v_staff or public.my_worker_id() = p_worker_id) then
    raise exception 'You can only upload your own documents.';
  end if;
  select name into v_actor from public.profiles where id = auth.uid();

  -- The most recent current document for this category held by the PERSON —
  -- this membership or, when the account is linked, any sibling membership.
  select d.id into v_previous from public.compliance_documents d
   join public.workers s on s.id = d.worker_id
   where d.category = p_category and d.superseded_at is null
     and s.organization_id = w.organization_id
     and (s.id = w.id or (w.user_id is not null and s.user_id = w.user_id))
   order by d.uploaded_at desc limit 1;

  -- Retire every current copy the person holds for the category (normally one).
  update public.compliance_documents d set superseded_at = now()
    from public.workers s
   where d.worker_id = s.id and d.category = p_category and d.superseded_at is null
     and s.organization_id = w.organization_id
     and (s.id = w.id or (w.user_id is not null and s.user_id = w.user_id));

  insert into public.compliance_documents
    (organization_id, worker_id, category, file_path, file_name, expiry_date,
     verified_at, verified_by, verified_by_name)
  values (w.organization_id, p_worker_id, p_category, p_file_path, p_file_name, p_expiry,
          case when v_staff then now() end, case when v_staff then auth.uid() end, case when v_staff then v_actor end)
  returning id into v_new;

  if v_previous is not null then
    update public.compliance_documents set superseded_by = v_new where id = v_previous;
  end if;

  insert into public.security_audit (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (w.organization_id, auth.uid(), public.my_role(), v_actor,
          case when v_staff then 'COMPLIANCE_DOC_FILED_VERIFIED' else 'COMPLIANCE_DOC_SUBMITTED' end,
          'compliance_documents', v_new::text,
          jsonb_build_object('workerId', p_worker_id, 'category', p_category, 'fileName', p_file_name, 'expiry', p_expiry, 'replaced', v_previous));

  return json_build_object('id', v_new, 'supersededId', v_previous, 'verified', v_staff);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Adding a person the org already knows links the new membership to their
--    existing sign-in straight away: same organisation + same email as a
--    membership that account has already claimed. The new site then simply
--    appears in their site list — no invite link, no second account, and the
--    new membership still starts its own induction/quiz/SWMS from Missing.
--    Worker accounts only (user_id comes from workers rows, never staff).
-- ---------------------------------------------------------------------------
create or replace function public.workers_autolink_same_person()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if new.user_id is null and nullif(trim(coalesce(new.email, '')), '') is not null then
    select s.user_id into v_user from public.workers s
     where s.organization_id = new.organization_id
       and s.user_id is not null and s.account_status = 'active'
       and lower(trim(s.email)) = lower(trim(new.email))
     order by s.id desc limit 1;
    if v_user is not null then
      new.user_id := v_user;
      new.account_status := 'active';
      new.invite_token := null;   -- nothing left for a link to claim
    end if;
  end if;
  return new;
end $$;

drop trigger if exists workers_autolink_same_person on public.workers;
create trigger workers_autolink_same_person before insert on public.workers
  for each row execute function public.workers_autolink_same_person();
