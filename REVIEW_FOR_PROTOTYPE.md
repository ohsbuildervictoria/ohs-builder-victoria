# REVIEW FOR PROTOTYPE — OHS Builder Victoria
**Client:** Nexxt Nest Group | **Date:** 10 Jun 2026 | **Updated:** 13 Jun 2026 | **Sources:** OHS Saroj (1).pdf (19pp) · OHS-Builder-Victoria-Screens (1).pptx (16 slides) · scenarios.docx (34 scenarios)

---

## SESSION 10 UPDATE — 13 Jun 2026

### TERMINOLOGY CHANGES COMPLETED
Global rename: **Worker → Stakeholder** across all user-facing labels. Code variables (`workers`, `getWorker`, `useWorkers`, route paths `/worker/...`, data keys `worker.id`, `workersPresent`) intentionally preserved — only displayed text changed.

| File | Change |
|------|--------|
| `src/pages/Login.jsx` | Toggle tab "Worker" → "Stakeholder" · "Enter Worker Portal" → "Enter Stakeholder Portal" |
| `src/layouts/BuilderLayout.jsx` | Sidebar link "Worker View" → "Stakeholder View" |
| `src/layouts/WorkerLayout.jsx` | Header pill "WORKER" → "STAKEHOLDER" |
| `src/components/shared/ComplianceMatrix.jsx` | Table column "Worker" → "Stakeholder" |
| `src/pages/builder/Compliance.jsx` | Tab "Workers" → "Stakeholders" · default tab · description · blocked banner |
| `src/pages/builder/ProjectDetail.jsx` | Tab "Workers" → "Stakeholders" · card title · table header · empty states · diary count |
| `src/pages/builder/AdminPortal.jsx` | StatCard "Worker / Tradie" → "Stakeholder / Tradie" · button "Invite User" → "Invite Stakeholder" · modal title |
| `src/pages/builder/Dashboard.jsx` | KPI label "Active Workers" → "Active Stakeholders" |
| `src/pages/builder/Projects.jsx` | Card metric label "Workers" → "Stakeholders" |
| `src/pages/builder/SWMS.jsx` | Description "Workers sign" → "Stakeholders sign" |
| `src/pages/builder/SiteDiary.jsx` | Field label "Workers present" → "Stakeholders present" |
| `src/pages/worker/Registration.jsx` | Subtitle "Worker registration" → "Stakeholder registration" |
| `src/data/mockData.js` | roleLabels worker → "Stakeholder / Tradie" · dashboardKpis · activityFeed |

### DEPLOYMENT STATUS
- Git remote: `https://github.com/sarojsanjel-beep/ohs-builder-victoria.git`
- Live URL: `https://nexxt-ohs-builder-victoria.pages.dev` (Cloudflare Pages)
- Current live version: **Session 8 only** (pre-SWMS library, pre-terminology changes)
- **Pending deploy:** Session 9 (SWMS library) + Session 10 (terminology) not yet pushed

### NEXT REQUIRED ACTION
```bash
cd ohs-builder-victoria
git add -A
git commit -m "Session 10: Stakeholder terminology + SWMS library integration"
git push origin main
```
Cloudflare Pages will auto-rebuild on push (2–3 min).

---

## PROJECT TEAM & WORKFLOW
| Person | Role | Hours |
|--------|------|-------|
| **David Caruana** | Builder / Product Owner — directs what he wants, reviews Saroj's work, sends annotated feedback | Tracks own hours separately |
| **Saroj** | Developer — builds screens, prototype, code based on David's direction | Tracked here |

**Workflow:** Saroj builds → David reviews → David sends annotated feedback to Saroj → Saroj implements changes → repeat

**CRITICAL FILE CONTEXT:**
- `OHS Saroj (1).pdf` = **David's** handwritten annotations on Saroj's printed screen designs — David's feedback sent TO Saroj
- `scenarios.docx` = **David's** 34 scenarios sent TO Saroj ("Hi Saroj, I have provided a table...")
- `OHS-Builder-Victoria-Screens (1).pptx` = **Saroj's** screen designs that David reviewed
- React prototype (`src/`) = **Saroj's** development work

---

## PRODUCT IDENTITY
- Name: **OH&S Builder Victoria** | Tagline: "Built by Builders for Builders"
- Client wants name/framing to capture "BUILDER MINDSET" → annotation: **"BUILDERS FOLLOW UP"**
- Two interfaces: **Web** (Builder/Admin roles) | **Mobile** (Worker/Tradie)
- Client company: **Nexxt Nest Group** (4 trading entities, ~$3K pricing, 14-day terms noted in PDF p.11)

