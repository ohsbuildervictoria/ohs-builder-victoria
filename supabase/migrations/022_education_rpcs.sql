-- ============================================================================
-- 022 — OHS BUILDER EDUCATION: RPCs (2026-08-22)
--
-- Everything that DECIDES something in Education happens here, in SECURITY
-- DEFINER functions that re-check the caller's rights, so the client can only
-- ever name a record id:
--   * institutions + invitations (platform admin / institution admin)
--   * accepting an invite, which PROVISIONS the student's sandbox organisation
--   * the evidence evaluator (Task → Platform Activity → Evidence → Progress)
--   * scenario events
--   * submissions (immutable snapshots) and assessment (S / NYS, finalise)
--   * the dashboards each role needs, in one call each
--   * my_permissions() — now also tells the client about the Education role
--     and hides Industry billing/admin UI inside a sandbox
--
-- Requires 021. Additive and idempotent.
-- ============================================================================

alter table public.edu_enrolments add column if not exists ui_state jsonb not null default '{}'::jsonb;

-- Memberships: invite tokens are never readable through the table. Admins get
-- them from edu_add_students() / edu_invite_member() / edu_invite_link().
-- (Client code must select explicit columns on edu_memberships — never "*".)
revoke select on public.edu_memberships from authenticated;
grant select (id, institution_id, user_id, edu_role, name, email, status, accepted_at, last_login, created_at)
  on public.edu_memberships to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Institutions (platform super admin only)
-- ---------------------------------------------------------------------------
create or replace function public.edu_create_institution(
  p_name text, p_admin_name text, p_admin_email text, p_is_demo boolean default false)
returns json language plpgsql security definer set search_path = public as $fn$
declare v_inst bigint; v_mem bigint; v_token uuid; v_email text;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required.';
  end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Give the institution a name.'; end if;
  v_email := lower(trim(coalesce(p_admin_email, '')));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'A valid administrator email is required.'; end if;

  insert into public.edu_institutions (name, is_demo, created_by, contact_name, contact_email)
  values (trim(p_name), coalesce(p_is_demo, false), auth.uid(), coalesce(trim(p_admin_name), ''), v_email)
  returning id into v_inst;

  insert into public.edu_memberships (institution_id, edu_role, name, email)
  values (v_inst, 'institution_admin', coalesce(trim(p_admin_name), ''), v_email)
  returning id, invite_token into v_mem, v_token;

  perform public._platform_audit('EDU_INSTITUTION_CREATED',
    jsonb_build_object('institutionId', v_inst, 'name', trim(p_name), 'adminEmail', v_email));

  return json_build_object('institutionId', v_inst, 'membershipId', v_mem, 'inviteToken', v_token);
end $fn$;
grant execute on function public.edu_create_institution(text, text, text, boolean) to authenticated;

-- Platform admin: list institutions with counts (metadata only).
create or replace function public.edu_platform_institutions()
returns json language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access required.';
  end if;
  return (select coalesce(json_agg(row_to_json(x) order by x.id), '[]'::json) from (
    select i.id, i.name, i.rto_number, i.status, i.is_demo, i.created_at, i.logo_url,
      (select count(*) from public.edu_memberships m where m.institution_id = i.id and m.edu_role = 'institution_admin') as admins,
      (select count(*) from public.edu_memberships m where m.institution_id = i.id and m.edu_role = 'assessor') as assessors,
      (select count(*) from public.edu_enrolments e where e.institution_id = i.id and e.status <> 'withdrawn') as students,
      (select count(*) from public.edu_cohorts c where c.institution_id = i.id) as cohorts,
      (select m.email from public.edu_memberships m where m.institution_id = i.id and m.edu_role = 'institution_admin' order by m.id limit 1) as first_admin_email,
      (select m.invite_token from public.edu_memberships m where m.institution_id = i.id and m.edu_role = 'institution_admin' and m.status = 'invited' order by m.id limit 1) as pending_admin_token
    from public.edu_institutions i) x);
end $fn$;
grant execute on function public.edu_platform_institutions() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Invitations
-- ---------------------------------------------------------------------------
-- Public preview (anon): what the invitee sees before setting a password.
create or replace function public.edu_invite_info(p_token uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'role', m.edu_role, 'name', m.name, 'email', m.email,
    'institutionName', i.name, 'logoUrl', i.logo_url, 'primaryColour', i.primary_colour,
    'claimed', (m.status <> 'invited'),
    'cohortName', (select c.name from public.edu_enrolments e join public.edu_cohorts c on c.id = e.cohort_id
                    where e.membership_id = m.id order by e.id limit 1),
    'scenarioTitle', (select s.title from public.edu_enrolments e join public.edu_cohorts c on c.id = e.cohort_id
                       join public.edu_scenarios s on s.id = c.scenario_id where e.membership_id = m.id order by e.id limit 1),
    'unitCode', (select u.code from public.edu_enrolments e join public.edu_cohorts c on c.id = e.cohort_id
                  join public.edu_programs p on p.id = c.program_id join public.edu_units u on u.id = p.unit_id
                 where e.membership_id = m.id order by e.id limit 1)
  )
  from public.edu_memberships m
  join public.edu_institutions i on i.id = m.institution_id
  where m.invite_token = p_token
$$;
grant execute on function public.edu_invite_info(uuid) to anon, authenticated;

-- Institution admin: invite an assessor or another admin.
create or replace function public.edu_invite_member(
  p_institution bigint, p_role text, p_name text, p_email text, p_cohort_ids bigint[] default '{}')
returns json language plpgsql security definer set search_path = public as $fn$
declare v_email text; v_mem record; v_token uuid; v_id bigint; c bigint;
begin
  if not public.edu_is_admin_of(p_institution) then
    raise exception 'Only an administrator of this institution can invite people.';
  end if;
  if p_role not in ('institution_admin','assessor') then
    raise exception 'Invite assessors or administrators here — students are enrolled into a cohort.';
  end if;
  v_email := lower(trim(coalesce(p_email, '')));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'A valid email address is required.'; end if;

  select * into v_mem from public.edu_memberships
   where institution_id = p_institution and email = v_email and edu_role = p_role;
  if found then
    if v_mem.status = 'active' then
      raise exception '% is already a member of this institution.', v_email;
    end if;
    if v_mem.status = 'deactivated' then
      update public.edu_memberships set status = 'invited', invite_token = gen_random_uuid(), name = coalesce(nullif(trim(p_name), ''), name)
       where id = v_mem.id returning id, invite_token into v_id, v_token;
    else
      v_id := v_mem.id; v_token := v_mem.invite_token;
      if v_token is null then
        update public.edu_memberships set invite_token = gen_random_uuid() where id = v_id returning invite_token into v_token;
      end if;
    end if;
  else
    insert into public.edu_memberships (institution_id, edu_role, name, email)
    values (p_institution, p_role, coalesce(trim(p_name), ''), v_email)
    returning id, invite_token into v_id, v_token;
  end if;

  if p_role = 'assessor' and coalesce(array_length(p_cohort_ids, 1), 0) > 0 then
    foreach c in array p_cohort_ids loop
      if not exists (select 1 from public.edu_cohorts where id = c and institution_id = p_institution) then
        raise exception 'One of those cohorts is not in your institution.';
      end if;
      insert into public.edu_cohort_assessors (cohort_id, membership_id) values (c, v_id)
      on conflict do nothing;
    end loop;
  end if;

  return json_build_object('membershipId', v_id, 'inviteToken', v_token, 'email', v_email, 'role', p_role);
end $fn$;
grant execute on function public.edu_invite_member(bigint, text, text, text, bigint[]) to authenticated;

-- Institution admin: re-read the invite link of an unclaimed membership.
create or replace function public.edu_invite_link(p_membership bigint)
returns json language plpgsql stable security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.edu_memberships where id = p_membership;
  if not found or not public.edu_is_admin_of(m.institution_id) then
    raise exception 'That invitation is not in your institution.';
  end if;
  if m.status <> 'invited' or m.invite_token is null then
    return json_build_object('claimed', true);
  end if;
  return json_build_object('claimed', false, 'inviteToken', m.invite_token, 'email', m.email, 'role', m.edu_role, 'name', m.name);
