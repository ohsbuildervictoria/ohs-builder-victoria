// ============================================================================
// Quiz-attempt evidence view — LIVE role + tenant-isolation suite (staging).
//
// The builder-facing evidence view (Compliance → Quiz cell) is a read of
// quiz_attempts under the existing RLS policy "quiz attempts read" (009).
// This suite signs in as the P0 rehearsal accounts and proves, through the
// same anon client + PostgREST the browser uses, that the view adds nothing:
//   * organisation safety staff (builder_admin, and the SiteIQ persona as an
//     ordinary hse_manager) read only their own organisation's attempts;
//   * a stakeholder reads only their own attempts;
//   * another tenant's admin sees nothing of this tenant, filtered or not;
//   * nobody can insert, update or delete an attempt (no write policy);
//   * the Quiz column cannot be set by hand (record_compliance_signoff refuses).
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… P0_ADMIN_EMAIL=… P0_ADMIN_PASSWORD=…
//   P0_PERSONA_EMAIL/PASSWORD  P0_WORKER_EMAIL/PASSWORD  P0_OTHER_EMAIL/PASSWORD
//   P0_ORG_ID=16 P0_WORKER_ID=114  npm run test:onboarding
// Skips (does not fail) with a clear message when the env is absent.
// Staging only: refuses to run against any project other than the staging ref.
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { ATTEMPT_FIELDS, mapAttempt } from "../../src/lib/quizEvidence.js";

const STAGING_REF = "adoatvmvmttdvrdfpfve";
const e = process.env;
const need = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "P0_ADMIN_EMAIL", "P0_ADMIN_PASSWORD", "P0_PERSONA_EMAIL", "P0_PERSONA_PASSWORD",
  "P0_WORKER_EMAIL", "P0_WORKER_PASSWORD", "P0_OTHER_EMAIL", "P0_OTHER_PASSWORD", "P0_ORG_ID", "P0_WORKER_ID"];
const missing = need.filter((k) => !e[k]);
let skip = missing.length ? `live quiz-attempt tests skipped — missing ${missing.join(", ")}` : false;
if (!skip && !e.SUPABASE_URL.includes(STAGING_REF)) skip = "live quiz-attempt tests refuse to run against a non-staging project";

const ORG = Number(e.P0_ORG_ID);
const WORKER = Number(e.P0_WORKER_ID);
const SELECT = ATTEMPT_FIELDS.join(", ");            // exactly what the UI selects
const SELECT_ORG = `${SELECT}, organization_id`;    // + the tenant column, for the assertions

