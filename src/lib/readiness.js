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
//
// Item STATES (the smallest set that is honest about a fresh organisation):
//   done            the required condition exists
//   open            it does not — the builder has to act (SiteIQ: outstanding)
//   invited         HSE manager invited, waiting for them to join (outstanding)
//   in_progress     something exists but is not usable yet — a policy that is
//                   published but has neither text nor a PDF. Product-only
//                   nuance: SiteIQ's rule is status-based, so this is NOT in
//                   outstandingIds(); it is simply never shown as a tick.
//   not_applicable  nothing to check yet because an earlier item is open
//                   (no project → no induction; no stakeholder → no work
//                   type). Never a tick, never counted as set up, and not
//                   outstanding either — SiteIQ scopes these rules the same way.
//   unknown         that input could not be read (quiz bank) — never done.
// ============================================================================

export const READINESS_ITEMS = [
  { id: "setup_org_profile_incomplete", label: "Organisation profile (Policies → Organisation): name, ABN, state and billing contact", href: "/builder/policies?tab=Organisation" },
  { id: "setup_no_hse_manager", label: "Invite an HSE manager (verifies stakeholder documents)", href: "/builder/admin?invite=1" },
  { id: "setup_no_active_project", label: "Create your first project and set it Active", href: "/builder/projects?new=1" },
  { id: "setup_induction_incomplete", label: "Induction: emergency muster point and site contact on every active project", href: "/builder/projects" },
  { id: "setup_quiz_bank_empty", label: "Safety quiz (Policies → Safety Quiz): at least one active question", href: "/builder/policies?tab=Safety%20Quiz" },
  { id: "setup_no_published_policy", label: "Publish at least one policy (a Draft is not sent)", href: "/builder/policies" },
  { id: "setup_company_uninsured", label: "Public Liability certificate for every subcontractor company with workers on site", href: "/builder/compliance?tab=Subcontractors" },
  { id: "setup_worker_without_trade", label: "Every stakeholder has a work type", href: "/builder/compliance" },
  { id: "setup_swms_not_locked", label: "A locked SWMS template for every work type in use", href: "/builder/swms" },
  { id: "setup_risk_register_empty", label: "Risk register started on every active project", href: "/builder/projects" },
  { id: "setup_no_toolbox_scheduled", label: "First toolbox meeting scheduled", href: "/builder/toolbox?new=1" },
];

export const STATES = ["done", "open", "invited", "in_progress", "not_applicable", "unknown"];
// States that still need the builder's attention, in the product's sense.
const NEEDS_ACTION = ["open", "invited", "in_progress", "unknown"];
// States SiteIQ reports as outstanding (the parity contract).
const OUTSTANDING = ["open", "invited"];

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

const projectTab = (p, tab) => `/builder/projects/${p.id}?tab=${encodeURIComponent(tab)}`;

/**
 * computeReadiness(data, { today }) -> { items, outstanding, complete }
 *   data: { org, profiles, invites, projects, quizBank, policies, companies,
 *           companyDocs, workers, templates, projectRisks, meetings }
 *   today: "YYYY-MM-DD" (defaults to the browser's date)
 * items keep READINESS_ITEMS order; each carries state (above), done
 * (state === "done"), unknown, detail (text) and href — the exact screen where
 * that item is finished (a project's own tab when one project is at fault).
 */