end $fn$;
grant execute on function public.edu_invite_link(bigint) to authenticated;

-- Institution admin: enrol students (manual or CSV). Each element of
-- p_students is {"name": "...", "email": "..."}. Returns per-row outcomes —
-- a partial import is reported, never disguised as a clean one.
create or replace function public.edu_add_students(p_cohort bigint, p_students jsonb)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  c record; item jsonb; v_name text; v_email text; v_mem record; v_mem_id bigint; v_token uuid;
  v_enr bigint; results jsonb := '[]'::jsonb; added int := 0; skipped int := 0; n int := 0;
begin
  select * into c from public.edu_cohorts where id = p_cohort;
  if not found or not public.edu_can_manage_cohort(p_cohort) then
    raise exception 'That cohort is not in your institution.';
  end if;
  if jsonb_typeof(p_students) <> 'array' then raise exception 'Expected a list of students.'; end if;
  if jsonb_array_length(p_students) > 500 then raise exception 'Import at most 500 students at a time.'; end if;

  for item in select * from jsonb_array_elements(p_students) loop
    n := n + 1;
    v_name := trim(coalesce(item->>'name', ''));
    v_email := lower(trim(coalesce(item->>'email', '')));
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      results := results || jsonb_build_object('row', n, 'name', v_name, 'email', v_email, 'status', 'error', 'message', 'Invalid email address');
      skipped := skipped + 1; continue;
    end if;
    if v_name = '' then v_name := split_part(v_email, '@', 1); end if;

    select * into v_mem from public.edu_memberships
     where institution_id = c.institution_id and email = v_email and edu_role = 'student';
    if found then
      v_mem_id := v_mem.id;
      if exists (select 1 from public.edu_enrolments e where e.membership_id = v_mem_id and e.cohort_id = p_cohort and e.status <> 'withdrawn') then
        select invite_token into v_token from public.edu_memberships where id = v_mem_id;
        results := results || jsonb_build_object('row', n, 'name', v_mem.name, 'email', v_email, 'status', 'skipped',
          'message', 'Already enrolled in this cohort', 'inviteToken', v_token, 'claimed', v_mem.status = 'active');
        skipped := skipped + 1; continue;
      end if;
      if exists (select 1 from public.edu_enrolments e where e.membership_id = v_mem_id and e.status <> 'withdrawn') then
        results := results || jsonb_build_object('row', n, 'name', v_mem.name, 'email', v_email, 'status', 'skipped',
          'message', 'Already enrolled in another cohort (one simulation per student in this release)');
        skipped := skipped + 1; continue;
      end if;
      if v_mem.status = 'deactivated' then
        update public.edu_memberships set status = 'invited', invite_token = gen_random_uuid(), name = v_name where id = v_mem_id;
      end if;
      select invite_token into v_token from public.edu_memberships where id = v_mem_id;
    else
      insert into public.edu_memberships (institution_id, edu_role, name, email)
      values (c.institution_id, 'student', v_name, v_email)
      returning id, invite_token into v_mem_id, v_token;
    end if;

    insert into public.edu_enrolments (institution_id, cohort_id, membership_id, student_name, student_email, status)
    values (c.institution_id, p_cohort, v_mem_id, v_name, v_email, 'invited')
    returning id into v_enr;

    results := results || jsonb_build_object('row', n, 'name', v_name, 'email', v_email, 'status', 'added',
      'enrolmentId', v_enr, 'membershipId', v_mem_id, 'inviteToken', v_token);
    added := added + 1;
  end loop;

  return json_build_object('added', added, 'skipped', skipped, 'rows', results);
end $fn$;
grant execute on function public.edu_add_students(bigint, jsonb) to authenticated;

create or replace function public.edu_assign_assessor(p_cohort bigint, p_membership bigint, p_assign boolean default true)
returns void language plpgsql security definer set search_path = public as $fn$
declare c record; m record;
begin
  select * into c from public.edu_cohorts where id = p_cohort;
  if not found or not public.edu_can_manage_cohort(p_cohort) then
    raise exception 'That cohort is not in your institution.';
  end if;
  select * into m from public.edu_memberships where id = p_membership;
  if not found or m.institution_id <> c.institution_id or m.edu_role <> 'assessor' then
    raise exception 'That person is not an assessor in your institution.';
  end if;
  if p_assign then
    insert into public.edu_cohort_assessors (cohort_id, membership_id) values (p_cohort, p_membership) on conflict do nothing;
  else
    delete from public.edu_cohort_assessors where cohort_id = p_cohort and membership_id = p_membership;
  end if;
end $fn$;
grant execute on function public.edu_assign_assessor(bigint, bigint, boolean) to authenticated;

create or replace function public.edu_withdraw_enrolment(p_enrolment bigint)
returns void language plpgsql security definer set search_path = public as $fn$
declare e record;
begin
  select * into e from public.edu_enrolments where id = p_enrolment;
  if not found or not public.edu_is_admin_of(e.institution_id) then
    raise exception 'That enrolment is not in your institution.';
  end if;
  update public.edu_enrolments set status = 'withdrawn' where id = p_enrolment;
  -- The student's sandbox stays (evidence is never destroyed) but the account
  -- can no longer sign in to it.
  update public.edu_memberships set status = 'deactivated', invite_token = null where id = e.membership_id;
  update public.profiles p set status = 'Deactivated'
    from public.edu_memberships m where m.id = e.membership_id and m.user_id = p.id;
