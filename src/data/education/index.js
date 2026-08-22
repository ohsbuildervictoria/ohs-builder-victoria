// ============================================================================
// OHS Builder Education — static copy and lookups
// Plain-language labels for students and trainers. All operational data
// (institutions, cohorts, scenarios, progress, assessments) lives in the
// database — see src/lib/eduApi.js.
// ============================================================================

export const eduBrand = {
  productName: "OHS Builder Education",
  tagline: "Construction workplace simulation & assessment",
  attribution: "Powered by OHS Builder Victoria",
  // Never claim accreditation. The institution owns the competency decision.
  disclaimer:
    "OHS Builder Education provides the simulated workplace, evidence and assessment workflow. Competency decisions, credentials and any Statement of Attainment are issued by the institution / RTO, not by OHS Builder Victoria.",
};

export const eduRoleLabels = {
  institution_admin: "Institution Admin",
  assessor: "Assessor / Trainer",
  student: "Student",
};

// Student enrolment lifecycle (edu_enrolments.status) — labels the assessor
// and institution boards show, and the tone each renders in.
export const enrolmentStatus = {
  invited: { label: "Invited", tone: "slate", hint: "Invite sent — hasn't set up their account yet" },
  not_started: { label: "Not Started", tone: "slate", hint: "Signed in, no tasks completed yet" },
  in_progress: { label: "In Progress", tone: "blue", hint: "Working through the simulation" },
  ready_for_assessment: { label: "Ready for Assessment", tone: "amber", hint: "Submitted — waiting on an assessor" },
  action_required: { label: "Action Required", tone: "red", hint: "Returned Not Yet Satisfactory — student is correcting" },
  completed: { label: "Completed", tone: "green", hint: "All criteria Satisfactory" },
  withdrawn: { label: "Withdrawn", tone: "slate", hint: "No longer enrolled" },
};

export const submissionStatus = {
  submitted: { label: "Submitted", tone: "amber" },
  under_review: { label: "Under review", tone: "blue" },
  returned_nys: { label: "Returned — Not Yet Satisfactory", tone: "red" },
  completed: { label: "Completed", tone: "green" },
};

export const resultLabels = {
  satisfactory: "Satisfactory",
  not_yet_satisfactory: "Not Yet Satisfactory",
};

export const toneClasses = {
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  blue: "bg-blue-100 text-blue-700 ring-blue-600/20",
  amber: "bg-amber-100 text-amber-700 ring-amber-600/20",
  red: "bg-red-100 text-red-700 ring-red-600/20",
  green: "bg-green-100 text-green-700 ring-green-600/20",
};

// The beginner tour — each step names a real module, what it is for in plain
// words, and where it lives. Re-openable from the training dashboard.
export const tourSteps = [
  {
    icon: "🏗️",
    title: "Projects",
    body: "A project is one building site. Everything you record — hazards, inductions, incidents, diary — belongs to a project. In this simulation you will have one: Riverside Apartments.",
    where: "Projects",
  },
  {
    icon: "👷",
    title: "Stakeholders (workers and subcontractors)",
    body: "Every person who comes onto your site. You add them with their trade and employer, and the compliance matrix shows whether each one is inducted, has signed their SWMS and holds their tickets.",
    where: "Compliance → Stakeholders",
  },
  {
    icon: "🎓",
    title: "Induction",
    body: "Your site rules, emergency arrangements and contact, written once per project. Nobody enters a real site without completing it — and you record who has.",
    where: "Project → Induction tab",
  },
  {
    icon: "📋",
    title: "SWMS",
    body: "A Safe Work Method Statement describes how a high-risk job (excavation, heights, cranes, live power) will be done safely. Workers read and sign it before they start; the register shows who signed which version.",
    where: "SWMS",
  },
  {
    icon: "🛡️",
    title: "Risk Register",
    body: "The list of hazards on your site, each rated for likelihood and consequence, with the controls you put in place and the risk left over. It is the backbone of your safety plan.",
    where: "Project → Risk Register tab",
  },
  {
    icon: "🧰",
    title: "Toolbox Meetings",
    body: "Short on-site safety talks with your crew. Recording the topic and who attended is how you prove you consulted people about hazards.",
    where: "Toolbox Meetings",
  },
  {
    icon: "⚠️",
    title: "Incidents",
    body: "When something goes wrong — or nearly does — you report it here, investigate, and assign corrective actions so it does not happen again. Serious ones must be reported to WorkSafe.",
    where: "Incidents",
  },
  {
    icon: "📓",
    title: "Site Diary",
    body: "Your daily record of the site: weather, crew on site, deliveries, inspections, visitors and notes. Over time it proves the safety system was actually operating.",
    where: "Site Diary",
  },
];

// CSV import: the header row the institution admin's template uses. Only
// name and email are read; extra columns are ignored.
export const studentCsvTemplate = "name,email\nJordan Lee,jordan.lee@example.edu\nPriya Shah,priya.shah@example.edu\n";

export function parseStudentCsv(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const split = (line) => {
    // Minimal CSV: handles quoted fields with commas.
    const out = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i += 1; } else q = !q;
      } else if (ch === "," && !q) {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = header.includes("email");
  const nameIdx = hasHeader ? header.findIndex((h) => /name/.test(h)) : 0;
  const emailIdx = hasHeader ? header.indexOf("email") : 1;
  const rows = hasHeader ? lines.slice(1) : lines;
  return rows
    .map(split)
    .map((cols) => ({ name: cols[nameIdx] || "", email: (cols[emailIdx] || "").toLowerCase() }))
    .filter((r) => r.email);
}

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// Resolves a stage's feature route for a particular student (their project id).
export function resolveFeatureRoute(route, { projectId } = {}) {
  if (!route) return "/builder/dashboard";
  if (route.includes("{projectId}")) {
    if (!projectId) return "/builder/projects";
    return route.replace("{projectId}", String(projectId));
  }
  return route;
}
