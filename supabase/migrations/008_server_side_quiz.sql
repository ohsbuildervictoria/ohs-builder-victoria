-- ============================================================================
-- THE SAFETY QUIZ BECOMES ENFORCEABLE (2026-07-25)
--
-- Until now the quiz proved nothing:
--   * the questions AND their correct answers shipped in the JS bundle
--     (src/data/constants.js -> quizQuestions, each with `answer: <index>`),
--     so anyone could read the key straight out of the browser;
--   * grading happened entirely in the browser; and
--   * update_my_compliance() accepted quiz = 'Verified' from the caller with
--     no evidence at all, so a tradie could mark themselves competent from the
--     console without opening the quiz.
--
-- For a product whose value is a *provable* competency record, that undercuts
-- the core claim: the register said "Quiz Verified" and could not stand behind
-- it. This migration moves the answer key and the grading server-side, and
-- keeps every attempt as evidence.
--
-- Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Question bank, per organisation so a builder can tailor it later.
-- `answer_index` never leaves the database: the table is readable only by
-- builder staff, and tradies reach the questions through get_quiz(), which
-- does not select that column.
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_questions (
  id bigint generated always as identity primary key,
  organization_id bigint not null default public.my_org() references public.organizations(id),
  position int not null default 0,
  question text not null,
  options text[] not null,
  answer_index int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.quiz_questions enable row level security;

drop policy if exists "quiz_questions: staff read" on public.quiz_questions;
create policy "quiz_questions: staff read" on public.quiz_questions
  for select to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org());

drop policy if exists "quiz_questions: staff write" on public.quiz_questions;
create policy "quiz_questions: staff write" on public.quiz_questions
  for all to authenticated
  using (public.is_builder_staff() and organization_id = public.my_org())
  with check (public.is_builder_staff() and organization_id = public.my_org());

-- ---------------------------------------------------------------------------
-- Every attempt is kept, passed or failed. This is the evidence the register
-- is claiming to hold: who sat it, when, what they scored. Insert happens only
-- through submit_quiz(); no update or delete policy exists, so an attempt
-- cannot be altered or quietly removed afterwards.
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id bigint generated always as identity primary key,
  organization_id bigint not null references public.organizations(id),
  worker_id bigint not null references public.workers(id) on delete cascade,
  score int not null,
  total int not null,
  passed boolean not null,
  answers jsonb not null default '[]'::jsonb,
  attempted_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;

drop policy if exists "quiz_attempts: read" on public.quiz_attempts;
create policy "quiz_attempts: read" on public.quiz_attempts
  for select to authenticated
  using (
    organization_id = public.my_org()
    and (
      public.is_builder_staff()
      or public.my_worker_id() is null
      or worker_id = public.my_worker_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Seed the five existing questions for every organisation that has none.
-- Same content the bundle used to carry — the difference is where the answers
-- now live.
-- ---------------------------------------------------------------------------
insert into public.quiz_questions (organization_id, position, question, options, answer_index)
select o.id, v.position, v.question, v.options, v.answer_index
from public.organizations o
cross join (values
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
) as v(position, question, options, answer_index)
where not exists (
  select 1 from public.quiz_questions q where q.organization_id = o.id
);

-- ---------------------------------------------------------------------------
-- What the tradie's browser is allowed to see: questions and options, never
-- the answer.
-- ---------------------------------------------------------------------------
create or replace function public.get_quiz()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
           'id', q.id, 'question', q.question, 'options', q.options
         ) order by q.position, q.id), '[]'::json)
  from public.quiz_questions q
  where q.organization_id = public.my_org() and q.active
$$;
grant execute on function public.get_quiz() to authenticated;

