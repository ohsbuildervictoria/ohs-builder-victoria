# OHS Builder Education — Audit, Architecture & Implementation Plan

**Status:** Phase 1 build on branch `feature/education` (not deployed). **Author:** lead engineer (AI-assisted). **Date:** 2026-08-22
**Governance:** nothing in this branch touches production until the owner approves each push to `main` and each migration, per the standing rule in `docs/EVENT_DAY_2026-08-15.local.md`.

---

## A. Current architecture (what exists today)

| Layer | Reality (verified from the repo + live endpoints) |
|---|---|
| Source of truth | `C:\Users\Pokha\Desktop\OHS Builder Victoria` → `github.com/ohsbuildervictoria/ohs-builder-victoria` (`main`, 80 commits, clean, in sync). The `NEXXT-GROUP/nexxt-ohs-builder-victoria` repo is a stale July fork — ignore it. |
| Framework | Vite 8 + React 19 + React Router 7 + Tailwind 3 + react-hook-form; recharts; jsPDF + autotable (lazy chunks); vite-plugin-pwa (autoUpdate SW). Single SPA, no server-rendered pages. |
| Hosting | **Cloudflare Pages** (auto-deploys on push to `main`), custom domain `ohsbuildervictoria.com.au`. `public/_headers` sets strict CSP (connect-src limited to Supabase + open-meteo). The `.vercel/project.json` link is dead (404) — Vercel is not used. |
| Server code | Cloudflare Pages Functions in `functions/api/*`: `send-invite`, `send-staff-invite`, `send-report`, `cron-nudges`. They verify the caller's Supabase JWT, then use the service-role key server-side. Email via Resend. |
| Database | Supabase project `bbbtqhypdjrmlrdabumm` ("ohsbuildervictoria's Org", Free plan, Tokyo). 20 migrations in `supabase/migrations/` — 001–019 recorded by the CLI, **020 applied but not recorded** (table `project_risks` exists in prod; `supabase migration list` shows it as local-only). Migrations are applied with the Management API (`apply-migrations.local.py`) or `supabase db push`. |
| Auth | Supabase Auth, email+password, auto-confirm on. `profiles` row auto-created by trigger. Roles: `builder_admin`, `hse_manager`, `site_supervisor`, `worker` (CHECK constraint). Platform super admin = allow-list table `platform_admins` (no policies; consulted only inside definer functions). Presence heartbeat. |
| Tenancy | **Real multi-tenancy.** `organizations` table; every data table carries `organization_id` (default `public.my_org()`, NOT NULL); all identity predicates (`my_org()`, `my_role()`, `is_builder()`, `is_org_safety()`, `is_supervisor()`, `my_worker_id()` …) are SECURITY DEFINER and fail closed for deactivated accounts. RLS is the enforcement layer; the sidebar renders from `public.my_permissions()` (DB-computed). Column-level GRANTs lock `profiles.role/organization_id/worker_id` and the evidence-backed `workers.induction/quiz/swms` ticks. |
| RBAC (DB-enforced, migration 009–011) | Builder Admin: everything in own org. HSE: safety records org-wide, no billing/users/projects-create. Supervisor: only `profiles.project_ids` sites (NULL = none). Worker: own record, own incidents. Privileged changes via audited RPCs (`set_user_role`, `set_user_projects`, `set_user_status`). `security_audit` append-only with triggers on 16 tables. |
| Evidence model | "A status is a consequence of evidence": `swms_signatures` (per person per version), `toolbox_signatures`, `induction_completions`, `quiz_attempts` (server-graded), `compliance_documents` (supersede, never overwrite), WorkSafe notification gate on notifiable incidents, `swms_revisions`, `project_risks` (5×5, seeded from SWMS library), `audit_log` (edit trail + fitness declarations), `record_photos`, `project_documents`, `site_checkins` (QR). |
| Storage | Buckets: `compliance-docs`, `site-photos`, `project-docs`, `policy-docs` (private, path-scoped RLS via `can_touch_*` helpers) and `org-branding` (public read, admin write under `{org_id}/`). |
| Client data layer | `src/lib/api.js` (1.7k lines): mappers + all queries; `fetchAppData()` loads *everything visible to the caller* into `AppContext`; hooks per module mutate via Supabase then patch in-memory state. Permissions via `fetchPermissions()` → `my_permissions()`. |
| UI | `BuilderLayout` (desktop sidebar + mobile strip), `WorkerLayout` (phone frame), pages per module, shared UI primitives (`Button`, `Card`, `Badge`, `StatCard`, `Modal`, `Tabs`, `Table`, `ProgressBar`, toast `Notification`), `HelpDrawer` + Help Centre content (`src/data/help/*`), `pdf.js` branded exports (`header()/footers()/loadOrgLogo()`), `Logo`. |
| Onboarding today | `/signup` → `signup_create_org()` → empty org, Builder Admin; "Welcome" page; per-project induction; invite tradies (`/join/:token`) and staff (`/join-staff/:token`). The 15-Aug training day used **one free-trial org per trainee** — i.e. the "student = builder of their own org" model has already been exercised on production with ~30 students. |
| Tests | No automated test runner in-repo. Live verification scripts `*.local.mjs` (git-ignored; hold QA passwords) probe PostgREST as real accounts: `rbac.local.mjs` (28 bypass attempts), `matrix.local.mjs` (35), `verify1011.local.mjs` (23). ESLint only. |
| Internal/QA data in prod | QA MASTER org (`is_internal=true`), event orgs 32–44, spare accounts — production is the team's de-facto test environment. |

