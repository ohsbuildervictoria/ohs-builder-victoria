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

export const incidentTypes = [
  "Near Miss", "Low Risk", "Medium Risk", "High Risk",
  "Environmental", "Property Damage", "Vehicle", "Security", "Notifiable (WorkSafe)",
];

export const incidentSeverities = ["Low", "Medium", "High", "Critical"];

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
export const inductionModules = [
  { id: 1, title: "Welcome & Site Rules", mins: 4, done: false, summary: "Site rules, PPE zones, and reporting lines." },
  { id: 2, title: "Site Hazards & Emergency Procedures", mins: 6, done: false, summary: "Muster points, fire warden, and emergency contacts." },
  { id: 3, title: "PPE Requirements", mins: 3, done: false, summary: "Hard hat, boots, hi-vis, and trade-specific PPE." },
  { id: 4, title: "High-Risk Work & Permits", mins: 5, done: false, summary: "Hot works, heights, and permit-to-work process." },
  { id: 5, title: "Reporting Incidents & Near Misses", mins: 3, done: false, summary: "How to log hazards before someone gets hurt." },
  { id: 6, title: "OHS Knowledge Check", mins: 5, done: false, summary: "Prepare for the safety quiz." },
];

export const quizQuestions = [
  {
    q: "What should you do FIRST if you witness a serious incident on site?",
    options: [
      "Take a photo for the report",
      "Ensure the area is safe and call for help / first aid",
      "Continue working and tell the supervisor later",
      "Move the injured person immediately",
    ],
    answer: 1,
  },
  {
    q: "When is a SWMS required to be signed?",
    options: [
      "Only after an incident occurs",
      "Once a year regardless of task",
      "Before commencing any high-risk construction work",
      "It is optional for experienced workers",
    ],
    answer: 2,
  },
  {
    q: "Which PPE is mandatory at all times on this site?",
    options: [
      "Hard hat, hi-vis and steel-capped boots",
      "Only when operating machinery",
      "Gloves and glasses only",
      "PPE is recommended but not enforced",
    ],
    answer: 0,
  },
  {
    q: "What does an untagged piece of scaffolding mean?",
    options: [
      "It is brand new and safe to use",
      "It can be used with supervisor approval",
      "Do NOT use it — it has not been inspected/approved",
      "Only the top level is unsafe",
    ],
    answer: 2,
  },
  {
    q: "Under Victorian OHS law, who must be notified of a notifiable incident?",
    options: [
      "The project architect only",
      "WorkSafe Victoria — immediately by phone",
      "The client within 48 hours",
      "No notification required for near misses",
    ],
    answer: 1,
  },
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
export const formatAUD = (amount) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(amount);

// ---------------------------------------------------------------------------
// Role permissions (enforced in BuilderLayout nav)
// ---------------------------------------------------------------------------
export const rolePermissions = {
  builder_admin: {
    dashboard: true, projects: true, compliance: true, swms: true, diary: true,
    incidents: true, toolbox: true, reports: true, admin: true, policies: true,
  },
  hse_manager: {
    dashboard: true, projects: false, compliance: true, swms: true, diary: false,
    incidents: true, toolbox: true, reports: true, admin: false, policies: false,
  },
  site_supervisor: {
    dashboard: true, projects: false, compliance: false, swms: false, diary: true,
    incidents: true, toolbox: true, reports: false, admin: false, policies: false,
  },
  worker: {
    dashboard: false, projects: false, compliance: false, swms: false, diary: false,
    incidents: false, toolbox: false, reports: false, admin: false, policies: false,
  },
};

// Admin Portal permission matrix table
const matrixRoles = ["builder_admin", "hse_manager", "site_supervisor"];
const matrixFeatureMap = {
  Projects: "projects",
  Compliance: "compliance",
  SWMS: "swms",
  "Site Diary": "diary",
  Incidents: "incidents",
  Toolbox: "toolbox",
  Reports: "reports",
  Admin: "admin",
  Policies: "policies",
};

export const permissionMatrix = {
  roles: matrixRoles,
  features: Object.keys(matrixFeatureMap),
  grid: Object.fromEntries(
    Object.entries(matrixFeatureMap).map(([label, key]) => [
      label,
      matrixRoles.map((r) => rolePermissions[r][key]),
    ])
  ),
};

// Roles offered on the login screen quick-access select
export const demoLoginRoles = [
  { role: "builder_admin", label: "Builder Admin", user: "David Caruana", email: "admin@ohsbuildervictoria.com.au" },
  { role: "hse_manager", label: "HSE Manager", user: "Rebecca Lawson", email: "admin+hse@ohsbuildervictoria.com.au" },
  { role: "site_supervisor", label: "Site Supervisor", user: "Tom Wallace", email: "admin+supervisor@ohsbuildervictoria.com.au" },
  { role: "worker", label: "Stakeholder / Tradie", user: "Liam Nguyen", email: "admin+stakeholder@ohsbuildervictoria.com.au" },
];
