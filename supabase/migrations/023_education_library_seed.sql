-- ============================================================================
-- 023 — OHS BUILDER EDUCATION: PLATFORM LIBRARY SEED (2026-08-22)
--
-- The shipped (institution_id = null) library: one qualification, one unit
-- with an INDICATIVE criteria summary, one carefully built scenario —
-- Riverside Apartments — with ten stages, three site events and the default
-- stage → criterion mapping. Institutions may copy/replace any of it.
--
-- The unit text here is an orientation summary. It is NOT the training
-- package; the institution / RTO replaces it with the unit's current release
-- and owns the assessment mapping. Nothing here certifies anything.
--
-- Idempotent: keyed on codes; re-running updates content in place and leaves
-- ids (and therefore cohorts/progress) intact.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Qualification + unit + criteria
-- ---------------------------------------------------------------------------
insert into public.edu_qualifications (institution_id, code, title)
select null, 'CPC40120', 'Certificate IV in Building and Construction'
where not exists (select 1 from public.edu_qualifications where institution_id is null and code = 'CPC40120');

insert into public.edu_units (institution_id, qualification_id, code, title, release, source_note)
select null, (select id from public.edu_qualifications where institution_id is null and code = 'CPC40120'),
  'CPCCBC4002', 'Manage work health and safety in the building and construction workplace', '',
  'Indicative summary of performance criteria for orientation only. Replace with the current unit of competency text from training.gov.au and confirm the assessment mapping against your RTO''s training and assessment strategy.'
where not exists (select 1 from public.edu_units where institution_id is null and code = 'CPCCBC4002');

update public.edu_units set source_note = 'Indicative summary of performance criteria for orientation only. Replace with the current unit of competency text from training.gov.au and confirm the assessment mapping against your RTO''s training and assessment strategy.'
 where institution_id is null and code = 'CPCCBC4002';

with u as (select id from public.edu_units where institution_id is null and code = 'CPCCBC4002'),
v(code, element, txt, hint, pos) as (values
  ('1.1', 'Evaluate WHS compliance requirements', 'Identify the WHS legislation, regulations, codes of practice and standards that apply to the project and the work being done.', 'Project record; policy register; SWMS legislation references.', 1),
  ('1.2', 'Evaluate WHS compliance requirements', 'Identify the duty holders on the project (builder, subcontractors, workers) and their WHS responsibilities.', 'Project record; stakeholder register; induction content.', 2),
  ('1.3', 'Evaluate WHS compliance requirements', 'Evaluate the site against WHS requirements and record the findings.', 'Risk register; site inspection entries in the diary.', 3),
  ('2.1', 'Establish WHS systems on site', 'Establish the project''s WHS documentation — site rules, induction content, emergency arrangements and policies.', 'Project induction settings; policies register.', 4),
  ('2.2', 'Establish WHS systems on site', 'Implement a site induction process for every person before they enter site.', 'Induction completion records on the compliance matrix.', 5),
  ('2.3', 'Establish WHS systems on site', 'Verify contractor and worker compliance documentation before work commences.', 'Stakeholder records; compliance matrix; SWMS sign-offs.', 6),
  ('3.1', 'Manage risks and hazards', 'Identify hazards on site and record them in a risk register.', 'Risk register entries.', 7),
  ('3.2', 'Manage risks and hazards', 'Assess each risk using a consistent method (likelihood x consequence).', 'Risk register ratings.', 8),
  ('3.3', 'Manage risks and hazards', 'Select and implement controls following the hierarchy of control, and record the residual risk.', 'Risk register controls and residual ratings.', 9),
  ('3.4', 'Manage risks and hazards', 'Review SWMS for high-risk construction work and ensure they are signed before that work starts.', 'SWMS register and signature register.', 10),
  ('3.5', 'Manage risks and hazards', 'Monitor and review controls, revising SWMS when the work, the conditions or the controls change.', 'SWMS revisions; risk register review dates; diary notes.', 11),
  ('4.1', 'Consult, communicate and respond', 'Consult workers and subcontractors on WHS matters and keep a record of the consultation.', 'Toolbox meeting and attendance records.', 12),
  ('4.2', 'Consult, communicate and respond', 'Respond to WHS non-compliance on site — for example work about to start without an accepted SWMS.', 'Stakeholder/SWMS records following the site event; diary notes.', 13),
  ('4.3', 'Consult, communicate and respond', 'Report and investigate incidents and near misses, assign corrective actions and close them out.', 'Incident report; corrective actions.', 14),
  ('4.4', 'Consult, communicate and respond', 'Determine whether an incident is notifiable and what the regulator must be told.', 'Incident classification and notification fields.', 15),
  ('5.1', 'Monitor, review and keep records', 'Carry out workplace safety inspections or audits and record the outcomes.', 'Diary entries tagged Inspection; risk register reviews.', 16),
  ('5.2', 'Monitor, review and keep records', 'Maintain WHS records that demonstrate compliance over time.', 'Site diary; registers; audit trail.', 17),
  ('5.3', 'Monitor, review and keep records', 'Compile and present WHS evidence for review.', 'Submitted evidence snapshot.', 18)
)
insert into public.edu_unit_criteria (unit_id, code, element, text, evidence_hint, position)
select u.id, v.code, v.element, v.txt, v.hint, v.pos from u, v
on conflict (unit_id, code) do update
  set element = excluded.element, text = excluded.text, evidence_hint = excluded.evidence_hint, position = excluded.position;