---

## NAVIGATION STRUCTURE (from PPTX)
**Builder Web sidebar:** Dashboard · Projects · Compliance · SWMS · Site Diary · Incidents · Toolbox Meetings · Admin Portal · Settings · Worker View · Sign Out

**Worker Mobile bottom nav:** My Site · Induction · SWMS · Profile · Exit

---

## 16 SCREENS — QUICK REFERENCE

| # | Screen | Role | Key Content | PDF Annotation |
|---|--------|------|-------------|----------------|
| 01 | Login & Role Select | Both | Toggle: Builder/Worker · Email/PW · "Enter Builder Workspace" · Demo mode | "Before you commence refer to — Builder Policy Site Induction!" · Box: "Site Induction/Video/AI" · ✓ approved |
| 02 | Builder Dashboard | Builder | KPIs: 12 projects, 184 workers, 92% compliance, 3 incidents · 9 pending inductions · 6 pending SWMS · 1 WorkSafe · 4 near misses · LTI rate 0.0 · compliance trend chart · top projects | "COME UP WITH NAME — BUILDER MINDSET — BUILDERS FOLLOW UP" · "OH&S MGMT PLAN/POLICY/LEGISLATION" link · ✓ Active Projects, Active Trades, Pending Inductions, Pending SWMS, Achieved Compliance · "DATA — READ ONLY" · "Info Table / Incident Reporting / BUILDERS PROJECT COMPLIANCE" |
| 03 | Projects | Builder | 12 active sites VIC · filter: All/Active/Planning/On Hold/Closed · cards: name, address, status, build %, workers, compliance %, incidents, contract type & value · Drill down | "Summary" · "Active Projects as per Projects List" · "Key Metric Detail" |
| 04 | Compliance Records | Builder | Upload docs · Export · Summary: Induction 98%, Quiz 100%, White Card 100%, Insurance 75%, Medical 100%, SWMS 85% · Worker table: columns INDUCTION/QUIZ/WHITE CARD/INSURANCE/MEDICAL/SWMS/STATUS · tabs: Workers/Subcontractors/Suppliers/Developer/Other · filter: Verified/Pending/Missing | "Key Metrics Summary" · "Key Metrics Detail" · arrow to worker list |
| 05 | SWMS | Builder | Standardised master template · version-controlled · locked for sign-off · 62/68 signed (91%) · cards per trade: Carpenter v3.2, Plumber v2.6, Electrician v4.1, Tiler v2.0★, Framer v3.0, Concreter v2.6★ (★=Template required) | "Total Compliance / Achieved / Pending" · "Not Based / Await / Compliance" on Tiling · "PENDING COMPLIANCE" |
| 06 | Site Diary | Builder | Daily records per project · entry: date/weather/hours/workers/meeting contacts/deliveries/notes/photos · tags: Quality insp./Safety/Variation/Weather delay · Email button | **"AUDIO RECORDING"** (prominent) · **"APPLIED FOR ONSITE MEETINGS!"** |
| 07 | Incident Reporting | Builder | Types: Near Miss/Low/Medium/High/Environmental/Property/Vehicle/Security/Notifiable(WorkSafe) · lifecycle: report→investigate→corrective actions→timeline · Notifiable = must report to WorkSafe VIC immediately | Left: "Info tab → Notifiable/High/Medium/Low/Environmental/Property/Security/Near Miss" · Right: "Incident A B C P" · "CALL 000. EVERY ABLE." |
| 08 | Toolbox Meetings | Builder | Pre-start talks · 24 meetings/30d · 92% avg attendance · 438 digital signatures · topics/attendance/signatures per meeting | ✓ on "New meeting" button |
| 09 | Analytics & Reports | Builder | Compliance by project table · Org compliance 92% donut · 3 auto-generated reports: Monthly OH&S Summary / WorkSafe Incident Register / SWMS Sign-off Report — all export-ready PDF | No legible annotations (printed sideways) |
| 10 | Admin Portal | Builder Admin | 7 platform users · 4 roles · Invite user · Roles: Builder Admin/HSE Manager/Site Supervisor/Worker(Tradie) 184 · "Tradies only see their assigned project — never other builders/projects/admin" | ✓ approved |
| 11 | Settings — Policies | Builder Admin | 6 policies pushed to all workers: OH&S Mgmt Plan v4.1 / Alcohol & Drugs v2.0 / Emergency Response v3.2 / Environmental Mgmt v1.8 / High-Risk Work v2.5 / Site Access & Induction v3.0 · Org: Hartley & Co (demo) · Notifications: Incident alerts/Compliance lapses/Pending SWMS/Toolbox reminders | "OH&S MGMT PLAN=INFLOW" · "Obligation all Panel" · "Hazard ID & Risk" · "Auditing/Environment/Maintenance" · "First Aid/Accident & Investigation" · "Fire Emergency" · "Incidents to WorkSafe" · crossed out → "Builders POLICY (SITE) INDUCTION" |
| 12 | Worker — My Site | Worker mobile | "G'day [Name]" · Assigned site/role/employer · "Site access pending — complete tasks below" · progress % | No annotations |
| 13 | Worker — Induction | Worker mobile | 7 modules, complete all · progress 3/7 · Module 1: Welcome & Site Rules 4min ✓ · Module 2: Site Hazards & Emergency Procedures 6min ✓ · 4 remaining | No annotations |
| 14 | Worker — Quiz | Worker mobile | "Answer all questions correctly to pass" · Q1/4: "What do FIRST if serious incident?" A=photo / B=ensure safe + call help | No annotations |
| 15 | Worker — Sign SWMS | Worker mobile | Trade SWMS assigned · Hazards & risk controls listed · Working at heights (High) · Manual handling (Medium) · Worker signs | No annotations |
| 16 | Worker — Registration | Worker mobile | Tabs: Personal / Contacts / Vehicle & Quals / Documents · First name/Surname/Address/Phone/Email | No annotations |