end $fn$;
grant execute on function public.edu_withdraw_enrolment(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Accepting an invite — the student's sandbox is provisioned HERE.
-- ---------------------------------------------------------------------------
-- Internal: creates the sandbox organisation for an enrolment and wires the
-- signed-in student into it as its Builder Admin. Not callable by clients.
create or replace function public.edu_provision_sandbox(p_enrolment bigint, p_user uuid)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare e record; c record; s record; i record; v_org bigint; v_name text;
begin
  select * into e from public.edu_enrolments where id = p_enrolment;
  if not found then raise exception 'enrolment not found'; end if;
  if e.sandbox_org_id is not null then return e.sandbox_org_id; end if;
  select * into c from public.edu_cohorts where id = e.cohort_id;
  select * into i from public.edu_institutions where id = e.institution_id;
  select * into s from public.edu_scenarios where id = c.scenario_id;

  v_name := coalesce(nullif(e.student_name, ''), 'Student') || ' · ' || coalesce(s.title, 'Training') || ' (simulation)';
  insert into public.organizations (name, plan, state, tagline, built_by, created_by, kind, is_internal, edu_enrolment_id)
  values (v_name, 'Education', 'Victoria', 'Training simulation · ' || i.name, i.name, p_user, 'education_sandbox', true, e.id)
  returning id into v_org;

  -- Same five standard quiz questions every organisation gets (migration 008 /
  -- signup_create_org), so the stakeholder journey inside the sandbox works.
  insert into public.quiz_questions (organization_id, position, question, options, answer_index)
  select v_org, v.position, v.question, v.options, v.answer_index
  from (values
    (1,'What should you do FIRST if you witness a serious incident on site?',
     array['Take a photo for the report','Ensure the area is safe and call for help / first aid','Continue working and tell the supervisor later','Move the injured person immediately'], 1),
    (2,'When is a SWMS required to be signed?',
     array['Only after an incident occurs','Once a year regardless of task','Before commencing any high-risk construction work','It is optional for experienced workers'], 2),
    (3,'Which PPE is mandatory at all times on this site?',
     array['Hard hat, hi-vis and steel-capped boots','Only when operating machinery','Gloves and glasses only','PPE is recommended but not enforced'], 0),
    (4,'What does an untagged piece of scaffolding mean?',
     array['It is brand new and safe to use','It can be used with supervisor approval','Do NOT use it — it has not been inspected/approved','Only the top level is unsafe'], 2),
    (5,'Under Victorian OHS law, who must be notified of a notifiable incident?',
     array['The project architect only','WorkSafe Victoria — immediately by phone','The client within 48 hours','No notification required for near misses'], 1)
  ) as v(position, question, options, answer_index);

  update public.profiles
     set organization_id = v_org, role = 'builder_admin', status = 'Active',
         name = coalesce(nullif(name, ''), e.student_name)
   where id = p_user;

  update public.edu_enrolments
     set sandbox_org_id = v_org, status = 'not_started'
   where id = p_enrolment;

  return v_org;
end $fn$;
revoke execute on function public.edu_provision_sandbox(bigint, uuid) from public, anon, authenticated;

create or replace function public.edu_accept_invite(p_token uuid)
returns json language plpgsql security definer set search_path = public as $fn$
declare m record; my_email text; p record; e record; v_org bigint; v_role text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into m from public.edu_memberships where invite_token = p_token and status = 'invited';
  if not found then
    raise exception 'This invite link is invalid or has already been used.';
  end if;
  select email into my_email from auth.users where id = auth.uid();
  if lower(trim(my_email)) <> lower(trim(m.email)) then
    raise exception 'This invite was issued to % — sign in with that email address.', m.email;
  end if;
  select organization_id, role into p from public.profiles where id = auth.uid();
  if p.organization_id is not null then
    raise exception 'This account already belongs to a company workspace on OHS Builder Victoria. Ask your institution to issue the invitation to a different email address.';
  end if;

  if m.edu_role = 'student' then
    if exists (select 1 from public.edu_memberships x
                where x.user_id = auth.uid() and x.status = 'active' and x.edu_role <> 'student') then
      raise exception 'This account is already an assessor or administrator. A student account needs its own email address.';
    end if;
    update public.edu_memberships
       set user_id = auth.uid(), status = 'active', accepted_at = now(), invite_token = null, last_login = now()
     where id = m.id;
    for e in select * from public.edu_enrolments where membership_id = m.id and status = 'invited' order by id loop
      v_org := public.edu_provision_sandbox(e.id, auth.uid());
    end loop;
    v_role := 'student';
  else
    if exists (select 1 from public.edu_memberships x
                where x.user_id = auth.uid() and x.status = 'active' and x.edu_role = 'student') then
      raise exception 'This account is a student account. Ask for the invitation to be issued to a different email address.';
    end if;
    update public.profiles
       set role = m.edu_role, status = 'Active', name = coalesce(nullif(name, ''), m.name)
     where id = auth.uid();
    update public.edu_memberships
       set user_id = auth.uid(), status = 'active', accepted_at = now(), invite_token = null, last_login = now()
     where id = m.id;
    v_role := m.edu_role;
  end if;

  insert into public.security_audit (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (v_org, auth.uid(), v_role, m.name, 'EDU_INVITE_ACCEPTED', 'edu_memberships', m.id::text,
          jsonb_build_object('institutionId', m.institution_id, 'role', v_role, 'sandboxOrgId', v_org));

  return json_build_object('role', v_role, 'institutionId', m.institution_id, 'sandboxOrgId', v_org);
end $fn$;
grant execute on function public.edu_accept_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. The evidence evaluator — Task → Platform Activity → Evidence → Progress
--
-- A stage's evidence_rule is JSON evaluated against the student's sandbox:
--   {"all":[...]} | {"any":[...]}
--   {"exists":"<table>", "where":{...}}
--   {"count":"<table>", "min":N, "where":{...}}
--   {"submission":true}      (complete once any submission exists)
-- where := {"<col>": "value"} | {"<col>": {"in":[...]}} | {"<col>": {"contains":"v"}}
--          | {"<col>": {"nonempty":true}} | {"<col>": {"ne":"value"}}
-- Tables and columns are whitelisted; values are passed as literals. New
-- units and scenarios reuse this vocabulary without code changes.
-- ---------------------------------------------------------------------------
create or replace function public.edu_rule_table_ok(p_table text)
returns boolean language sql immutable as $$
  select p_table in ('projects','workers','subbie_companies','swms_templates','swms_signatures','swms_revisions',
    'project_risks','incidents','corrective_actions','diary_entries','toolbox_meetings','toolbox_signatures',
    'induction_completions','policies','compliance_documents','company_documents','project_documents',
    'record_photos','site_checkins','quiz_attempts','audit_log')
$$;

-- Column → SQL expression. Anything not listed is refused.
create or replace function public.edu_rule_col(p_col text)
returns text language sql immutable as $$
  select case p_col
    when 'induction_rules' then '(induction->>''rules'')'
    when 'induction_muster' then '(induction->>''musterPoint'')'
    when 'type' then 'type' when 'status' then 'status' when 'severity' then 'severity'
    when 'induction' then 'induction' when 'quiz' then 'quiz' when 'swms' then 'swms'
    when 'white_card' then 'white_card' when 'insurance' then 'insurance' when 'medical' then 'medical'
    when 'source' then 'source' when 'category' then 'category' when 'trade' then 'trade'
    when 'tags' then 'tags' when 'notifiable' then 'notifiable' when 'lost_time' then 'lost_time'
    when 'signed_by_staff' then 'signed_by_staff' when 'on_paper' then 'on_paper'
    when 'entity' then 'entity' when 'action' then 'action' when 'review_date' then 'review_date'
    when 'controls' then 'controls' when 'residual_likelihood' then 'residual_likelihood'
    when 'residual_consequence' then 'residual_consequence' when 'likelihood' then 'likelihood'
    when 'consequence' then 'consequence' when 'notified_at' then 'notified_at'
    when 'immediate_action' then 'immediate_action' when 'description' then 'description'
    when 'points' then 'points' when 'presenter' then 'presenter' when 'notes' then 'notes'
    when 'weather' then 'weather' when 'labour' then 'labour' when 'hours' then 'hours'
    when 'assigned_to' then 'assigned_to' when 'closed_at' then 'closed_at' when 'due' then 'due'
    when 'name' then 'name' when 'address' then 'address' when 'project_manager' then 'project_manager'
    when 'start_date' then 'start_date' when 'locked' then 'locked' when 'version' then 'version'
    when 'account_status' then 'account_status' when 'employer' then 'employer' when 'email' then 'email'
    when 'expiry_date' then 'expiry_date' when 'file_path' then 'file_path' when 'passed' then 'passed'
    else null end
$$;

create or replace function public.edu_rule_where(p_where jsonb)
returns text language plpgsql immutable as $fn$
declare k text; v jsonb; expr text; clauses text[] := '{}'; arr text[];
begin
  if p_where is null or jsonb_typeof(p_where) <> 'object' then return ''; end if;
  for k, v in select * from jsonb_each(p_where) loop
    expr := public.edu_rule_col(k);
    if expr is null then raise exception 'evidence rule: column % is not allowed', k; end if;
    if jsonb_typeof(v) = 'object' then
      if v ? 'in' then
        select coalesce(array_agg(x), '{}') into arr from jsonb_array_elements_text(v->'in') x;
        clauses := clauses || format('%s::text = any(%L::text[])', expr, arr);
      elsif v ? 'contains' then
        clauses := clauses || format('%L = any(%s)', v->>'contains', expr);
      elsif v ? 'nonempty' then
        clauses := clauses || format('coalesce(%s::text, '''') <> ''''', expr);
      elsif v ? 'ne' then
        clauses := clauses || format('%s::text is distinct from %L', expr, v->>'ne');
      elsif v ? 'gte' then
        clauses := clauses || format('(%s)::numeric >= %L::numeric', expr, v->>'gte');
      elsif v ? 'lte' then
        clauses := clauses || format('(%s)::numeric <= %L::numeric', expr, v->>'lte');
      else
        raise exception 'evidence rule: unknown operator on %', k;
      end if;
    else
      clauses := clauses || format('%s::text = %L', expr, v#>>'{}');
    end if;
  end loop;
  if array_length(clauses, 1) is null then return ''; end if;
  return ' and ' || array_to_string(clauses, ' and ');
end $fn$;

create or replace function public.edu_eval_rule(p_org bigint, p_rule jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare sub jsonb; parts jsonb := '[]'::jsonb; r jsonb; ok boolean; tbl text; n bigint; want int; sql text;
begin
  if p_rule is null or p_rule = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'count', 0, 'note', 'no rule');
  end if;
  if p_rule ? 'all' then
    ok := true;
    for sub in select * from jsonb_array_elements(p_rule->'all') loop
      r := public.edu_eval_rule(p_org, sub);
      parts := parts || r;
      ok := ok and coalesce((r->>'ok')::boolean, false);
    end loop;
    return jsonb_build_object('ok', ok, 'parts', parts);
  end if;
  if p_rule ? 'any' then
    ok := false;
    for sub in select * from jsonb_array_elements(p_rule->'any') loop
      r := public.edu_eval_rule(p_org, sub);
      parts := parts || r;
      ok := ok or coalesce((r->>'ok')::boolean, false);
    end loop;
    return jsonb_build_object('ok', ok, 'parts', parts);
  end if;
  if p_rule ? 'submission' then
    -- resolved by the caller (needs the enrolment, not the org)
    return jsonb_build_object('ok', false, 'count', 0, 'submission', true);
  end if;
  tbl := coalesce(p_rule->>'exists', p_rule->>'count');
  if tbl is null or not public.edu_rule_table_ok(tbl) then
    raise exception 'evidence rule: table % is not allowed', coalesce(tbl, '(none)');
  end if;
  if p_org is null then
    return jsonb_build_object('ok', false, 'count', 0, 'table', tbl);
  end if;
  want := case when p_rule ? 'count' then greatest(coalesce((p_rule->>'min')::int, 1), 1) else 1 end;
  sql := format('select count(*) from public.%I where organization_id = $1 %s', tbl, public.edu_rule_where(p_rule->'where'));
  execute sql into n using p_org;
  return jsonb_build_object('ok', n >= want, 'count', n, 'min', want, 'table', tbl);
end $fn$;
revoke execute on function public.edu_eval_rule(bigint, jsonb) from public, anon, authenticated;

-- Evaluates every stage of the enrolment's scenario, caches the answer, and
-- moves the enrolment to in_progress on the first completed stage.
create or replace function public.edu_evaluate_progress(p_enrolment bigint)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  e record; c record; st record; r jsonb; ok boolean; has_sub boolean; v_status text;
  stages jsonb := '[]'::jsonb; total int := 0; done int := 0; first_done timestamptz;
begin
  if not public.edu_can_view_enrolment(p_enrolment) then
    raise exception 'That enrolment is not available to you.';
  end if;
  select * into e from public.edu_enrolments where id = p_enrolment;
  v_status := e.status;
  select * into c from public.edu_cohorts where id = e.cohort_id;
  has_sub := exists (select 1 from public.edu_submissions s where s.enrolment_id = p_enrolment);

  for st in select * from public.edu_scenario_stages where scenario_id = c.scenario_id order by position, id loop
    total := total + 1;
    if st.evidence_rule ? 'submission' then
      ok := has_sub; r := jsonb_build_object('ok', ok, 'submission', true);
    else
      begin
        r := public.edu_eval_rule(e.sandbox_org_id, st.evidence_rule);
        ok := coalesce((r->>'ok')::boolean, false);
      exception when others then
        r := jsonb_build_object('ok', false, 'error', sqlerrm); ok := false;
      end;
    end if;
    if ok then done := done + 1; end if;

    insert into public.edu_stage_progress as sp (enrolment_id, stage_id, complete, evidence, first_completed_at, evaluated_at)
    values (p_enrolment, st.id, ok, r, case when ok then now() end, now())
    on conflict (enrolment_id, stage_id) do update
      set complete = excluded.complete,
          evidence = excluded.evidence,
          first_completed_at = coalesce(sp.first_completed_at, excluded.first_completed_at),
          evaluated_at = now()
    returning first_completed_at into first_done;

    stages := stages || jsonb_build_object(
      'stageId', st.id, 'code', st.code, 'title', st.title, 'position', st.position,
      'complete', ok, 'evidence', r, 'firstCompletedAt', first_done);
  end loop;

  if done > 0 and v_status = 'not_started' then
    update public.edu_enrolments set status = 'in_progress', started_at = coalesce(started_at, now()) where id = p_enrolment;
    v_status := 'in_progress';
  end if;

  return json_build_object(
    'enrolmentId', p_enrolment, 'status', v_status, 'stages', stages,
    'completed', done, 'total', total,
    'percent', case when total = 0 then 0 else round(100.0 * done / total) end);
end $fn$;
grant execute on function public.edu_evaluate_progress(bigint) to authenticated;

create or replace function public.edu_my_progress()
returns json language plpgsql security definer set search_path = public as $fn$
declare v bigint;
begin
  v := public.edu_my_enrolment_id();
  if v is null then raise exception 'No training enrolment is linked to this account.'; end if;
  return public.edu_evaluate_progress(v);
end $fn$;
grant execute on function public.edu_my_progress() to authenticated;

-- Student: merge a small UI-state patch (tour seen, welcome seen …).
create or replace function public.edu_set_ui_state(p_patch jsonb)
returns json language plpgsql security definer set search_path = public as $fn$
declare v bigint; out jsonb;
begin
  v := public.edu_my_enrolment_id();
  if v is null then raise exception 'No training enrolment is linked to this account.'; end if;
  update public.edu_enrolments set ui_state = ui_state || coalesce(p_patch, '{}'::jsonb) where id = v
    returning ui_state into out;
  return out::json;
end $fn$;
grant execute on function public.edu_set_ui_state(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Scenario events
--   trigger := {"type":"start"} | {"type":"stage_complete","stage":"S5"}
-- ---------------------------------------------------------------------------
create or replace function public.edu_events_for(p_enrolment bigint)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare e record; c record; ev record; avail boolean; st_complete boolean; out jsonb := '[]'::jsonb; se record;
begin
  select * into e from public.edu_enrolments where id = p_enrolment;
  select * into c from public.edu_cohorts where id = e.cohort_id;
  for ev in select x.*, s.code as stage_code, s.title as stage_title
              from public.edu_scenario_events x left join public.edu_scenario_stages s on s.id = x.stage_id
             where x.scenario_id = c.scenario_id order by x.position, x.id loop
    if coalesce(ev.trigger->>'type', 'start') = 'stage_complete' then
      select coalesce(bool_or(p.complete), false) into st_complete
        from public.edu_stage_progress p join public.edu_scenario_stages s on s.id = p.stage_id
       where p.enrolment_id = p_enrolment and s.scenario_id = c.scenario_id and s.code = ev.trigger->>'stage';
      avail := st_complete;
    else
      avail := true;
    end if;
    select * into se from public.edu_student_events where enrolment_id = p_enrolment and event_id = ev.id;
    if avail and not found and p_enrolment = public.edu_my_enrolment_id() then
      insert into public.edu_student_events (enrolment_id, event_id) values (p_enrolment, ev.id)
      on conflict do nothing;
      select * into se from public.edu_student_events where enrolment_id = p_enrolment and event_id = ev.id;
    end if;
    out := out || jsonb_build_object(
      'id', ev.id, 'code', ev.code, 'title', ev.title, 'body', ev.body, 'responseHint', ev.response_hint,
      'stageId', ev.stage_id, 'stageCode', ev.stage_code, 'stageTitle', ev.stage_title, 'trigger', ev.trigger,
      'state', case when not avail then 'locked' when se.acknowledged_at is not null then 'acknowledged' else 'new' end,
      'deliveredAt', se.delivered_at, 'acknowledgedAt', se.acknowledged_at, 'response', coalesce(se.response, '{}'::jsonb));
  end loop;
  return out;
end $fn$;
revoke execute on function public.edu_events_for(bigint) from public, anon, authenticated;

create or replace function public.edu_acknowledge_event(p_event bigint, p_response jsonb default '{}'::jsonb)
returns json language plpgsql security definer set search_path = public as $fn$
declare v bigint;
begin
  v := public.edu_my_enrolment_id();
  if v is null then raise exception 'No training enrolment is linked to this account.'; end if;
  insert into public.edu_student_events (enrolment_id, event_id, acknowledged_at, response)
  values (v, p_event, now(), coalesce(p_response, '{}'::jsonb))
  on conflict (enrolment_id, event_id) do update
    set acknowledged_at = coalesce(public.edu_student_events.acknowledged_at, now()),
        response = public.edu_student_events.response || excluded.response;
  return json_build_object('ok', true);
end $fn$;
grant execute on function public.edu_acknowledge_event(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Submissions: an immutable, versioned snapshot of the sandbox
-- ---------------------------------------------------------------------------
create or replace function public.edu_snapshot_org(p_org bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare t text; part jsonb; out jsonb := '{}'::jsonb; counts jsonb := '{}'::jsonb;
begin
  if p_org is null then return out; end if;
  foreach t in array array['projects','workers','subbie_companies','swms_templates','swms_signatures','swms_revisions',
    'project_risks','incidents','corrective_actions','diary_entries','toolbox_meetings','toolbox_signatures',
    'induction_completions','policies','compliance_documents','company_documents','project_documents',
    'record_photos','site_checkins','quiz_attempts','audit_log'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t) order by t.id), ''[]''::jsonb) from public.%I t where t.organization_id = $1', t)
      into part using p_org;
    out := out || jsonb_build_object(t, part);
    counts := counts || jsonb_build_object(t, jsonb_array_length(part));
  end loop;
  out := out || jsonb_build_object(
    'organization', (select to_jsonb(o) - 'notifications' from public.organizations o where o.id = p_org),
    'counts', counts,
    'takenAt', now());
  return out;
end $fn$;
revoke execute on function public.edu_snapshot_org(bigint) from public, anon, authenticated;

create or replace function public.edu_submit_for_assessment(p_note text default '')
returns json language plpgsql security definer set search_path = public as $fn$
declare v bigint; e record; prog json; missing text[]; ver int; sub_id bigint; snap jsonb; my_name text;
begin
  v := public.edu_my_enrolment_id();
  if v is null then raise exception 'No training enrolment is linked to this account.'; end if;
  select * into e from public.edu_enrolments where id = v;
  if e.sandbox_org_id is null then raise exception 'Your simulation workspace is not set up yet.'; end if;
  if e.status = 'completed' then raise exception 'This assessment is already complete.'; end if;
  if exists (select 1 from public.edu_submissions s where s.enrolment_id = v and s.status in ('submitted','under_review')) then
    raise exception 'Your previous submission is still with your assessor. You can resubmit once it has been returned.';
  end if;

  prog := public.edu_evaluate_progress(v);
  select coalesce(array_agg(st.v->>'title' order by (st.v->>'position')::int), '{}') into missing
    from jsonb_array_elements((prog::jsonb)->'stages') as st(v)
   where not coalesce((st.v->>'complete')::boolean, false)
     and not coalesce((st.v->'evidence'->>'submission')::boolean, false);
  if array_length(missing, 1) > 0 then
    raise exception 'Finish these tasks before submitting: %', array_to_string(missing, ', ');
  end if;

  snap := public.edu_snapshot_org(e.sandbox_org_id);
  select coalesce(max(version), 0) + 1 into ver from public.edu_submissions where enrolment_id = v;
  select name into my_name from public.profiles where id = auth.uid();

  insert into public.edu_submissions (enrolment_id, institution_id, cohort_id, version, submitted_by, student_note, snapshot, progress)
  values (v, e.institution_id, e.cohort_id, ver, auth.uid(), coalesce(trim(p_note), ''), snap, prog::jsonb)
  returning id into sub_id;

  update public.edu_enrolments set status = 'ready_for_assessment', submitted_at = now() where id = v;
  perform public.edu_evaluate_progress(v);   -- the "Submit evidence" stage now completes

  insert into public.security_audit (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (e.sandbox_org_id, auth.uid(), 'student', my_name, 'EDU_SUBMITTED', 'edu_submissions', sub_id::text,
          jsonb_build_object('enrolmentId', v, 'version', ver, 'counts', snap->'counts'));

  return json_build_object('id', sub_id, 'version', ver, 'submittedAt', now());
end $fn$;
grant execute on function public.edu_submit_for_assessment(text) to authenticated;

-- The criteria an assessor must decide for a submission: the institution's own
-- mapping for (unit, scenario) if it has one, otherwise the shipped default.
create or replace function public.edu_effective_mappings(p_institution bigint, p_unit bigint, p_scenario bigint)
returns table (criterion_id bigint, stage_id bigint, institution_id bigint)
language sql stable security definer set search_path = public as $$
  with own as (
    select m.criterion_id, m.stage_id, m.institution_id from public.edu_criteria_mappings m
     where m.institution_id = p_institution and m.unit_id = p_unit and m.scenario_id = p_scenario)
  select * from own
  union all
  select m.criterion_id, m.stage_id, m.institution_id from public.edu_criteria_mappings m
   where m.institution_id is null and m.unit_id = p_unit and m.scenario_id = p_scenario
     and not exists (select 1 from own)
$$;
grant execute on function public.edu_effective_mappings(bigint, bigint, bigint) to authenticated;

create or replace function public.edu_record_result(p_submission bigint, p_criterion bigint, p_result text, p_comment text default '')
returns json language plpgsql security definer set search_path = public as $fn$
declare s record; c record; p record; my_name text; out record;
begin
  select * into s from public.edu_submissions where id = p_submission;
  if not found then raise exception 'Submission not found.'; end if;
  if not (s.cohort_id = any(public.edu_assessor_cohort_ids())) then
    raise exception 'Only an assessor assigned to this cohort can assess it.';
  end if;
  if s.status not in ('submitted','under_review') then
    raise exception 'This submission has been finalised. Assess the student''s next submission instead.';
  end if;
  if p_result not in ('satisfactory','not_yet_satisfactory') then raise exception 'Result must be Satisfactory or Not Yet Satisfactory.'; end if;
  select * into c from public.edu_cohorts where id = s.cohort_id;
  select * into p from public.edu_programs where id = c.program_id;
  if not exists (select 1 from public.edu_unit_criteria uc where uc.id = p_criterion and uc.unit_id = p.unit_id) then
    raise exception 'That criterion does not belong to this unit.';
  end if;
  select name into my_name from public.profiles where id = auth.uid();

  insert into public.edu_assessment_results (submission_id, criterion_id, result, comment, assessed_by, assessed_by_name)
  values (p_submission, p_criterion, p_result, coalesce(trim(p_comment), ''), auth.uid(), coalesce(my_name, ''))
  on conflict (submission_id, criterion_id) do update
    set result = excluded.result, comment = excluded.comment,
        assessed_by = excluded.assessed_by, assessed_by_name = excluded.assessed_by_name, assessed_at = now()
  returning * into out;

  if s.status = 'submitted' then
    update public.edu_submissions set status = 'under_review' where id = p_submission;
  end if;
  return json_build_object('id', out.id, 'criterionId', out.criterion_id, 'result', out.result,
    'comment', out.comment, 'assessedBy', out.assessed_by_name, 'assessedAt', out.assessed_at);
end $fn$;
grant execute on function public.edu_record_result(bigint, bigint, text, text) to authenticated;

create or replace function public.edu_finalise_assessment(p_submission bigint, p_outcome text, p_comment text default '')
returns json language plpgsql security definer set search_path = public as $fn$
declare s record; c record; p record; e record; my_name text; required int; decided int; nys int; new_status text;
begin
  select * into s from public.edu_submissions where id = p_submission;
  if not found then raise exception 'Submission not found.'; end if;
  if not (s.cohort_id = any(public.edu_assessor_cohort_ids())) then
    raise exception 'Only an assessor assigned to this cohort can finalise it.';
  end if;
  if s.status not in ('submitted','under_review') then raise exception 'This submission has already been finalised.'; end if;
  if p_outcome not in ('completed','returned_nys') then raise exception 'Outcome must be completed or returned_nys.'; end if;
  select * into c from public.edu_cohorts where id = s.cohort_id;
  select * into p from public.edu_programs where id = c.program_id;
  select * into e from public.edu_enrolments where id = s.enrolment_id;

  with req as (select distinct criterion_id from public.edu_effective_mappings(s.institution_id, p.unit_id, c.scenario_id))
  select count(*),
         count(*) filter (where exists (select 1 from public.edu_assessment_results r where r.submission_id = p_submission and r.criterion_id = req.criterion_id)),
         count(*) filter (where exists (select 1 from public.edu_assessment_results r where r.submission_id = p_submission and r.criterion_id = req.criterion_id and r.result = 'not_yet_satisfactory'))
    into required, decided, nys
    from req;
  if required = 0 then
    -- no mapping seeded: every criterion of the unit is required
    select count(*),
           count(*) filter (where exists (select 1 from public.edu_assessment_results r where r.submission_id = p_submission and r.criterion_id = uc.id)),
           count(*) filter (where exists (select 1 from public.edu_assessment_results r where r.submission_id = p_submission and r.criterion_id = uc.id and r.result = 'not_yet_satisfactory'))
      into required, decided, nys
      from public.edu_unit_criteria uc where uc.unit_id = p.unit_id;
  end if;
  if decided < required then
    raise exception 'Record a result for every mapped criterion first (% of % done).', decided, required;
  end if;
  if p_outcome = 'completed' and nys > 0 then
    raise exception 'Every criterion must be Satisfactory to complete — % still Not Yet Satisfactory. Return the work instead.', nys;
  end if;
  if p_outcome = 'returned_nys' and nys = 0 then
    raise exception 'Every criterion is Satisfactory — complete the assessment instead of returning it.';
  end if;

  select name into my_name from public.profiles where id = auth.uid();
  update public.edu_submissions
     set status = p_outcome, outcome_comment = coalesce(trim(p_comment), ''),
         decided_by = auth.uid(), decided_by_name = coalesce(my_name, ''), decided_at = now()
   where id = p_submission;

  new_status := case when p_outcome = 'completed' then 'completed' else 'action_required' end;
  update public.edu_enrolments
     set status = new_status, completed_at = case when p_outcome = 'completed' then now() else completed_at end
   where id = s.enrolment_id;

  insert into public.security_audit (organization_id, actor_id, actor_role, actor_name, action, table_name, row_id, details)
  values (e.sandbox_org_id, auth.uid(), 'assessor', my_name, 'EDU_ASSESSMENT_FINALISED', 'edu_submissions', p_submission::text,
          jsonb_build_object('enrolmentId', s.enrolment_id, 'version', s.version, 'outcome', p_outcome,
                             'criteria', required, 'notYetSatisfactory', nys));

  return json_build_object('submissionId', p_submission, 'outcome', p_outcome, 'enrolmentStatus', new_status, 'decidedAt', now());
end $fn$;
grant execute on function public.edu_finalise_assessment(bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Dashboards — one call per screen
-- ---------------------------------------------------------------------------
create or replace function public.edu_institution_json(p_inst bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', i.id, 'name', i.name, 'legalName', i.legal_name, 'rtoNumber', i.rto_number,
    'website', i.website, 'address', i.address, 'contactName', i.contact_name, 'contactEmail', i.contact_email,
    'supportEmail', i.support_email, 'department', i.department, 'campus', i.campus,
    'logoUrl', i.logo_url, 'primaryColour', i.primary_colour, 'secondaryColour', i.secondary_colour,
    'status', i.status, 'isDemo', i.is_demo, 'onboarding', i.onboarding, 'createdAt', i.created_at)
  from public.edu_institutions i where i.id = p_inst
$$;
revoke execute on function public.edu_institution_json(bigint) from public, anon, authenticated;

create or replace function public.edu_scenario_json(p_scenario bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', s.id, 'code', s.code, 'title', s.title, 'summary', s.summary,
    'description', s.description, 'projectBrief', s.project_brief, 'studentRole', s.student_role,
    'supportingDocs', s.supporting_docs, 'assessorNotes', s.assessor_notes,
    'stages', (select coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'code', st.code, 'position', st.position,
        'title', st.title, 'objective', st.objective, 'whyItMatters', st.why_it_matters, 'instructions', st.instructions,
        'featureRoute', st.feature_route, 'featureLabel', st.feature_label, 'evidenceLabel', st.evidence_label,
        'evidenceRule', st.evidence_rule, 'assessorNotes', st.assessor_notes) order by st.position, st.id), '[]'::jsonb)
      from public.edu_scenario_stages st where st.scenario_id = s.id),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('id', ev.id, 'code', ev.code, 'position', ev.position,
        'title', ev.title, 'body', ev.body, 'stageId', ev.stage_id, 'trigger', ev.trigger, 'responseHint', ev.response_hint)
        order by ev.position, ev.id), '[]'::jsonb)
      from public.edu_scenario_events ev where ev.scenario_id = s.id))
  from public.edu_scenarios s where s.id = p_scenario