-- ---------------------------------------------------------------------------
-- Grade server-side. p_answers is [{ "id": <question id>, "answer": <index> }].
-- The pass mark is every question correct, matching what the UI has always
-- said. Only this function may set quiz = 'Verified'.
-- ---------------------------------------------------------------------------
create or replace function public.submit_quiz(p_answers jsonb)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  v_worker_id bigint;
  v_org bigint;
  v_total int;
  v_score int;
  v_passed boolean;
  v_wrong bigint[];
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  v_worker_id := public.my_worker_id();
  if v_worker_id is null then
    raise exception 'Only a linked stakeholder account can sit the quiz.';
  end if;
  select organization_id into v_org from public.workers where id = v_worker_id;
  if v_org is null or v_org <> public.my_org() then
    raise exception 'no linked worker record';
  end if;

  select count(*) into v_total
    from public.quiz_questions where organization_id = v_org and active;
  if v_total = 0 then raise exception 'No quiz has been set up for your builder yet.'; end if;

  select count(*) into v_score
  from public.quiz_questions q
  join lateral (
    select (a->>'answer')::int as given
    from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
    where (a->>'id')::bigint = q.id
    limit 1
  ) s on true
  where q.organization_id = v_org and q.active and s.given = q.answer_index;

  select coalesce(array_agg(q.id), '{}')
    into v_wrong
  from public.quiz_questions q
  left join lateral (
    select (a->>'answer')::int as given
    from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
    where (a->>'id')::bigint = q.id
    limit 1
  ) s on true
  where q.organization_id = v_org and q.active
    and (s.given is null or s.given <> q.answer_index);

  v_passed := v_score = v_total;

  insert into public.quiz_attempts
    (organization_id, worker_id, score, total, passed, answers)
  values (v_org, v_worker_id, v_score, v_total, v_passed, coalesce(p_answers, '[]'::jsonb));

  if v_passed then
    update public.workers set quiz = 'Verified' where id = v_worker_id;
    update public.workers w set status =
      case
        when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s = 'Missing') > 0
          then 'Site Access Pending'
        when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s <> 'Verified') > 0
          then 'Action Required'
        else 'Active'
      end
    where w.id = v_worker_id;
  end if;

  -- Which ones were wrong, so the tradie can be told what to review — but
  -- never which option was right, or the key leaks one attempt at a time.
  return json_build_object(
    'score', v_score, 'total', v_total, 'passed', v_passed,
    'incorrectQuestionIds', v_wrong
  );
end $fn$;
grant execute on function public.submit_quiz(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Close the self-certification hole: 'quiz' can no longer be set by the
-- worker-facing compliance RPC. Induction and SWMS are completion-driven and
-- stay as they are; the quiz now has a grader, so it does not need a manual
-- path. Builder staff can still correct it directly, which is deliberate.
-- ---------------------------------------------------------------------------
create or replace function public.update_my_compliance(category text, value text)
returns void language plpgsql security definer set search_path = public as $fn$
declare wid bigint;
begin
  if category = 'quiz' then
    raise exception 'The safety quiz is graded when it is submitted — it cannot be set directly.';
  end if;
  if category not in ('induction','swms') then
    raise exception 'category not allowed';
  end if;
  if value not in ('Verified','Pending','Missing') then
    raise exception 'value not allowed';
  end if;
  select worker_id into wid from public.profiles where id = auth.uid();
  if wid is null then raise exception 'no linked worker record'; end if;
  execute format('update public.workers set %I = $1 where id = $2', category)
    using value, wid;
  update public.workers w set status =
    case
      when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s = 'Missing') > 0
        then 'Site Access Pending'
      when (select count(*) from (values (w.induction),(w.quiz),(w.white_card),(w.insurance),(w.medical),(w.swms)) v(s) where v.s <> 'Verified') > 0
        then 'Action Required'
      else 'Active'
    end
  where w.id = wid;
end $fn$;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.quiz_questions)                       as questions_seeded,
  (select count(distinct organization_id) from public.quiz_questions) as orgs_covered,
  (select count(*) from pg_proc where proname = 'get_quiz')          as get_quiz_fn,
  (select count(*) from pg_proc where proname = 'submit_quiz')       as submit_quiz_fn;
