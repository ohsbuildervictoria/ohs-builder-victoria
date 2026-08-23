# Access reset, stakeholder cleanup & product identity — 22 Aug 2026 (owner-approved)

## 1. Access reset (production)

**Before:** 52 auth users / 52 profiles, all `Active`; `platform_admins` = 1 (`nexxtsitesolutions@gmail.com`, uid `975b4760-…`); 85 live refresh tokens; 1 pending staff invite; 19 pending stakeholder invite tokens; Education internal test institution with 4 memberships (3 active, 1 invited).

Mechanisms that can grant platform authority were audited: `platform_admins` allow-list (RLS on, zero policies, consulted only inside `is_platform_admin()` SECURITY DEFINER functions); no `profiles` platform column; the only hard-coded email is the 016 seed of the owner; no env-var admin lists; `RequirePlatform` in the frontend only mirrors `my_permissions().platform`; Pages Functions never grant platform rights.

**Why revoke rather than delete auth users:** `auth.users` deletion cascades to `profiles`, and `profiles` is referenced by `induction_completions.recorded_by` / `swms_revisions.revised_by` (NO ACTION), while `organizations.created_by`, `edu_institutions.created_by`, `edu_submissions.*`, `edu_assessment_results.assessed_by` reference `auth.users` without cascade — deletion would either fail or destroy attribution. Every non-master account was therefore **revoked, not deleted**, atomically (`scratchpad/reset/reset.sql`, audited as `ACCESS_RESET`):

| Action | Count |
|---|---|
| `auth.users.banned_until = 2999-12-31` | 51 |
| `auth.sessions` deleted | 84 |
| `auth.refresh_tokens` deleted | 130 |
| `profiles.status = 'Deactivated'` | 51 |
| `edu_memberships.status = 'deactivated'`, token cleared | 4 |
| `edu_institutions.status = 'suspended'` (internal test institute) | 1 |
| staff invite tokens cleared | 1 |
| stakeholder invite tokens cleared | 19 |

David's accounts (`admin@ohsbuildervictoria.com.au` builder_admin org 1, `dcaruana@arlingtonhomes.com.au` builder_admin org 17, `adriandavidcaruana@gmail.com` worker org 20, `qa-david@…` QA): **access revoked** (banned + deactivated), **accounts not deleted**, **no scoped access retained**, historical records (Arlington projects, inductions, signatures, diary, audit) untouched. Same for every builder customer, HSE/supervisor, stakeholder, Education admin/assessor/student, smoke-test, QA, demo and legacy account.

**Proof (captured tokens before the reset, tested after):** fresh sign-ins → "User is banned"; stale JWTs → `my_permissions` role null, organizations/projects/workers/edu tables 0 rows, platform/Education RPCs refused, `get_quiz` empty, inserts refused; refresh tokens → HTTP 400; GoTrue `/auth/v1/user` → 403 (so Pages Functions see "Not signed in"); Education invite token `544763fe…` → null. Residual until JWT expiry (≤ 1 h, and only for a token captured before the reset): a deactivated account can read **its own** profile/membership row (`id = auth.uid()` policies) — self-scoped, no tenant data.

**After:** active profiles = 1, unbanned auth users = 1, platform_admins = 1, live sessions = 1 — all `nexxtsitesolutions@gmail.com`; active Education memberships 0; pending invites 0 (staff/stakeholder/Education); auth users total 54 (52 + the two temporary QA accounts below, both revoked).

Pages Functions hardening: `verifyUser()` now also requires `profiles.status = 'Active'` (a still-valid JWT of a deactivated account gets 401).

### 1a. Correction (same day, owner instruction: "nobody is banned — everyone can come back and start again")

The reset must not stop anyone re-registering with their usual email. So every retired account was **archived and its email released** instead of staying banned: `auth.users.email`, the `auth.identities` email identity and `profiles.email` were renamed to `retired+<uid8>@retired.ohsbuildervictoria.invalid` (original kept in `raw_user_meta_data.retired_from_email`), profiles stay `Deactivated`, and **all auth bans were lifted (0 banned)**. 53 accounts archived this way (the 51 from the reset + the 2 temporary QA accounts). Historical records keep their attribution because they reference ids, not emails. Proof: a fresh `/signup` with `nexxtsitesolutions+spare7@gmail.com` (a retired email) created a brand-new builder workspace; that throwaway was then archived the same way. David (`dcaruana@arlingtonhomes.com.au`, `admin@ohsbuildervictoria.com.au`) can now sign up as a new Builder. Live emails: master + the three Owner Test Institute accounts only.

### 1b. 23 Aug — retired shells deleted; David's account; invite guard (026)

