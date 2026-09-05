// ============================================================================
// Builder onboarding readiness (P0-2) — pure-module tests + PARITY with SiteIQ.
//
// The fixtures under ./fixtures are written by SiteIQ's test suite
// (siya-computer/core/tests/org_fake.py) in database shape; this test maps
// them through the same field names api.js uses and asserts that the product
// checklist produces exactly `expected_ids_product`. SiteIQ asserts
// `expected_ids_siteiq` on the same files. The one documented difference is
// the projects section: with zero visible projects SiteIQ says UNKNOWN (the
// persona may be unassigned) while the product says "no active project".
//
//   npm run test:onboarding
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeReadiness, outstandingIds, READINESS_ITEMS } from "../../src/lib/readiness.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, "fixtures");

// Minimal mirror of the api.js mappers (db row -> app object) for the fields
// readiness reads. Kept tiny on purpose: if api.js renames a field, this and
// the component both have to follow.
const COMPANY_DB_TO_KEY = { public_liability: "publicLiability", workcover: "workcover" };
function mapTables(t) {
  return {
    org: t.organizations?.[0]
      ? { name: t.organizations[0].name, abn: t.organizations[0].abn, state: t.organizations[0].state, billingContact: t.organizations[0].billing_contact }
      : null,
    profiles: (t.profiles || []).map((p) => ({ role: p.role, status: p.status })),
    projects: (t.projects || []).map((p) => ({ id: p.id, name: p.name, status: p.status, induction: p.induction || {} })),
    quizBank: (t.quiz_questions || []).map((q) => ({ id: q.id, active: q.active })),
    policies: (t.policies || []).map((p) => ({ id: p.id, status: p.status, content: p.content ?? null, filePath: p.file_path ?? null })),
    invites: (t.staff_invites || []).map((i) => ({ role: i.role })),
    companies: (t.subbie_companies || []).map((c) => ({ id: c.id, name: c.name })),
    companyDocs: (t.company_documents || []).map((d) => ({ companyId: d.company_id, category: COMPANY_DB_TO_KEY[d.category] || d.category, filePath: d.file_path, expiry: d.expiry_date })),
    workers: (t.workers || []).map((w) => ({ id: w.id, trade: w.trade, trades: w.trades, companyId: w.company_id ?? null })),
    templates: (t.swms_templates || []).map((x) => ({ trade: x.trade, locked: x.locked })),
    projectRisks: (t.project_risks || []).map((r) => ({ projectId: r.project_id })),
    meetings: (t.toolbox_meetings || []).map((m) => ({ date: m.date })),
  };
}
const load = (name) => JSON.parse(readFileSync(join(FIX, `readiness_${name}.json`), "utf8"));
const TODAY = "2026-09-05";
const configured = () => mapTables(load("configured").tables);

test("fixtures present (written by SiteIQ's org_fake.py)", () => {
  const files = readdirSync(FIX).filter((f) => f.startsWith("readiness_") && f.endsWith(".json"));
  assert.deepEqual(files.sort(), ["readiness_configured.json", "readiness_new_org.json", "readiness_partial.json"]);
});

for (const name of ["new_org", "configured", "partial"]) {
  test(`parity: ${name} -> expected_ids_product`, () => {
    const doc = load(name);
    const r = computeReadiness(mapTables(doc.tables), { today: doc.today });
    assert.deepEqual(outstandingIds(r), doc.expected_ids_product);
    // every id the product reports (other than the documented projects
    // difference) is also on SiteIQ's list for the same fixture
    for (const id of outstandingIds(r)) {
      if (id !== "setup_no_active_project") assert.ok(doc.expected_ids_siteiq.includes(id), `${id} missing from SiteIQ list`);
    }
  });
}

test("configured organisation is complete; item order is fixed", () => {
  const r = computeReadiness(configured(), { today: TODAY });
  assert.equal(r.complete, true);
  assert.equal(r.outstanding, 0);
  assert.deepEqual(r.items.map((i) => i.id), READINESS_ITEMS.map((i) => i.id));
});

const flip = (mutate) => { const d = configured(); mutate(d); return outstandingIds(computeReadiness(d, { today: TODAY })); };

test("single-condition flips map to exactly one item each", () => {
  assert.deepEqual(flip((d) => { d.org.abn = " "; }), ["setup_org_profile_incomplete"]);
  assert.deepEqual(flip((d) => { d.org.name = "My Company"; }), ["setup_org_profile_incomplete"]);
  assert.deepEqual(flip((d) => { d.profiles[1].status = "Deactivated"; }), ["setup_no_hse_manager"]);
  assert.deepEqual(flip((d) => { d.projects[0].status = "On Hold"; }), ["setup_no_active_project"]);
  assert.deepEqual(flip((d) => { d.projects[0].induction.musterPoint = ""; }), ["setup_induction_incomplete"]);
  assert.deepEqual(flip((d) => { d.quizBank.forEach((q) => { q.active = false; }); }), ["setup_quiz_bank_empty"]);
  assert.deepEqual(flip((d) => { d.policies = [{ id: 9, status: "Draft" }]; }), ["setup_no_published_policy"]);
  assert.deepEqual(flip((d) => { d.companyDocs[0].expiry = "2020-01-01"; }), ["setup_company_uninsured"]);
  assert.deepEqual(flip((d) => { d.companyDocs = []; d.workers[0].companyId = null; }), []);
  assert.deepEqual(flip((d) => { d.companyDocs[0].expiry = "2026-09-15"; }), []);
  assert.deepEqual(flip((d) => { d.companyDocs.unshift({ companyId: 301, category: "publicLiability", filePath: "x", expiry: "2020-01-01" }); }), []);
  assert.deepEqual(flip((d) => { d.workers.push({ id: 299, trade: "", trades: [], companyId: null }); }), ["setup_worker_without_trade"]);
  assert.deepEqual(flip((d) => { d.templates[0].locked = false; }), ["setup_swms_not_locked"]);
  assert.deepEqual(flip((d) => { d.templates.pop(); }), ["setup_swms_not_locked"]);
  assert.deepEqual(flip((d) => { d.projectRisks = []; }), ["setup_risk_register_empty"]);
  assert.deepEqual(flip((d) => { d.meetings[0].date = "2020-01-01"; }), ["setup_no_toolbox_scheduled"]);
  assert.deepEqual(flip((d) => { d.meetings[0].date = TODAY; }), []);
});

test("empty inputs are 'not configured', never done; unread quiz bank is unknown, not done", () => {
  const r = computeReadiness({}, { today: TODAY });
  assert.equal(r.complete, false);
  const quiz = r.items.find((i) => i.id === "setup_quiz_bank_empty");
  assert.equal(quiz.unknown, true);
  assert.equal(quiz.done, false);
  assert.ok(outstandingIds(r).includes("setup_no_active_project"));
});

test("pure: no input is mutated, no I/O", () => {
  const d = configured();
  const snap = JSON.stringify(d);
  computeReadiness(d, { today: TODAY });
  assert.equal(JSON.stringify(d), snap);
});