## B. Reusable components (what Education reuses unchanged)

1. **The whole tenancy + RLS model.** A student sandbox is simply an `organizations` row (new column `kind='education_sandbox'`) with the student as its `builder_admin`. Every existing policy, helper, trigger, evidence RPC and storage rule applies to the sandbox with **zero changes**, and by construction Student A can never read Student B (different `my_org()`).
2. **Every operational module as the simulation surface:** Projects (+ induction settings, QR check-in), Compliance/Stakeholders (workers, subbie companies, documents), SWMS (library of 49 trades, signatures, revisions), Risk Register (5×5), Incidents (+ corrective actions, WorkSafe gate, body map, photos), Toolbox (attendance register), Site Diary (audit trail, photos), Policies, Reports. No educational copies are built.
3. **Invite pattern** (`invites.invite_token` + public `*_invite_info()` preview + `accept_*_invite()` definer RPC + Pages Function email) — mirrored for Education invites.
4. **`my_permissions()`** as the single place the client learns what it may do — extended with an `education` block.
5. **UI kit, layouts, toast, HelpDrawer, Logo, Badge statuses**, `pdf.js` header/footer/logo pipeline (for the Evidence Portfolio), `export.js` CSV.
6. **Platform Admin page** (`/platform`) — gains an Institutions panel.
7. **Signup/org creation RPC pattern** (`signup_create_org`) — the sandbox provisioning RPC is modelled on it (incl. quiz seeding).
8. **Security audit** trigger function (`audit_row_change`) — attached to the new Education tables that hold decisions (assessment results).

## C. Risks

| # | Risk | Mitigation in this design |
|---|---|---|
| 1 | **Cross-tenant read for assessors** is the one genuinely new access path. | Additive `SELECT` policies only (`edu_can_view_org(organization_id)`), OR-ed with existing policies, so Industry access is unchanged; the predicate is `false` for every account without an `edu_memberships` row. No write path for assessors into a sandbox at all. Tested by the isolation suite. |
| 2 | A student is a `builder_admin` of a real org → sees billing/subscription/admin UI and could invite staff into the sandbox. | `my_permissions()` returns `admin/billing/orgSettings/manageUsers=false` and `education.role='student'` for sandbox orgs; sidebar hides them; Pages Functions refuse staff invites from sandbox orgs. Not a security boundary (a student "inviting" someone into their own sandbox leaks nothing), but a scope boundary. |
| 3 | Education users (institution admin / assessor) obtaining Industry data. | Their `profiles.organization_id` is NULL and their role is a new value (`institution_admin`, `assessor`) that no Industry predicate recognises → every org-scoped policy evaluates false. Verified by tests. |
| 4 | `fetchAppData()` loads "everything visible": for an assessor that would now span many sandboxes. | Education UI never calls `fetchAppData()` unscoped; the review screen uses `fetchSandboxData(orgId)` (same mappers, `.eq('organization_id', …)`), and the assessor's own `my_org()` is NULL so the Industry shell never loads for them. |
| 5 | Migration safety on a live DB with no staging. | All Education DDL is additive (new tables/columns/functions/policies), idempotent, and reversible by a documented down-script (`supabase/migrations/education/ROLLBACK_021_023.sql`). The only touch on existing objects: widen `profiles.role` CHECK, add `organizations.kind`/`education_*` columns with defaults, replace `my_permissions()` body (superset output). |
| 6 | `role` CHECK widening: `set_user_role()` still only accepts the four Industry roles (unchanged), so Industry admins cannot hand out Education roles; Education roles are set only by `edu_accept_invite()`. |
| 7 | 020 not recorded in CLI history → `supabase db push` would re-run it (idempotent, harmless). Recommend `supabase migration repair --status applied 020` before pushing 021+. |
| 8 | Service worker `autoUpdate`: new routes ship only after clients pick up the new bundle — harmless (Education is additive). |
| 9 | CSP `connect-src`: no new hosts required (Education talks only to Supabase). Logo uploads go to a new public bucket on the same Supabase host. |
| 10 | No test environment: Docker is absent, and creating a staging Supabase project from this session was blocked by the permission layer. **Decision needed** (§F). |
| 11 | Terminology/legal: Education never states it "certifies" or issues Statements of Attainment; completion screens and PDFs say "Assessment outcome recorded by <institution>". Mapping is labelled "indicative — institution-controlled". |