-- ---------------------------------------------------------------------------
-- 2. Scenario: Riverside Apartments
-- ---------------------------------------------------------------------------
insert into public.edu_scenarios (institution_id, code, title, summary, description, project_brief, student_role, supporting_docs, assessor_notes)
select null, 'RIVERSIDE', 'Riverside Apartments',
  'A six-storey residential apartment development beside a creek and established homes. You are the builder''s site manager, responsible for setting up and running the site''s WHS system.',
  $d$You have just been appointed Site Manager for Riverside Apartments — six storeys of apartments over a basement car park at 14–18 Creekside Drive, beside Merri Creek and a row of established houses. Construction starts in two weeks.

Your job in this simulation is to establish and manage the site's work health and safety system using the same tools a real builder uses: set up the project, find and assess the hazards, put controls in place, run the induction, check SWMS before high-risk work starts, deal with what happens on site, consult your crew, and keep the records that prove it all.

Nothing here is real — it is your own private practice site. Take your time, and do the work properly: your assessor will look at the actual records you create, not at whether you clicked through the steps.$d$,
  jsonb_build_object(
    'name', 'Riverside Apartments',
    'address', '14-18 Creekside Drive, Riverside VIC 3099',
    'description', 'Six-storey residential apartment building (42 apartments) over a single-level basement car park, with a landscaped creek-side setback.',
    'contractType', 'Lump Sum',
    'contractValue', 18400000,
    'client', 'Creekside Living Pty Ltd',
    'duration', '18 months',
    'storeys', 6,
    'keyFeatures', jsonb_build_array(
      'Basement excavation to 3.2 m, 8 m from the creek bank',
      'Tower crane on site from month 2',
      'Concrete frame with precast panels; 2-storey timber-frame roof level',
      'Live residential neighbours on the north and east boundaries',
      'Single access point off Creekside Drive (school bus route, 8:00-9:00 and 3:00-4:00)',
      'Overhead power lines along the Creekside Drive frontage'),
    'trades', jsonb_build_array('Formworker', 'Concreter', 'Crane Operator', 'Steel Fixer', 'Electrician', 'Plumber', 'Carpenter', 'Scaffolder', 'Painter'),
    'constraints', jsonb_build_array(
      'Council permit: no noisy work before 7:00 am, none on Sundays',
      'Creek is an environmental protection zone — no runoff or spoil',
      'Delivery vehicles must not queue on Creekside Drive')),
  'Site Manager / Builder responsible for establishing and managing the site''s WHS system.',
  jsonb_build_array(
    jsonb_build_object('title', 'Project brief', 'type', 'brief',
      'content', 'Creekside Living has engaged your company under a lump-sum contract ($18.4M, 18 months) to build Riverside Apartments: 42 apartments over six storeys, single-level basement, landscaped setback to Merri Creek. Start on site in two weeks. Handover to the client PM, Priya Nair, for any client matters.'),
    jsonb_build_object('title', 'Site plan summary', 'type', 'site',
      'content', 'Rectangular site 62 m x 38 m. Creek on the south (8 m from the basement edge). Houses on the north and east boundaries (1.5 m from the hoarding). Creekside Drive frontage on the west with overhead 22 kV lines 1.2 m outside the boundary. Single site gate at the north-west corner. Crane pad centre-south. Site sheds along the north boundary.'),
    jsonb_build_object('title', 'Subcontractor list (first 3 months)', 'type', 'contractors',
      'content', 'Earthworks & piling: Deepfield Civil (excavation to 3.2 m, shoring). Formwork/concrete: MasterForm Pty Ltd (12 workers). Crane: Skyline Cranes (tower crane, dogmen). Steel fixing: RebarPro. In-ground services: Hydro-Flow Plumbing (trenching >1.5 m). Electrical: BrightSpark Electrical. Scaffold: SafeDeck Scaffolding.'),
    jsonb_build_object('title', 'Known site hazards to think about', 'type', 'hazards',
      'content', 'Deep excavation near a watercourse; crane over a public road and neighbours; overhead power lines at the gate; live traffic and a school bus route; silica dust from concrete and masonry; work at height from level 2 up; confined basement during fit-out; noise and dust to neighbours; deliveries in a single-access site.'),
    jsonb_build_object('title', 'Who''s who', 'type', 'people',
      'content', 'You - Site Manager. Marcus Doyle - Construction Manager (your boss). Priya Nair - Client project manager. Leanne Ford - HSE Manager (2 days a week). Each subcontractor has a nominated supervisor who will sign in at the gate.')),
  'Students will create genuine records in their own sandbox. Use the Evidence panel to open each record. Expect variation in detail; what matters is that the WHS system exists, hangs together, and that the student responded sensibly to the two site events. Stage rules are a floor for "done", not a grade.'
