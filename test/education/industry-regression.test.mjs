// ============================================================================
// Industry regression — the contract in PERMISSION_MATRIX.md, probed against
// a live database through PostgREST as the seeded Industry accounts
// (scripts/education/seed-industry-staging.mjs). Proves the Education
// migrations (021–023) left Industry semantics unchanged, and that Industry
// accounts gain no Education privileges.
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run test:education
// Skips (does not fail) with a clear message when env / seed output is absent.
// ============================================================================
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const SEED_FILE = join(here, "..", "..", "scripts", "education", "industry-seed-output.local.json");
const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
let seed = null;
if (existsSync(SEED_FILE)) { try { seed = JSON.parse(readFileSync(SEED_FILE, "utf8")); } catch { seed = null; } }
const password = process.env.SEED_PASSWORD || seed?.password;
const ready = !!(url && anon && seed?.accounts && password);
const skip = ready ? false : `industry regression skipped — ${!url || !anon ? "SUPABASE_URL / SUPABASE_ANON_KEY not set" : `no seed output at ${SEED_FILE} — run scripts/education/seed-industry-staging.mjs`}`;

const A = seed?.accounts || {};
const rows = (r) => (r.error ? -1 : (r.data || []).length);
const denied = (r) => !!r.error || (r.data || []).length === 0;
const today = new Date().toISOString().slice(0, 10);
const TAG = `REG-${Date.now()}`;

const clients = {};
async function as(who) {
  if (clients[who]) return clients[who];
  const c = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: A[who].email, password });
  if (error) throw new Error(`sign in ${who}: ${error.message}`);
  clients[who] = c;
  return c;
}
async function perms(who) {
  const r = await (await as(who)).rpc("my_permissions");
  assert.equal(r.error, null, `my_permissions(${who}): ${r.error?.message}`);
  return r.data;
}
async function expectRefused(promise, label) {
  const r = await promise;
  assert.ok(r.error, `${label}: expected the database to refuse this, but it succeeded with ${JSON.stringify(r.data).slice(0, 160)}`);
  return r.error;
}

const created = { incidents: [], diary: [], toolbox: [], policies: [], workers: [], templates: [], projects: [] };

// ----------------------------------------------------------------------------
// Builder Admin
// ----------------------------------------------------------------------------
test("builder admin: full read/write in own org (project, worker, diary, toolbox, incident, SWMS, policy)", { skip }, async () => {
  const b = await as("builder");
  const pr = await b.from("projects").insert({ name: `${TAG} project`, address: "x", status: "Planning" }).select().single();
  assert.equal(pr.error, null, pr.error?.message); created.projects.push(pr.data.id);
  const w = await b.from("workers").insert({ name: `${TAG} worker`, trade: "Painter", employer: "QA", project_id: seed.projects.assigned }).select().single();
  assert.equal(w.error, null, w.error?.message); created.workers.push(w.data.id);
  const d = await b.from("diary_entries").insert({ project_id: seed.projects.assigned, date: today, weather: "Fine", notes: TAG }).select().single();
  assert.equal(d.error, null, d.error?.message); created.diary.push(d.data.id);
  const t = await b.from("toolbox_meetings").insert({ project_id: seed.projects.assigned, topic: TAG, date: today, attendees: 1, total: 1 }).select().single();
  assert.equal(t.error, null, t.error?.message); created.toolbox.push(t.data.id);
  const i = await b.from("incidents").insert({ type: "Near Miss", severity: "Minor", project_id: seed.projects.assigned, date: today, reported_by: "QA", description: TAG, status: "Open" }).select().single();
  assert.equal(i.error, null, i.error?.message); created.incidents.push(i.data.id);
  const s = await b.from("swms_templates").insert({ trade: `Trade ${TAG}`, ref: `SWMS-${TAG}`, version: "v1.0", total: 1 }).select().single();
  assert.equal(s.error, null, s.error?.message); created.templates.push(s.data.id);
  const p = await b.from("policies").insert({ name: `${TAG} policy`, version: "v1.0", category: "OHS Mgmt Plan" }).select().single();
  assert.equal(p.error, null, p.error?.message); created.policies.push(p.data.id);
  const upd = await b.from("workers").update({ employer: "QA updated" }).eq("id", w.data.id).select();
  assert.equal(rows(upd), 1, "builder updates a worker");
});