## D. Proposed Education architecture

### D.1 Identity & roles
- `profiles.role` CHECK widened with `institution_admin`, `assessor`. Students keep `builder_admin` (they *are* the builder of their sandbox).
- `edu_memberships(id, institution_id, user_id, edu_role ∈ {institution_admin, assessor, student}, name, email, invite_token, status ∈ {invited, active, deactivated}, accepted_at)` — the Education identity table. One row per person per institution.
- Helper predicates (SECURITY DEFINER, fail closed): `edu_my_membership_ids()`, `edu_is_admin_of(inst)`, `edu_is_assessor_of(inst)`, `edu_assessor_cohorts()` (cohort ids), `edu_my_enrolment()` (student), `edu_can_view_org(org)`, `edu_can_view_enrolment(enrolment)`, `edu_can_manage_cohort(cohort)`.
- `my_permissions()` gains `education: { role, institutionId, institutionName, enrolmentId, cohortId, sandbox: bool }` and, for sandbox orgs, sets `admin/billing/manageUsers/orgSettings=false`.

### D.2 Schema (all new, prefix `edu_`)
```
edu_institutions          id, name, legal_name, rto_number, website, address, contact_name, support_email,
                          department, campus, logo_url, primary_colour, secondary_colour, is_demo,
                          status, created_by, created_at, onboarding (jsonb: step flags)
edu_memberships           (above) + last_login
edu_qualifications        id, code, title, institution_id (null = platform library)
edu_units                 id, qualification_id, code, title, institution_id (null = library), active
edu_unit_criteria         id, unit_id, code, text, evidence_hint, position
edu_programs              id, institution_id, name, qualification_id, unit_id, intake, campus, department
edu_cohorts               id, institution_id, program_id, name, start_date, end_date, campus,
                          expected_students, scenario_id, status
edu_cohort_assessors      cohort_id, membership_id  (pk)
edu_enrolments            id, institution_id, cohort_id, membership_id, student_name, student_email,
                          invite_token, status ∈ {invited, not_started, in_progress, ready_for_assessment,
                          action_required, completed, withdrawn}, sandbox_org_id, started_at, completed_at
edu_scenarios             id, institution_id (null = library), code, title, summary, description,
                          project_brief (jsonb: name, address, description, storeys, neighbours, hazards…),
                          student_role, supporting_docs (jsonb[]), assessor_notes, active
edu_scenario_stages       id, scenario_id, position, code, title, objective, why_it_matters, instructions
                          (markdown), feature_route, feature_label, evidence_label, evidence_rule (jsonb),
                          assessor_notes
edu_scenario_events       id, scenario_id, stage_id, position, title, body, trigger (jsonb), response_rule
edu_criteria_mappings     id, unit_id, criterion_id, scenario_id, stage_id, institution_id (null = default)
edu_stage_progress        enrolment_id, stage_id, status ∈ {pending, complete}, evidence (jsonb),
                          first_completed_at, evaluated_at   (cache of the evaluator's output)
edu_submissions           id, enrolment_id, version, submitted_at, snapshot (jsonb), progress (jsonb),
                          status ∈ {submitted, under_review, returned_nys, completed}, outcome_comment,
                          decided_by, decided_at
edu_assessment_results    id, submission_id, criterion_id, result ∈ {satisfactory, not_yet_satisfactory},
                          comment, assessed_by, assessed_at          (unique submission+criterion)
edu_student_events        id, enrolment_id, event_id, delivered_at, acknowledged_at, response (jsonb)
edu_audit                 reuse public.security_audit via triggers on submissions/results
```
`organizations` gains `kind text default 'industry' check in ('industry','education_sandbox')` and `edu_enrolment_id`.

