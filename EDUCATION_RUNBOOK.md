# OHS Builder Education — Runbook

Operational steps for the Education layer (migrations 021–023, branch `feature/education`).
Architecture and rationale: `EDUCATION_ARCHITECTURE.md`.

> **Governance (standing rule):** the owner approves **every** push to `main` and **every**
> migration applied to production, individually. Nothing below is run against production
> without that explicit approval. Prefer a staging Supabase project for first application.

---

## 1. Apply the migrations

Migrations are additive and idempotent. Order: `021_education_foundation.sql` →
`022_education_rpcs.sql` → `023_education_library_seed.sql`.

### Preferred — Supabase CLI (records the migration history)

Production already has 020 applied but not recorded by the CLI, so mark it first or
`db push` will re-run it (harmless — it is idempotent — but noisy):

```bash
supabase link --project-ref <ref>                     # bbbtqhypdjrmlrdabumm = production
supabase migration repair --status applied 020        # one-off, production only
supabase db push                                      # applies 021, 022, 023
supabase migration list --linked                      # 001–023 should show on both sides
```

### Alternative — Management API (what `apply-migrations.local.py` does)

Paste each file into the SQL editor, or POST it to
`https://api.supabase.com/v1/projects/<ref>/database/query` with a Management API token.
Run them in order; each is safe to re-run.

### Verify

Each migration ends with a `select … as …` block. Expected values:

| Migration | Expect |
|---|---|
| 021 | `edu_tables` = 17 · `sandbox_view_policies` = 21 · `storage_policies` ≥ 7 · `branding_bucket` = 1 · `role_check_widened` = 1 |
| 022 | `rpcs_present` = 19 · `provision_exposed_should_be_false` = false · `eval_exposed_should_be_false` = false · `permissions_has_education` = true |
| 023 | `criteria` = 18 · `stages` = 10 · `events` = 4 · `default_mappings` = 27 |

Then run `select public.my_permissions();` as an existing Industry account (QA MASTER):
`education` must be `null` and `sandbox` `false`; every pre-existing key unchanged.

---

## 2. Seed the demo institution

