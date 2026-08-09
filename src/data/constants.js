// ============================================================================
// OHS Builder Victoria — Static app configuration
// Branding, role definitions, lookup lists and learning content.
// All operational data (projects, workers, incidents, SWMS, diary, toolbox,
// policies, users) lives in Supabase — see src/lib/api.js.
// ============================================================================

export const brand = {
  productName: "OHS Builder",
  region: "Victoria",
  domain: "ohsbuildervictoria.com.au",
  fullName: "OHS Builder Victoria",
  supportEmail: "admin@ohsbuildervictoria.com.au",
  tagline: "Built by Builders for Builders.",
  // Legal identity: OHS Builder Victoria is a registered business name of
  // ConstructIQ Technologies Pty Ltd.
  legalName: "ConstructIQ Technologies Pty Ltd",
  abn: "39 699 824 238",
  acn: "699 824 238",
  copyright: "© 2026 OHS Builder Victoria · ConstructIQ Technologies Pty Ltd · ABN 39 699 824 238",
};

export const roleLabels = {
  builder_admin: "Builder Admin",
  hse_manager: "HSE Manager",
  site_supervisor: "Site Supervisor",
  worker: "Stakeholder / Tradie",
};

// The 6 compliance categories used across the matrix. Defined once in
// src/lib/compliance.js (the single source of truth for compliance logic) and
// re-exported here for the many modules that already import it from constants.
export { complianceCategories } from "../lib/compliance";

// ---------------------------------------------------------------------------
// Incident classification
//
// TYPE says what happened. SEVERITY says how bad the consequence was. The old
// list conflated the two — it offered "Low Risk / Medium Risk / High Risk" as
// *types* alongside a separate severity field, so a report could say type
// "High Risk" with severity "Low" and mean nothing. It also had no way at all
// to record that a person was hurt, which is the single most important thing
// an incident register captures.
//
// Each severity is tied to an objective test (first aid / medical treatment /
// serious injury / fatality) so two supervisors grade the same event the same
// way, and so the register stands up when a regulator or insurer reads it.
// ---------------------------------------------------------------------------

export const incidentTypes = [
  { value: "Near Miss", purpose: "No injury or damage occurred, but there was potential." },
  { value: "Injury / Illness", purpose: "A person was injured or became ill." },
  { value: "Property Damage", purpose: "Damage to plant, equipment, buildings or materials." },
  { value: "Environmental", purpose: "Pollution, spills, contamination, waste, noise, dust." },
  { value: "Security", purpose: "Theft, vandalism, trespass, violence, cyber incident." },
  {
    value: "Dangerous Occurrence",
    purpose: "Serious event with significant potential (e.g. scaffold collapse, crane failure) even if nobody was injured.",
  },
  { value: "Notifiable Incident", purpose: "Incident that must legally be reported to the regulator." },
];

export const incidentSeverities = [
  { value: "Insignificant", meaning: "Minimal impact." },
  { value: "Minor", meaning: "First aid only, or minor damage." },
  { value: "Moderate", meaning: "Medical treatment, or moderate property or environmental damage." },
  { value: "Major", meaning: "Serious injury, extensive damage, significant environmental impact." },
  { value: "Catastrophic", meaning: "Fatality, permanent disability, major collapse or disaster." },
];

export const incidentTypeValues = incidentTypes.map((t) => t.value);
export const incidentSeverityValues = incidentSeverities.map((s) => s.value);

export const incidentTypePurpose = Object.fromEntries(
  incidentTypes.map((t) => [t.value, t.purpose])
);
export const incidentSeverityMeaning = Object.fromEntries(
  incidentSeverities.map((s) => [s.value, s.meaning])
);

// Records written before this scale existed. Kept so historical incidents keep
// displaying and can still be edited without being silently re-graded — a
// safety record is corrected deliberately, never rewritten by a dropdown.
export const legacyIncidentTypes = [
  "Low Risk", "Medium Risk", "High Risk", "Vehicle", "Notifiable (WorkSafe)",
];
export const legacyIncidentSeverities = ["Low", "Medium", "High", "Critical"];

// What obliges a call to WorkSafe Victoria. Deliberately errs towards
// prompting: a dangerous occurrence is notifiable in Victoria even when nobody
// was hurt, and "Major" means serious injury. Over-prompting costs a phone
// call; under-prompting costs a prosecution.
export const NOTIFIABLE_TYPES = [
  "Notifiable Incident",
  "Dangerous Occurrence",
  "Notifiable (WorkSafe)", // legacy
];
export const NOTIFIABLE_SEVERITIES = [
  "Major",
  "Catastrophic",
  "Critical", // legacy
];

export const isNotifiableIncident = (type, severity) =>
  NOTIFIABLE_TYPES.includes(type) || NOTIFIABLE_SEVERITIES.includes(severity);