### D.3 RLS summary
- `edu_institutions`: platform admin all; institution admins read/update own; assessors & students read own institution (name/branding only — via a view `edu_institution_public`).
- `edu_memberships`: institution admin manages own institution's rows; a member reads own row; assessors read memberships of their cohorts' students (names).
- `edu_programs/cohorts/cohort_assessors/enrolments`: institution admin CRUD within institution; assessor read for assigned cohorts; student reads own enrolment.
- `edu_scenarios/stages/events/units/criteria/qualifications/mappings`: read by any education member of the owning institution or library rows; write institution admin (own) / platform admin (library).
- `edu_stage_progress`, `edu_student_events`: read own / assessor of cohort / admin of institution; written only by RPCs.
- `edu_submissions`, `edu_assessment_results`: inserted only via RPCs; read by student (own), assessor (cohort), admin (institution); results never updatable except through the assessor RPC before finalisation; no delete.
- Sandbox tables: additional `SELECT` policy `edu_can_view_org(organization_id)` on projects, workers, swms_templates, swms_signatures, swms_revisions, incidents, corrective_actions, diary_entries, toolbox_meetings, toolbox_signatures, induction_completions, policies, compliance_documents, company_documents, subbie_companies, project_risks, project_documents, record_photos, site_checkins, quiz_attempts, audit_log, organizations. Storage: `SELECT` on `site-photos`/`project-docs`/`compliance-docs` objects for the sandbox via `edu_can_view_storage(bucket, name)`.
- New public bucket `edu-branding` (`{institution_id}/…`, institution-admin write).

