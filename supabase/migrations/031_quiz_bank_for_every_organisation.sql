-- ============================================================================
-- A QUIZ BANK FOR EVERY ORGANISATION (2026-09-05)
--
-- Migration 008 moved the safety quiz server-side and seeded the five standard
-- questions — but only for organisations that existed on that day. Nothing
-- seeded organisations created afterwards: signup_create_org() never wrote to
-- quiz_questions (only the Education sandbox path in 022 did), and there was
-- no builder screen to add questions. So every organisation created through
-- signup since 008 has had NO quiz: get_quiz() returns [], the stakeholder
-- portal says "No quiz set up yet", submit_quiz() raises, and the Quiz column
-- can never become Verified — every stakeholder stays "Site Access Pending"
-- forever. Confirmed on staging organisation 13 during the PI Training
-- rehearsal (six stakeholders, all blocked on the quiz alone).
--
-- Two things fix it:
--   * the app now has Policies → Safety Quiz, where builder staff create,
--     edit, order and retire questions (RLS from 008: their own organisation
--     only; organization_id comes from the column default my_org());
--   * this migration makes sure no organisation STARTS empty — the five
--     standard questions are seeded for every organisation that has none, and
--     for every organisation created from now on.
--
-- Nothing here touches quiz_attempts or any worker's quiz status; passing
-- still requires the stakeholder to sit the quiz. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Seed the standard five for one organisation — only when it has no questions
-- at all (a builder who has already tailored the bank is never overwritten).
-- Internal helper: callable only from the signup function and this migration.
-- ---------------------------------------------------------------------------
create or replace function public.seed_standard_quiz(p_org bigint)
returns int language plpgsql security definer set search_path = public as $fn$
declare n int;
begin
  if p_org is null then return 0; end if;
  if exists (select 1 from public.quiz_questions q where q.organization_id = p_org) then
    return 0;
  end if;
  insert into public.quiz_questions (organization_id, position, question, options, answer_index)
  select p_org, v.position, v.question, v.options, v.answer_index
  from (values
    (1,
     'What should you do FIRST if you witness a serious incident on site?',
     array['Take a photo for the report',
           'Ensure the area is safe and call for help / first aid',
           'Continue working and tell the supervisor later',
           'Move the injured person immediately'], 1),
    (2,
     'When is a SWMS required to be signed?',
     array['Only after an incident occurs',
           'Once a year regardless of task',
           'Before commencing any high-risk construction work',
           'It is optional for experienced workers'], 2),
    (3,
     'Which PPE is mandatory at all times on this site?',
     array['Hard hat, hi-vis and steel-capped boots',
           'Only when operating machinery',
           'Gloves and glasses only',
           'PPE is recommended but not enforced'], 0),
    (4,
     'What does an untagged piece of scaffolding mean?',
     array['It is brand new and safe to use',
           'It can be used with supervisor approval',
           'Do NOT use it — it has not been inspected/approved',
           'Only the top level is unsafe'], 2),
    (5,
     'Under Victorian OHS law, who must be notified of a notifiable incident?',
     array['The project architect only',
           'WorkSafe Victoria — immediately by phone',
           'The client within 48 hours',
           'No notification required for near misses'], 1)
  ) as v(position, question, options, answer_index);
  get diagnostics n = row_count;
  return n;
end $fn$;
revoke all on function public.seed_standard_quiz(bigint) from public;
revoke all on function public.seed_standard_quiz(bigint) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: every organisation that has no questions today gets the standard
-- five (education sandboxes already have theirs from 022 and are skipped by
-- the "has none" test like everyone else).
-- ---------------------------------------------------------------------------
do $do$
declare o record;
begin
  for o in select id from public.organizations loop
    perform public.seed_standard_quiz(o.id);
  end loop;
end $do$;

-- ---------------------------------------------------------------------------
-- Signup: same function as 001, plus the seed. A new builder's first
-- stakeholder can sit the quiz on day one.
-- ---------------------------------------------------------------------------
create or replace function public.signup_create_org(org_name text)
returns bigint language plpgsql security definer set search_path = public as $fn$
declare new_org bigint; existing bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select organization_id into existing from public.profiles where id = auth.uid();
  if existing is not null then return existing; end if;
  insert into public.organizations (name, created_by)
    values (coalesce(nullif(trim(org_name),''), 'My Company'), auth.uid())
    returning id into new_org;
  update public.profiles set organization_id = new_org, role = 'builder_admin', status = 'Active'
    where id = auth.uid();
  perform public.seed_standard_quiz(new_org);
  return new_org;
end $fn$;
grant execute on function public.signup_create_org(text) to authenticated;
