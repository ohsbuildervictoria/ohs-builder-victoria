# OHS Builder Victoria — Master Build Prompt
**Use this prompt in Claude / Cursor / Copilot to build the full application.**
**Stack: React + Vite 5 + Tailwind CSS v3 | No deployment config needed yet**

---

## ROLE & OBJECTIVE

You are building **OH&S Builder Victoria** — a full-stack OHS compliance management web application for the Victorian construction industry (Australia). Built by Nexxt Nest Group. Tagline: "Built by Builders for Builders."

Build the complete frontend prototype using:
- **React 18** with functional components and hooks only (no class components)
- **Vite 5** (latest) as the build tool
- **Tailwind CSS v3** for all styling
- **React Router v6** for routing
- **Recharts** for all charts and data visualisations
- **React Hook Form** for all forms
- **No backend required** — use mock data only
- **No deployment config** — no vercel.json, no GitHub Actions, nothing
- **No auth library** — simulate login with local state only

All state management via React hooks: `useState`, `useReducer`, `useContext`, `useEffect`, `useMemo`, `useCallback`. Build custom hooks for shared logic.

---

## PROJECT STRUCTURE

```
src/
├── main.jsx
├── App.jsx
├── index.css
├── hooks/
│   ├── useAuth.js           # Current user + role
│   ├── useCompliance.js     # Compliance status per worker
│   ├── useIncidents.js      # Incident CRUD
│   ├── useProjects.js       # Projects CRUD
│   ├── useWorkers.js        # Workers CRUD
│   ├── useSWMS.js           # SWMS management
│   ├── useDiary.js          # Site diary entries
│   ├── useToolbox.js        # Toolbox meetings
│   └── useNotifications.js  # In-app notification state
├── context/
│   ├── AuthContext.jsx
│   └── AppContext.jsx
├── layouts/
│   ├── BuilderLayout.jsx    # Web sidebar + header
│   └── WorkerLayout.jsx     # Mobile bottom nav
├── pages/
│   ├── Login.jsx
│   ├── builder/
│   │   ├── Dashboard.jsx
│   │   ├── Projects.jsx
│   │   ├── ProjectDetail.jsx
│   │   ├── Compliance.jsx
│   │   ├── SWMS.jsx
│   │   ├── SiteDiary.jsx
│   │   ├── Incidents.jsx
│   │   ├── NearMiss.jsx
│   │   ├── Toolbox.jsx
│   │   ├── Reports.jsx
│   │   ├── AdminPortal.jsx
│   │   └── Settings.jsx
│   └── worker/
│       ├── WorkerHome.jsx
│       ├── Induction.jsx
│       ├── Quiz.jsx
│       ├── SwmsSigning.jsx
│       └── Registration.jsx
├── components/
│   ├── ui/
│   │   ├── Badge.jsx        # Status badges: Verified/Pending/Missing
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   ├── Table.jsx
│   │   ├── Tabs.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── StatCard.jsx     # KPI metric cards
│   │   └── Notification.jsx
│   ├── charts/
│   │   ├── ComplianceDonut.jsx
│   │   ├── ComplianceTrend.jsx
│   │   └── IncidentBar.jsx
│   └── shared/
│       ├── Logo.jsx
│       ├── RoleBadge.jsx
│       └── ComplianceMatrix.jsx  # Worker × 6-category grid
└── data/
    └── mockData.js
```

---

## AUTHENTICATION & ROLES

### Login Screen (`/login`)
- Toggle switch: **Builder** | **Worker** (default: Builder)
- Fields: Email + Password
- Button: "Enter Builder Workspace" (Builder) / "Enter Worker Portal" (Worker)
- Demo mode button — bypasses credentials
- Banner at top: *"Before you commence, refer to Builder Policy Site Induction"*
- On login, route to correct layout based on role

### Roles (4 tiers)
| Role | Interface | Access |
|------|-----------|--------|
| `builder_admin` | Web | Full — all projects, all workers, billing, settings, admin portal |
| `hse_manager` | Web | Compliance, incidents, SWMS, reports — assigned sites only |
| `site_supervisor` | Web | Workers, site diary, toolbox — assigned projects only |
| `worker` | Mobile | Assigned project only — induction, SWMS, profile |

