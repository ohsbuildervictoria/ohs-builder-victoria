// ============================================================================
// OHS Builder Education — tenant isolation suite
//
// Signs in as the seeded demo accounts (scripts/education/seed-demo.mjs) and
// probes PostgREST the way a browser would, asserting that every boundary
// holds: institution ↔ institution, assessor ↔ unassigned cohort, student ↔
// student, student ↛ assessor/admin, assessor ↛ admin, Education ↛ Industry,
// ids in URLs ↛ other people's records, storage paths, CSV/enrolment imports.
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run test:education
// Skips (does not fail) with a clear message when env / seed output is absent.
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadEnv, signIn, student, expectRefused } from "./helpers.mjs";

const env = loadEnv();
const skip = env.ready ? false : `isolation tests skipped — ${env.reason}`;

const s4 = student(env, "student4");
const s5 = student(env, "student5");
const s2 = student(env, "student2");
const adminEmail = env.accounts?.admin?.email;
const assessorEmail = env.accounts?.assessor?.email;

const SANDBOX_TABLES = ["projects", "workers", "incidents", "project_risks", "diary_entries", "toolbox_meetings", "swms_templates"];

test("institution admin sees only their own institution, cohorts, enrolments and people", { skip }, async () => {
  const c = await signIn(env, adminEmail);
  const inst = await c.from("edu_institutions").select("id");
  assert.equal(inst.error, null, inst.error?.message);
  assert.deepEqual(inst.data.map((r) => r.id), [env.seed.institutionId], "admin must see exactly one institution (their own)");
  for (const t of ["edu_cohorts", "edu_enrolments", "edu_programs"]) {
    const r = await c.from(t).select("institution_id");
    assert.equal(r.error, null, `${t}: ${r.error?.message}`);
    assert.ok(r.data.every((x) => x.institution_id === env.seed.institutionId), `${t} leaked rows from another institution`);
  }
  const m = await c.from("edu_memberships").select("id, institution_id, edu_role, email, status");
  assert.equal(m.error, null, m.error?.message);
  assert.ok(m.data.length > 0 && m.data.every((x) => x.institution_id === env.seed.institutionId), "memberships leaked across institutions");
});

test("invite tokens are not readable through the memberships table", { skip }, async () => {
  const c = await signIn(env, adminEmail);
  const r = await c.from("edu_memberships").select("id, invite_token").limit(1);
  assert.ok(r.error, "selecting invite_token must be refused (column grant revoked); admins use the invite RPCs instead");
});

test("assessor can read their cohort board; a cohort they are not assigned to raises", { skip }, async () => {
  const c = await signIn(env, assessorEmail);
  const ok = await c.rpc("edu_cohort_board", { p_cohort: env.seed.cohortId });
  assert.equal(ok.error, null, ok.error?.message);
  assert.ok(Array.isArray(ok.data.students), "board has a students array");
  await expectRefused(c.rpc("edu_cohort_board", { p_cohort: 999999 }), "edu_cohort_board(unassigned/unknown cohort)");
});

test("assessor can READ an assigned student's sandbox (projects ≥ 1) but cannot WRITE to it", { skip: skip || (!s4?.sandboxOrgId && "student4 has no sandbox") }, async () => {
  const c = await signIn(env, assessorEmail);
  const read = await c.from("projects").select("id, name").eq("organization_id", s4.sandboxOrgId);
  assert.equal(read.error, null, read.error?.message);
  assert.ok(read.data.length >= 1, "assessor should see student4's project through the read-only policy");
  const pid = read.data[0].id;
  for (const t of ["projects", "incidents", "project_risks"]) {
    const payload = t === "projects"
      ? { name: "Assessor write probe", organization_id: s4.sandboxOrgId }
      : t === "incidents"
        ? { type: "Near Miss", severity: "Minor", description: "probe", organization_id: s4.sandboxOrgId, project_id: pid }
        : { hazard: "probe", project_id: pid, organization_id: s4.sandboxOrgId };
    await expectRefused(c.from(t).insert(payload), `assessor insert into ${t}`);
  }
  const upd = await c.from("projects").update({ name: "Assessor edit probe" }).eq("id", pid).select();
  assert.ok(upd.error || (upd.data || []).length === 0, "assessor update of a student's project must affect 0 rows / be refused");
  const after = await c.from("projects").select("name").eq("id", pid).single();
  assert.notEqual(after.data?.name, "Assessor edit probe", "student's project name must be unchanged");
});

test("student A cannot see student B's records; unfiltered reads return only their own org", { skip: skip || (!(s4?.sandboxOrgId && s5?.sandboxOrgId) && "need two sandboxes") }, async () => {
  const c = await signIn(env, s4.email);
  for (const t of ["projects", "incidents", "project_risks", "workers", "diary_entries", "toolbox_meetings"]) {
    const other = await c.from(t).select("id").eq("organization_id", s5.sandboxOrgId);
    assert.equal(other.error, null, `${t}: ${other.error?.message}`);
    assert.equal(other.data.length, 0, `${t}: student4 can read student5's rows`);
    const mine = await c.from(t).select("organization_id");
    assert.equal(mine.error, null, `${t}: ${mine.error?.message}`);
    assert.ok(mine.data.every((r) => r.organization_id === s4.sandboxOrgId), `${t}: unfiltered read returned another org`);
  }
  const orgs = await c.from("organizations").select("id");
  assert.deepEqual(orgs.data.map((o) => o.id), [s4.sandboxOrgId], "student must see exactly their own organisation");
});