async function signIn(email, password) {
  const c = createClient(e.SUPABASE_URL, e.SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return c;
}
const admin = () => signIn(e.P0_ADMIN_EMAIL, e.P0_ADMIN_PASSWORD);
const persona = () => signIn(e.P0_PERSONA_EMAIL, e.P0_PERSONA_PASSWORD);
const worker = () => signIn(e.P0_WORKER_EMAIL, e.P0_WORKER_PASSWORD);
const other = () => signIn(e.P0_OTHER_EMAIL, e.P0_OTHER_PASSWORD);

async function countAs(c) {
  const r = await c.from("quiz_attempts").select("id", { count: "exact", head: true });
  assert.equal(r.error, null, r.error?.message);
  return r.count;
}

// "This write must not land": PostgREST either returns an error or affects 0 rows.
async function expectNoWrite(promise, label) {
  const res = await promise;
  assert.ok(res.error || (res.data || []).length === 0, `${label}: expected refusal / 0 rows, got ${JSON.stringify(res.data).slice(0, 200)}`);
}

test("tenant staff read the UI's exact field list for their own worker; every row is their organisation's", { skip }, async () => {
  for (const [who, login] of [["builder_admin", admin], ["SiteIQ persona (hse_manager)", persona]]) {
    const c = await login();
    const me = await c.from("profiles").select("organization_id, role").eq("id", (await c.auth.getUser()).data.user.id).single();
    assert.equal(me.error, null, me.error?.message);
    assert.equal(me.data.organization_id, ORG, `${who} must belong to organisation ${ORG}`);
    const ui = await c.from("quiz_attempts").select(SELECT).eq("worker_id", WORKER).order("attempted_at", { ascending: false }).limit(20);
    assert.equal(ui.error, null, `${who}: ${ui.error?.message}`);
    for (const r of ui.data) {
      const m = mapAttempt(r);
      assert.equal(m.workerId, WORKER);
      assert.equal("answers" in m, false, "the mapped row never carries answers");
    }
    const all = await c.from("quiz_attempts").select(SELECT_ORG);
    assert.equal(all.error, null, `${who}: ${all.error?.message}`);
    assert.ok(all.data.every((r) => r.organization_id === ORG), `${who}: an unfiltered read leaked another organisation's attempts`);
  }
});

test("a stakeholder reads only their own attempts", { skip }, async () => {
  const c = await worker();
  const all = await c.from("quiz_attempts").select(SELECT_ORG);
  assert.equal(all.error, null, all.error?.message);
  assert.ok(all.data.every((r) => r.worker_id === WORKER && r.organization_id === ORG), "stakeholder saw attempts that are not theirs");
  // Another worker in the same organisation (if any): filtered read returns nothing.
  const a = await admin();
  const others = await a.from("workers").select("id").eq("organization_id", ORG).neq("id", WORKER).limit(1);
  assert.equal(others.error, null, others.error?.message);
  if (others.data.length) {
    const r = await c.from("quiz_attempts").select(SELECT).eq("worker_id", others.data[0].id);
    assert.equal(r.error, null, r.error?.message);
    assert.equal(r.data.length, 0, "stakeholder could read a colleague's attempts");
  }
});

test("another tenant's admin sees nothing of this tenant, filtered or unfiltered", { skip }, async () => {
  const c = await other();
  const me = await c.from("profiles").select("organization_id").eq("id", (await c.auth.getUser()).data.user.id).single();
  assert.equal(me.error, null, me.error?.message);
  assert.notEqual(me.data.organization_id, ORG, "fixture error: the 'other' account is in the same organisation");
  const byWorker = await c.from("quiz_attempts").select(SELECT).eq("worker_id", WORKER);
  assert.equal(byWorker.error, null, byWorker.error?.message);
  assert.equal(byWorker.data.length, 0, "cross-tenant read by worker id returned rows");
  const byOrg = await c.from("quiz_attempts").select(SELECT_ORG).eq("organization_id", ORG);
  assert.equal(byOrg.error, null, byOrg.error?.message);
  assert.equal(byOrg.data.length, 0, "cross-tenant read by organisation id returned rows");
  const all = await c.from("quiz_attempts").select("organization_id");
  assert.equal(all.error, null, all.error?.message);
  assert.ok(all.data.every((r) => r.organization_id !== ORG), "unfiltered read leaked this tenant's attempts");
  // The worker itself is not visible to the other tenant either.
  const w = await c.from("workers").select("id").eq("id", WORKER);
  assert.equal(w.error, null, w.error?.message);
  assert.equal(w.data.length, 0, "cross-tenant read of the worker row");
});

test("nobody can insert, update or delete an attempt — grading stays with submit_quiz", { skip }, async () => {
  const a = await admin();
  const before = await countAs(a);
  const row = { organization_id: ORG, worker_id: WORKER, score: 5, total: 5, passed: true, answers: [] };
  for (const [who, login] of [["builder_admin", admin], ["SiteIQ persona", persona], ["stakeholder", worker], ["other tenant", other]]) {
    const c = await login();
    await expectNoWrite(c.from("quiz_attempts").insert(row).select(), `${who} insert`);
    await expectNoWrite(c.from("quiz_attempts").update({ passed: true, score: 5 }).eq("worker_id", WORKER).select(), `${who} update`);
    await expectNoWrite(c.from("quiz_attempts").delete().eq("worker_id", WORKER).select(), `${who} delete`);
  }
  assert.equal(await countAs(a), before, "the attempt count changed — a write landed");
});

test("the Quiz column cannot be set by hand, even by the builder or the persona", { skip }, async () => {
  for (const [who, login] of [["builder_admin", admin], ["SiteIQ persona", persona]]) {
    const c = await login();
    const r = await c.rpc("record_compliance_signoff", { p_worker_id: WORKER, p_category: "quiz", p_value: "Verified", p_note: null });
    assert.ok(r.error, `${who}: record_compliance_signoff(quiz) must be refused`);
    assert.match(r.error.message, /graded when it is sat|cannot be recorded by hand/i);
  }
  const a = await admin();
  const w = await a.from("workers").select("quiz").eq("id", WORKER).single();
  assert.equal(w.error, null, w.error?.message);
  assert.notEqual(w.data.quiz, undefined);
});