**CRITICAL RULE:** Workers (Tradies) must NEVER see other builders' projects, other workers' data, or any admin area.

### useAuth hook
```js
// Returns: { user, role, login, logout, isBuilder, isWorker }
// Demo users:
// builder_admin: david@arlingtonhomes.com.au
// hse_manager: hse@arlingtonhomes.com.au
// site_supervisor: supervisor@arlingtonhomes.com.au
// worker: liam.nguyen@tradie.com.au
```

---

## MOCK DATA (`src/data/mockData.js`)

### Organisation
```js
org = {
  name: "Arlington Homes",
  abn: "45 882 119 660",
  state: "Victoria",
  plan: "Professional",
  users: 7
}
```

### Projects (7 active, Victoria)
```js
projects = [
  { id: 1, name: "Docklands Tower Stage 2", address: "12 Harbour Esplanade, Docklands VIC 3008", status: "Active", buildPercent: 68, workers: 42, compliance: 94, incidents: 1, contractType: "Lump Sum", contractValue: 8400000 },
  { id: 2, name: "Geelong Marina Apartments", address: "45 Eastern Beach Rd, Geelong VIC 3220", status: "Active", buildPercent: 31, workers: 28, compliance: 88, incidents: 0, contractType: "Cost Plus", contractValue: 5200000 },
  { id: 3, name: "Ballarat Health Precinct", address: "1 Drummond St N, Ballarat VIC 3350", status: "Active", buildPercent: 85, workers: 19, compliance: 97, incidents: 0, contractType: "Lump Sum", contractValue: 3800000 },
  { id: 4, name: "Bendigo Civic Centre Upgrade", address: "189 Lyttleton Tce, Bendigo VIC 3550", status: "Active", buildPercent: 52, workers: 31, compliance: 91, incidents: 2, contractType: "Lump Sum", contractValue: 6100000 },
  { id: 5, name: "Cranbourne Logistics Warehouse", address: "67 Industrial Dr, Cranbourne VIC 3977", status: "Active", buildPercent: 14, workers: 22, compliance: 79, incidents: 0, contractType: "Design & Construct", contractValue: 4500000 },
  { id: 6, name: "Frankston Foreshore Hotel", address: "2 Beach St, Frankston VIC 3199", status: "Planning", buildPercent: 0, workers: 4, compliance: 100, incidents: 0, contractType: "Lump Sum", contractValue: 9200000 },
  { id: 7, name: "Werribee Town Centre", address: "80 Comben Dr, Werribee VIC 3030", status: "On Hold", buildPercent: 22, workers: 0, compliance: 85, incidents: 0, contractType: "Cost Plus", contractValue: 7700000 }
]
```

### Workers (12 demo workers)
```js
workers = [
  { id: 1, name: "Liam Nguyen", trade: "Carpenter", employer: "Arlington Homes", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 2, name: "Sophie Callahan", trade: "Electrician", employer: "Spark Solutions Pty Ltd", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Pending", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 3, name: "Mason Pereira", trade: "Concreter", employer: "Pereira Concrete", project: 2, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Missing", swms: "Pending", status: "Action Required" },
  { id: 4, name: "Ava Thompson", trade: "Plumber", employer: "AquaFix VIC", project: 1, induction: "Verified", quiz: "Pending", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Action Required" },
  { id: 5, name: "Noah Di Santo", trade: "Tiler", employer: "Di Santo Tiling", project: 3, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Pending", status: "Active" },
  { id: 6, name: "Isla Robertson", trade: "Framer", employer: "Arlington Homes", project: 4, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 7, name: "Ethan Marsh", trade: "Carpenter", employer: "Arlington Homes", project: 2, induction: "Pending", quiz: "Pending", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Missing", status: "Site Access Pending" },
  { id: 8, name: "Charlotte Webb", trade: "Electrician", employer: "Spark Solutions Pty Ltd", project: 3, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 9, name: "Jack Donnelly", trade: "Plumber", employer: "AquaFix VIC", project: 4, induction: "Verified", quiz: "Verified", whiteCard: "Missing", insurance: "Pending", medical: "Verified", swms: "Verified", status: "Action Required" },
  { id: 10, name: "Mia Fitzgerald", trade: "Concreter", employer: "Pereira Concrete", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 11, name: "Oliver Brennan", trade: "Steel Fixer", employer: "Arlington Homes", project: 5, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 12, name: "Priya Sharma", trade: "Crane Operator", employer: "Lift-Right VIC", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Pending", status: "Action Required" }
]
```