$$;
revoke execute on function public.edu_scenario_json(bigint) from public, anon, authenticated;

create or replace function public.edu_unit_json(p_unit bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', u.id, 'code', u.code, 'title', u.title, 'release', u.release, 'sourceNote', u.source_note,
    'qualification', (select jsonb_build_object('id', q.id, 'code', q.code, 'title', q.title) from public.edu_qualifications q where q.id = u.qualification_id),
    'criteria', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', c.code, 'element', c.element, 'text', c.text,
        'evidenceHint', c.evidence_hint, 'position', c.position) order by c.position, c.id), '[]'::jsonb)
      from public.edu_unit_criteria c where c.unit_id = u.id))
  from public.edu_units u where u.id = p_unit
$$;
revoke execute on function public.edu_unit_json(bigint) from public, anon, authenticated;

create or replace function public.edu_submissions_json(p_enrolment bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'version', s.version, 'submittedAt', s.submitted_at,
    'studentNote', s.student_note, 'status', s.status, 'outcomeComment', s.outcome_comment,
    'decidedByName', s.decided_by_name, 'decidedAt', s.decided_at, 'progress', s.progress,
    'counts', s.snapshot->'counts',
    'results', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'criterionId', r.criterion_id,
        'criterionCode', uc.code, 'criterionText', uc.text, 'result', r.result, 'comment', r.comment,
        'assessedByName', r.assessed_by_name, 'assessedAt', r.assessed_at) order by uc.position, uc.id), '[]'::jsonb)
      from public.edu_assessment_results r join public.edu_unit_criteria uc on uc.id = r.criterion_id
     where r.submission_id = s.id)) order by s.version desc), '[]'::jsonb)
  from public.edu_submissions s where s.enrolment_id = p_enrolment