test("builder admin: sees nothing of another organisation and cannot administer its users or files", { skip }, async () => {
  const b = await as("builder");
  for (const t of ["projects", "workers", "incidents", "diary_entries", "toolbox_meetings", "policies"]) {
    const r = await b.from(t).select("id, organization_id").eq("organization_id", seed.otherOrg.id);
    assert.equal(r.error, null, `${t}: ${r.error?.message}`);
    assert.equal(r.data.length, 0, `${t}: builder must see 0 rows from the other org`);
  }
  const all = await b.from("projects").select("organization_id");
  assert.ok(all.data.every((p) => p.organization_id === seed.org.id), "unfiltered projects are all own-org");
  await expectRefused(b.rpc("set_user_role", { p_user: seed.otherOrg.builderUserId, p_role: "hse_manager" }), "set_user_role on another org's user");
  await expectRefused(b.rpc("set_user_status", { p_user: seed.otherOrg.builderUserId, p_status: "Deactivated" }), "set_user_status on another org's user");
  const signed = await b.storage.from("project-docs").createSignedUrl(`${seed.otherOrg.projectId}/probe.pdf`, 60);
  assert.ok(signed.error, "signed URL under another org's project-docs path must fail");
  const orgUpd = await b.from("organizations").update({ name: "HIJACK" }).eq("id", seed.otherOrg.id).select();
  assert.ok(denied(orgUpd), "cannot rename another org");
});

// ----------------------------------------------------------------------------
// HSE Manager
// ----------------------------------------------------------------------------
test("HSE manager: reads all projects, CANNOT create a project, CAN log incidents and SWMS, cannot own the org", { skip }, async () => {
  const h = await as("hse");
  const pr = await h.from("projects").select("id");
  assert.ok(rows(pr) >= 2, `HSE sees all projects (${rows(pr)})`);
  await expectRefused(h.from("projects").insert({ name: `${TAG} HSE bypass` }).select(), "HSE create project");
  const i = await h.from("incidents").insert({ type: "Near Miss", severity: "Minor", project_id: seed.projects.assigned, date: today, reported_by: "HSE", description: `${TAG} hse`, status: "Open" }).select().single();
  assert.equal(i.error, null, i.error?.message); created.incidents.push(i.data.id);
  const s = await h.from("swms_templates").insert({ trade: `HSE ${TAG}`, ref: `SWMS-H-${TAG}`, version: "v1.0", total: 1 }).select().single();
  assert.equal(s.error, null, s.error?.message); created.templates.push(s.data.id);
  assert.ok(denied(await h.from("organizations").update({ name: "HSE OWNED IT" }).eq("id", seed.org.id).select()), "HSE cannot rename the org");
  assert.equal(rows(await h.from("invites").select("id")), 0, "HSE cannot read invites");
  await expectRefused(h.rpc("set_user_role", { p_user: A.hse.userId, p_role: "builder_admin" }), "HSE self-promotion");
  const p = await perms("hse");
  assert.equal(p.role, "hse_manager");
  assert.ok(p.isHse && !p.isBuilder);
  assert.equal(p.admin, false); assert.equal(p.billing, false); assert.equal(p.manageUsers, false); assert.equal(p.orgSettings, false); assert.equal(p.projects, false);
  assert.equal(p.compliance, true); assert.equal(p.swms, true); assert.equal(p.reports, true);
});