### SWMS Templates (trade-specific, version-controlled)
```js
swmsTemplates = [
  { id: 1, trade: "Carpenter", version: "v3.2", signed: 18, total: 18, status: "Compliant" },
  { id: 2, trade: "Plumber", version: "v2.6", signed: 9, total: 10, status: "Pending" },
  { id: 3, trade: "Electrician", version: "v4.1", signed: 8, total: 8, status: "Compliant" },
  { id: 4, trade: "Tiler", version: "v2.0", signed: 3, total: 5, status: "Template Required" },
  { id: 5, trade: "Framer", version: "v3.0", signed: 12, total: 12, status: "Compliant" },
  { id: 6, trade: "Concreter", version: "v2.6", signed: 6, total: 8, status: "Pending Compliance" },
  { id: 7, trade: "Steel Fixer", version: "v1.4", signed: 4, total: 4, status: "Compliant" },
  { id: 8, trade: "Crane Operator", version: "v3.1", signed: 1, total: 2, status: "Pending" }
]
```

### Incidents
```js
incidents = [
  { id: 1, type: "Near Miss", description: "Scaffold component fell near worker on Level 3", project: "Docklands Tower Stage 2", reportedBy: "Noah Di Santo", date: "2026-06-02", status: "Investigating", severity: "Medium" },
  { id: 2, type: "Low Risk", description: "Worker slipped on wet concrete surface", project: "Bendigo Civic Centre Upgrade", reportedBy: "Mason Pereira", date: "2026-06-05", status: "Corrective Action", severity: "Low" },
  { id: 3, type: "High Risk", description: "Temporary propping altered without engineer sign-off", project: "Bendigo Civic Centre Upgrade", reportedBy: "Site Supervisor", date: "2026-06-08", status: "Open", severity: "High" }
]
```

### Policies (Settings)
```js
policies = [
  { id: 1, name: "OH&S Management Plan", version: "v4.1", category: "OH&S Mgmt Plan", status: "Active" },
  { id: 2, name: "Alcohol & Drugs Policy", version: "v2.0", category: "Workplace Conduct", status: "Active" },
  { id: 3, name: "Emergency Response Procedure", version: "v3.2", category: "Fire Emergency", status: "Active" },
  { id: 4, name: "Environmental Management Plan", version: "v1.8", category: "Auditing/Environment", status: "Active" },
  { id: 5, name: "High-Risk Work Procedures", version: "v2.5", category: "Hazard ID & Risk", status: "Active" },
  { id: 6, name: "Site Access & Induction Policy", version: "v3.0", category: "Site Induction", status: "Active" }
]
```

---

## SCREEN-BY-SCREEN SPECIFICATION

### 1. DASHBOARD (`/builder/dashboard`)

**Header KPI cards (row of 5):**
- Active Projects: **12**
- Active Workers: **184**
- Achieved Compliance: **92%**
- Pending Inductions: **9** (amber)
- Open Incidents: **3** (red)

**Secondary KPI row:**
- Pending SWMS Sign-offs: **6**
- WorkSafe Notifications: **1** (red — urgent)
- Near Misses (30d): **4**
- LTI Rate: **0.0** (green)

**Charts section (two columns):**
- Left: Compliance Trend line chart (6 months, show 88% → 92%)
- Right: Incidents by Type donut chart

**Bottom section:**
- Project compliance table: project name | compliance % | progress bar | status
- Recent activity feed (last 5 actions with timestamp)

**Annotations from David (MUST implement):**
- Link button: "OH&S MGMT PLAN / POLICY / LEGISLATION" — opens policy modal
- All KPI data marked READ ONLY — no inline editing on dashboard
- Section heading: "BUILDERS PROJECT COMPLIANCE"

---

### 2. PROJECTS (`/builder/projects`)

**Filter tabs:** All | Active | Planning | On Hold | Closed

**Project cards (grid, 2 columns):**
Each card shows:
- Project name + full address
- Status badge (colour-coded)
- Build progress bar + percentage
- Workers on site count
- Compliance % with colour (red <80, amber 80-89, green 90+)
- Active incidents count
- Contract type + value (AUD formatted)
- "View Details" button → `/builder/projects/:id`