$$;
revoke execute on function public.edu_submissions_json(bigint) from public, anon, authenticated;

create or replace function public.edu_mappings_json(p_institution bigint, p_unit bigint, p_scenario bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'source', case when exists (select 1 from public.edu_criteria_mappings m where m.institution_id = p_institution and m.unit_id = p_unit and m.scenario_id = p_scenario)
                   then 'institution' else 'default' end,
    'rows', (select coalesce(jsonb_agg(jsonb_build_object('criterionId', em.criterion_id, 'stageId', em.stage_id)), '[]'::jsonb)
               from public.edu_effective_mappings(p_institution, p_unit, p_scenario) em))
$$;
revoke execute on function public.edu_mappings_json(bigint, bigint, bigint) from public, anon, authenticated;

-- Student home: everything the training dashboard needs. VOLATILE on purpose
-- (it evaluates progress and records newly available events).
create or replace function public.edu_student_home()
returns json language plpgsql security definer set search_path = public as $fn$
declare v bigint; e record; c record; p record; prog json; first_project bigint; m record;
begin
  v := public.edu_my_enrolment_id();
  if v is null then raise exception 'No training enrolment is linked to this account.'; end if;
  select * into e from public.edu_enrolments where id = v;
  select * into c from public.edu_cohorts where id = e.cohort_id;
  select * into p from public.edu_programs where id = c.program_id;
  select * into m from public.edu_memberships where id = e.membership_id;
  update public.edu_memberships set last_login = now() where id = e.membership_id;
  prog := public.edu_evaluate_progress(v);
  select id into first_project from public.projects where organization_id = e.sandbox_org_id order by id limit 1;

  return json_build_object(
    'enrolment', jsonb_build_object('id', e.id, 'status', e.status, 'startedAt', e.started_at, 'submittedAt', e.submitted_at,
                                    'completedAt', e.completed_at, 'uiState', e.ui_state, 'sandboxOrgId', e.sandbox_org_id,
                                    'projectId', first_project),
    'student', jsonb_build_object('name', m.name, 'email', m.email),
    'institution', public.edu_institution_json(e.institution_id),
    'cohort', jsonb_build_object('id', c.id, 'name', c.name, 'startDate', c.start_date, 'endDate', c.end_date, 'campus', c.campus),
    'program', jsonb_build_object('id', p.id, 'name', p.name, 'intake', p.intake, 'campus', p.campus, 'department', p.department),
    'unit', public.edu_unit_json(p.unit_id),
    'scenario', public.edu_scenario_json(c.scenario_id),
    'mappings', public.edu_mappings_json(e.institution_id, p.unit_id, c.scenario_id),
    'assessors', (select coalesce(jsonb_agg(jsonb_build_object('name', am.name, 'email', am.email)), '[]'::jsonb)
                    from public.edu_cohort_assessors ca join public.edu_memberships am on am.id = ca.membership_id
                   where ca.cohort_id = c.id and am.status = 'active'),
    'progress', prog,
    'events', public.edu_events_for(v),
    'submissions', public.edu_submissions_json(v),
    'evidenceCounts', (select s->'counts' from (select public.edu_snapshot_org(e.sandbox_org_id) s) x)
  );