---

## USER TYPES & ROLES

| User | Interface | Access Level |
|------|-----------|--------------|
| Builder Admin | Web | Full — projects, users, billing, settings |
| HSE Manager | Web | Compliance, incidents, SWMS, reporting — assigned sites |
| Site Supervisor | Web | Workers, diary, toolbox — assigned projects |
| Worker / Tradie | Mobile | Assigned project only — induction, SWMS, compliance |
| Builder Admin Officer | Web | Update compliance records; builder approves |
| First Aid Officer | Web/Mobile | Records treatment; logs incident if required |
| Subcontractor Employer | Web | Ensures workers registered and inducted |
| Electrician/Carpenter/Concreter/Plumber/Tiler/Roofer/Scaffolder/Plasterer/Painter/Framer/Bricklayer/Steel Fixer/Crane Op/Apprentice/Labourer | Mobile | Register, induct, sign trade SWMS |
| Delivery Driver / Site Visitor / Client / Owner | On-site | Visitor sign-in only |
| Building Surveyor / Engineer / Traffic Controller / Forklift Operator / Cleaner | On-site/Mobile | Report; builder/supervisor logs |
| Safety Officer | Web | Weekly inspections; logs open actions |
| Neighbour / Public | External | Complaint → builder logs |

---

## COMPLIANCE TRACKING — 6 CATEGORIES
Induction · Quiz · White Card · Insurance · Medical · SWMS
→ Each tracked per worker as: Verified ✓ | Pending ○ | Missing ✗
→ Aggregate = Achieved Compliance %

---

## DOCUMENT TYPES REQUIRED
SWMS (trade-specific, versioned, locked) · SDS · White Card · Insurance · Medical clearance · Scaffold handover cert · Lift plan/crane docs · Contractor licences · Harness inspection evidence · Plant pre-start checklist · Traffic management plan · Site diary entries · Toolbox meeting attendance · Incident reports · OH&S Mgmt Plan · Alcohol & Drugs Policy · Emergency Response Procedure · Environmental Mgmt Plan · High-Risk Work Procedures · Site Access & Induction Policy · Monthly OH&S Summary (report) · WorkSafe Incident Register (report) · SWMS Sign-off Report (report) · Worker Registration/Profile · Platform Policy · Refund Policy · Terms & Conditions · Security & Privacy Policy

---

## INCIDENT TYPES (confirmed by client annotation PDF p.10)
Near Miss · Low Risk · Medium Risk · High Risk · Environmental · Property Damage · Vehicle · Security · Notifiable (WorkSafe)
→ Notifiable = serious injury/fatality → must report WorkSafe VIC immediately
→ Client also annotated: "Incident A B C P" classification (meaning UNRESOLVED — see contradictions)

---

