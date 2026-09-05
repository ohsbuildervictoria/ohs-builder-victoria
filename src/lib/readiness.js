// ============================================================================
// OHS Builder Victoria — builder onboarding readiness (P0-2, 2026-09-05)
//
// A PURE derivation: no I/O, no React, no stored state. Given the data the
// app already loads (AppContext + the quiz bank), it returns the onboarding
// checklist a brand-new builder must finish before a stakeholder can become
// "Ready for Site". The item ids and thresholds are shared ONE-TO-ONE with
// SiteIQ's organisation-readiness read (siya/org_readiness.py); the fixtures
// under test/onboarding/fixtures are the same files both sides are tested
// against, so the product and SiteIQ can never disagree about what "set up"
// means. Change a rule here and there together, with the fixture.
//
// Every input is optional; a missing array counts as "nothing configured",
// never as "done". Nothing here reads quiz text, answers or e-mails.
// ============================================================================

export const READINESS_ITEMS = [
  { id: "setup_org_profile_incomplete", label: "Organisation profile (Policies → Organisation): name, ABN, state and billing contact", href: "/builder/policies" },
  { id: "setup_no_hse_manager", label: "Invite an HSE manager (verifies stakeholder documents)", href: "/builder/admin" },
  { id: "setup_no_active_project", label: "Create your first project and set it Active", href: "/builder/projects" },
  { id: "setup_induction_incomplete", label: "Induction: emergency muster point and site contact on every active project", href: "/builder/projects" },
  { id: "setup_quiz_bank_empty", label: "Safety quiz (Policies → Safety Quiz): at least one active question", href: "/builder/policies" },
  { id: "setup_no_published_policy", label: "Publish at least one policy (a Draft is not sent)", href: "/builder/policies" },
  { id: "setup_company_uninsured", label: "Public Liability certificate for every subcontractor company with workers on site", href: "/builder/compliance" },
  { id: "setup_worker_without_trade", label: "Every stakeholder has a work type", href: "/builder/compliance" },
  { id: "setup_swms_not_locked", label: "A locked SWMS template for every work type in use", href: "/builder/swms" },
  { id: "setup_risk_register_empty", label: "Risk register started on every active project", href: "/builder/projects" },
  { id: "setup_no_toolbox_scheduled", label: "First toolbox meeting scheduled", href: "/builder/toolbox" },
];

const DEFAULT_ORG_NAMES = ["", "my company"];
const blank = (v) => !String(v ?? "").trim();
const isoDay = (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);

function tradesOf(w) {
  const list = Array.isArray(w.trades) ? w.trades.filter((t) => !blank(t)) : [];
  if (list.length) return list;
  return blank(w.trade) ? [] : [w.trade];
}

// compliance.js docExpiryStatus for a company certificate, reduced to the one
// question readiness asks: is the crew covered today? (Expiring still counts.)
function companyCovered(doc, today) {
  if (!doc || !doc.filePath) return false;
  if (!doc.expiry) return true;
  return String(doc.expiry).slice(0, 10) >= today;
}

/**
 * computeReadiness(data, { today }) -> { items, outstanding, complete }
 *   data: { org, profiles, projects, quizBank, policies, companies, companyDocs,
 *           workers, templates, projectRisks, meetings }
 *   today: "YYYY-MM-DD" (defaults to the browser's date)
 * items keep READINESS_ITEMS order; each carries done (boolean), detail (text)
 * and unknown (true only when that input was not supplied at all).
 */
export function computeReadiness(data = {}, { today = isoDay(new Date()) } = {}) {
  const org = data.org || null;
  const profiles = data.profiles || [];
  const projects = data.projects || [];
  const quizBank = data.quizBank;            // undefined = could not be read
  const policies = data.policies || [];
  const companies = data.companies || [];
  const companyDocs = data.companyDocs || [];
  const workers = data.workers || [];
  const templates = data.templates || [];
  const projectRisks = data.projectRisks || [];
  const meetings = data.meetings || [];

  const active = projects.filter((p) => p.status === "Active");
  const findings = {};

  // organisation profile
  {
    const missing = [];
    if (!org || DEFAULT_ORG_NAMES.includes(String(org.name ?? "").trim().toLowerCase())) missing.push("name");
    for (const [k, label] of [["abn", "ABN"], ["state", "state"], ["billingContact", "billing contact"]]) {
      if (!org || blank(org[k])) missing.push(label);
    }
    findings.setup_org_profile_incomplete = missing.length ? `missing: ${missing.join(", ")}` : null;
  }
  // staff
  findings.setup_no_hse_manager = profiles.some((p) => p.role === "hse_manager" && p.status === "Active")
    ? null : "no active HSE manager";
  // projects
  findings.setup_no_active_project = active.length ? null : (projects.length ? "no project is Active" : "no project yet");
  {
    const bad = active.filter((p) => blank(p.induction?.musterPoint) || blank(p.induction?.contactName));
    findings.setup_induction_incomplete = bad.length ? bad.map((p) => p.name).join(", ") : null;
  }
  // quiz bank
  findings.setup_quiz_bank_empty = quizBank === undefined
    ? undefined
    : (quizBank.some((q) => q.active !== false) ? null : "no active question");
  // policies
  findings.setup_no_published_policy = policies.some((p) => p.status !== "Draft") ? null : "no published policy";
  // company insurance (last public-liability row wins, as api.js plByCompany)
  {
    const employed = new Set(workers.map((w) => w.companyId).filter((id) => Number.isInteger(id)));
    const bad = [];
    for (const c of companies) {
      if (!employed.has(c.id)) continue;
      let pl = null;
      for (const d of companyDocs) if (d.companyId === c.id && d.category === "publicLiability") pl = d;
      if (!companyCovered(pl, today)) bad.push(c.name);
    }
    findings.setup_company_uninsured = bad.length ? bad.join(", ") : null;
  }
  // work types
  {
    const bad = workers.filter((w) => tradesOf(w).length === 0);
    findings.setup_worker_without_trade = bad.length ? `${bad.length} stakeholder(s) without a work type` : null;
  }
  // locked SWMS per trade in use
  {
    const inUse = [];
    for (const w of workers) for (const t of tradesOf(w)) if (!inUse.includes(t)) inUse.push(t);
    const bad = inUse.filter((t) => !templates.some((x) => x.trade === t && x.locked));
    findings.setup_swms_not_locked = bad.length ? bad.join(", ") : null;
  }
  // risk register per active project
  {
    const bad = active.filter((p) => !projectRisks.some((r) => r.projectId === p.id));
    findings.setup_risk_register_empty = bad.length ? bad.map((p) => p.name).join(", ") : null;
  }
  // toolbox
  findings.setup_no_toolbox_scheduled = meetings.some((mt) => String(mt.date ?? "").slice(0, 10) >= today)
    ? null : "no meeting today or later";

  const items = READINESS_ITEMS.map((it) => {
    const f = findings[it.id];
    return { ...it, done: f === null, unknown: f === undefined, detail: f || "" };
  });
  const outstanding = items.filter((i) => !i.done).length;
  return { items, outstanding, complete: outstanding === 0 };
}

export function outstandingIds(result) {
  return result.items.filter((i) => !i.done && !i.unknown).map((i) => i.id).sort();
}
