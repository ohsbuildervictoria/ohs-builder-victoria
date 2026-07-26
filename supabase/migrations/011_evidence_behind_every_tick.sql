-- ============================================================================
-- EVIDENCE BEHIND EVERY TICK (2026-07-26)
--
-- An independent compliance audit found the same defect in four places: the
-- product shows a green tick, and nothing underneath it has to be true.
--
--   * Compliance Matrix — a Builder or HSE Manager could set a worker's Quiz,
--     SWMS or Induction straight to "Verified" with one button, writing the
--     workers row directly. No signature, no attempt, no record of who decided
--     it. Migration 008 closed exactly this hole for the quiz on the tradie's
--     side, and the staff side was left open — so the "Quiz Verified" a
--     builder shows an inspector could still mean nothing.
--   * SWMS — update_my_compliance() let a tradie set swms = 'Verified'
--     themselves, entirely separately from signing anything.
--   * Notifiable incidents — the product classifies them and stops. Nothing
--     recorded that WorkSafe was ever actually called, and an incident could
--     be closed without it. Section 38 requires immediate notification, a
--     written notice within 48 hours, and the record kept.
--   * Toolbox meetings — "signatures" was an integer someone could press a
--     button to increment. It could not answer "was this person at the talk?",
--     which is the only question consultation evidence exists to answer.
--
-- Plus: the roles the OHS Act holds accountable could hard-delete the incident
-- register, and the audit trigger recorded that a row went without recording
-- what it said.
--
-- The rule this migration applies throughout: a status is a consequence of
-- evidence, never an input.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The three evidence-backed columns stop being writable by hand.
--
-- RLS is per-row and cannot protect a column, so this is a GRANT, following
-- the same pattern migration 004 used on profiles. Everything else about a
-- worker stays editable — it is only the three ticks that must be earned.
-- ---------------------------------------------------------------------------
revoke update on public.workers from authenticated;
grant update (
  name, trade, employer, project_id, company_id, email, login_handle,
  white_card, insurance, medical, status, profile, account_status
) on public.workers to authenticated;

-- profiles.status likewise: activate/deactivate now goes through the audited
-- set_user_status() RPC from migration 010.
revoke update on public.profiles from authenticated;
grant update (name, read_notifications, last_login) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Induction gets an evidence table of its own.
--
-- Completion used to live in React state — a refresh lost it, and the tick it
-- produced could not say what content the person had actually been shown.
-- ---------------------------------------------------------------------------
create table if not exists public.induction_completions (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id),
  worker_id bigint not null references public.workers(id) on delete restrict,
  project_id bigint references public.projects(id) on delete set null,
  completed_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id),
  recorded_by_name text,
  on_paper boolean not null default false,
  note text
);
alter table public.induction_completions enable row level security;

drop policy if exists "induction: read" on public.induction_completions;
create policy "induction: read" on public.induction_completions
  for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      public.is_org_safety()
      or (public.is_supervisor() and exists (
            select 1 from public.workers w where w.id = worker_id
              and w.project_id = any(public.my_project_ids())))
      or worker_id = public.my_worker_id()
    )
  );
-- No insert, update or delete policy: rows arrive only through the RPCs below,
-- and once written they stay written.

-- ---------------------------------------------------------------------------
-- 3. Toolbox meetings get a real attendance register.
--
-- The meeting row keeps its counts for the existing screens; the counts are
-- now derived from these rows rather than being the record itself.
-- ---------------------------------------------------------------------------
create table if not exists public.toolbox_signatures (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id),
  meeting_id bigint not null references public.toolbox_meetings(id) on delete restrict,
  worker_id bigint references public.workers(id) on delete restrict,
  signed_name text not null,
  signed_by_staff boolean not null default false,
  signed_at timestamptz not null default now(),
  unique (meeting_id, worker_id)
);
alter table public.toolbox_signatures enable row level security;

drop policy if exists "toolbox sigs: read" on public.toolbox_signatures;
create policy "toolbox sigs: read" on public.toolbox_signatures
  for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      public.is_org_safety()
      or exists (select 1 from public.toolbox_meetings m
                  where m.id = meeting_id and public.can_supervise_project(m.project_id))
      or worker_id = public.my_worker_id()
    )
  );

