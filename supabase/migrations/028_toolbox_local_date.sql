-- 028 — Toolbox "held" must use the site's calendar date (Australia/Melbourne),
-- not the database's UTC date: a 7am Monday pre-start is "today" in Melbourne
-- while UTC is still Sunday evening, so 027's auto-complete never fired on the
-- day. Same rule applied to the explicit close-out and the backfill.
create or replace function public.site_today()
returns date language sql stable as $$
  select (now() at time zone 'Australia/Melbourne')::date
$$;
grant execute on function public.site_today() to authenticated, anon;

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
         attendees = greatest(coalesce(mt.attendees, 0), v_roster, v_sigs),
         total = greatest(coalesce(mt.total, 0), v_roster, v_sigs)
   where mt.id = p_meeting_id;

  if m.status <> 'Completed' and m.date <= public.site_today() and v_roster > 0 and v_sigs >= v_roster then
    update public.toolbox_meetings
       set status = 'Completed', completed_at = now(), completed_by = auth.uid(),
           completed_by_name = 'Everyone on the site roster signed', completion_note = 'auto'
     where id = p_meeting_id;
    v_completed := true;
  end if;

  return json_build_object('recorded', v_inserted is not null, 'alreadyRecorded', v_inserted is null,
                           'signedName', v_name, 'signatures', v_sigs, 'roster', v_roster, 'completed', v_completed);
end $$;

create or replace function public.complete_toolbox_meeting(p_meeting bigint, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare m record; v_actor text; v_sigs int; v_roster int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into m from public.toolbox_meetings where id = p_meeting and organization_id = public.my_org();
  if not found then raise exception 'That toolbox meeting is not available.'; end if;
  if not public.can_supervise_project(m.project_id) then raise exception 'You cannot close out meetings for that site.'; end if;
  if m.status = 'Completed' then return json_build_object('id', m.id, 'status', 'Completed', 'alreadyCompleted', true); end if;
  if m.date > public.site_today() then raise exception 'This meeting is scheduled for % — it can be completed once it has been held.', m.date; end if;
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

-- Meetings held (site date) where everyone on the roster has signed complete now.
update public.toolbox_meetings m
   set status = 'Completed', completed_at = coalesce(m.completed_at, now()), completed_by_name = 'Everyone on the site roster signed', completion_note = 'auto'
 where m.status = 'Scheduled' and m.date <= public.site_today()
   and m.signatures > 0 and public.toolbox_roster_count(m.id) > 0 and m.signatures >= public.toolbox_roster_count(m.id);
