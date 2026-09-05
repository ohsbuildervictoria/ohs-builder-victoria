// ============================================================================
// Builder onboarding checklist — HONEST states, DESTINATIONS, NEXT STEP.
//
// The fresh-tenant rehearsal (2026-09-05) landed on "6 of 11 set up" with
// five ticks for things that had not been done: rules with nothing to check
// (no project, no stakeholder) counted as done. These tests pin the product
// behaviour on top of the SiteIQ parity contract (readiness.test.mjs):
//   * an empty organisation never shows a false tick;
//   * every item ticks only when its actual condition exists;
//   * each Open action lands on the exact screen for that item;
//   * the next step is the first item that still needs the builder.
//
//   npm run test:onboarding
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeReadiness, outstandingIds, nextStep, progressOf, READINESS_ITEMS, STATES } from "../../src/lib/readiness.js";

const here = dirname(fileURLToPath(import.meta.url));
const TODAY = "2026-09-05";
const stateOf = (r, id) => r.items.find((i) => i.id === id).state;
const hrefOf = (r, id) => r.items.find((i) => i.id === id).href;

// The same mapping readiness.test.mjs uses, so both suites read one fixture.
const COMPANY_DB_TO_KEY = { public_liability: "publicLiability", workcover: "workcover" };
function mapTables(t) {
  return {
    org: t.organizations?.[0]
      ? { name: t.organizations[0].name, abn: t.organizations[0].abn, state: t.organizations[0].state, billingContact: t.organizations[0].billing_contact }
      : null,
    profiles: (t.profiles || []).map((p) => ({ role: p.role, status: p.status })),
    invites: (t.staff_invites || []).map((i) => ({ role: i.role })),
    projects: (t.projects || []).map((p) => ({ id: p.id, name: p.name, status: p.status, induction: p.induction || {} })),
    quizBank: (t.quiz_questions || []).map((q) => ({ id: q.id, active: q.active })),
    policies: (t.policies || []).map((p) => ({ id: p.id, status: p.status, content: p.content ?? null, filePath: p.file_path ?? null })),
    companies: (t.subbie_companies || []).map((c) => ({ id: c.id, name: c.name })),
    companyDocs: (t.company_documents || []).map((d) => ({ companyId: d.company_id, category: COMPANY_DB_TO_KEY[d.category] || d.category, filePath: d.file_path, expiry: d.expiry_date })),
    workers: (t.workers || []).map((w) => ({ id: w.id, trade: w.trade, trades: w.trades, companyId: w.company_id ?? null })),
    templates: (t.swms_templates || []).map((x) => ({ trade: x.trade, locked: x.locked })),
    projectRisks: (t.project_risks || []).map((r) => ({ projectId: r.project_id })),
    meetings: (t.toolbox_meetings || []).map((m) => ({ date: m.date })),
  };
}
const load = (name) => mapTables(JSON.parse(readFileSync(join(here, "fixtures", `readiness_${name}.json`), "utf8")).tables);
const fresh = () => ({ org: { name: "Marlow Ridge Constructions", abn: "", state: "VIC", billingContact: "" }, profiles: [{ role: "builder_admin", status: "Active" }], quizBank: [{ id: 1, active: true }] });

test("a fresh organisation shows no false tick: nothing is done, five items are not yet applicable", () => {
  const r = computeReadiness(fresh(), { today: TODAY });
  // The quiz bank is seeded at signup, so it is the one thing genuinely set up.
  assert.deepEqual(r.items.filter((i) => i.done).map((i) => i.id), ["setup_quiz_bank_empty"]);
  assert.deepEqual(
    r.items.filter((i) => i.state === "not_applicable").map((i) => i.id),
    ["setup_induction_incomplete", "setup_company_uninsured", "setup_worker_without_trade", "setup_swms_not_locked", "setup_risk_register_empty"]
  );
  assert.deepEqual(progressOf(r), { done: 1, total: 11, notApplicable: 5 });
  assert.equal(r.complete, false);
});

test("the SiteIQ new_org fixture: only genuinely set up items tick; the parity list is unchanged", () => {
  const r = computeReadiness(load("new_org"), { today: TODAY });
  const ticks = r.items.filter((i) => i.done).map((i) => i.id);
  // The rehearsal's five "vacuous" ticks are gone; what remains ticked is real.
  for (const id of ["setup_induction_incomplete", "setup_company_uninsured", "setup_worker_without_trade", "setup_swms_not_locked", "setup_risk_register_empty"]) {
    assert.ok(!ticks.includes(id), `${id} must not tick on an empty organisation`);
    assert.equal(stateOf(r, id), "not_applicable");
  }
  assert.deepEqual(outstandingIds(r), ["setup_no_active_project", "setup_no_hse_manager", "setup_no_published_policy", "setup_no_toolbox_scheduled", "setup_org_profile_incomplete"]);
});