-- Attendance is recorded per named person, by someone entitled to run that
-- site's meetings. Same shape as swms_signatures: insert-only, and honest
-- about whether the person signed themselves or a supervisor recorded it.
create or replace function public.record_toolbox_attendance(
  p_meeting_id bigint,
  p_worker_id bigint,
  p_signed_name text default null
)
returns json language plpgsql security definer set search_path = public as $fn$
declare m record; v_name text; v_self boolean; v_inserted bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into m from public.toolbox_meetings
    where id = p_meeting_id and organization_id = public.my_org();
  if not found then raise exception 'That toolbox meeting is not available.'; end if;

  v_self := public.my_worker_id() is not null and public.my_worker_id() = p_worker_id;
  if not v_self and not public.can_supervise_project(m.project_id) then
    raise exception 'You cannot record attendance for that site.';
  end if;

  perform 1 from public.workers
    where id = p_worker_id and organization_id = public.my_org();
  if not found then raise exception 'That person is not on your crew.'; end if;

  select name into v_name from public.workers where id = p_worker_id;
  v_name := coalesce(nullif(trim(p_signed_name), ''), v_name, 'Unnamed');

  insert into public.toolbox_signatures as t
    (organization_id, meeting_id, worker_id, signed_name, signed_by_staff)
  values (m.organization_id, p_meeting_id, p_worker_id, v_name, not v_self)
  on conflict (meeting_id, worker_id) do nothing
  returning t.id into v_inserted;

  -- Counts follow the register, never the other way around.
  update public.toolbox_meetings mt
     set signatures = (select count(*) from public.toolbox_signatures s
                        where s.meeting_id = mt.id)
   where mt.id = p_meeting_id;

  return json_build_object(
    'recorded', v_inserted is not null,
    'alreadyRecorded', v_inserted is null,
    'signedName', v_name
  );
end $fn$;
grant execute on function public.record_toolbox_attendance(bigint, bigint, text) to authenticated;

-- Backfill: existing meetings keep whatever count they had, but from here the
-- count is a consequence of the register.
create or replace function public.sync_toolbox_counts()
returns void language sql security definer set search_path = public as $$
  update public.toolbox_meetings m
     set signatures = greatest(
           (select count(*) from public.toolbox_signatures s where s.meeting_id = m.id),
           0)
   where exists (select 1 from public.toolbox_signatures s where s.meeting_id = m.id)
$$;

-- ---------------------------------------------------------------------------
-- 4. The staff override becomes a record of a paper sign-off, not a switch.
--
-- Builders do genuinely need to record a SWMS signed on paper at the site gate
-- or an induction run in a donga with no phone signal. That is legitimate, and
-- it should leave the same kind of trace the digital path leaves — including
-- who recorded it, which the previous button did not.
-- ---------------------------------------------------------------------------
create or replace function public.record_compliance_signoff(
  p_worker_id bigint,
  p_category text,
  p_value text default 'Verified',
  p_note text default null
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  w record; t record; v_actor text; v_recorded boolean := false;
begin
  if not public.is_org_safety() then
    raise exception 'Only the builder or an HSE manager can record a sign-off.';
  end if;
  if p_category = 'quiz' then
    raise exception 'The safety quiz is graded when it is sat — it cannot be recorded by hand.';
  end if;
  if p_category not in ('induction','swms') then
    raise exception 'category not allowed';
  end if;
  if p_value not in ('Verified','Pending','Missing') then
    raise exception 'value not allowed';
  end if;

  select * into w from public.workers
    where id = p_worker_id and organization_id = public.my_org();
  if not found then raise exception 'That person is not on your crew.'; end if;

  select name into v_actor from public.profiles where id = auth.uid();

  if p_value = 'Verified' then
    if p_category = 'induction' then
      insert into public.induction_completions
        (organization_id, worker_id, project_id, recorded_by, recorded_by_name, on_paper, note)
      values (w.organization_id, w.id, w.project_id, auth.uid(), v_actor, true, p_note);
      v_recorded := true;
    else
      -- SWMS: write the signature the tick is supposed to stand on.
      select * into t from public.swms_templates
        where organization_id = w.organization_id and trade = w.trade
        order by id limit 1;
      if not found then
        raise exception 'There is no SWMS published for % work yet — add it before recording a sign-off.', coalesce(w.trade,'that');
      end if;
      insert into public.swms_signatures as sig
        (organization_id, template_id, worker_id, signed_name, template_version, signed_by_staff)
      values (w.organization_id, t.id, w.id, w.name, coalesce(t.version,''), true)
      on conflict (template_id, worker_id, template_version) do nothing;
      update public.swms_templates s
         set signed = least(
               (select count(*) from public.swms_signatures g
                 where g.template_id = s.id
                   and g.template_version = coalesce(s.version,'')),
               greatest(s.total, 0))
       where s.id = t.id;
      v_recorded := true;
    end if;
  end if;

  execute format('update public.workers set %I = $1 where id = $2', p_category)
    using p_value, w.id;

  update public.workers w2 set status =
    case
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s = 'Missing') > 0
        then 'Site Access Pending'
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s <> 'Verified') > 0
        then 'Action Required'
      else 'Active'
    end
  where w2.id = w.id;

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (w.organization_id, auth.uid(), public.my_role(), v_actor,
          'COMPLIANCE_SIGNOFF', 'workers', w.id::text,
          jsonb_build_object('category', p_category, 'value', p_value,
                             'evidenceWritten', v_recorded, 'note', p_note));

  return json_build_object('category', p_category, 'value', p_value, 'evidenceWritten', v_recorded);