## KEY BUSINESS RULES
- Worker cannot enter site until induction + quiz + SWMS signed + profile complete
- SWMS standardised to master template · version-controlled · locked · worker signs only
- Roofer: no work until harness evidence uploaded
- Crane operator: docs approved before lift proceeds
- Refusal to induct = log non-compliance + deny site access
- Repeated sign-in breach = logged by builder
- SDS must be uploaded + verified before chemical product used
- Scaffold cert uploaded + verified before use
- Notifiable incident = WorkSafe VIC immediately
- Corrective actions: assigned role + status (Done/In progress/Open)
- Tradie: only sees own assigned project — never other builders/projects/admin
- 4 roles: Builder Admin / HSE Manager / Site Supervisor / Worker (Tradie 184)
- Notifications on: Incident alerts / Compliance lapses / Pending SWMS / Toolbox reminders
- Platform must have: Policy · Refund Policy · T&Cs · Security & Privacy Policy · Payment receipts

---

## 34 SCENARIOS (scenarios.docx — verbatim)

| Stakeholder | Situation | Who Acts | Responsible | Outcome |
|-------------|-----------|----------|-------------|---------|
| Electrician | Electrical lead damaged, shock risk | Electrician reports | Builder/supervisor | Logs + closes action |
| Apprentice | Unsure how to complete induction on app | Apprentice completes | Supervisor | Assists if required |
| Labourer | Forgets to sign in | Labourer signs in | Builder | Records breach if repeated |
| Delivery Driver | Enters without visitor sign-in | Driver/visitor signs in | Site supervisor | Verifies entry |
| Concreter | Concrete truck creates traffic/pedestrian risk | Site supervisor | Site supervisor | Logs traffic control/hazard |
| Roofer | Starts without harness inspection uploaded | Roofer uploads evidence | Builder | Restricts access until done |
| Scaffolder | Scaffold cert missing or expired | Scaffolder uploads cert | Builder | Verifies before use |
| Excavation Contractor | Trench open without barricading | Contractor reports/rectifies | Builder | Logs hazard + corrective action |
| Crane Operator | Lift plan/docs missing before lift | Crane contractor uploads | Builder | Approves before lift |
| Site Visitor | Client/consultant attends for inspection | Visitor signs in | Builder/supervisor | Confirms induction requirements |
| Building Surveyor | Identifies safety access issue | Builder/supervisor | Builder/supervisor | Logs issue + corrective action |
| Engineer | Temporary propping has been altered | Engineer reports immediately | Builder | Logs hazard + action required |
| Demolition Contractor | Suspected asbestos discovered | Contractor stops + reports | Builder | Logs incident/hazard + escalation |
| Plasterer | Slips on wet floor, not seriously injured | Worker reports | Builder/supervisor | Logs incident |
| Painter | Paint fumes, poor ventilation | Painter reports | Builder | Logs control measures |
| Waterproofer | Chemical product SDS not on site | Contractor uploads SDS | Builder | Verifies before product use |
| Tiler | Near miss — scaffold component falls nearby | Tiler reports | Builder/supervisor | Logs near miss |
| Carpenter | Refuses induction or registration | Builder | Builder | Logs non-compliance + denies access |
| Supplier | Cannot log in / doesn't understand process | Supplier registers | Builder/site admin | Assists |
| Builder/Principal Contractor | Serious injury, emergency services attend | Builder/PC | Builder/PC | Logs + manages WorkSafe notification |
| Safety Officer | Weekly inspection, multiple open actions | Safety officer logs | Builder | Tracks close-out |
| Subcontractor Employer | Sends worker who hasn't inducted | Worker registers | Subcontractor + builder | Ensure compliance |
| First Aid Officer | Minor first-aid treatment provided | First aid officer records | Builder/supervisor | Logs incident if required |
| All Workers | Sees unsafe behaviour (removing edge protection) | Worker reports immediately | Builder/supervisor | Logs hazard/non-compliance |
| Site Supervisor | Toolbox meeting done, attendance must be recorded | Site supervisor | Site supervisor | Uploads attendance record |
| Builder Admin Officer | Licences/insurances/SWMS/certs expired | Admin updates records | Builder | Approves |
| Forklift/Telehandler Operator | Pre-start checklist identifies fault | Operator records issue | Builder/supervisor | Logs plant out of service |
| Cleaner | Housekeeping creates trip hazards | Cleaner/worker reports | Builder/supervisor | Logs hazard + action |
| Neighbour/Public | Reports unsafe storage or blocked footpath | Builder/supervisor | Builder/supervisor | Logs complaint + corrective action |
| Client/Owner | Enters site without permission or PPE | Builder/supervisor | Builder/supervisor | Logs breach + reinforces rules |
| Traffic Controller | Traffic mgmt plan not followed during delivery | Traffic controller reports | Builder/supervisor | Logs non-compliance |
| Bricklayer | Silica dust controls not followed | Bricklayer reports/rectifies | Builder | Logs hazard + control measures |
| Plumber | Hot works creates fire/service risk | Plumber reports | Builder/supervisor | Logs permit/action if required |
| Electrician (2) | Temporary power board damaged/exposed to weather | Electrician isolates/reports | Builder | Logs hazard + action |
| Site Manager | End-of-day check: unsecured fencing | Site manager | Site manager | Logs inspection + corrective action |