### D.4 RPCs (SECURITY DEFINER, audited where they decide something)
- Platform: `edu_create_institution(name, admin_name, admin_email) → {institution_id, invite_token}`.
- Invites: `edu_invite_info(token)` (anon preview), `edu_accept_invite(token)` — binds the signed-in user to the membership; for students also **provisions the sandbox**: creates org (kind sandbox, name "<Student> · <Scenario> · <Institution> sandbox"), seeds quiz, sets profile → org/builder_admin, links enrolment.
- Institution admin: `edu_add_students(cohort_id, students jsonb[]) → enrolments`, `edu_invite_member(institution_id, role, name, email, cohort_ids[])`, `edu_assign_assessor(cohort_id, membership_id)`.
- Progress: `edu_evaluate_progress(enrolment_id) → jsonb` (runs each stage's `evidence_rule` against the sandbox org; whitelisted tables; caches into `edu_stage_progress`; moves enrolment to `in_progress` on first completion). `edu_my_progress()` for students.
- Events: `edu_pending_events()`, `edu_acknowledge_event(event_id, response)`.
- Submission: `edu_submit_for_assessment(note) → submission` (student; snapshot of all sandbox records + progress + mapping; version = max+1; enrolment → ready_for_assessment). `edu_record_result(submission_id, criterion_id, result, comment)` (assessor of cohort; only while status ∈ submitted/under_review). `edu_finalise_assessment(submission_id, outcome ∈ {completed, returned_nys}, comment)` — requires every mapped criterion to have a result; sets enrolment status; audited.
- Dashboards: `edu_institution_overview(institution_id)`, `edu_cohort_board(cohort_id)` (per-student status, last activity, latest submission).

### D.5 Evidence rules (the Task → Activity → Evidence → Progress layer)
`evidence_rule` is JSON evaluated in the DB against the sandbox org:
```json
{"all":[{"exists":"projects"},{"exists":"projects","where":{"status":"Active"}}]}
{"count":"project_risks","min":8}
{"all":[{"exists":"swms_templates"},{"count":"swms_signatures","min":1}]}
{"exists":"incidents","where":{"type":"Near Miss"}}
{"all":[{"exists":"incidents"},{"exists":"corrective_actions"}]}
{"all":[{"exists":"toolbox_meetings"},{"count":"toolbox_signatures","min":2}]}
{"count":"diary_entries","min":3}
{"exists":"workers","where":{"induction":"Verified"}}
```
Supported ops: `exists`, `count/min`, `where` (equality on whitelisted columns), `all`, `any`. Tables are whitelisted with their org column. New units/scenarios reuse the same vocabulary — no code change.

### D.6 Routes & components
```
/edu/join/:token                  EduJoin (any Education invite)
/education                        redirect by education.role
/education/admin                  InstitutionDashboard      (+ /setup wizard, /programs, /cohorts/:id,
                                  /students, /assessors, /scenarios, /settings)
/education/assess                 AssessorHome → /cohorts/:id (board) → /students/:enrolmentId (review)
/education/student                StudentHome (welcome on first visit) → /tasks/:stageCode, /evidence,
                                  /submit, /results, /tour
/platform                          + Institutions panel
```
- `EducationLayout` (branded by institution: logo, primary colour bar, "Powered by OHS Builder Victoria").
- Student's sandbox keeps `BuilderLayout` with a "🎓 My Training" entry pinned at the top and an institution strip; billing/admin hidden.
- `src/lib/eduApi.js` (all Education queries/RPCs), `src/hooks/useEducation.js`, `src/data/education/*` (copy, tour steps), `src/lib/eduPdf.js` (Evidence Portfolio).

### D.7 How a sandbox works end-to-end
1. Admin enrols student → `edu_enrolments` row + token → email/link.
2. Student opens `/edu/join/:token`, sets password → `edu_accept_invite()` creates the org + links everything → lands on `/education/student` (Welcome → Start Simulation → Tour).
3. Training dashboard lists stages from the cohort's scenario; each "Start task" deep-links into the real module (`/builder/projects`, `/builder/projects/:id` Risk Register tab, `/builder/compliance`, `/builder/swms`, `/builder/incidents`, `/builder/toolbox`, `/builder/diary`).
4. Returning to the dashboard calls `edu_my_progress()`; stages flip to ✓ only when the rule is satisfied by real rows.
5. Scenario events appear when their trigger stage completes (Stage 6 "SWMS problem", Stage 7 "Trip incident").
6. "Submit for assessment" → locked snapshot, version N.
7. Assessor review: evidence viewer (reads live sandbox rows via RLS, and the frozen snapshot), criteria panel (S/NYS + comment), finalise. NYS → student sees Action Required with the feedback; fixes work; resubmits (V2). Completed → Completion screen + Evidence Portfolio PDF (institution branding + OHS Builder attribution, version/date stamped).

## E. Implementation sequence (milestones)
1. **M1 DB** — `021_education_foundation.sql` (roles, tables, helpers, RLS, storage bucket), `022_education_rpcs.sql` (invites, provisioning, evaluator, events, submission, assessment, dashboards, `my_permissions`), `023_education_library_seed.sql` (CPC40120, CPCCBC4002 + criteria, Riverside Apartments scenario with 10 stages + events, default mapping). Rollback script.
2. **M2 Client foundation** — `eduApi.js`, routing, `EducationLayout`, auth routing by `permissions.education`, `/edu/join`.
3. **M3 Platform** — Institutions panel (create institution + first admin link).
4. **M4 Institution admin** — onboarding wizard (8 screens), dashboard, programs, cohorts, assessors, students (manual + CSV), branding, scenarios.
5. **M5 Student** — welcome, tour, training dashboard, task pages, events, My Evidence, Submit, Results/Action Required, Completion; BuilderLayout integration.
6. **M6 Assessor** — first-time welcome, cohort board, review screen, NYS/complete, history.
7. **M7 Evidence Portfolio PDF**.
8. **M8** — Pages Function `send-edu-invite`, seed script (demo institution/accounts/states), isolation test suite, Help Centre entries, lint/build, docs & runbook.

## F. Test plan
- **Tenant isolation suite** (`test/education/isolation.mjs`, runs against a URL/anon key with seeded demo accounts, same style as `rbac.local.mjs`): Institution A admin ↔ Institution B (0 rows); assessor ↔ unassigned cohort; student ↔ other student's sandbox (projects/incidents/risks/photos signed URL → 0 / 400); student → assessor RPCs (raise); assessor → writes into sandbox (42501); assessor → `set_user_role` (raise); education users → Industry orgs (0 rows); CSV import into another institution's cohort (raise); URL id tampering on enrolment/submission (0 rows); storage path probes.
- **Industry regression**: rerun `rbac.local.mjs`, `matrix.local.mjs`, `verify1011.local.mjs` (owner-held) and a new `test/education/industry-unchanged.mjs` asserting `my_permissions()` output for the four Industry roles is byte-identical except the new `education:null` key, and that `is_builder_staff()`-gated writes still work for a QA org.
- **Workflow**: scripted journey (admin → cohort → assessor → student → tasks → submit → S/NYS → resubmit → complete → PDF) plus manual walkthrough as the three personas in the browser (desktop + 390 px).
- **Migrations**: apply 021–023 on a clean DB copy, run rollback, re-apply (idempotency).
- **Build/lint**: `npm run lint && npm run build`; console/network clean in all three journeys.

### Decision needed from the owner (does not block building; blocks verification)
Production is the only database and there is no local stack. Options: **(a)** allow me to create a free-tier staging project `ohs-builder-victoria-staging` in the ohsbuildervictoria Supabase org (the command was blocked by this session's permission layer — either allow it or create it and put `{ref, db_password, service_role_key}` in `staging.local.json`); or **(b)** approve applying 021–023 to production and seeding an isolated `Demo Training Institute` (`is_demo=true`, excluded from counts), mirroring how QA MASTER is used today. I recommend (a).