end $fn$;
grant execute on function public.record_compliance_signoff(bigint, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. The tradie's own path: induction records evidence; SWMS no longer
--    self-certifies at all — signing the document is what sets it.
-- ---------------------------------------------------------------------------
create or replace function public.update_my_compliance(category text, value text)
returns void language plpgsql security definer set search_path = public as $fn$
declare w record;
begin
  if category = 'quiz' then
    raise exception 'The safety quiz is graded when it is submitted — it cannot be set directly.';
  end if;
  if category = 'swms' then
    raise exception 'Your SWMS status is set when you sign the document.';
  end if;
  if category <> 'induction' then
    raise exception 'category not allowed';
  end if;
  if value not in ('Verified','Pending','Missing') then
    raise exception 'value not allowed';
  end if;

  select * into w from public.workers where id = public.my_worker_id();
  if not found then raise exception 'no linked worker record'; end if;

  if value = 'Verified' then
    insert into public.induction_completions
      (organization_id, worker_id, project_id, recorded_by, recorded_by_name, on_paper)
    values (w.organization_id, w.id, w.project_id, auth.uid(), w.name, false);
  end if;

  update public.workers set induction = value where id = w.id;
  update public.workers w2 set status =
    case
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s = 'Missing') > 0
        then 'Site Access Pending'
      when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s <> 'Verified') > 0
        then 'Action Required'
      else 'Active'
    end
  where w2.id = w.id;
end $fn$;

-- Signing the SWMS is now what sets the SWMS tick, for the person who signed.
create or replace function public.sign_swms_v2(
  p_template_id bigint,
  p_signed_name text,
  p_worker_id bigint default null
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  t record; v_worker_id bigint; v_staff boolean; v_name text;
  v_version text; v_inserted bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into t from public.swms_templates
    where id = p_template_id and organization_id = public.my_org();
  if t.id is null then raise exception 'That SWMS is not available.'; end if;
  if t.locked then raise exception 'That SWMS is locked and cannot be signed.'; end if;

  v_staff := public.is_builder_staff();
  v_worker_id := coalesce(public.my_worker_id(), case when v_staff then p_worker_id else null end);

  if v_worker_id is not null then
    perform 1 from public.workers
      where id = v_worker_id and organization_id = public.my_org();
    if not found then raise exception 'That worker is not in your organisation.'; end if;
  elsif not v_staff then
    raise exception 'no linked worker record';
  end if;

  select name into v_name from public.workers where id = v_worker_id;
  v_name := coalesce(nullif(trim(p_signed_name), ''), v_name, 'Unnamed');
  v_version := coalesce(t.version, '');

  insert into public.swms_signatures as sig
    (organization_id, template_id, worker_id, signed_name, template_version, signed_by_staff)
  values
    (t.organization_id, t.id, v_worker_id, v_name, v_version,
     v_staff and public.my_worker_id() is null)
  on conflict (template_id, worker_id, template_version) do nothing
  returning sig.id into v_inserted;

  update public.swms_templates s
     set signed = least(
           (select count(*) from public.swms_signatures g
             where g.template_id = s.id
               and g.template_version = coalesce(s.version, '')),
           greatest(s.total, 0))
   where s.id = t.id;

  -- The tick follows the signature, so the two can never disagree.
  if v_worker_id is not null then
    update public.workers set swms = 'Verified' where id = v_worker_id;
    update public.workers w2 set status =
      case
        when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s = 'Missing') > 0
          then 'Site Access Pending'
        when (select count(*) from (values (w2.induction),(w2.quiz),(w2.white_card),(w2.insurance),(w2.medical),(w2.swms)) v(s) where v.s <> 'Verified') > 0
          then 'Action Required'
        else 'Active'
      end
    where w2.id = v_worker_id;
  end if;

  return json_build_object(
    'recorded', v_inserted is not null,
    'signedName', v_name,
    'version', v_version,
    'alreadySigned', v_inserted is null
  );