---

### 3. PROJECT DETAIL (`/builder/projects/:id`)

Tabs: Overview | Workers | Compliance | Incidents | Documents | Diary

**Overview tab:** project info, map placeholder, key metrics
**Workers tab:** table of all workers on that project with compliance status
**Compliance tab:** 6-category breakdown for that project
**Incidents tab:** incidents filtered to this project
**Documents tab:** document upload area (mock — no real upload needed)
**Diary tab:** site diary entries for this project

---

### 4. COMPLIANCE RECORDS (`/builder/compliance`)

**Summary bar (top):** 6 progress bars — one per category
- Induction: 98% | Quiz: 100% | White Card: 100% | Insurance: 75% | Medical: 100% | SWMS: 85%

**Filter tabs:** Workers | Subcontractors | Suppliers | Developer | Other

**Compliance matrix table:**
Columns: Worker Name | Trade | Induction | Quiz | White Card | Insurance | Medical | SWMS | Overall Status

Each cell = coloured badge: ✅ Verified (green) | ⏳ Pending (amber) | ❌ Missing (red)

Overall Status column:
- All Verified → "Active" (green)
- Any Pending → "Action Required" (amber)
- Any Missing → "Site Access Pending" (red)

**CRITICAL BUSINESS RULE:** Worker with ANY Missing item cannot access site. Show red banner on their row.

**Buttons:** Upload Documents | Export CSV

---

### 5. SWMS MANAGEMENT (`/builder/swms`)

**Summary stats:** Total templates | Total signed | Overall sign-off % (show as donut)

**Trade cards (grid):**
Each card: Trade name | Version | Signed/Total count | Progress bar | Status badge

Status badges:
- "Compliant" → green
- "Pending Compliance" → amber
- "Template Required" → red (needs new template created)

**Per-template actions:** View | Edit | Lock for Sign-off | Download PDF

**SWMS is standardised** — master template per trade, version-controlled. Workers sign the assigned version; they cannot edit it.

---

### 6. SITE DIARY (`/builder/diary`)

**Left panel:** Project selector + date picker + list of diary entries

**Entry form fields:**
- Date (auto today)
- Project (dropdown)
- Weather conditions (dropdown: Fine/Cloudy/Rain/Wind/Extreme Heat)
- Hours worked on site
- Workers present (number)
- Meeting contacts (text)
- Deliveries received (text)
- Notes / observations (textarea)
- Tags (multi-select): Quality Inspection | Safety | Variation | Weather Delay | Visitor
- Photo attachment (mock button — no real upload)
- **Audio Recording button** (prominent — mic icon, labelled "Record Site Note") — show as UI element, state: "Recording feature applied for — coming soon"
- **"Applied for Onsite Meetings" badge** visible on the meetings section

**Email button** — "Email diary entry" (mock — shows success toast, no real email)

---

### 7. INCIDENT REPORTING (`/builder/incidents`)

**Tabs:** All Incidents | Near Miss | WorkSafe Notifiable

**Incident type filter pills:**
Near Miss | Low Risk | Medium Risk | High Risk | Environmental | Property Damage | Vehicle | Security | Notifiable (WorkSafe)

**Incident cards / table:**
- Type badge (colour coded) | Description | Project | Reported by | Date | Status

**Incident lifecycle status:**
Open → Investigating → Corrective Actions Assigned → Corrective Actions Complete → Closed

**Notifiable incidents** (WorkSafe) — show red urgent banner: *"This incident must be reported to WorkSafe Victoria immediately. Call 000 if emergency."*

**Create New Incident modal — fields:**
- Incident type (dropdown — all types above)
- Date/time
- Project (dropdown)
- Location on site
- Description
- Injured/involved person
- Witnesses
- Immediate action taken
- Attach photos (mock)
- Severity: Low | Medium | High | Critical

**Corrective Actions section per incident:**
- Action description | Assigned to (role) | Due date | Status: Open | In Progress | Done

---

### 8. TOOLBOX MEETINGS (`/builder/toolbox`)

**Stats row:** Total meetings (30d): 24 | Avg attendance: 92% | Digital signatures collected: 438