where not exists (select 1 from public.edu_scenarios where institution_id is null and code = 'RIVERSIDE');

-- Stages (upsert by code so content can be refined without breaking progress).
with s as (select id from public.edu_scenarios where institution_id is null and code = 'RIVERSIDE'),
v(pos, code, title, objective, why, instructions, route, route_label, ev_label, rule, anotes) as (values
  (1, 'S1', 'Establish the project',
   'Create the Riverside Apartments project in OHS Builder and make it Active.',
   'Every WHS record you make - risks, inductions, SWMS, incidents, diary - hangs off a project. A builder cannot manage a site the system does not know about.',
   $i$1. Open **Projects** and click **+ New Project**.
2. Use the brief: name **Riverside Apartments**, address **14-18 Creekside Drive, Riverside VIC 3099**, contract type **Lump Sum**, value **18,400,000**, yourself as project manager, a start date two weeks from today.
3. Set the status to **Active** and save.
4. Open the project and read its Overview — this is the site you are now responsible for.$i$,
   '/builder/projects', 'Projects', 'Project record',
   '{"exists":"projects"}'::jsonb,
   'Check the project reflects the brief (address, value, status Active). A renamed or placeholder project is fine if the content is right.'),
  (2, 'S2', 'Identify site hazards',
   'Build the project risk register: at least eight hazards specific to Riverside Apartments.',
   'You cannot control what you have not found. The register is where the site''s hazards are written down, rated and owned - it is the backbone of the WHS management plan.',
   $i$1. Open your project and go to the **Risk Register** tab.
2. Use **Add from SWMS library** for the trades on your subcontractor list (excavation, crane, formwork, steel fixing, electrical, plumbing, scaffold).
3. Then add the hazards that are particular to this site - the creek, the neighbours 1.5 m away, overhead power lines at the gate, the school bus route, silica dust, work at height.
4. Give each hazard a likelihood and consequence rating. Aim for at least **eight** entries.$i$,
   '/builder/projects/{projectId}?tab=Risk%20Register', 'Project → Risk Register', 'Risk register entries',
   '{"count":"project_risks","min":8}'::jsonb,
   'Look for site-specific hazards from the brief (creek, power lines, neighbours, traffic, silica, heights), not only library items.'),
  (3, 'S3', 'Establish controls',
   'Record the controls for each significant hazard, rate the residual risk and mark the hazard Controlled.',
   'Rating a risk is only half the job. The hierarchy of control - eliminate, substitute, isolate, engineer, administrate, then PPE - is how a builder actually makes the site safer, and the residual rating shows whether it worked.',
   $i$1. In the **Risk Register**, edit each High or Extreme hazard.
2. Write the controls you will put in place (think hierarchy of control: can it be eliminated or isolated before you rely on PPE?).
3. Set the **residual** likelihood and consequence, nominate an owner and a review date, and change the status to **Controlled**.
4. Do this for at least **six** hazards, including the creek-side excavation and the crane.$i$,
   '/builder/projects/{projectId}?tab=Risk%20Register', 'Project → Risk Register', 'Controls + residual ratings',
   '{"all":[{"count":"project_risks","min":6,"where":{"controls":{"nonempty":true}}},{"count":"project_risks","min":4,"where":{"status":"Controlled"}}]}'::jsonb,
   'Controls should be specific (shoring design, exclusion zones, crane lift plan, tiger tails on the power lines), not "be careful".'),
  (4, 'S4', 'Set up site induction and access',
   'Write this site''s induction, add your first stakeholders and record that at least one has been inducted.',
   'Nobody enters a construction site without an induction. Your site rules, muster point and emergency contact are what a tradie reads at the gate on their phone - and the compliance matrix is how you know who is cleared to work.',
   $i$1. Open your project and go to the **Induction** tab. Write the site rules for Riverside Apartments (hours, the single gate, deliveries, the creek, PPE), the muster point and your contact details. Save.
2. Go to **Compliance → + Add Stakeholder** and add at least **three** people from the subcontractor list with their trades (for example a Formworker from MasterForm, a Crane Operator from Skyline, an Electrician from BrightSpark).
3. For at least one of them, record their induction: on the compliance matrix click the **Induction** cell → **Record sign-off**. (In a real job they would complete it on their phone via the invite link - you can try that too.)$i$,
   '/builder/projects/{projectId}?tab=Induction', 'Project → Induction, then Compliance', 'Induction content + stakeholder records + induction completion',
   '{"all":[{"exists":"projects","where":{"induction_rules":{"nonempty":true}}},{"count":"workers","min":3},{"exists":"induction_completions"}]}'::jsonb,
   'Induction text should reflect the brief (gate, hours, creek, power lines). Stakeholders should carry real trades from the library.'),
  (5, 'S5', 'Review and manage SWMS',
   'Make sure a SWMS exists for each high-risk trade on site and that sign-offs are recorded before the work starts.',
   'High-risk construction work (excavation over 1.5 m, work at height, cranes, live power) legally needs a Safe Work Method Statement that the workers doing the job have read and signed. The register must be able to show who signed which version.',
   $i$1. Open **SWMS**. A template appears for each trade you added; open one and read what it covers.
2. Record a sign-off for at least one stakeholder: either **SWMS → Sign** (as the builder recording a paper sign-off) or on the **Compliance** matrix click their **SWMS** cell → **Record sign-off**.
3. Look at the signature register under the template - that list is your evidence.$i$,
   '/builder/swms', 'SWMS', 'SWMS templates + signature register',
   '{"all":[{"exists":"swms_templates"},{"exists":"swms_signatures"}]}'::jsonb,
   'Signatures recorded by the builder are flagged signed_by_staff; that is acceptable here - the point is the register exists and is used.'),
  (6, 'S6', 'Respond to a subcontractor compliance problem',
   'Deal with a crew that arrives to do high-risk work without an acceptable SWMS — without letting the work start.',
   'This happens on real sites every week. The builder''s duty is to stop the work until the SWMS is in place and the workers have signed it - and to leave a record that shows you did.',
   $i$Read the **Site update** event on your dashboard first.

1. Do not let the plumbing crew start trenching.
2. Go to **Compliance → + Add Stakeholder** and add the Hydro-Flow crew (trade **Plumber**, employer Hydro-Flow Plumbing).
3. Open **SWMS** - a Plumber SWMS now exists. Review it against the job (trenching over 1.5 m, services, a creek nearby).
4. Only once the SWMS is acceptable, record the crew''s sign-offs (Compliance matrix → SWMS → Record sign-off, or SWMS → Sign).
5. Note what happened in the **Site Diary** for today.$i$,
   '/builder/compliance', 'Compliance → Stakeholders / SWMS', 'Plumber stakeholder + Plumber SWMS + sign-offs',
   '{"all":[{"exists":"workers","where":{"trade":"Plumber"}},{"exists":"swms_templates","where":{"trade":"Plumber"}},{"count":"swms_signatures","min":2}]}'::jsonb,
   'The sequence matters: stakeholder added, SWMS in place, then sign-off. A diary note explaining the stop is strong evidence of 4.2.'),
  (7, 'S7', 'Report and manage an incident',
   'Report the incident from the site event, investigate it, assign corrective actions and work it towards closure.',
   'An incident register that is honest and complete is the most important WHS record a builder keeps. Corrective actions are how the same thing is stopped from happening again - and the system will not let a notifiable incident close without WorkSafe being recorded.',
   $i$Read the **Incident** event on your dashboard first.

1. Open **Incidents → Report incident**. Choose the type and severity that match what happened (a person was hurt; first aid only), fill in where, who, what was done immediately, and mark the injury on the body diagram.
2. Decide whether it is notifiable to WorkSafe - for a minor first-aid injury it is not; if you believe it is, you must record the notification.
3. Add at least one **corrective action** (for example lead management / cable covers, a toolbox reminder) with an owner and due date.
4. Move the incident status along as you go (Investigating → Corrective Actions Assigned ...).$i$,
   '/builder/incidents', 'Incidents', 'Incident report + corrective action(s)',
   '{"all":[{"exists":"incidents"},{"exists":"corrective_actions"}]}'::jsonb,
   'Check type/severity are sensible (Injury / Illness, Minor), the body map is used, and the corrective action addresses the cause.'),
  (8, 'S8', 'Hold a toolbox meeting (consultation)',
   'Run a toolbox meeting about the incident and the week ahead, and record who attended.',
   'Consultation is a legal duty, not a courtesy. A toolbox record with a real attendance register is how you prove the crew were told about the hazard and had a say.',
   $i$1. Open **Toolbox Meetings → New meeting**. Topic: the trip incident and lead management, plus the crane lifts coming up. Add the discussion points and safety alerts.
2. Record attendance by name for at least **two** stakeholders (the attendance register, not just a number).
3. Any actions agreed at the meeting can be added to the incident as corrective actions.$i$,
   '/builder/toolbox', 'Toolbox Meetings', 'Toolbox meeting + attendance register',
   '{"all":[{"exists":"toolbox_meetings"},{"exists":"toolbox_signatures"}]}'::jsonb,
   'Attendance must be per person (toolbox_signatures), not only the attendee count.'),
  (9, 'S9', 'Workplace safety review',
   'Inspect the site, record the inspection in the diary and review the risk register.',
   'A WHS system is reviewed, not just written. Inspections catch the drift between the plan and the site; dated reviews of the register show the system is alive.',
   $i$1. Open **Site Diary** and add an entry for today tagged **Inspection**: weather, crew on site, what you checked (excavation shoring, crane exclusion zone, leads and housekeeping after the incident, the gate and power lines), and what you found.
2. Add at least one more diary entry for a different day (deliveries, progress, visitors).
3. Back in the **Risk Register**, review the entries - set or update the **review date** on the ones you looked at.$i$,
   '/builder/diary', 'Site Diary', 'Inspection diary entry + risk register review dates',
   '{"all":[{"count":"diary_entries","min":2},{"exists":"diary_entries","where":{"tags":{"contains":"Inspection"}}},{"exists":"project_risks","where":{"review_date":{"nonempty":true}}}]}'::jsonb,
   'The inspection entry should read like a walk-through of this site after the events, not a generic note.'),
  (10, 'S10', 'Submit your evidence',
   'Check My Evidence, then submit a locked snapshot for your assessor.',
   'Submitting freezes your records as they are today so your assessor reviews exactly what you built. You can still correct work and resubmit if anything is returned.',
   $i$1. Open **My Evidence** and make sure every task shows a tick.
2. Click **Submit for assessment**, add a short note to your assessor if you like, and confirm.
3. You will see your submission version and status. Your assessor will mark each criterion Satisfactory or Not Yet Satisfactory and you will be told what, if anything, to fix.$i$,
   '/education/student/submit', 'Submit for assessment', 'Locked submission snapshot',
   '{"submission":true}'::jsonb,
   'Nothing to assess here directly - this stage completes when a submission exists.')
)
insert into public.edu_scenario_stages (scenario_id, position, code, title, objective, why_it_matters, instructions, feature_route, feature_label, evidence_label, evidence_rule, assessor_notes)
select s.id, v.pos, v.code, v.title, v.objective, v.why, v.instructions, v.route, v.route_label, v.ev_label, v.rule, v.anotes from s, v
on conflict (scenario_id, code) do update
  set position = excluded.position, title = excluded.title, objective = excluded.objective, why_it_matters = excluded.why_it_matters,
      instructions = excluded.instructions, feature_route = excluded.feature_route, feature_label = excluded.feature_label,
      evidence_label = excluded.evidence_label, evidence_rule = excluded.evidence_rule, assessor_notes = excluded.assessor_notes;

