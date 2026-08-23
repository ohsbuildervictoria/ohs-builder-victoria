-- ============================================================================
-- 027 — David's 23 Aug feedback: make four workflows truthful end to end.
--
--  A. Compliance documents: "uploaded" ≠ "verified". A White Card / Insurance /
--     Medical file that a stakeholder uploads is SUBMITTED until the builder or
--     HSE manager verifies it (new columns + verify_compliance_document RPC).
--     A file the builder uploads themselves is verified by that act. Workers
--     cannot write the verification columns (column-level grants).
--  B. Toolbox meetings: a real lifecycle. status Scheduled → Awaiting
--     Signatures (meeting time passed) → Completed, reached either when every
--     person on the site roster has signed (set by record_toolbox_attendance)
--     or by an explicit, audited complete_toolbox_meeting(). The denominator is
--     the live project roster, never the count ticked when scheduling.
--  C. Site Diary voice notes are stored (audio_path in the site-photos bucket
--     under diary_entry/<id>/ — same path-scoped RLS as the entry's photos).
--  D. Incidents record whether/when the site team was emailed
--     (staff_notified_*), written only by the notify-incident Pages Function.
--  Additive; no existing row is changed except the toolbox status backfill.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Compliance document verification
-- ---------------------------------------------------------------------------
alter table public.compliance_documents
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid,
  add column if not exists verified_by_name text,
  add column if not exists verification_note text;

-- Only the RPCs below may touch the verification columns.
revoke insert, update on public.compliance_documents from authenticated;
grant insert (organization_id, worker_id, category, file_path, file_name, expiry_date, superseded_at, superseded_by, uploaded_at)
  on public.compliance_documents to authenticated;
grant update (category, expiry_date, file_name, file_path, superseded_at, superseded_by, uploaded_at, worker_id, organization_id)
  on public.compliance_documents to authenticated;

-- Filing: a document the builder/HSE files themselves is verified by that act;
-- a stakeholder's own upload is submitted and waits for verification.
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

  select id into v_previous from public.compliance_documents
   where worker_id = p_worker_id and category = p_category and superseded_at is null;

  if v_previous is not null then
    update public.compliance_documents set superseded_at = now() where id = v_previous;
  end if;

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

-- Builder / HSE decision on a submitted document.
create or replace function public.verify_compliance_document(p_doc bigint, p_verified boolean, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare d record; v_actor text;
begin
  if not public.is_org_safety() then
    raise exception 'Only the builder or an HSE manager can verify documents.';
  end if;
  select * into d from public.compliance_documents
   where id = p_doc and organization_id = public.my_org() and superseded_at is null;
  if not found then raise exception 'That document is not current or not in your organisation.'; end if;
  select name into v_actor from public.profiles where id = auth.uid();

  update public.compliance_documents
     set verified_at = case when p_verified then now() else null end,
         verified_by = case when p_verified then auth.uid() else null end,
         verified_by_name = case when p_verified then v_actor else null end,
         verification_note = nullif(trim(coalesce(p_note, '')), '')
   where id = d.id;

  insert into public.security_audit (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (d.organization_id, auth.uid(), public.my_role(), v_actor,
          case when p_verified then 'COMPLIANCE_DOC_VERIFIED' else 'COMPLIANCE_DOC_REJECTED' end,
          'compliance_documents', d.id::text,
          jsonb_build_object('workerId', d.worker_id, 'category', d.category, 'fileName', d.file_name, 'note', p_note));

  return json_build_object('id', d.id, 'verified', p_verified, 'verifiedBy', case when p_verified then v_actor end,
                           'verifiedAt', case when p_verified then now() end);
end $$;
grant execute on function public.verify_compliance_document(bigint, boolean, text) to authenticated;

-- projects.compliance is a legacy denormalised column (every view derives the
-- figure from the crew's evidence). It must not manufacture "100" for a new
-- project: allow null and default to null.
alter table public.projects alter column compliance drop not null;
alter table public.projects alter column compliance set default null;

-- ---------------------------------------------------------------------------
-- B. Toolbox meeting lifecycle
-- ---------------------------------------------------------------------------
alter table public.toolbox_meetings
  add column if not exists status text not null default 'Scheduled',
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid,
  add column if not exists completed_by_name text,
  add column if not exists completion_note text;
alter table public.toolbox_meetings drop constraint if exists toolbox_meetings_status_check;
alter table public.toolbox_meetings add constraint toolbox_meetings_status_check
  check (status in ('Scheduled', 'Completed'));

-- Status/completion columns only through the RPCs.
revoke insert, update on public.toolbox_meetings from authenticated;
grant insert (organization_id, project_id, topic, date, presenter, attendees, total, duration, points, signatures, created_at)
  on public.toolbox_meetings to authenticated;
grant update (project_id, topic, date, presenter, attendees, total, duration, points, signatures)
  on public.toolbox_meetings to authenticated;

-- The people who should sign: everyone currently on that site's roster.
create or replace function public.toolbox_roster_count(p_meeting bigint)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.workers w
   join public.toolbox_meetings m on m.id = p_meeting
  where w.organization_id = m.organization_id and w.project_id = m.project_id
$$;
grant execute on function public.toolbox_roster_count(bigint) to authenticated;

-- Recording attendance: unchanged rules; when the meeting has been held and
-- every person on the roster has signed, the meeting completes itself.
create or replace function public.record_toolbox_attendance(p_meeting_id bigint, p_worker_id bigint, p_signed_name text default null)
returns json language plpgsql security definer set search_path = public as $$
declare m record; v_name text; v_self boolean; v_inserted bigint; v_roster int; v_sigs int; v_completed boolean := false;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into m from public.toolbox_meetings
    where id = p_meeting_id and organization_id = public.my_org();
  if not found then raise exception 'That toolbox meeting is not available.'; end if;

  v_self := public.my_worker_id() is not null and public.my_worker_id() = p_worker_id;
  if not v_self and not public.can_supervise_project(m.project_id) then
    raise exception 'You cannot record attendance for that site.';
  end if;

  perform 1 from public.workers where id = p_worker_id and organization_id = public.my_org();
  if not found then raise exception 'That person is not on your crew.'; end if;

  select name into v_name from public.workers where id = p_worker_id;
  v_name := coalesce(nullif(trim(p_signed_name), ''), v_name, 'Unnamed');

  insert into public.toolbox_signatures as t
    (organization_id, meeting_id, worker_id, signed_name, signed_by_staff)
  values (m.organization_id, p_meeting_id, p_worker_id, v_name, not v_self)
  on conflict (meeting_id, worker_id) do nothing
  returning t.id into v_inserted;

  select count(*) into v_sigs from public.toolbox_signatures s where s.meeting_id = p_meeting_id;
  v_roster := public.toolbox_roster_count(p_meeting_id);

  update public.toolbox_meetings mt
     set signatures = v_sigs,
         -- expected attendance follows the roster the register uses
         attendees = greatest(coalesce(mt.attendees, 0), v_roster, v_sigs),
         total = greatest(coalesce(mt.total, 0), v_roster, v_sigs)
   where mt.id = p_meeting_id;

  if m.status <> 'Completed' and m.date <= current_date and v_roster > 0 and v_sigs >= v_roster then
    update public.toolbox_meetings
       set status = 'Completed', completed_at = now(), completed_by = auth.uid(),
           completed_by_name = 'Everyone on the site roster signed', completion_note = 'auto'
     where id = p_meeting_id;
    v_completed := true;
  end if;

  return json_build_object('recorded', v_inserted is not null, 'alreadyRecorded', v_inserted is null,
                           'signedName', v_name, 'signatures', v_sigs, 'roster', v_roster, 'completed', v_completed);
end $$;

-- Explicit close-out for a held meeting where not everyone signed (absences
-- are real). Requires the meeting time to have passed and at least one
-- signature on the register; audited with who closed it and why.
create or replace function public.complete_toolbox_meeting(p_meeting bigint, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare m record; v_actor text; v_sigs int; v_roster int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into m from public.toolbox_meetings where id = p_meeting and organization_id = public.my_org();
  if not found then raise exception 'That toolbox meeting is not available.'; end if;
  if not public.can_supervise_project(m.project_id) then raise exception 'You cannot close out meetings for that site.'; end if;
  if m.status = 'Completed' then return json_build_object('id', m.id, 'status', 'Completed', 'alreadyCompleted', true); end if;
  if m.date > current_date then raise exception 'This meeting is scheduled for % — it can be completed once it has been held.', m.date; end if;
  select count(*) into v_sigs from public.toolbox_signatures s where s.meeting_id = m.id;
  if v_sigs = 0 then raise exception 'Nobody has signed the attendance register yet — record who attended before completing the meeting.'; end if;
  v_roster := public.toolbox_roster_count(m.id);
  if v_sigs < v_roster and coalesce(trim(p_note), '') = '' then
    raise exception '% of % on the roster signed. Note why the others did not attend (or record them), then complete.', v_sigs, v_roster;
  end if;
  select name into v_actor from public.profiles where id = auth.uid();
  update public.toolbox_meetings
     set status = 'Completed', completed_at = now(), completed_by = auth.uid(), completed_by_name = v_actor,
         completion_note = nullif(trim(coalesce(p_note, '')), ''), signatures = v_sigs
   where id = m.id;
  insert into public.security_audit (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (m.organization_id, auth.uid(), public.my_role(), v_actor, 'TOOLBOX_COMPLETED', 'toolbox_meetings', m.id::text,
          jsonb_build_object('signatures', v_sigs, 'roster', v_roster, 'note', p_note));
  return json_build_object('id', m.id, 'status', 'Completed', 'signatures', v_sigs, 'roster', v_roster);
end $$;
grant execute on function public.complete_toolbox_meeting(bigint, text) to authenticated;

-- One-off: meetings already held where every person who was expected signed
-- (signatures >= the expected count and at least one signature) are complete.
update public.toolbox_meetings m
   set status = 'Completed', completed_at = coalesce(completed_at, m.date::timestamptz), completed_by_name = 'Backfilled 24 Aug 2026 (all expected signed)', completion_note = 'backfill'
 where m.status = 'Scheduled' and m.date < current_date
   and m.signatures > 0 and m.signatures >= greatest(coalesce(m.total, 0), coalesce(m.attendees, 0), 1);

-- ---------------------------------------------------------------------------
-- C. Site Diary voice note
-- ---------------------------------------------------------------------------
alter table public.diary_entries
  add column if not exists audio_path text,
  add column if not exists audio_name text;
-- RLS: diary rows are already staff/supervisor-scoped; the file lives in the
-- site-photos bucket under diary_entry/<id>/… and is governed by the existing
-- can_touch_record_photo('diary_entry', id) storage policies.

-- ---------------------------------------------------------------------------
-- D. Incident team notification record (written by the Pages Function)
-- ---------------------------------------------------------------------------
alter table public.incidents
  add column if not exists staff_notified_at timestamptz,
  add column if not exists staff_notify_to text[],
  add column if not exists staff_notify_error text;
revoke insert, update on public.incidents from authenticated;
grant insert (type, description, project_id, reported_by, date, status, severity, location, involved, witnesses, immediate_action, notifiable, created_at, lost_time, organization_id, body_map, reported_by_worker_id, involved_worker_id)
  on public.incidents to authenticated;
grant update (type, description, project_id, reported_by, date, status, severity, location, involved, witnesses, immediate_action, notifiable, lost_time, body_map, reported_by_worker_id, involved_worker_id, notified_at, notified_by, notification_method, worksafe_reference, written_notice_at, site_preserved)
  on public.incidents to authenticated;