test("every state is one of the documented set and 'done' means done", () => {
  for (const name of ["new_org", "partial", "configured"]) {
    const r = computeReadiness(load(name), { today: TODAY });
    for (const it of r.items) {
      assert.ok(STATES.includes(it.state), `${it.id}: ${it.state}`);
      assert.equal(it.done, it.state === "done");
    }
  }
  const c = computeReadiness(load("configured"), { today: TODAY });
  assert.equal(c.complete, true);
  assert.equal(nextStep(c), null);
});

test("each major item completes only when its actual condition exists", () => {
  const base = () => load("configured");
  const with_ = (mutate) => { const d = base(); mutate(d); return computeReadiness(d, { today: TODAY }); };
  // organisation profile
  assert.equal(stateOf(with_((d) => { d.org.abn = ""; }), "setup_org_profile_incomplete"), "open");
  // HSE manager: none → open; invited but not joined → invited (still outstanding for SiteIQ); active → done
  assert.equal(stateOf(with_((d) => { d.profiles = d.profiles.filter((p) => p.role !== "hse_manager"); }), "setup_no_hse_manager"), "open");
  const invited = with_((d) => { d.profiles = d.profiles.filter((p) => p.role !== "hse_manager"); d.invites = [{ role: "hse_manager" }]; });
  assert.equal(stateOf(invited, "setup_no_hse_manager"), "invited");
  assert.ok(outstandingIds(invited).includes("setup_no_hse_manager"));
  assert.match(invited.items.find((i) => i.id === "setup_no_hse_manager").detail, /waiting/);
  assert.equal(stateOf(with_((d) => { d.invites = [{ role: "site_supervisor" }]; d.profiles = d.profiles.filter((p) => p.role !== "hse_manager"); }), "setup_no_hse_manager"), "open");
  // project: none → open (create); some but none Active → open (set status); Active → done
  assert.equal(stateOf(with_((d) => { d.projects = []; }), "setup_no_active_project"), "open");
  assert.equal(stateOf(with_((d) => { d.projects[0].status = "Planning"; }), "setup_no_active_project"), "open");
  assert.equal(stateOf(computeReadiness(base(), { today: TODAY }), "setup_no_active_project"), "done");
  // induction: no active project → not applicable; missing muster point → open
  assert.equal(stateOf(with_((d) => { d.projects = []; }), "setup_induction_incomplete"), "not_applicable");
  assert.equal(stateOf(with_((d) => { d.projects[0].induction.musterPoint = ""; }), "setup_induction_incomplete"), "open");
  // quiz bank: unread → unknown; no active question → open
  assert.equal(stateOf(with_((d) => { d.quizBank = undefined; }), "setup_quiz_bank_empty"), "unknown");
  assert.equal(stateOf(with_((d) => { d.quizBank = [{ id: 1, active: false }]; }), "setup_quiz_bank_empty"), "open");
  // policy: none → open; only Drafts → open; published but empty → in progress (never a tick); published with text or PDF → done
  assert.equal(stateOf(with_((d) => { d.policies = []; }), "setup_no_published_policy"), "open");
  assert.equal(stateOf(with_((d) => { d.policies = [{ id: 1, status: "Draft", content: "text" }]; }), "setup_no_published_policy"), "open");
  const empty = with_((d) => { d.policies = [{ id: 1, status: "Active", content: "", filePath: null }]; });
  assert.equal(stateOf(empty, "setup_no_published_policy"), "in_progress");
  assert.equal(empty.items.find((i) => i.id === "setup_no_published_policy").done, false);
  assert.equal(empty.complete, false);
  assert.ok(!outstandingIds(empty).includes("setup_no_published_policy"), "SiteIQ's status-based rule is unchanged: not outstanding");
  assert.equal(stateOf(with_((d) => { d.policies = [{ id: 1, status: "Active", content: null, filePath: "policies/1.pdf" }]; }), "setup_no_published_policy"), "done");
  // company insurance: no company with stakeholders → not applicable; expired certificate → open
  assert.equal(stateOf(with_((d) => { d.workers.forEach((w) => { w.companyId = null; }); }), "setup_company_uninsured"), "not_applicable");
  assert.equal(stateOf(with_((d) => { d.companyDocs[0].expiry = "2020-01-01"; }), "setup_company_uninsured"), "open");
  // work types: no stakeholder → not applicable; one without a trade → open
  assert.equal(stateOf(with_((d) => { d.workers = []; }), "setup_worker_without_trade"), "not_applicable");
  assert.equal(stateOf(with_((d) => { d.workers.push({ id: 9, trade: "", trades: [], companyId: null }); }), "setup_worker_without_trade"), "open");
  // SWMS: no work type in use → not applicable; unlocked → open
  assert.equal(stateOf(with_((d) => { d.workers = []; }), "setup_swms_not_locked"), "not_applicable");
  assert.equal(stateOf(with_((d) => { d.templates[0].locked = false; }), "setup_swms_not_locked"), "open");
  // risk register: no active project → not applicable; none for the project → open
  assert.equal(stateOf(with_((d) => { d.projects = []; }), "setup_risk_register_empty"), "not_applicable");
  assert.equal(stateOf(with_((d) => { d.projectRisks = []; }), "setup_risk_register_empty"), "open");
  // toolbox
  assert.equal(stateOf(with_((d) => { d.meetings = []; }), "setup_no_toolbox_scheduled"), "open");
});