-- Events
with s as (select id from public.edu_scenarios where institution_id is null and code = 'RIVERSIDE'),
v(pos, code, title, body, stage_code, trig, hint) as (values
  (1, 'E0', 'Site handover — from Marcus Doyle, Construction Manager',
   $b$Welcome aboard. Riverside Apartments is yours from today. Deepfield Civil start the basement dig in two weeks and Skyline are booked to erect the tower crane in month two.

Before anyone swings a shovel I want the WHS system stood up: project in the system, risk register done, induction written, SWMS in place for the high-risk trades. The neighbours on Creekside Drive have already complained to council about the last job on that street, so keep them in mind.

Leanne (HSE) is on site Tuesdays and Thursdays if you need a second pair of eyes. Call me if anything goes wrong.$b$,
   'S1', '{"type":"start"}'::jsonb,
   'Work through the tasks in order. Nothing to respond to yet.'),
  (2, 'E1', 'SITE UPDATE — 8:15 AM: subcontractor cannot produce a SWMS',
   $b$The Hydro-Flow Plumbing crew (supervisor Dean Walsh plus three workers) have arrived to start trenching for the in-ground services along the south side — 1.8 m deep, within 10 m of the creek bank.

Dean says their SWMS "is in the truck somewhere" and wants to get going because the excavator is on hire by the hour. None of the crew have been inducted on this site and they are not on your stakeholder list.

What do you do?$b$,
   'S6', '{"type":"stage_complete","stage":"S5"}'::jsonb,
   'The work must not start. Add the crew as stakeholders (trade Plumber), make sure an acceptable SWMS exists and is signed, record the decision in the diary - then continue with task 6.'),
  (3, 'E2', 'INCIDENT — 2:40 PM: worker trips over an extension lead',
   $b$Leanne has just radioed from level 1. Jordan Pike, a 19-year-old apprentice with MasterForm, tripped over an extension lead running across the corridor near the lift core, fell onto their right hand and knee, and has a grazed palm and a sore wrist. First aid has been given on site; Jordan says they're fine and wants to keep working.

The lead was powering a grinder for a formwork crew on the other side of the corridor. There is no lead stand or cover in that area.$b$,
   'S7', '{"type":"stage_complete","stage":"S6"}'::jsonb,
   'Report it as it is (a person was hurt, first aid), investigate the cause (lead management), assign a corrective action, and raise it at the next toolbox. Decide - and be able to explain - whether it is notifiable.'),
  (4, 'E3', 'Client request — evidence for the monthly meeting',
   $b$Priya Nair (client PM) has emailed: "Before Thursday's monthly meeting I need evidence that the site safety system is operating — consultation records, your latest inspection, and confirmation that the incident last week was closed out. Please send through what you have."$b$,
   'S9', '{"type":"stage_complete","stage":"S8"}'::jsonb,
   'Complete your workplace safety review (task 9), then submit your evidence (task 10).')
)
insert into public.edu_scenario_events (scenario_id, stage_id, position, code, title, body, trigger, response_hint)
select s.id, (select st.id from public.edu_scenario_stages st where st.scenario_id = s.id and st.code = v.stage_code),
       v.pos, v.code, v.title, v.body, v.trig, v.hint