end $fn$;
grant execute on function public.edu_student_home() to authenticated;

create or replace function public.edu_assessor_home()
returns json language plpgsql security definer set search_path = public as $fn$
declare m record;
begin
  select * into m from public.edu_memberships
   where user_id = auth.uid() and status = 'active' and edu_role = 'assessor' and public.is_active_account()
   order by id limit 1;
  if not found then raise exception 'This account is not an assessor.'; end if;
  update public.edu_memberships set last_login = now() where id = m.id;
  return json_build_object(
    'assessor', jsonb_build_object('membershipId', m.id, 'name', m.name, 'email', m.email, 'acceptedAt', m.accepted_at),
    'institution', public.edu_institution_json(m.institution_id),
    'cohorts', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'status', c.status, 'startDate', c.start_date, 'endDate', c.end_date, 'campus', c.campus,
        'programName', p.name, 'unitCode', u.code, 'unitTitle', u.title, 'qualificationCode', q.code, 'qualificationTitle', q.title,
        'scenarioTitle', s.title,
        'students', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status <> 'withdrawn'),
        'readyForAssessment', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status = 'ready_for_assessment'),
        'inProgress', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status = 'in_progress'),
        'notStarted', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status in ('invited','not_started')),
        'actionRequired', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status = 'action_required'),
        'completed', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status = 'completed')
      ) order by c.start_date nulls last, c.id), '[]'::jsonb)
      from public.edu_cohort_assessors ca
      join public.edu_cohorts c on c.id = ca.cohort_id
      join public.edu_programs p on p.id = c.program_id
      left join public.edu_units u on u.id = p.unit_id
      left join public.edu_qualifications q on q.id = p.qualification_id
      left join public.edu_scenarios s on s.id = c.scenario_id
     where ca.membership_id = m.id)
  );