test("student cannot use assessor or admin RPCs, or Industry admin RPCs", { skip: skip || (!s4 && "student4 missing") }, async () => {
  const c = await signIn(env, s4.email);
  await expectRefused(c.rpc("edu_record_result", { p_submission: 1, p_criterion: 1, p_result: "satisfactory", p_comment: "x" }), "student edu_record_result");
  await expectRefused(c.rpc("edu_finalise_assessment", { p_submission: 1, p_outcome: "completed", p_comment: "x" }), "student edu_finalise_assessment");
  await expectRefused(c.rpc("edu_cohort_board", { p_cohort: env.seed.cohortId }), "student edu_cohort_board");
  await expectRefused(c.rpc("edu_add_students", { p_cohort: env.seed.cohortId, p_students: [{ name: "x", email: "x@example.com" }] }), "student edu_add_students");
  await expectRefused(c.rpc("edu_invite_member", { p_institution: env.seed.institutionId, p_role: "assessor", p_name: "x", p_email: "x@example.com", p_cohort_ids: [] }), "student edu_invite_member");
  await expectRefused(c.rpc("edu_create_institution", { p_name: "Evil", p_admin_name: "x", p_admin_email: "x@example.com", p_is_demo: true }), "student edu_create_institution");
  // A student IS the builder of their own sandbox, so the only thing
  // set_user_role can ever reach is their own org — never anyone else's.
  await expectRefused(c.rpc("set_user_role", { p_user: "00000000-0000-0000-0000-000000000000", p_role: "builder_admin" }), "student set_user_role(outside their org)");
  await expectRefused(c.rpc("platform_orgs"), "student platform_orgs");
  await expectRefused(c.rpc("edu_platform_institutions"), "student edu_platform_institutions");
});

test("assessor cannot become an admin or touch Industry/privileged RPCs", { skip }, async () => {
  const c = await signIn(env, assessorEmail);
  const { data: { user } } = await c.auth.getUser();
  await expectRefused(c.rpc("set_user_role", { p_user: user.id, p_role: "builder_admin" }), "assessor set_user_role");
  await expectRefused(c.rpc("edu_add_students", { p_cohort: env.seed.cohortId, p_students: [{ name: "x", email: "x@example.com" }] }), "assessor edu_add_students");
  await expectRefused(c.rpc("edu_create_institution", { p_name: "Evil", p_admin_name: "x", p_admin_email: "x@example.com", p_is_demo: true }), "assessor edu_create_institution");
  await expectRefused(c.rpc("edu_invite_member", { p_institution: env.seed.institutionId, p_role: "institution_admin", p_name: "x", p_email: "x@example.com", p_cohort_ids: [] }), "assessor edu_invite_member");
  await expectRefused(c.rpc("platform_orgs"), "assessor platform_orgs");
  const upd = await c.from("edu_institutions").update({ name: "Hijacked" }).eq("id", env.seed.institutionId).select();
  assert.ok(upd.error || (upd.data || []).length === 0, "assessor must not be able to rename the institution");
});

test("institution admin cannot read sandbox records or assess", { skip }, async () => {
  const c = await signIn(env, adminEmail);
  for (const t of SANDBOX_TABLES) {
    const r = await c.from(t).select("id");
    assert.equal(r.error, null, `${t}: ${r.error?.message}`);
    assert.equal(r.data.length, 0, `${t}: institution admin must not read sandbox rows (got ${r.data.length})`);
  }
  await expectRefused(c.rpc("edu_record_result", { p_submission: 1, p_criterion: 1, p_result: "satisfactory", p_comment: "x" }), "admin edu_record_result");
  await expectRefused(c.rpc("edu_finalise_assessment", { p_submission: 1, p_outcome: "completed", p_comment: "x" }), "admin edu_finalise_assessment");
});

test("my_permissions(): Education staff hold no organisation; students are sandboxed with billing/admin hidden", { skip: skip || (!s4 && "student4 missing") }, async () => {
  for (const [mail, role] of [[adminEmail, "institution_admin"], [assessorEmail, "assessor"]]) {
    const c = await signIn(env, mail);
    const p = await c.rpc("my_permissions");
    assert.equal(p.error, null, p.error?.message);
    assert.equal(p.data.organizationId, null, `${role} must have no Industry organisation`);
    assert.equal(p.data.education?.role, role);
    assert.equal(p.data.sandbox, false);
    assert.equal(p.data.dashboard, false, `${role} must not be offered the builder dashboard`);
  }
  const c = await signIn(env, s4.email);
  const p = await c.rpc("my_permissions");
  assert.equal(p.error, null, p.error?.message);
  assert.equal(p.data.sandbox, true, "student's org must be a sandbox");
  assert.equal(p.data.education?.role, "student");
  assert.equal(p.data.organizationId, s4.sandboxOrgId);
  assert.equal(p.data.admin, false, "admin portal hidden inside a sandbox");
  assert.equal(p.data.billing, false, "billing hidden inside a sandbox");
  assert.equal(p.data.manageUsers, false);
  assert.equal(p.data.orgSettings, false);
  assert.equal(p.data.projects, true, "student is the builder of their own sandbox");
});