// ----------------------------------------------------------------------------
// Site Supervisor
// ----------------------------------------------------------------------------
test("site supervisor: assigned site only — reads 1 of 2 projects, writes diary on assigned, refused on unassigned, cannot hire", { skip }, async () => {
  const s = await as("supervisor");
  const pr = await s.from("projects").select("id");
  assert.deepEqual((pr.data || []).map((p) => p.id), [seed.projects.assigned], `supervisor sees only the assigned project (${JSON.stringify(pr.data)})`);
  const ok = await s.from("diary_entries").insert({ project_id: seed.projects.assigned, date: today, weather: "Fine", notes: `${TAG} sup` }).select().single();
  assert.equal(ok.error, null, ok.error?.message); created.diary.push(ok.data.id);
  assert.ok(denied(await s.from("diary_entries").insert({ project_id: seed.projects.unassigned, date: today, notes: "BYPASS" }).select()), "diary on unassigned site refused");
  assert.ok(denied(await s.from("workers").insert({ name: "SUP HIRE", trade: "Carpenter" }).select()), "supervisor cannot add workers");
  assert.ok(denied(await s.from("policies").insert({ name: "SUP POLICY", version: "v1.0" }).select()), "supervisor cannot publish policies");
  await expectRefused(s.rpc("set_user_projects", { p_user: A.supervisor.userId, p_projects: [seed.projects.assigned, seed.projects.unassigned] }), "supervisor self-assigning sites");
  assert.equal(rows(await s.from("invites").select("id")), 0);
  assert.equal(rows(await s.from("security_audit").select("id")), 0, "supervisor has no audit access");
  const inc = await s.from("incidents").select("project_id");
  assert.ok((inc.data || []).every((i) => i.project_id === seed.projects.assigned), "incidents only on assigned site");
  const p = await perms("supervisor");
  assert.equal(p.role, "site_supervisor");
  assert.deepEqual(p.projectIds, [seed.projects.assigned]);
  for (const [k, v] of Object.entries({ dashboard: true, projects: false, compliance: false, swms: false, diary: true, incidents: true, toolbox: true, reports: false, admin: false, policies: false, billing: false })) {
    assert.equal(p[k], v, `supervisor my_permissions.${k}`);
  }
});

// ----------------------------------------------------------------------------
// Worker / tradie
// ----------------------------------------------------------------------------
test("worker: sees only their own record, no diary/toolbox/project docs, SWMS of own trade only", { skip }, async () => {
  const w = await as("tradie");
  const mine = await w.from("workers").select("id");
  assert.deepEqual((mine.data || []).map((x) => x.id), [A.tradie.workerId], "worker sees exactly their own row");
  assert.equal(rows(await w.from("diary_entries").select("id")), 0, "no diary");
  assert.equal(rows(await w.from("toolbox_meetings").select("id")), 0, "no toolbox");
  assert.equal(rows(await w.from("project_documents").select("id")), 0, "no project docs");
  assert.equal(rows(await w.from("invites").select("id")), 0, "no invites");
  assert.equal(rows(await w.from("security_audit").select("id")), 0, "no audit");
  const sw = await w.from("swms_templates").select("trade");
  assert.ok(rows(sw) >= 1 && sw.data.every((t) => t.trade === A.tradie.trade), `SWMS only for ${A.tradie.trade}: ${JSON.stringify(sw.data)}`);
  const pr = await w.from("projects").select("id");
  assert.deepEqual((pr.data || []).map((p) => p.id), [seed.projects.assigned], "only the site they are on");
  const p = await perms("tradie");
  assert.equal(p.role, "worker");
  for (const k of ["dashboard", "projects", "compliance", "swms", "admin", "reports", "billing"]) assert.equal(p[k], false, `worker my_permissions.${k}`);
});