- **Retired account shells deleted permanently** (owner: "we don't want them there"): 54 auth users + identities removed; the nullable FKs that pointed at them were nulled first (`organizations.created_by` ×39, `induction_completions.recorded_by` ×7, `swms_revisions.revised_by` ×2 — the `*_name` text columns keep the attribution), `workers.user_id` / `edu_memberships.user_id` set null by FK rule, profiles cascaded. Auth users now: master, David (`dcaruana@arlingtonhomes.com.au`, new Builder of org #54), and the three Owner Test Institute accounts. Orphaned old organisations (#1–#53) still exist as data; purging them is a separate decision.
- **David (new account, 23 Aug 00:37–01:41):** signed up as Builder (org #54), created project #85, added stakeholder "Daniel Romana" with his own email, then opened that invite link while signed in as the builder — `accept_worker_invite` converted his builder profile into the stakeholder (role worker → worker 72) and he completed induction/quiz/SWMS/documents as "Daniel". Repaired with the owner's decision (option A): profile back to `builder_admin` of org #54, worker 72 back to `invited` with a fresh token; all his evidence on worker 72 / project #85 kept.
- **026:** `accept_worker_invite` now refuses any signed-in builder / HSE manager / site supervisor / institution admin / assessor / student ("A stakeholder invite is for the tradie's own login…"); the join page shows the same explanation with "Sign out and open this link as the stakeholder" instead of an accept button. Proven on staging with the exact case (builder opening an invite issued to his own email → refused, role unchanged).
- Wording: Builder nav + page title "Compliance" → **"Stakeholder Compliance"**.

### 1d. 24 Aug — organisation purge (owner: "check those numbers and get rid of if not needed")

The platform tiles were counting 40 organisations that had **zero users** after the access reset (old trial junk #14–#49, retired pilot orgs #1/#17, QA org #13, temporary QA orgs #51/#53/#57). All 40 were deleted atomically with their org-scoped data (projects, workers, SWMS, incidents, diaries, toolbox, policies, invites, quiz, photos-metadata, org settings); `security_audit` rows were kept with the org reference nulled, so the audit trail survives. Orphaned files in the private storage buckets are inert and unreadable. **Kept:** #54 Arlington Homes (David, active), #55 SNY Home Solutions and #56 (new real customers), #50/#52 Education sandboxes (Education untouched). After: 5 organisations (3 customer · 2 internal), 7 users, and the pending invitations are David's own test crew + one staff invite in #54.

### 1c. 24 Aug — David's feedback (email Sun 23 Aug 10:12 PM) — migrations 027 + 028, merges `5182963` + `0825427`

| David said | Root cause | Fix | Production proof |
|---|---|---|---|
| Projects / dashboard show 100% although stakeholders aren't verified | new project inserted `compliance=100` and shown until reload; "Verified" for White Card/Insurance/Medical meant "a file exists" | `projects.compliance` nullable/default null, new projects annotated `null` (shows —); `compliance_documents.verified_at/by/name/note`; `file_compliance_document` marks builder/HSE uploads verified, stakeholder uploads SUBMITTED; `verify_compliance_document` RPC (audited); column grants stop anyone writing the verified columns directly; `docExpiryStatus` → Pending until verified (expired still blocks); builder modal "✓ Verify document"; stakeholder sees "Submitted — awaiting your builder's verification"; ProjectDetail matrix now uses documents too | no-crew project "—"; crew unverified 0%; upload → Pending → verify → Verified; dashboard table 17% (derived) |
| Record on site does not record | audio blob never uploaded; "saved" toast before persistence | `diary_entries.audio_path/name`; blob uploaded to `site-photos/diary_entry/<id>/` (existing path-scoped RLS); success message only after upload; "Play voice note" via signed URL; CSP `media-src` added | recorded with a (fake) mic, saved, reloaded, playable from storage URL |
| Near Miss Register duplicates the Near Miss tab | separate read-only page | button removed; `/builder/incidents/near-miss` redirects to Incidents | verified |
| Only Injury/Illness can be opened/closed | false — all types have the lifecycle; the register page hid it | status control labelled "Status (all incident types)" on every card; WorkSafe close-out restriction untouched | Near Miss moved to Investigating |
| Notify builder/supervisor; WorkCover for notifiable | no outbound notification existed; toggles wired to nothing | `/api/notify-incident` (Pages Function): emails Active builder admins + HSE managers + the project's assigned supervisors, honours `organizations.notifications.incident`, records `staff_notified_at/to/error` (service role only); client calls it after every incident and offers "Notify team" retry; notifiable incidents get an internal alert telling the team to phone WorkSafe 13 23 60 and record it — no email is sent to WorkSafe | `sent:true`, card shows "Site team notified" |
| Can't upload OH&S Management Plan PDF; how do stakeholders see it | no upload code; no stakeholder view | "Upload PDF / Replace PDF" per policy → private `policy-docs/<org>/<policy>/…` (existing RLS); `/worker/policies` read-only page + link on My Site | builder attached PDF; stakeholder opened it (signed URL, HTTP 200) |
| Signatures 7/6 | frozen tick-count denominator vs live roster | denominator = live site roster (`toolbox_roster_count`); invite list filtered to the site; `attendees/total` raised to roster/signatures on each sign-off | meeting #11 now 7/7 |
| Scheduled → Completed logic | derived client-side from the frozen count | `toolbox_meetings.status/completed_*`; auto-Completed when the whole roster has signed after the meeting (Melbourne date, 028); explicit `complete_toolbox_meeting` (held, ≥1 signature, note if roster incomplete, audited); Awaiting Signatures shown once held; historical backfill | #11 Completed (backfill), QA meeting auto-completed at 2/2 |

Not changed on purpose: Induction/Quiz/SWMS ticks are still evidence-backed server rules (paper sign-off writes a completion/signature row); company insurance certificates (builder-held) count as verified; David's existing records were not edited (his 3 documents now read Submitted until he verifies them — Reservoir drops from 100% to ~7%).

## 2. Stakeholder workflow (audit → fixes, migrations 024 + 025)

**Audit findings (production code before today):** one `workers.trade` (free text) and one `workers.project_id` per row; a person's account pointed at exactly one row (`profiles.worker_id`), so a second trade overwrote the first and a second site meant a second identity (e.g. 5 worker rows for one Arlington email); SWMS matched by exact trade string in RLS, `revise_swms`, staff sign-off and the signing page; `workers.swms` flipped to Verified on the first signature; induction had no versioning; compliance % computed in JS, `workers.status` in SQL (expiry-blind); `insertWorker` bumped `swms_templates.total` client-side (drift). `accept_worker_invite` already email-guards and refuses cross-company moves.

**Model now (024):** a `workers` row = one person's membership on one site; `workers.trades text[]` (many work types; `trade` kept in sync as primary); `workers.user_id` ties every membership to the one auth account; `profiles.worker_id` = the site being viewed; `my_sites()` / `switch_my_site()`; SWMS applies when its trade is any of the membership's work types (`swms read` policy, `revise_swms`, paper sign-off); SWMS tick = every applicable SWMS signed at its current version (`recompute_worker_swms`); `set_worker_trades()` provisions templates per work type, recomputes totals from the crew, recomputes the tick, audits `WORK_TYPES_CHANGED`; `accept_worker_invite` links a second site (same org, or another builder who invited by matching email) to the same account — staff accounts still cannot be moved between companies; `worker_invite_info` returns trades + address. 025: `my_sites`/`switch_my_site` refuse deactivated accounts.

Rules: **same site + new work type** → same membership, induction/quiz/existing signatures kept, only the new SWMS is added (tick pending until signed). **New site** → new membership: that site's induction, quiz, SWMS and documents; no evidence crosses sites (RLS keys everything by the current membership). Induction versioning/re-acknowledgement is still absent (unchanged, documented gap).

**UX:** Builder — Add Stakeholder explains the flow, multi work-type picker, per-row "✎ edit" work types, work types shown in matrix/project. Stakeholder — join page says who/site/work/steps and lets a signed-in stakeholder accept a second site in one tap; My Site is action-first (Ready for Site ✓ / Action Required — n steps, Next step CTA, numbered checklist with Completed ✓, My Sites switcher); My SWMS lists every applicable SWMS and signs each once (n of m). Worker nav induction icon no longer the graduation cap.

**Verified (production, temporary accounts in temp org 51, then revoked):** journeys 1–4 headless 30/30 (invite → join → induction → quiz → SWMS → documents → Ready; builder matrix Active on evidence; second work type same row, tick pending → sign new SWMS → Ready, induction not repeated; second site one-tap accept, My Sites = 2, B needs own induction, A evidence not on B, switch back A Ready; two membership rows, one identity); direct RLS/RPC 28/28; 390 px no overflow; 0 console errors/failed requests. Staging: same journeys 30/30; Education + Industry suites 27 pass / 1 skip after 024.

## 3. Product identity

`src/components/shared/Logo.jsx`: inline SVG marks on the shared navy tile — **hard hat = OHS Builder Victoria** (default `Logo`), **graduation cap = OHS Builder Education** (`Logo product="education"`), plus `HardHatIcon`/`GradCapIcon`. Placement verified live: `/`, `/pricing`, `/login`, `/signup`, `/stakeholder`, Builder shell, stakeholder shell → hat; homepage/pricing nav item → cap + "OHS Builder Education"; `/education` → cap, link back → hat; `/login?portal=…` → cap; Education shell → cap (fallback mark + icon beside "OHS Builder Education · role") with the institution's own logo when set.

## 4. Deployment

Commits `0792fc0` (cleanup) → merge `0748b53` on `main`; 025 + this record follow. Cloudflare bundle `index-DeCesxVH.js`. Migrations 024/025 applied to production with `supabase db query` and recorded with `migration repair` (history 019–025). Rollback: 024/025 are additive (new columns with defaults, replaced function bodies, one policy); the pre-024 bodies are in 011/013/009 and can be re-applied; the access reset is reversible per account (`banned_until = null`, `profiles.status = 'Active'`).