**Meeting list:**
- Meeting title | Project | Date | Topic | Attendance count | Signatures count | Status

**Create New Meeting modal:**
- Title | Project | Date/time | Topic/agenda | Attendees (multi-select from workers list)

**Attendance sign-off:** Each attendee has a "Signed" checkbox — digital signature simulated

---

### 9. REPORTS & ANALYTICS (`/builder/reports`)

**Compliance by Project table:**
Project | Induction | Quiz | White Card | Insurance | Medical | SWMS | Overall

**Org-wide donut:** Overall compliance 92% — large centred donut chart

**Auto-generated reports (3 cards):**
1. Monthly OH&S Summary — "Export PDF" button
2. WorkSafe Incident Register — "Export PDF" button
3. SWMS Sign-off Report — "Export PDF" button

All exports are mock — show download toast with filename.

---

### 10. ADMIN PORTAL (`/builder/admin`)

**Platform users table:**
Name | Email | Role | Status | Last Login | Actions (Edit/Deactivate)

**Roles summary:** Builder Admin: 1 | HSE Manager: 2 | Site Supervisor: 3 | Worker/Tradie: 184

**Invite User button** — modal: Name, Email, Role (dropdown), Project assignment

**Role permission matrix** (read-only display table):
Feature vs Role — tick/cross grid

---

### 11. SETTINGS (`/builder/settings`)

**Tabs:** Policies | Notifications | Organisation | Platform

**Policies tab:**
Table of 6 policies: Name | Version | Category | Status | Last Updated | Actions (Edit/Upload New Version)

Categories shown (from David's annotations):
- OH&S Mgmt Plan
- Hazard ID & Risk
- Auditing / Environment / Maintenance
- First Aid / Accident & Investigation
- Fire Emergency
- Incidents to WorkSafe
- Site Access & Induction (Builders Policy Site Induction)

**Notifications tab:**
Toggle switches for:
- Incident alerts (on)
- Compliance lapses (on)
- Pending SWMS sign-offs (on)
- Toolbox meeting reminders (on)
- WorkSafe notifications (on — locked, cannot disable)

**Organisation tab:** Org name, ABN, state, plan tier, billing contact (read-only display)

**Platform tab:** Links to: Privacy Policy | Terms & Conditions | Refund Policy | Security Policy (all open mock modal with placeholder text)

---

## WORKER MOBILE SCREENS

All worker screens use `WorkerLayout.jsx` — mobile-first, max-width 430px, bottom navigation bar.

**Bottom nav (5 items):** My Site | Induction | SWMS | Profile | Exit

---

### 12. WORKER HOME (`/worker/home`)

- "G'day, [Worker Name]!" greeting
- Assigned site name + address
- Role + employer
- **Progress banner:** "Site Access Pending — Complete tasks below" OR "Site Access Granted ✅" depending on compliance status
- Task checklist:
  - [ ] Complete Site Induction
  - [ ] Pass Safety Quiz
  - [ ] Sign SWMS
  - [ ] Upload Documents (White Card, Insurance)
- Overall progress bar (e.g., 2/4 complete)

---

### 13. INDUCTION (`/worker/induction`)

7 modules — all must be completed in order:
1. Welcome & Site Rules — 4 min — ✅ Complete
2. Site Hazards & Emergency Procedures — 6 min — ✅ Complete
3. Personal Protective Equipment — 5 min — 🔒 Locked (complete in order)
4. Working at Heights — 7 min — 🔒 Locked
5. Chemical & Hazardous Substances — 4 min — 🔒 Locked
6. Incident Reporting Procedures — 5 min — 🔒 Locked
7. Site-Specific Rules & Access — 3 min — 🔒 Locked

Progress: 2 of 7 modules complete

Each module card: Title | Duration | Status badge | "Start Module" or "Completed ✅" button

---

### 14. QUIZ (`/worker/quiz`)

- "Answer all questions correctly to pass"
- 4 questions, one at a time
- Q1: "What should you do FIRST if you witness a serious incident?"
  - A) Take photos immediately
  - B) Ensure the area is safe, then call for help ← correct
  - C) Continue working and report later
  - D) Leave the site immediately
- Show correct/incorrect feedback per answer
- Pass = all 4 correct → "Quiz Passed ✅ — Proceed to sign your SWMS"
- Fail = retry allowed