end $fn$;
grant execute on function public.edu_assessor_home() to authenticated;

create or replace function public.edu_cohort_board(p_cohort bigint)
returns json language plpgsql stable security definer set search_path = public as $fn$
declare c record; p record;
begin
  select * into c from public.edu_cohorts where id = p_cohort;
  if not found then raise exception 'Cohort not found.'; end if;
  if not (public.edu_can_manage_cohort(p_cohort) or p_cohort = any(public.edu_assessor_cohort_ids())) then
    raise exception 'That cohort is not available to you.';
  end if;
  select * into p from public.edu_programs where id = c.program_id;
  return json_build_object(
    'cohort', jsonb_build_object('id', c.id, 'name', c.name, 'status', c.status, 'startDate', c.start_date, 'endDate', c.end_date,
                                 'campus', c.campus, 'expectedStudents', c.expected_students, 'institutionId', c.institution_id),
    'program', jsonb_build_object('id', p.id, 'name', p.name, 'intake', p.intake, 'campus', p.campus),
    'unit', public.edu_unit_json(p.unit_id),
    'scenario', public.edu_scenario_json(c.scenario_id),
    'mappings', public.edu_mappings_json(c.institution_id, p.unit_id, c.scenario_id),
    'assessors', (select coalesce(jsonb_agg(jsonb_build_object('membershipId', am.id, 'name', am.name, 'email', am.email, 'status', am.status)), '[]'::jsonb)
                    from public.edu_cohort_assessors ca join public.edu_memberships am on am.id = ca.membership_id where ca.cohort_id = c.id),
    'students', (select coalesce(jsonb_agg(jsonb_build_object(
        'enrolmentId', e.id, 'name', e.student_name, 'email', e.student_email, 'status', e.status,
        'startedAt', e.started_at, 'submittedAt', e.submitted_at, 'completedAt', e.completed_at,
        'sandboxOrgId', e.sandbox_org_id, 'membershipStatus', m.status, 'lastLogin', m.last_login,
        'completedStages', (select count(*) from public.edu_stage_progress sp where sp.enrolment_id = e.id and sp.complete),
        'totalStages', (select count(*) from public.edu_scenario_stages st where st.scenario_id = c.scenario_id),
        'lastActivity', greatest(e.submitted_at, (select max(sp.evaluated_at) from public.edu_stage_progress sp where sp.enrolment_id = e.id), m.last_login),
        'latestSubmission', (select jsonb_build_object('id', s.id, 'version', s.version, 'status', s.status, 'submittedAt', s.submitted_at, 'decidedAt', s.decided_at)
                               from public.edu_submissions s where s.enrolment_id = e.id order by s.version desc limit 1)
      ) order by e.student_name, e.id), '[]'::jsonb)
      from public.edu_enrolments e join public.edu_memberships m on m.id = e.membership_id
     where e.cohort_id = c.id and e.status <> 'withdrawn')
  );
end $fn$;
grant execute on function public.edu_cohort_board(bigint) to authenticated;

create or replace function public.edu_review_bundle(p_enrolment bigint)
returns json language plpgsql security definer set search_path = public as $fn$
declare e record; c record; p record; m record;
begin
  if not public.edu_can_view_enrolment(p_enrolment) then raise exception 'That student is not available to you.'; end if;
  select * into e from public.edu_enrolments where id = p_enrolment;
  select * into c from public.edu_cohorts where id = e.cohort_id;
  select * into p from public.edu_programs where id = c.program_id;
  select * into m from public.edu_memberships where id = e.membership_id;
  return json_build_object(
    'enrolment', jsonb_build_object('id', e.id, 'status', e.status, 'startedAt', e.started_at, 'submittedAt', e.submitted_at,
                                    'completedAt', e.completed_at, 'sandboxOrgId', e.sandbox_org_id, 'institutionId', e.institution_id),
    'student', jsonb_build_object('name', e.student_name, 'email', e.student_email, 'membershipStatus', m.status, 'lastLogin', m.last_login),
    'institution', public.edu_institution_json(e.institution_id),
    'cohort', jsonb_build_object('id', c.id, 'name', c.name, 'startDate', c.start_date, 'endDate', c.end_date, 'campus', c.campus),
    'program', jsonb_build_object('id', p.id, 'name', p.name, 'intake', p.intake),
    'unit', public.edu_unit_json(p.unit_id),
    'scenario', public.edu_scenario_json(c.scenario_id),
    'mappings', public.edu_mappings_json(e.institution_id, p.unit_id, c.scenario_id),
    'progress', public.edu_evaluate_progress(p_enrolment),
    'events', public.edu_events_for(p_enrolment),
    'submissions', public.edu_submissions_json(p_enrolment),
    'canAssess', (e.cohort_id = any(public.edu_assessor_cohort_ids())),
    'assessors', (select coalesce(jsonb_agg(jsonb_build_object('name', am.name)), '[]'::jsonb)
                    from public.edu_cohort_assessors ca join public.edu_memberships am on am.id = ca.membership_id where ca.cohort_id = c.id)
  );
end $fn$;
grant execute on function public.edu_review_bundle(bigint) to authenticated;

-- Frozen snapshot of one submission (large; fetched on demand).
create or replace function public.edu_submission_snapshot(p_submission bigint)
returns json language plpgsql stable security definer set search_path = public as $fn$
declare s record;
begin
  select * into s from public.edu_submissions where id = p_submission;
  if not found or not public.edu_can_view_enrolment(s.enrolment_id) then raise exception 'That submission is not available to you.'; end if;
  return json_build_object('id', s.id, 'version', s.version, 'submittedAt', s.submitted_at, 'status', s.status,
    'snapshot', s.snapshot, 'progress', s.progress);
end $fn$;
grant execute on function public.edu_submission_snapshot(bigint) to authenticated;

