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

// ---------------------------------------------------------------------------
// Colour contrast. An institution may pick any colour; we must never put white
// text on a colour that cannot carry it. usablePrimary() darkens a too-light
// colour (same hue) until it reaches WCAG 4.5:1 against white.
// ---------------------------------------------------------------------------
const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lum = ([r, g, b]) => {
  const f = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  if (!a || !b) return 1;
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
};
const hslToRgb = ([h, s, l]) => {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const t2c = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [t2c(h + 1 / 3) * 255, t2c(h) * 255, t2c(h - 1 / 3) * 255];
};
export const DEFAULT_PRIMARY = "#1e3a8a";
// A primary colour that white text is readable on (>= 4.5:1). Invalid input
// falls back to the platform navy. Same hue, darker where needed.
export function usablePrimary(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_PRIMARY;
  let h = rgbToHsl(rgb);
  let out = rgbToHex(...rgb);
  let guard = 0;
  while (contrastRatio(out, "#ffffff") < 4.5 && guard < 60) {
    h = [h[0], h[1], Math.max(0, h[2] - 0.02)];
    out = rgbToHex(...hslToRgb(h));
    guard += 1;
  }
  return out.toLowerCase();
}
// Secondary/accent only needs to not vanish against white.
export function usableSecondary(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#fbbf24";
  if (contrastRatio(rgbToHex(...rgb), "#ffffff") >= 1.6) return rgbToHex(...rgb).toLowerCase();
  let h = rgbToHsl(rgb); let out = rgbToHex(...rgb); let guard = 0;
  while (contrastRatio(out, "#ffffff") < 1.6 && guard < 60) { h = [h[0], h[1], Math.max(0, h[2] - 0.02)]; out = rgbToHex(...hslToRgb(h)); guard += 1; }
  return out.toLowerCase();
}