---

## CONTRADICTIONS & ITEMS REQUIRING CLARIFICATION

1. **Login screen** — "Before you commence refer to page ---- Builder Policy Site Induction!" — page number blank. Is this a forced pre-login step or a reference?
2. **Login screen** — Box: "Site Induction / Video / AI" — is this a video induction, an AI-assisted induction, or a reference only?
3. **Incident priority** — "Incident A B C P" annotation (PDF p.10 right side) — letters undefined. Custom system or industry standard?
4. **Emergency number** — annotation reads "CALL 100" — likely meant 000 (AUS emergency). Confirm before any in-platform emergency guidance is written.
5. **Audio recording** — "APPLIED FOR ONSITE MEETINGS!" (exclamation = emphasis) — applied to whom? Third-party provider, regulator, or internal feature request? Scope implication significant.
6. **Dashboard "DATA — READ ONLY" + "#No"** — which specific data elements are read-only vs editable? "#No" not connected to a labelled element.
7. **Compliance Records "V/b/c — the — option — Pending Site Inductions"** — "V/b/c" meaning unclear. Filter options? Tab name?
8. **PDF p.4 note** — "Every page — (other) — xym — in" — possibly a persistent UI element on every page. Meaning unclear.
9. **PDF p.11 commercial notes** — "$3K / 14 day" — subscription price? Project cost? Trial period? Payment terms?
10. **"user = 1. Sat/Sati"** (PDF p.17) — a person, a satisfaction metric, or a user tier?
11. **PDF p.13 deployment notes** — "LABR" acronym — product, contractor, or abbreviation?
12. **PDF p.15 architecture sketch** — "4 xy,2 / A B C / Cloud / Result" — conceptual architecture or user flow? "4 xy,2" undefined.
13. **PDF p.19 mobile sketch** — "Store / 2.4v2?" — is the worker mobile app intended for App Store/Google Play publication? Major scope implication if yes.

---

## KEY LANGUAGE (client terms)
Achieved Compliance · Action Required · Audio Recording · Builder · Builder Admin · Builders Follow Up · Close-Out · Compliance · Compliance Lapse · Corrective Action · Demo Mode · Drill Down · HSE Manager · Hazard · Incident · Induction/Site Induction · Key Metrics · Near Miss · Notifiable (WorkSafe) · OHS Management Plan · Onsite Meetings · Pending · Pending Compliance · Platform Users · Project · Regulatory Notification · SDS · SWMS · Site Access Pending · Site Diary · Site Supervisor · Standardised · Template Required · Toolbox Meeting · Trade Worker/Tradie · Verified · White Card · WorkSafe Victoria · Worker View

---

## DEMONSTRATION DATA (not client's own)
Builder persona: Daniel Hartley / Hartley & Co Constructions / ABN 45 882 119 660 / Victoria
Projects: Docklands Tower Stage 2 · Geelong Marina Apartments · Ballarat Health Precinct · Bendigo Civic Centre Upgrade · Cranbourne Logistics Warehouse · Frankston Foreshore Hotel · Werribee Town Centre
Workers (demo): Liam Nguyen (Carpenter) · Sophie Callahan (Electrician) · Mason Pereira (Concreter) · Ava Thompson (Plumber) · Noah Di Santo (Tiler) · Isla Robertson (Framer) · Ethan Marsh (Carpenter) · Charlotte Webb (Electrician) · Jack Donnelly (Plumber) · Mia Fitzgerald (Concreter) · Oliver Brennan (Steel Fixer) · Priya Sharma (Crane Op.)

---
*Compact reference — full evidence in OHS_Builder_Victoria_BA_Report.docx*