Creates `Demo Training Institute` (`is_demo = true`) with an admin, an assessor and six
students in every state (invited, not started, in progress, ready for assessment,
returned NYS, completed). Uses the real invite/accept/provision/submit/assess paths.
Never touches any other organisation.

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<anon/publishable key> \
SUPABASE_SERVICE_ROLE_KEY=<service role key — never in the browser, never committed> \
APP_ORIGIN=http://localhost:5173 \
node scripts/education/seed-demo.mjs
```

Optional: `SEED_PASSWORD` (default `Demo!Edu2026`), `SEED_EMAIL_DOMAIN` (default
`example.edu.au`), `SEED_PREFIX` (default `edu-demo`).

Output: a table of accounts + `scripts/education/seed-output.local.json` (git-ignored).
Re-running tops up / skips. Remove everything the seed created:

```bash
node scripts/education/seed-demo.mjs --reset
```

Demo accounts (all share `SEED_PASSWORD`):

| Role | Email |
|---|---|
| Institution admin | `edu-demo-admin@example.edu.au` |
| Assessor | `edu-demo-assessor@example.edu.au` |
| Students | `edu-demo-student1..6@example.edu.au` (student1 stays *invited* — use its printed link) |

> Do not seed the demo on production unless the owner has decided to (the brief: never put
> demo users into production unless explicitly intended and clearly isolated). It is isolated
> (`is_demo`, sandbox orgs are `is_internal`), but the decision is the owner's.

---

## 3. Run the tests

```bash
SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run test:education
# optional Industry smoke test:
QA_EMAIL=… QA_PASSWORD=… SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run test:education
```

- `test/education/isolation.test.mjs` — institution ↔ institution, assessor ↔ unassigned
  cohort, student ↔ student, role escalation, Education ↛ Industry, URL id tampering,
  storage paths, cross-tenant enrolment.
- `test/education/industry-unchanged.test.mjs` — Education accounts read no Industry rows;
  `my_permissions()` keeps every Industry key; an Industry QA account is untouched.

Both suites **skip** with a message (rather than fail) when env / seed output is missing.
Also re-run the owner-held Industry scripts (`rbac.local.mjs`, `matrix.local.mjs`,
`verify1011.local.mjs`) after the migrations: all counts must be unchanged.

Build & lint: `npm run lint && npm run build`.

---

## 4. Walk it through as three people

**A — Institution admin** (`edu-demo-admin@…`, or a fresh institution from `/platform`):
sign in → lands on `/education/admin` → setup wizard: profile, branding (logo + colours with
live preview), program (CPC40120 / CPCCBC4002), cohort (Riverside Apartments), invite an
assessor, add students (manual + CSV) → Ready screen → dashboard shows counts and cohorts.
Check: can you reach a working cohort without developer help? Are the invite links copyable?

**B — Assessor** (`edu-demo-assessor@…`): sign in → `/education/assess` → first-time guide →
cohort card shows unit, scenario, counts → cohort board: Ready for Assessment first → Unit &
mapping (labelled institution-controlled) → Scenario → Assess a student: evidence tabs
(live + snapshot versions), criteria panel, S/NYS + comments, finalise (Complete or Return)
→ portfolio PDF. Check: is it obvious who needs you, where their evidence is, how to mark it,
how to request corrections? Confirm you cannot edit any student record.

**C — Student** (`edu-demo-student2@…` for a blank run, or student1's invite link for the full
first-login): invite page → password → "You're in" → Welcome (institution, unit, cohort,
scenario, role, assessor) → Start Simulation → tour → training dashboard → Task 1 opens
Projects in the student's own site → back to 🎓 My Training → tick appears only once the
record exists → site events appear after tasks 5 and 6 → My Evidence → Submit (locked
snapshot) → Assessment (Action Required with linked tasks, or Completion + PDF).
Check mobile width (390 px) for the student pages.

Also check: console clean, no failed network calls, no secrets in the bundle (only the
publishable key), Industry login unchanged (`/builder/dashboard` for a QA org).

---

## 5. Rollback

`supabase/migrations/education/ROLLBACK_021_023.sql` removes every Education object and
restores `my_permissions()` / `profiles.role` to their pre-021 definitions. Sandbox
organisations are **not** deleted automatically (they are tenants holding evidence) — the
script ends with a commented, deliberate delete. Run only after an explicit decision.

---

## 6. Production checklist (gate — requires owner approval)

1. Staging applied + verified + seeded + all tests green + three-persona walkthrough done.
2. `supabase migration repair --status applied 020` on production (one-off).
3. Apply 021 → 022 → 023; run each verification block.
4. Re-run the Industry verification scripts; confirm QA MASTER `my_permissions()` unchanged.
5. Merge `feature/education` → `main` (Cloudflare Pages auto-deploys). Service worker is
   `autoUpdate`; Education routes appear on the next load.
6. Cloudflare Pages env already has `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ORIGIN` — `send-edu-invite` needs nothing new.
7. Create the first real institution from `/platform` → Education institutions → New.
8. Decide separately whether the demo institution exists on production.

---

## Staging verification record — 22 Aug 2026

**Staging project:** `ohs-builder-victoria-staging` (ref `adoatvmvmttdvrdfpfve`, Tokyo, free tier, same Supabase org as production). Credentials live only on the verification machine (`staging.local.json`, git-ignored); the app is pointed at it with `.env.staging.local` + `vite --mode staging`.

**Migration sequence used (and the one to use for any fresh database):**
1. `supabase link --project-ref <ref>` from a scratch workspace (never re-link the repo's production link).
2. `supabase db push` with migrations 001–023. On a *clean* database, one statement in `001_schema.sql` cannot run as written (`alter column hours type numeric` while the column still has the text default `''`). Production never hit this because the statement was applied incrementally in July. For staging the copy of 001 was patched to `drop default` → `type numeric` → `set default 0`; production's 001 is **not** edited (history is left alone). If a fresh database is ever rebuilt, apply the same three-line patch.
3. Migration 020 is recorded in staging by the push. On **production** it is applied but unrecorded: run `supabase migration repair --status applied 020` **before** pushing 021–023 there, otherwise `db push` will re-run 020 (idempotent, but noisy).
4. `supabase config push` for staging auth (site URL + no email confirmation, matching production's auto-confirm).
5. Seed: `scripts/education/seed-demo.mjs`, `scripts/education/seed-industry-staging.mjs`.
6. Tests: `npm run test:education` (Education isolation 16, Industry regression 11, Industry-unchanged 1+1 optional).

**Post-walkthrough RPC patches (all in 022, re-applied to staging with `create or replace`):** `edu_events_for` auto-acknowledges an event whose task is already evidenced; `edu_student_home` evaluates progress before reading the enrolment status; `edu_submit_for_assessment` freezes the post-insert evaluation into the submission (task 10 shows Evidenced in the snapshot); `edu_institution_overview` counts branding as set when colours were saved.

**Known pre-existing drift (Industry, not Education):** production's `signup_create_org` carries the 14-Aug quiz-seed hot-fix that is not in any recorded migration; a clean database built from the repo does not seed the quiz for a new trial org. Fold that hot-fix into a migration at some point.