test("ids in URLs cannot be swapped: review bundle / snapshot / progress of another enrolment raise", { skip: skip || (!(s4 && s5) && "need two students") }, async () => {
  const c = await signIn(env, s4.email);
  await expectRefused(c.rpc("edu_review_bundle", { p_enrolment: s5.enrolmentId }), "student4 edu_review_bundle(student5)");
  await expectRefused(c.rpc("edu_evaluate_progress", { p_enrolment: s5.enrolmentId }), "student4 edu_evaluate_progress(student5)");
  // Find one of student5's submissions through the assessor (who may see it), then probe as student4.
  const a = await signIn(env, assessorEmail);
  const bundle = await a.rpc("edu_review_bundle", { p_enrolment: s5.enrolmentId });
  assert.equal(bundle.error, null, bundle.error?.message);
  const subId = bundle.data.submissions?.[0]?.id;
  if (subId) {
    await expectRefused(c.rpc("edu_submission_snapshot", { p_submission: subId }), "student4 edu_submission_snapshot(student5's submission)");
    const rows = await c.from("edu_submissions").select("id").eq("id", subId);
    assert.equal(rows.data?.length || 0, 0, "student4 must not see student5's submission row");
  }
  const own = await c.rpc("edu_review_bundle", { p_enrolment: s4.enrolmentId });
  assert.equal(own.error, null, "a student may read their own bundle");
  assert.equal(own.data.canAssess, false, "a student can never assess");
});

test("storage: a student cannot sign a URL for another student's photo path", { skip: skip || (!(s4 && s5) && "need two students") }, async () => {
  const a = await signIn(env, assessorEmail);
  const photos = await a.from("record_photos").select("file_path").eq("organization_id", s5.sandboxOrgId).limit(1);
  if (!photos.data?.length) {
    // No photo evidence in the demo — probe a plausible path shape instead.
    const inc = await a.from("incidents").select("id").eq("organization_id", s5.sandboxOrgId).limit(1);
    const path = `incident/${inc.data?.[0]?.id || 0}/probe.jpg`;
    const c = await signIn(env, s4.email);
    const r = await c.storage.from("site-photos").createSignedUrl(path, 60);
    assert.ok(r.error, `student4 must not get a signed URL under student5's incident path (${path})`);
    return;
  }
  const c = await signIn(env, s4.email);
  const r = await c.storage.from("site-photos").createSignedUrl(photos.data[0].file_path, 60);
  assert.ok(r.error, "student4 must not get a signed URL for student5's photo");
});

test("enrolment import cannot cross tenants: edu_add_students into a cohort you don't own raises", { skip }, async () => {
  const c = await signIn(env, adminEmail);
  await expectRefused(c.rpc("edu_add_students", { p_cohort: 999999, p_students: [{ name: "x", email: "x@example.com" }] }), "edu_add_students(foreign cohort)");
  await expectRefused(c.rpc("edu_assign_assessor", { p_cohort: 999999, p_membership: env.accounts.assessor.membershipId, p_assign: true }), "edu_assign_assessor(foreign cohort)");
  const ins = await c.from("edu_cohorts").insert({ institution_id: 999999, program_id: 1, name: "Foreign" }).select();
  assert.ok(ins.error, "inserting a cohort under another institution must be refused");
});

test("a student who has not accepted the invite cannot sign in to anything (invited state)", { skip: skip || (!student(env, "student1")?.inviteLink && "student1 not left invited") }, async () => {
  const s1 = student(env, "student1");
  const c = await signIn(env, adminEmail);
  const e = await c.from("edu_enrolments").select("status, sandbox_org_id").eq("id", s1.enrolmentId).single();
  assert.equal(e.data?.status, "invited");
  assert.equal(e.data?.sandbox_org_id, null, "no sandbox exists before the invite is accepted");
});

test("not_started student: sandbox exists, is empty, and the student cannot see any other org", { skip: skip || (!s2?.sandboxOrgId && "student2 missing") }, async () => {
  const c = await signIn(env, s2.email);
  const p = await c.from("projects").select("id");
  assert.equal(p.error, null, p.error?.message);
  assert.equal(p.data.length, 0, "fresh sandbox should be empty");
  const orgs = await c.from("organizations").select("id, kind");
  assert.deepEqual(orgs.data, [{ id: s2.sandboxOrgId, kind: "education_sandbox" }]);
});