test("worker: can report an incident, cannot edit/delete anyone's, cannot self-certify quiz/SWMS/induction ticks, cannot administer accounts", { skip }, async () => {
  const w = await as("tradie");
  const rep = await w.from("incidents").insert({ type: "Near Miss", severity: "Minor", project_id: seed.projects.assigned, date: today, reported_by: "Quentin Tradie", description: `${TAG} tradie`, status: "Open" }).select().single();
  assert.equal(rep.error, null, rep.error?.message); created.incidents.push(rep.data.id);
  assert.equal(rep.data.reported_by_worker_id, A.tradie.workerId, "trigger stamps the reporter");
  const visible = await w.from("incidents").select("id, reported_by_worker_id, involved_worker_id");
  assert.ok(visible.data.every((i) => i.reported_by_worker_id === A.tradie.workerId || i.involved_worker_id === A.tradie.workerId), "sees only own incidents");
  const othersIncident = created.incidents[0];
  assert.ok(denied(await w.from("incidents").update({ status: "Closed" }).eq("id", othersIncident).select()), "cannot edit another's incident");
  assert.ok(denied(await w.from("incidents").delete().eq("id", rep.data.id).select()), "cannot delete even own incident");
  await expectRefused(w.rpc("update_my_compliance", { category: "quiz", value: "Verified" }), "update_my_compliance(quiz)");
  await expectRefused(w.rpc("update_my_compliance", { category: "swms", value: "Verified" }), "update_my_compliance(swms)");
  assert.ok(denied(await w.from("workers").update({ quiz: "Verified" }).eq("id", A.tradie.workerId).select()), "direct write to workers.quiz refused (column grant)");
  assert.ok(denied(await w.from("compliance_documents").insert({ worker_id: seed.workers.other, category: "white_card", file_name: "BYPASS.pdf", file_path: "x/BYPASS.pdf" }).select()), "cannot file a document against a colleague");
  await expectRefused(w.rpc("set_user_status", { p_user: A.supervisor.userId, p_status: "Deactivated" }), "worker set_user_status");
  await expectRefused(w.rpc("set_user_role", { p_user: A.tradie.userId, p_role: "builder_admin" }), "worker set_user_role");
});

// ----------------------------------------------------------------------------
// Evidence-backed ticks (migrations 008/011)
// ----------------------------------------------------------------------------
test("evidence: quiz is served without answers, graded server-side, attempts recorded; staff cannot hand-set the three ticks", { skip }, async () => {
  const w = await as("tradie");
  const q = await w.rpc("get_quiz");
  assert.equal(q.error, null, q.error?.message);
  assert.ok(Array.isArray(q.data) && q.data.length >= 1, "quiz has questions (seeded)");
  assert.ok(q.data.every((x) => !("answer_index" in x) && !("answerIndex" in x)), "answer key never leaves the database");
  const wrong = q.data.map((x) => ({ id: x.id, answer: 3 }));
  const sub = await w.rpc("submit_quiz", { p_answers: wrong });
  assert.equal(sub.error, null, sub.error?.message);
  assert.equal(sub.data.passed, false, "all-wrong answers do not pass");
  const attempts = await w.from("quiz_attempts").select("id, passed").eq("worker_id", A.tradie.workerId);
  assert.ok(rows(attempts) >= 1, "attempt recorded");
  const b = await as("builder");
  for (const col of ["quiz", "swms", "induction"]) {
    assert.ok(denied(await b.from("workers").update({ [col]: "Verified" }).eq("id", A.tradie.workerId).select()), `staff cannot write workers.${col} directly`);
  }
  const wc = await b.from("workers").update({ white_card: "Verified" }).eq("id", A.tradie.workerId).select();
  assert.equal(rows(wc), 1, "staff can still correct a document check (white card)");
  await expectRefused(b.rpc("record_compliance_signoff", { p_worker_id: A.tradie.workerId, p_category: "quiz", p_value: "Verified" }), "no manual quiz path");
});