// A corrective action's own lifecycle, independent of the incident's.
export const correctiveActionStatuses = ["Open", "In Progress", "Done"];

export const incidentLifecycle = [
  "Open", "Investigating", "Corrective Actions Assigned",
  "Corrective Actions Complete", "Closed",
];

export const weatherOptions = [
  "Sunny", "Partly cloudy", "Overcast", "Rain", "Heavy rain",
  "Windy", "Storm", "Fog", "Hot (>35°C)", "Cold (<5°C)",
];

export const diaryTags = [
  "Concrete Pour", "Steel Frame", "Glazing", "Fit-out", "Inspection",
  "Incident", "Wet Weather", "Crane", "Delivery", "Toolbox Meeting",
  "Visitor on Site", "Subcontractor", "Survey / Engineering",
];

export const policyCategories = [
  "OHS Mgmt Plan",
  "Hazard ID & Risk",
  "Auditing / Environment / Maintenance",
  "First Aid / Accident & Investigation",
  "Fire Emergency",
  "Incidents to WorkSafe",
  "Site Access & Induction (Builders Policy Site Induction)",
];

// ---------------------------------------------------------------------------
// Worker portal learning content
// ---------------------------------------------------------------------------

// Generic fallback induction content — shown until a builder writes their own
// site rules (Project → Induction tab). Never leaves a tradie a blank screen.
export const inductionDefaults = {
  rules: `Welcome to site. Before you start work:

• Sign in at the gate every day (scan the QR poster).
• Wear your PPE at all times — hard hat, steel-cap boots and hi-vis as a minimum.
• No alcohol or drugs on site. Ever.
• Keep your work area tidy — trip hazards hurt people.
• If you're not sure how to do something safely, stop and ask the supervisor.
• Report every hazard, incident and near miss straight away, no matter how small.`,
  emergency: `If the alarm sounds or you're told to evacuate: stop work, turn off your equipment if it's safe to, and walk to the muster point. Don't go back for tools. Wait to be marked off.

Dial 000 for any life-threatening emergency, then tell the site supervisor.`,
};

export const inductionModules = [
  { id: 1, title: "Welcome & Site Rules", mins: 4, done: false, summary: "Site rules, PPE zones, and reporting lines." },
  { id: 2, title: "Site Hazards & Emergency Procedures", mins: 6, done: false, summary: "Muster points, fire warden, and emergency contacts." },
  { id: 3, title: "PPE Requirements", mins: 3, done: false, summary: "Hard hat, boots, hi-vis, and trade-specific PPE." },
  { id: 4, title: "High-Risk Work & Permits", mins: 5, done: false, summary: "Hot works, heights, and permit-to-work process." },
  { id: 5, title: "Reporting Incidents & Near Misses", mins: 3, done: false, summary: "How to log hazards before someone gets hurt." },
  { id: 6, title: "OHS Knowledge Check", mins: 5, done: false, summary: "Prepare for the safety quiz." },
];

// The safety quiz now lives in the database (public.quiz_questions) and is
// graded by public.submit_quiz(). The questions AND their correct answers used
// to sit right here and ship to every browser, which made the quiz — and the
// "Quiz Verified" it produced — worthless as evidence. Seeded content for new
// organisations lives in supabase/migrations/008_server_side_quiz.sql.

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
export const formatAUD = (amount) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(amount);

// ---------------------------------------------------------------------------
// Permission matrix — DOCUMENTATION of what the database enforces.
//
// There used to be a `rolePermissions` table here that the sidebar filtered
// itself with, and an Admin Portal matrix generated from it. Both described
// access the database never checked: hiding a menu item stops nobody who can
// type a URL or call PostgREST. Enforcement now lives entirely in RLS policies
// (supabase/migrations/009_database_enforced_rbac.sql) and the sidebar renders
// from public.my_permissions(), so the menu can no longer claim more than the
// database will honour.
//
// What follows is a transcription of those policies for the Admin Portal, kept
// deliberately as text: it is a description of the rules, not the rules
// themselves. Letters are C(reate) R(ead) U(pdate) D(elete); "—" is no access
// at all, refused by the database with a 42501.
// ---------------------------------------------------------------------------
export const permissionRoles = [
  "builder_admin",
  "hse_manager",
  "site_supervisor",
  "worker",
];

const NONE = { rights: "—", scope: "No access" };

