// ============================================================================
// OHS Builder Education — Industry regression guard
//
// Education is additive. These checks prove that (a) an Education account
// gets nothing from the Industry tables, (b) my_permissions() still carries
// every Industry key, and (c) an ordinary Industry account is untouched
// (education: null, sandbox: false, own data still readable).
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… [QA_EMAIL=… QA_PASSWORD=…] npm run test:education
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, signIn } from "./helpers.mjs";

const env = loadEnv();
const skip = env.ready ? false : `industry regression tests skipped — ${env.reason}`;

const INDUSTRY_KEYS = [
  "role", "organizationId", "projectIds", "isBuilder", "isHse", "isSupervisor",
  "dashboard", "projects", "compliance", "swms", "diary", "incidents", "toolbox",
  "reports", "admin", "policies", "welcome", "billing", "manageUsers", "orgSettings", "platform",
];

test("an Education staff account reads nothing from Industry tables", { skip }, async () => {
  const c = await signIn(env, env.accounts.admin.email);
  for (const t of ["projects", "workers", "incidents", "swms_templates", "diary_entries", "toolbox_meetings", "organizations", "compliance_documents", "policies"]) {
    const r = await c.from(t).select("id");
    assert.equal(r.error, null, `${t}: ${r.error?.message}`);
    assert.equal(r.data.length, 0, `${t}: institution admin received ${r.data.length} Industry rows`);
  }
});

test("my_permissions() keeps every Industry key and adds education + sandbox", { skip }, async () => {
  const c = await signIn(env, env.accounts.assessor.email);
  const p = await c.rpc("my_permissions");
  assert.equal(p.error, null, p.error?.message);
  for (const k of INDUSTRY_KEYS) assert.ok(k in p.data, `my_permissions() is missing Industry key "${k}"`);
  assert.ok("education" in p.data, "education key present");
  assert.ok("sandbox" in p.data, "sandbox key present");
});

const qaEmail = process.env.QA_EMAIL;
const qaPassword = process.env.QA_PASSWORD;
const qaSkip = skip || (!(qaEmail && qaPassword) && "QA_EMAIL / QA_PASSWORD not set — Industry account smoke test skipped");

test("an Industry account is untouched: education null, sandbox false, own projects readable", { skip: qaSkip }, async () => {
  const c = createClient(env.url, env.anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: qaEmail, password: qaPassword });
  assert.equal(error, null, error?.message);
  const p = await c.rpc("my_permissions");
  assert.equal(p.error, null, p.error?.message);
  assert.equal(p.data.education, null, "Industry account must have education: null");
  assert.equal(p.data.sandbox, false, "Industry account must not be a sandbox");
  assert.ok(p.data.organizationId, "Industry account keeps its organisation");
  const r = await c.from("projects").select("id, organization_id");
  assert.equal(r.error, null, r.error?.message);
  assert.ok(r.data.every((x) => x.organization_id === p.data.organizationId), "projects must all belong to the account's own org");
  const edu = await c.from("edu_institutions").select("id");
  assert.equal(edu.error, null, edu.error?.message);
  assert.equal(edu.data.length, 0, "an Industry account sees no institutions");
});