test("evidence: worker signs SWMS → signature row + tick; builder records named toolbox attendance; counts derive from registers", { skip }, async () => {
  const w = await as("tradie");
  const t = await w.from("swms_templates").select("id, trade").eq("trade", A.tradie.trade).limit(1).single();
  assert.equal(t.error, null, t.error?.message);
  const sig = await w.rpc("sign_swms_v2", { p_template_id: t.data.id, p_signed_name: "Quentin Tradie" });
  assert.equal(sig.error, null, sig.error?.message);
  const reg = await w.from("swms_signatures").select("id, worker_id, signed_by_staff").eq("template_id", t.data.id).eq("worker_id", A.tradie.workerId);
  assert.ok(rows(reg) >= 1 && reg.data.every((r) => r.signed_by_staff === false), "signature recorded as the tradie's own");
  const me = await w.from("workers").select("swms").eq("id", A.tradie.workerId).single();
  assert.equal(me.data.swms, "Verified", "SWMS tick follows the signature");
  const b = await as("builder");
  const m = await b.from("toolbox_meetings").insert({ project_id: seed.projects.assigned, topic: `${TAG} pre-start`, date: today, attendees: 2, total: 2 }).select().single();
  assert.equal(m.error, null, m.error?.message); created.toolbox.push(m.data.id);
  const att = await b.rpc("record_toolbox_attendance", { p_meeting_id: m.data.id, p_worker_id: A.tradie.workerId, p_signed_name: null });
  assert.equal(att.error, null, att.error?.message);
  const dupe = await b.rpc("record_toolbox_attendance", { p_meeting_id: m.data.id, p_worker_id: A.tradie.workerId });
  assert.equal(dupe.data?.alreadyRecorded, true, "same person not counted twice");
  const after = await b.from("toolbox_meetings").select("signatures").eq("id", m.data.id).single();
  assert.equal(after.data.signatures, 1, "meeting count derived from the register");
});

test("evidence: a notifiable incident cannot be closed until WorkSafe notification is recorded; nobody can delete incidents", { skip }, async () => {
  const b = await as("builder");
  const inc = await b.from("incidents").insert({ type: "Notifiable Incident", severity: "Major", project_id: seed.projects.assigned, date: today, reported_by: "QA", description: `${TAG} notifiable`, status: "Open" }).select().single();
  assert.equal(inc.error, null, inc.error?.message); created.incidents.push(inc.data.id);
  assert.equal(inc.data.notifiable, true, "notifiable flag computed by the database");
  const early = await b.from("incidents").update({ status: "Closed" }).eq("id", inc.data.id).select();
  assert.ok(early.error, "closing before notification must be refused by the trigger");
  const n = await b.rpc("record_worksafe_notification", { p_incident_id: inc.data.id, p_method: "Telephone 13 23 60", p_reference: TAG, p_site_preserved: true });
  assert.equal(n.error, null, n.error?.message);
  const closeNow = await b.from("incidents").update({ status: "Closed" }).eq("id", inc.data.id).select();
  assert.equal(rows(closeNow), 1, "closes once the call is recorded");
  assert.ok(denied(await b.from("incidents").delete().eq("id", inc.data.id).select()), "even the builder cannot delete an incident");
});

// ----------------------------------------------------------------------------
// Deactivation + audit
// ----------------------------------------------------------------------------
test("deactivation revokes on the live session and is audited; reactivation restores", { skip }, async () => {
  const b = await as("builder");
  const s = await as("supervisor");
  assert.equal(rows(await s.from("projects").select("id")), 1);
  const off = await b.rpc("set_user_status", { p_user: A.supervisor.userId, p_status: "Deactivated" });
  assert.equal(off.error, null, off.error?.message);
  assert.equal(rows(await s.from("projects").select("id")), 0, "deactivated supervisor reads 0 projects on the same session");
  const p = await s.rpc("my_permissions");
  assert.equal(p.data?.role, null, "deactivated account reports no role");
  assert.equal(p.data?.organizationId, null, "deactivated account reports no organisation");
  const on = await b.rpc("set_user_status", { p_user: A.supervisor.userId, p_status: "Active" });
  assert.equal(on.error, null, on.error?.message);
  delete clients.supervisor;
  const s2 = await as("supervisor");
  assert.equal(rows(await s2.from("projects").select("id")), 1, "reactivated supervisor sees the assigned project again");
  const audit = await b.from("security_audit").select("action").eq("action", "ACCOUNT_STATUS");
  assert.ok(rows(audit) >= 2, `status changes in the audit log (${rows(audit)})`);
  const h = await as("hse");
  assert.ok(rows(await h.from("security_audit").select("id")) >= 1, "HSE can read the audit trail");
  assert.equal(rows(await s2.from("security_audit").select("id")), 0, "supervisor cannot");
  await expectRefused(h.rpc("set_user_status", { p_user: A.supervisor.userId, p_status: "Deactivated" }), "HSE cannot deactivate anyone");
});