test("Open destinations land on the exact screen for the item", () => {
  const f = computeReadiness(fresh(), { today: TODAY });
  assert.equal(hrefOf(f, "setup_org_profile_incomplete"), "/builder/policies?tab=Organisation");
  assert.equal(hrefOf(f, "setup_no_hse_manager"), "/builder/admin?invite=1");
  assert.equal(hrefOf(f, "setup_no_active_project"), "/builder/projects?new=1");
  assert.equal(hrefOf(f, "setup_quiz_bank_empty"), "/builder/policies?tab=Safety%20Quiz");
  assert.equal(hrefOf(f, "setup_no_published_policy"), "/builder/policies");
  assert.equal(hrefOf(f, "setup_company_uninsured"), "/builder/compliance?tab=Subcontractors");
  assert.equal(hrefOf(f, "setup_worker_without_trade"), "/builder/compliance");
  assert.equal(hrefOf(f, "setup_swms_not_locked"), "/builder/swms");
  assert.equal(hrefOf(f, "setup_no_toolbox_scheduled"), "/builder/toolbox?new=1");

  // Context-specific destinations
  const d = load("configured");
  d.projects[0].status = "Planning";
  const planning = computeReadiness(d, { today: TODAY });
  assert.equal(hrefOf(planning, "setup_no_active_project"), "/builder/projects", "a project exists: go and set it Active, not create another");
  const pid = load("configured").projects[0].id;
  const induction = load("configured"); induction.projects[0].induction.musterPoint = "";
  assert.equal(hrefOf(computeReadiness(induction, { today: TODAY }), "setup_induction_incomplete"), `/builder/projects/${pid}?tab=Induction`);
  const risks = load("configured"); risks.projectRisks = [];
  assert.equal(hrefOf(computeReadiness(risks, { today: TODAY }), "setup_risk_register_empty"), `/builder/projects/${pid}?tab=Risk%20Register`);
  const inv = load("configured"); inv.profiles = inv.profiles.filter((p) => p.role !== "hse_manager"); inv.invites = [{ role: "hse_manager" }];
  assert.equal(hrefOf(computeReadiness(inv, { today: TODAY }), "setup_no_hse_manager"), "/builder/admin", "already invited: the roster, not another invite form");
});

test("next step is the first item that still needs the builder, in checklist order", () => {
  const f = computeReadiness(fresh(), { today: TODAY });
  assert.equal(nextStep(f).id, "setup_org_profile_incomplete");
  const d = fresh(); d.org.abn = "12345678901"; d.org.billingContact = "accounts@marlowridge.example";
  assert.equal(nextStep(computeReadiness(d, { today: TODAY })).id, "setup_no_hse_manager");
  d.invites = [{ role: "hse_manager" }];
  assert.equal(nextStep(computeReadiness(d, { today: TODAY })).id, "setup_no_hse_manager", "invited still needs the builder's attention (waiting)");
  d.profiles.push({ role: "hse_manager", status: "Active" });
  assert.equal(nextStep(computeReadiness(d, { today: TODAY })).id, "setup_no_active_project");
  // not-yet-applicable items are skipped: with a project but no induction, induction comes next
  d.projects = [{ id: 7, name: "Bayside Duplex", status: "Active", induction: {} }];
  assert.equal(nextStep(computeReadiness(d, { today: TODAY })).id, "setup_induction_incomplete");
  // an empty published policy still needs the builder
  d.projects[0].induction = { musterPoint: "front gate", contactName: "Tessa" };
  d.policies = [{ id: 1, status: "Active", content: "" }];
  assert.equal(nextStep(computeReadiness(d, { today: TODAY })).id, "setup_no_published_policy");
  d.policies[0].content = "Everyone signs in at the gate.";
  // remaining: no stakeholders yet → company/work type/SWMS not applicable, risk register open
  assert.equal(nextStep(computeReadiness(d, { today: TODAY })).id, "setup_risk_register_empty");
  assert.equal(READINESS_ITEMS.length, 11);
});