from s, v
on conflict (scenario_id, code) do update
  set stage_id = excluded.stage_id, position = excluded.position, title = excluded.title, body = excluded.body,
      trigger = excluded.trigger, response_hint = excluded.response_hint;

-- ---------------------------------------------------------------------------
-- 3. Default (indicative) mapping: criterion → stage. Institutions override by
--    inserting their own rows for the same unit + scenario.
-- ---------------------------------------------------------------------------
with u as (select id from public.edu_units where institution_id is null and code = 'CPCCBC4002'),
s as (select id from public.edu_scenarios where institution_id is null and code = 'RIVERSIDE'),
m(crit, stage) as (values
  ('1.1','S1'),('1.1','S5'),('1.2','S1'),('1.2','S4'),('1.3','S2'),('1.3','S9'),
  ('2.1','S1'),('2.1','S4'),('2.2','S4'),('2.3','S4'),('2.3','S6'),
  ('3.1','S2'),('3.2','S2'),('3.2','S3'),('3.3','S3'),('3.4','S5'),('3.4','S6'),('3.5','S6'),('3.5','S9'),
  ('4.1','S8'),('4.2','S6'),('4.3','S7'),('4.4','S7'),
  ('5.1','S9'),('5.2','S9'),('5.2','S1'),('5.3','S10')
)
insert into public.edu_criteria_mappings (institution_id, unit_id, scenario_id, criterion_id, stage_id)
select null, u.id, s.id,
       (select c.id from public.edu_unit_criteria c where c.unit_id = u.id and c.code = m.crit),
       (select st.id from public.edu_scenario_stages st where st.scenario_id = s.id and st.code = m.stage)
from u, s, m
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.edu_unit_criteria c join public.edu_units u on u.id = c.unit_id where u.code = 'CPCCBC4002' and u.institution_id is null) as criteria,
  (select count(*) from public.edu_scenario_stages st join public.edu_scenarios s on s.id = st.scenario_id where s.code = 'RIVERSIDE' and s.institution_id is null) as stages,
  (select count(*) from public.edu_scenario_events ev join public.edu_scenarios s on s.id = ev.scenario_id where s.code = 'RIVERSIDE' and s.institution_id is null) as events,
  (select count(*) from public.edu_criteria_mappings where institution_id is null) as default_mappings;