---

### 15. SWMS SIGNING (`/worker/swms`)

- Assigned trade SWMS displayed (read-only — worker cannot edit)
- SWMS title + version number
- Hazards & risk controls listed:
  - Working at Heights — Risk: High — Controls: Full body harness, edge protection, spotter required
  - Manual Handling — Risk: Medium — Controls: Team lift for loads >20kg, use equipment where available
  - Power Tools — Risk: Medium — Controls: Pre-start inspection, PPE required at all times
  - Slip/Trip Hazards — Risk: Low — Controls: Keep work area clear, report spills immediately
- Scroll-to-bottom required before sign button activates
- Signature: "I have read and understood this SWMS" — checkbox + typed name + date
- "Sign SWMS" button — success confirmation

---

### 16. WORKER REGISTRATION (`/worker/registration`)

Tabs: Personal | Emergency Contacts | Vehicle & Quals | Documents

**Personal tab:**
- First Name | Surname | Date of Birth | Phone | Email | Home Address | Trade | Employer

**Emergency Contacts tab:**
- Contact Name | Relationship | Phone | Alternate Phone

**Vehicle & Quals tab:**
- White Card Number | Licence Number | Licence Expiry | Vehicle Rego (optional)
- Additional qualifications (text area)

**Documents tab:**
- Upload: White Card (photo) | Insurance Certificate | Medical Clearance | Other
- Each shows: filename | upload date | status (Pending review / Verified)

---

## CUSTOM HOOKS SPECIFICATION

Build these hooks — they are the patchable extension points:

```js
// useAuth.js
export function useAuth() {
  // Returns: { user, role, login(email, password), logout, isBuilder, isWorker, hasRole(roleName) }
}

// useProjects.js
export function useProjects() {
  // Returns: { projects, getProject(id), addProject, updateProject, filterByStatus }
}

// useWorkers.js
export function useWorkers(projectId = null) {
  // Returns: { workers, getWorker(id), updateCompliance, filterByStatus, getComplianceStats }
}

// useCompliance.js
export function useCompliance(workerId) {
  // Returns: { compliance, updateCategory, overallStatus, canAccessSite, missingItems }
  // RULE: canAccessSite = all 6 categories === "Verified"
}

// useIncidents.js
export function useIncidents(projectId = null) {
  // Returns: { incidents, addIncident, updateStatus, addCorrectiveAction, getByType }
}

// useSWMS.js
export function useSWMS(trade = null) {
  // Returns: { templates, getTemplate, signSWMS, lockTemplate, signOffStats }
}

// useDiary.js
export function useDiary(projectId = null) {
  // Returns: { entries, addEntry, getByProject, getByDate }
}

// useToolbox.js
export function useToolbox(projectId = null) {
  // Returns: { meetings, addMeeting, recordAttendance, getStats }
}

// useNotifications.js
export function useNotifications() {
  // Returns: { notifications, unreadCount, markRead, markAllRead }
  // Auto-generate notifications from: incidents, compliance lapses, pending SWMS
}
```

---

## NAVIGATION & ROUTING

```jsx
// App.jsx routes
/                          → redirect to /login
/login                     → Login.jsx (no layout)

// Builder routes (BuilderLayout wrapper)
/builder/dashboard         → Dashboard.jsx
/builder/projects          → Projects.jsx
/builder/projects/:id      → ProjectDetail.jsx
/builder/compliance        → Compliance.jsx
/builder/swms              → SWMS.jsx
/builder/diary             → SiteDiary.jsx
/builder/incidents         → Incidents.jsx
/builder/toolbox           → Toolbox.jsx
/builder/reports           → Reports.jsx
/builder/admin             → AdminPortal.jsx (builder_admin only)
/builder/settings          → Settings.jsx

// Worker routes (WorkerLayout wrapper)
/worker/home               → WorkerHome.jsx
/worker/induction          → Induction.jsx
/worker/quiz               → Quiz.jsx
/worker/swms               → SwmsSigning.jsx
/worker/registration       → Registration.jsx
```

**BuilderLayout sidebar items (in order):**
Dashboard | Projects | Compliance | SWMS | Site Diary | Incidents | Toolbox Meetings | Reports | Admin Portal | Settings | — | Worker View (link) | Sign Out