export function computeReadiness(data = {}, { today = isoDay(new Date()) } = {}) {
  const org = data.org || null;
  const profiles = data.profiles || [];
  const invites = data.invites || [];
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
  const done = () => ({ state: "done" });
  const open = (detail, href) => ({ state: "open", detail, href });
  const notYet = (detail) => ({ state: "not_applicable", detail });

  // organisation profile
  {
    const missing = [];
    if (!org || DEFAULT_ORG_NAMES.includes(String(org.name ?? "").trim().toLowerCase())) missing.push("name");
    for (const [k, label] of [["abn", "ABN"], ["state", "state"], ["billingContact", "billing contact"]]) {
      if (!org || blank(org[k])) missing.push(label);
    }
    findings.setup_org_profile_incomplete = missing.length ? open(`missing: ${missing.join(", ")}`) : done();
  }
  // staff — active beats invited; an invite that has not been accepted is
  // still outstanding, but the builder should not be told to invite again.
  if (profiles.some((p) => p.role === "hse_manager" && p.status === "Active")) {
    findings.setup_no_hse_manager = done();
  } else if (invites.some((i) => i.role === "hse_manager")) {
    findings.setup_no_hse_manager = { state: "invited", detail: "invited — waiting for them to accept and set a password", href: "/builder/admin" };
  } else {
    findings.setup_no_hse_manager = open("no active HSE manager");
  }
  // projects
  findings.setup_no_active_project = active.length
    ? done()
    : projects.length
      ? open("no project is Active — open it and set the status", "/builder/projects")
      : open("no project yet");
  {
    const bad = active.filter((p) => blank(p.induction?.musterPoint) || blank(p.induction?.contactName));
    findings.setup_induction_incomplete = !active.length
      ? notYet("after your first Active project")
      : bad.length ? open(bad.map((p) => p.name).join(", "), projectTab(bad[0], "Induction")) : done();
  }
  // quiz bank
  findings.setup_quiz_bank_empty = quizBank === undefined
    ? { state: "unknown", detail: "couldn't check — open the page to confirm" }
    : (quizBank.some((q) => q.active !== false) ? done() : open("no active question"));
  // policies — published means status != Draft (the SiteIQ rule). A published
  // policy with neither text nor a PDF is shown as in progress, never a tick.
  {
    const published = policies.filter((p) => p.status !== "Draft");
    const usable = published.some((p) => !blank(p.content) || !blank(p.filePath));
    findings.setup_no_published_policy = !published.length
      ? open(policies.length ? "only Drafts — a Draft is not sent; publish one" : "no published policy")
      : usable
        ? done()
        : { state: "in_progress", detail: "published, but empty — add the policy text or attach a PDF so stakeholders receive something" };
  }
  // company insurance (last public-liability row wins, as api.js plByCompany)
  {
    const employed = new Set(workers.map((w) => w.companyId).filter((id) => Number.isInteger(id)));
    const inScope = companies.filter((c) => employed.has(c.id));
    const bad = [];
    for (const c of inScope) {
      let pl = null;
      for (const d of companyDocs) if (d.companyId === c.id && d.category === "publicLiability") pl = d;
      if (!companyCovered(pl, today)) bad.push(c.name);
    }
    findings.setup_company_uninsured = !inScope.length
      ? notYet("after a subcontractor company has stakeholders on site")
      : bad.length ? open(bad.join(", ")) : done();
  }
  // work types
  {
    const bad = workers.filter((w) => tradesOf(w).length === 0);
    findings.setup_worker_without_trade = !workers.length
      ? notYet("after you add your first stakeholder")
      : bad.length ? open(`${bad.length} stakeholder(s) without a work type`) : done();
  }
  // locked SWMS per trade in use
  {
    const inUse = [];
    for (const w of workers) for (const t of tradesOf(w)) if (!inUse.includes(t)) inUse.push(t);
    const bad = inUse.filter((t) => !templates.some((x) => x.trade === t && x.locked));
    findings.setup_swms_not_locked = !inUse.length
      ? notYet("after stakeholders have work types")
      : bad.length ? open(bad.join(", ")) : done();
  }
  // risk register per active project
  {
    const bad = active.filter((p) => !projectRisks.some((r) => r.projectId === p.id));
    findings.setup_risk_register_empty = !active.length
      ? notYet("after your first Active project")
      : bad.length ? open(bad.map((p) => p.name).join(", "), projectTab(bad[0], "Risk Register")) : done();
  }
  // toolbox
  findings.setup_no_toolbox_scheduled = meetings.some((mt) => String(mt.date ?? "").slice(0, 10) >= today)
    ? done() : open("no meeting today or later");

  const items = READINESS_ITEMS.map((it) => {
    const f = findings[it.id];
    return {
      ...it,
      state: f.state,
      done: f.state === "done",
      unknown: f.state === "unknown",
      detail: f.detail || "",
      href: f.href || it.href,
    };
  });
  const outstanding = items.filter((i) => NEEDS_ACTION.includes(i.state)).length;
  const complete = items.every((i) => i.state === "done" || i.state === "not_applicable");
  return { items, outstanding, complete };
}

/** Ids SiteIQ reports as outstanding for the same data (parity list). */
export function outstandingIds(result) {
  return result.items.filter((i) => OUTSTANDING.includes(i.state)).map((i) => i.id).sort();
}

/** The first item the builder should act on next, or null when nothing is left. */
export function nextStep(result) {
  return result.items.find((i) => NEEDS_ACTION.includes(i.state)) || null;
}

/** { done, total, notApplicable } for "N of M set up". Only real ticks count. */
export function progressOf(result) {
  const done = result.items.filter((i) => i.state === "done").length;
  const notApplicable = result.items.filter((i) => i.state === "not_applicable").length;
  return { done, total: result.items.length, notApplicable };
}