export const permissionMatrix = [
  {
    resource: "Organisation & branding",
    cells: [
      { rights: "R U", scope: "Own company" },
      { rights: "R", scope: "Read-only" },
      { rights: "R", scope: "Read-only" },
      { rights: "R", scope: "Read-only" },
    ],
  },
  {
    resource: "Billing & subscription",
    cells: [{ rights: "R U", scope: "Account owner" }, NONE, NONE, NONE],
  },
  {
    resource: "User accounts",
    cells: [
      { rights: "C R U D", scope: "Whole roster" },
      { rights: "R", scope: "Roster, read-only" },
      { rights: "R U", scope: "Own account" },
      { rights: "R U", scope: "Own account" },
    ],
  },
  {
    resource: "Roles & site assignment",
    cells: [{ rights: "U", scope: "Audited RPC" }, NONE, NONE, NONE],
  },
  {
    resource: "Invitations",
    cells: [{ rights: "C R U D", scope: "Whole org" }, NONE, NONE, NONE],
  },
  {
    resource: "Projects",
    cells: [
      { rights: "C R U D", scope: "All sites" },
      { rights: "R", scope: "All sites" },
      { rights: "R", scope: "Assigned sites" },
      { rights: "R", scope: "Their own site" },
    ],
  },
  {
    resource: "Crew records",
    cells: [
      { rights: "C R U D", scope: "Whole crew" },
      { rights: "C R U D", scope: "Whole crew" },
      { rights: "R", scope: "Crew on assigned sites" },
      { rights: "R", scope: "Own record only" },
    ],
  },
  {
    resource: "SWMS documents",
    cells: [
      { rights: "C R U D", scope: "All trades" },
      { rights: "C R U D", scope: "All trades" },
      { rights: "R", scope: "All trades" },
      { rights: "R", scope: "Their trade only" },
    ],
  },
  {
    resource: "SWMS signatures",
    cells: [
      { rights: "C R", scope: "All · never editable" },
      { rights: "C R", scope: "All · never editable" },
      { rights: "R", scope: "Crew on assigned sites" },
      { rights: "C R", scope: "Own signature only" },
    ],
  },
  {
    resource: "Incidents",
    cells: [
      { rights: "C R U D", scope: "All sites" },
      { rights: "C R U", scope: "All sites · no delete" },
      { rights: "C R U", scope: "Assigned sites" },
      { rights: "C R", scope: "Reported by or involving them" },
    ],
  },
  {
    resource: "Corrective actions",
    cells: [
      { rights: "C R U D", scope: "All sites" },
      { rights: "C R U D", scope: "All sites" },
      { rights: "C R U D", scope: "Assigned sites" },
      { rights: "R", scope: "On their own incidents" },
    ],
  },
  {
    resource: "Site diary",
    cells: [
      { rights: "C R U D", scope: "All sites" },
      { rights: "C R U D", scope: "All sites" },
      { rights: "C R U D", scope: "Assigned sites" },
      NONE,
    ],
  },
  {
    resource: "Toolbox meetings",
    cells: [
      { rights: "C R U D", scope: "All sites" },
      { rights: "C R U D", scope: "All sites" },
      { rights: "C R U D", scope: "Assigned sites" },
      NONE,
    ],
  },
  {
    resource: "Policy register",
    cells: [
      { rights: "C R U D", scope: "Whole org" },
      { rights: "C R U D", scope: "Whole org" },
      { rights: "R", scope: "Read-only" },
      { rights: "R", scope: "Read-only" },
    ],
  },
  {
    resource: "Compliance documents",
    cells: [
      { rights: "C R U D", scope: "Whole crew" },
      { rights: "C R U D", scope: "Whole crew" },
      { rights: "R", scope: "Crew on assigned sites" },
      { rights: "C R U D", scope: "Own documents only" },
    ],
  },
  {
    resource: "Subcontractor companies",
    cells: [
      { rights: "C R U D", scope: "Whole org" },
      { rights: "C R U D", scope: "Whole org" },
      { rights: "R", scope: "Read-only" },
      { rights: "R", scope: "Their own company" },
    ],
  },
  {
    resource: "Project documents",
    cells: [
      { rights: "C R U D", scope: "All sites" },
      { rights: "R", scope: "All sites" },
      { rights: "C R U D", scope: "Assigned sites" },
      NONE,
    ],
  },
  {
    resource: "Site check-ins",
    cells: [
      { rights: "R", scope: "All sites" },
      { rights: "R", scope: "All sites" },
      { rights: "R", scope: "Assigned sites" },
      { rights: "R", scope: "Own check-ins" },
    ],
  },
  {
    resource: "Quiz attempts",
    cells: [
      { rights: "R", scope: "Whole crew" },
      { rights: "R", scope: "Whole crew" },
      { rights: "R", scope: "Crew on assigned sites" },
      { rights: "R", scope: "Own attempts · graded server-side" },
    ],
  },
  {
    resource: "Photos on records",
    cells: [
      { rights: "C R D", scope: "Records they can see" },
      { rights: "C R D", scope: "Records they can see" },
      { rights: "C R", scope: "Records they can see" },
      { rights: "C R", scope: "Their own incidents" },
    ],
  },
  {
    resource: "Security audit log",
    cells: [
      { rights: "R", scope: "Whole org · append-only" },
      { rights: "R", scope: "Whole org · append-only" },
      NONE,
      NONE,
    ],
  },
];