**WorkerLayout bottom nav:**
My Site | Induction | SWMS | Profile | Exit

---

## DESIGN SYSTEM

**Colours (Tailwind classes):**
- Primary navy: `bg-blue-900` / `text-blue-900`
- Accent gold: `bg-yellow-500` / `text-yellow-500`
- Success green: `bg-green-500` / `text-green-100`
- Warning amber: `bg-amber-500` / `text-amber-100`
- Danger red: `bg-red-500` / `text-red-100`
- Sidebar bg: `bg-slate-900`
- Page bg: `bg-slate-50`
- Card bg: `bg-white` with `shadow-sm border border-slate-200`

**Status badge colours:**
- Verified → green
- Pending → amber
- Missing → red
- Active → green
- Action Required → amber
- Site Access Pending → red
- Compliant → green
- Template Required → red

**Typography:**
- Page titles: `text-2xl font-bold text-slate-800`
- Section headings: `text-lg font-semibold text-slate-700`
- Table headers: `text-xs font-semibold text-slate-500 uppercase tracking-wider`
- Body: `text-sm text-slate-600`

---

## KEY BUSINESS RULES (enforce in code)

1. Worker cannot access site until ALL 6 compliance categories = Verified
2. SWMS is read-only for workers — they can only sign, never edit
3. SWMS is version-controlled — each trade has one active master version
4. Notifiable incidents trigger a red urgent banner with WorkSafe contact info
5. Workers only see their assigned project — never other projects, never admin
6. Corrective actions have: assigned role + due date + status (Open / In Progress / Done)
7. Induction modules must be completed in order (sequential unlock)
8. Quiz must be passed before SWMS signing is available
9. Builder Admin only can access Admin Portal
10. All reports are export-ready (mock export with toast notification)

---

## 34 SCENARIO COVERAGE (ensure these user flows work)

The following scenarios must be navigable in the app:

| Scenario | Screen(s) involved |
|----------|--------------------|
| Electrician reports damaged lead | Incidents → Create → Low/Medium Risk |
| Apprentice completes induction | Worker → Induction → all 7 modules |
| Labourer forgot to sign in | Site Diary → entry noting attendance |
| Roofer starts without harness evidence | Compliance → Missing badge → upload docs |
| Scaffolder cert missing | Compliance → Missing → upload → Pending review |
| Crane operator lift plan missing | Compliance → Missing → upload → builder approves |
| Plasterer slips, not seriously injured | Incidents → Create → Low Risk |
| Waterproofer SDS not on site | Compliance → Missing → upload SDS |
| Tiler near miss — scaffold falls | Incidents → Create → Near Miss |
| Carpenter refuses induction | Compliance → log non-compliance → deny site access |
| Serious injury — WorkSafe | Incidents → Create → Notifiable → red urgent banner |
| Safety Officer weekly inspection | Incidents/Compliance → open corrective actions |
| Builder Admin Officer updates licences | Compliance → upload → builder_admin approves |
| Silica dust controls not followed | Incidents → Create → Environmental/Hazard |
| Plumber hot works risk | Incidents → Create → High Risk + corrective action |
| End-of-day fencing check | Site Diary → entry + Safety tag |

---

## WHAT TO SKIP (build later)

- ❌ GitHub / git config
- ❌ Vercel / deployment config
- ❌ Real authentication (no JWT, no API)
- ❌ Real file uploads (mock UI only)
- ❌ Real email sending (toast notifications only)
- ❌ Audio recording (show UI placeholder: "Applied for — coming soon")
- ❌ App Store / native mobile build
- ❌ Payment / billing screens
- ❌ Backend / database

---

## OUTPUT REQUIREMENTS

- Every file complete, no TODOs, no placeholder components
- All routes working and navigable
- All mock data wired to all screens
- All hooks implemented and used
- Responsive: Builder web ≥ 1024px | Worker mobile ≤ 430px
- No console errors or warnings
- `npm run dev` starts cleanly on first run

---

*Source: OHS Saroj (1).pdf (19pp David annotations) + OHS-Builder-Victoria-Screens (1).pptx (16 slides) + scenarios.docx (34 scenarios) — Nexxt Nest Group / OHS Builder Victoria*