end $fn$;

-- ---------------------------------------------------------------------------
-- 6. Notifiable incidents: the flag is computed here, and closing one without
--    a notification record is refused.
--
-- OHS Act 2004 s.38 — immediate notification by telephone, written notice
-- within 48 hours, record kept for five years. The product classified the
-- incident and stopped; a builder could hand an inspector a register of
-- notifiable incidents with no evidence any of them were ever phoned in.
-- ---------------------------------------------------------------------------
alter table public.incidents add column if not exists notified_at timestamptz;
alter table public.incidents add column if not exists notified_by text;
alter table public.incidents add column if not exists notification_method text;
alter table public.incidents add column if not exists worksafe_reference text;
alter table public.incidents add column if not exists written_notice_at timestamptz;
alter table public.incidents add column if not exists site_preserved boolean;

-- The browser works out whether an incident is notifiable so it can warn the
-- person filling the form. The database works it out again so the register is
-- right even if the form is bypassed.
create or replace function public.stamp_incident_notifiable()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  new.notifiable := coalesce(new.notifiable, false)
    or new.type in ('Notifiable Incident','Dangerous Occurrence','Notifiable (WorkSafe)')
    or new.severity in ('Major','Catastrophic','Critical');
  return new;
end $fn$;

drop trigger if exists incidents_stamp_notifiable on public.incidents;
create trigger incidents_stamp_notifiable
  before insert or update of type, severity on public.incidents
  for each row execute function public.stamp_incident_notifiable();

create or replace function public.guard_incident_closure()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'Closed' and old.status is distinct from 'Closed'
     and new.notifiable and new.notified_at is null then
    raise exception 'This is a notifiable incident. Record the WorkSafe notification (13 23 60) before closing it.';
  end if;
  return new;
end $fn$;

drop trigger if exists incidents_guard_closure on public.incidents;
create trigger incidents_guard_closure
  before update on public.incidents
  for each row execute function public.guard_incident_closure();

-- Recording the notification is its own action, so it is audited and stamped
-- with who made the call rather than typed into a free-text field.
create or replace function public.record_worksafe_notification(
  p_incident_id bigint,
  p_method text default 'Telephone 13 23 60',
  p_reference text default null,
  p_site_preserved boolean default null
)
returns json language plpgsql security definer set search_path = public as $fn$
declare i record; v_actor text;
begin
  if not public.is_org_safety() then
    raise exception 'Only the builder or an HSE manager can record a WorkSafe notification.';
  end if;
  select * into i from public.incidents
    where id = p_incident_id and organization_id = public.my_org();
  if not found then raise exception 'That incident is not available.'; end if;
  if i.notified_at is not null then
    raise exception 'A WorkSafe notification is already recorded against this incident.';
  end if;

  select name into v_actor from public.profiles where id = auth.uid();

  update public.incidents
     set notified_at = now(),
         notified_by = v_actor,
         notification_method = p_method,
         worksafe_reference = nullif(trim(coalesce(p_reference,'')), ''),
         site_preserved = coalesce(p_site_preserved, site_preserved)
   where id = p_incident_id;

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (i.organization_id, auth.uid(), public.my_role(), v_actor,
          'WORKSAFE_NOTIFICATION', 'incidents', p_incident_id::text,
          jsonb_build_object('method', p_method, 'reference', p_reference,
                             'sitePreserved', p_site_preserved));

  return json_build_object('notifiedAt', now(), 'notifiedBy', v_actor);