create or replace function public.edu_institution_overview(p_institution bigint)
returns json language plpgsql security definer set search_path = public as $fn$
declare m record; i record;
begin
  if not public.edu_is_admin_of(p_institution) then raise exception 'Only an administrator of this institution can view this.'; end if;
  select * into i from public.edu_institutions where id = p_institution;
  select * into m from public.edu_memberships where user_id = auth.uid() and institution_id = p_institution and edu_role = 'institution_admin' and status = 'active' order by id limit 1;
  if found then update public.edu_memberships set last_login = now() where id = m.id; end if;
  return json_build_object(
    'institution', public.edu_institution_json(p_institution),
    'admin', jsonb_build_object('name', m.name, 'email', m.email),
    'counts', jsonb_build_object(
      'programs', (select count(*) from public.edu_programs x where x.institution_id = p_institution and x.status = 'active'),
      'cohorts', (select count(*) from public.edu_cohorts x where x.institution_id = p_institution and x.status <> 'closed'),
      'assessors', (select count(*) from public.edu_memberships x where x.institution_id = p_institution and x.edu_role = 'assessor' and x.status <> 'deactivated'),
      'assessorsPending', (select count(*) from public.edu_memberships x where x.institution_id = p_institution and x.edu_role = 'assessor' and x.status = 'invited'),
      'students', (select count(*) from public.edu_enrolments x where x.institution_id = p_institution and x.status <> 'withdrawn'),
      'invited', (select count(*) from public.edu_enrolments x where x.institution_id = p_institution and x.status = 'invited'),
      'notStarted', (select count(*) from public.edu_enrolments x where x.institution_id = p_institution and x.status = 'not_started'),
      'inProgress', (select count(*) from public.edu_enrolments x where x.institution_id = p_institution and x.status = 'in_progress'),
      'readyForAssessment', (select count(*) from public.edu_enrolments x where x.institution_id = p_institution and x.status = 'ready_for_assessment'),
      'actionRequired', (select count(*) from public.edu_enrolments x where x.institution_id = p_institution and x.status = 'action_required'),
      'completed', (select count(*) from public.edu_enrolments x where x.institution_id = p_institution and x.status = 'completed')),
    'setup', jsonb_build_object(
      'profile', (coalesce(i.contact_email, '') <> '' and coalesce(i.address, '') <> ''),
      'branding', coalesce(i.logo_url, '') <> '',
      'program', exists (select 1 from public.edu_programs x where x.institution_id = p_institution),
      'cohort', exists (select 1 from public.edu_cohorts x where x.institution_id = p_institution),
      'assessor', exists (select 1 from public.edu_memberships x where x.institution_id = p_institution and x.edu_role = 'assessor'),
      'students', exists (select 1 from public.edu_enrolments x where x.institution_id = p_institution)),
    'cohorts', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'status', c.status, 'startDate', c.start_date, 'endDate', c.end_date, 'campus', c.campus,
        'programName', p.name, 'unitCode', u.code, 'scenarioTitle', s.title,
        'students', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status <> 'withdrawn'),
        'readyForAssessment', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status = 'ready_for_assessment'),
        'actionRequired', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status = 'action_required'),
        'completed', (select count(*) from public.edu_enrolments e where e.cohort_id = c.id and e.status = 'completed'),
        'assessors', (select coalesce(jsonb_agg(am.name), '[]'::jsonb) from public.edu_cohort_assessors ca join public.edu_memberships am on am.id = ca.membership_id where ca.cohort_id = c.id)
      ) order by c.start_date nulls last, c.id), '[]'::jsonb)
      from public.edu_cohorts c join public.edu_programs p on p.id = c.program_id
      left join public.edu_units u on u.id = p.unit_id left join public.edu_scenarios s on s.id = c.scenario_id
     where c.institution_id = p_institution)
  );
end $fn$;
grant execute on function public.edu_institution_overview(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. my_permissions(): the Education block, and Industry billing/admin UI
--    hidden inside a sandbox. Every pre-existing key keeps its meaning.
-- ---------------------------------------------------------------------------
create or replace function public.edu_permissions_json()
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare m record; e record; i record;
begin
  if auth.uid() is null or not public.is_active_account() then return null; end if;
  select * into m from public.edu_memberships
   where user_id = auth.uid() and status = 'active'
   order by case edu_role when 'institution_admin' then 0 when 'assessor' then 1 else 2 end, id
   limit 1;
  if not found then return null; end if;
  select * into i from public.edu_institutions where id = m.institution_id;
  if m.edu_role = 'student' then
    select * into e from public.edu_enrolments where membership_id = m.id and status <> 'withdrawn' order by created_at desc limit 1;
    return jsonb_build_object('role', 'student', 'institutionId', m.institution_id, 'institutionName', i.name,
      'logoUrl', i.logo_url, 'primaryColour', i.primary_colour, 'secondaryColour', i.secondary_colour,
      'enrolmentId', e.id, 'cohortId', e.cohort_id, 'enrolmentStatus', e.status, 'sandbox', true,
      'uiState', coalesce(e.ui_state, '{}'::jsonb));
  end if;
  return jsonb_build_object('role', m.edu_role, 'institutionId', m.institution_id, 'institutionName', i.name,
    'logoUrl', i.logo_url, 'primaryColour', i.primary_colour, 'secondaryColour', i.secondary_colour, 'sandbox', false,
    'institutions', (select coalesce(jsonb_agg(jsonb_build_object('id', x.institution_id, 'role', x.edu_role, 'name', xi.name)), '[]'::jsonb)
                       from public.edu_memberships x join public.edu_institutions xi on xi.id = x.institution_id
                      where x.user_id = auth.uid() and x.status = 'active'));
end $fn$;
revoke execute on function public.edu_permissions_json() from public, anon, authenticated;

create or replace function public.is_sandbox_org()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select o.kind = 'education_sandbox' from public.organizations o where o.id = public.my_org()), false)
$$;
grant execute on function public.is_sandbox_org() to authenticated;

create or replace function public.my_permissions()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'role', public.my_role(),
    'organizationId', public.my_org(),
    'projectIds', public.my_project_ids(),
    'isBuilder', public.is_builder(),
    'isHse', public.is_hse(),
    'isSupervisor', public.is_supervisor(),
    'dashboard', public.is_org_safety() or public.is_supervisor(),
    'projects', public.is_builder(),
    'compliance', public.is_org_safety(),
    'swms', public.is_org_safety(),
    'diary', public.is_org_safety() or public.is_supervisor(),
    'incidents', public.is_org_safety() or public.is_supervisor(),
    'toolbox', public.is_org_safety() or public.is_supervisor(),
    'reports', public.is_org_safety(),
    -- Inside a training sandbox the student is the builder, but account
    -- administration, billing and organisation settings are not part of the
    -- simulation — the institution owns those.
    'admin', public.is_builder() and not public.is_sandbox_org(),
    'policies', public.is_org_safety(),
    'welcome', public.my_org() is not null
               or public.is_org_safety() or public.is_supervisor(),
    'billing', public.is_builder() and not public.is_sandbox_org(),
    'manageUsers', public.is_builder() and not public.is_sandbox_org(),
    'orgSettings', public.is_builder() and not public.is_sandbox_org(),
    'platform', public.is_platform_admin(),
    'sandbox', public.is_sandbox_org(),
    'education', public.edu_permissions_json()
  )
$$;
grant execute on function public.my_permissions() to authenticated;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_proc where proname in ('edu_create_institution','edu_invite_info','edu_invite_member','edu_add_students',
     'edu_accept_invite','edu_provision_sandbox','edu_eval_rule','edu_evaluate_progress','edu_my_progress','edu_student_home',
     'edu_assessor_home','edu_cohort_board','edu_review_bundle','edu_submit_for_assessment','edu_record_result',
     'edu_finalise_assessment','edu_institution_overview','edu_platform_institutions','is_sandbox_org')) as rpcs_present,
  has_function_privilege('authenticated', 'public.edu_provision_sandbox(bigint, uuid)', 'execute') as provision_exposed_should_be_false,
  has_function_privilege('authenticated', 'public.edu_eval_rule(bigint, jsonb)', 'execute') as eval_exposed_should_be_false,
  (select (public.my_permissions()::jsonb) ? 'education') as permissions_has_education;