// ----------------------------------------------------------------------------
// Education must not leak into Industry
// ----------------------------------------------------------------------------
test("Education does not leak: every Industry role has education=null, sandbox=false, and no Education RPC/table access", { skip }, async () => {
  for (const who of ["builder", "hse", "supervisor", "tradie", "otherBuilder"]) {
    const p = await perms(who);
    assert.equal(p.education, null, `${who}: my_permissions.education must be null`);
    assert.equal(p.sandbox, false, `${who}: sandbox must be false`);
    const c = await as(who);
    const inst = await c.from("edu_institutions").select("id");
    assert.equal(inst.error, null, `${who} edu_institutions: ${inst.error?.message}`);
    assert.equal(inst.data.length, 0, `${who} must see 0 institutions`);
    for (const t of ["edu_cohorts", "edu_enrolments", "edu_submissions", "edu_scenarios"]) {
      const r = await c.from(t).select("id");
      assert.equal(r.error, null, `${who} ${t}: ${r.error?.message}`);
      assert.equal(r.data.length, 0, `${who} must see 0 rows of ${t}`);
    }
    await expectRefused(c.rpc("edu_institution_overview", { p_institution: 1 }), `${who} edu_institution_overview`);
    await expectRefused(c.rpc("edu_assessor_home"), `${who} edu_assessor_home`);
    await expectRefused(c.rpc("edu_student_home"), `${who} edu_student_home`);
    await expectRefused(c.rpc("edu_create_institution", { p_name: "x", p_admin_name: "x", p_admin_email: "x@x.com" }), `${who} edu_create_institution`);
    const own = await c.rpc("edu_can_view_org", { p_org: seed.org.id });
    assert.equal(own.error, null, own.error?.message);
    assert.equal(own.data, false, `${who}: edu_can_view_org(own org) must be false`);
  }
  // Builder admin keeps the Industry permission shape exactly.
  const p = await perms("builder");
  for (const k of ["role", "organizationId", "projectIds", "isBuilder", "isHse", "isSupervisor", "dashboard", "projects", "compliance", "swms", "diary", "incidents", "toolbox", "reports", "admin", "policies", "welcome", "billing", "manageUsers", "orgSettings", "platform"]) {
    assert.ok(k in p, `my_permissions still has key ${k}`);
  }
  assert.equal(p.admin, true); assert.equal(p.billing, true); assert.equal(p.manageUsers, true); assert.equal(p.orgSettings, true);
  assert.equal(p.organizationId, seed.org.id);
});

// ----------------------------------------------------------------------------
// Clean up probe rows (builder can delete most; incidents are undeletable by design).
// ----------------------------------------------------------------------------
after(async () => {
  if (!ready) return;
  try {
    const b = await as("builder");
    if (created.diary.length) await b.from("diary_entries").delete().in("id", created.diary);
    if (created.toolbox.length) await b.from("toolbox_meetings").delete().in("id", created.toolbox);
    if (created.policies.length) await b.from("policies").delete().in("id", created.policies);
    if (created.templates.length) await b.from("swms_templates").delete().in("id", created.templates);
    if (created.workers.length) await b.from("workers").delete().in("id", created.workers);
    if (created.projects.length) await b.from("projects").delete().in("id", created.projects);
  } catch { /* best effort */ }
});