end $fn$;
grant execute on function public.record_worksafe_notification(bigint, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Corrective actions record who closed them and on what basis.
-- ---------------------------------------------------------------------------
alter table public.corrective_actions add column if not exists closed_at timestamptz;
alter table public.corrective_actions add column if not exists closed_by text;
alter table public.corrective_actions add column if not exists resolution text;

create or replace function public.stamp_action_closure()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'Done' and old.status is distinct from 'Done' then
    new.closed_at := now();
    new.closed_by := coalesce(new.closed_by,
                              (select name from public.profiles where id = auth.uid()));
  elsif new.status <> 'Done' then
    new.closed_at := null;
    new.closed_by := null;
  end if;
  return new;
end $fn$;

drop trigger if exists actions_stamp_closure on public.corrective_actions;
create trigger actions_stamp_closure
  before update on public.corrective_actions
  for each row execute function public.stamp_action_closure();

-- ---------------------------------------------------------------------------
-- 8. Deletion: the register stops being disposable, and the audit trail keeps
--    what was deleted rather than only that something was.
-- ---------------------------------------------------------------------------
drop policy if exists "incidents builder delete" on public.incidents;
-- No delete policy on incidents at all. An incident recorded in error is
-- corrected — status, description, an appended note — not made to disappear
-- by the person it reflects on.

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  v_row jsonb;
  v_id text;
  v_org bigint;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  v_id := coalesce(v_row->>'id', '');
  begin
    v_org := (v_row->>'organization_id')::bigint;
  exception when others then v_org := public.my_org();
  end;

  insert into public.security_audit
    (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (
    coalesce(v_org, public.my_org()),
    auth.uid(),
    public.my_role(),
    (select name from public.profiles where id = auth.uid()),
    tg_op,
    tg_table_name,
    v_id,
    -- A deletion is the one case where the row itself is the evidence: keep
    -- it, or the audit log records only that something vanished.
    case when tg_op = 'DELETE' then jsonb_build_object('deletedRow', v_row)
         else jsonb_build_object('row', v_row) end
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end $fn$;

-- Photos are evidence too; they were missing from the audited set.
drop trigger if exists zz_audit_record_photos on public.record_photos;
create trigger zz_audit_record_photos
  after insert or update or delete on public.record_photos
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- 9. Evidence must not disappear because a parent row was removed.
--
-- swms_signatures, quiz_attempts and compliance_documents were all documented
-- as immutable, and all three cascaded away with their worker or template.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select con.conname, con.conrelid::regclass as tbl
    from pg_constraint con
    where con.contype = 'f'
      and con.confdeltype = 'c'                      -- ON DELETE CASCADE
      and con.conrelid::regclass::text in (
        'swms_signatures','quiz_attempts','compliance_documents',
        'toolbox_signatures','induction_completions')
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.swms_signatures
  add constraint swms_signatures_template_id_fkey
  foreign key (template_id) references public.swms_templates(id) on delete restrict;
alter table public.swms_signatures
  add constraint swms_signatures_worker_id_fkey
  foreign key (worker_id) references public.workers(id) on delete restrict;
alter table public.quiz_attempts
  add constraint quiz_attempts_worker_id_fkey
  foreign key (worker_id) references public.workers(id) on delete restrict;
alter table public.compliance_documents
  add constraint compliance_documents_worker_id_fkey
  foreign key (worker_id) references public.workers(id) on delete restrict;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_proc where proname in
     ('record_compliance_signoff','record_toolbox_attendance',
      'record_worksafe_notification'))                                as new_rpcs,
  (select count(*) from information_schema.columns
     where table_name = 'incidents'
       and column_name in ('notified_at','worksafe_reference'))       as notify_cols,
  (select count(*) from pg_tables where tablename in
     ('toolbox_signatures','induction_completions'))                  as evidence_tables,
  (select count(*) from pg_policies
     where tablename = 'incidents' and cmd = 'DELETE')                as incident_delete_policies,
  (select count(*) from information_schema.column_privileges
     where table_name = 'workers' and grantee = 'authenticated'
       and privilege_type = 'UPDATE'
       and column_name in ('quiz','swms','induction'))                as tickable_columns;
