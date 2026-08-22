#!/usr/bin/env node
// ============================================================================
// Industry regression seed (staging)
//
// Creates TWO ordinary Industry organisations through the product's real
// paths so test/education/industry-regression.test.mjs can prove the
// Education migrations did not change Industry semantics:
//
//   "QA Regression Builders": Builder Admin (signup_create_org), HSE Manager
//   and Site Supervisor (staff invites -> accept_staff_invite), two projects
//   (one assigned to the supervisor via set_user_projects), two workers (one a
//   real tradie via accept_worker_invite), SWMS templates, quiz questions.
//   "QA Other Builders": its own Builder Admin + one project (cross-org probes).
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
//     node scripts/education/seed-industry-staging.mjs           # create / top-up
//     node scripts/education/seed-industry-staging.mjs --reset   # remove only what it created
//
// Optional: SEED_PASSWORD (default Demo!Edu2026), SEED_EMAIL_DOMAIN
// (default example.edu.au), SEED_PREFIX (default qa-reg).
// Writes scripts/education/industry-seed-output.local.json (git-ignored).
// Idempotent: re-runs find rows by email / name and reuse them.
// ============================================================================
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const env = process.env;
const URL = env.SUPABASE_URL;
const ANON = env.SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = env.SEED_PASSWORD || "Demo!Edu2026";
const DOMAIN = env.SEED_EMAIL_DOMAIN || "example.edu.au";
const PREFIX = env.SEED_PREFIX || "qa-reg";
const RESET = process.argv.includes("--reset");
const ORG_NAME = "QA Regression Builders";
const OTHER_ORG_NAME = "QA Other Builders";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "industry-seed-output.local.json");

if (!URL || !ANON || !SERVICE) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
if (/bbbtqhypdjrmlrdabumm/.test(URL)) {
  console.error("Refusing to seed the production project.");
  process.exit(3);
}

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const email = (who) => `${PREFIX}-${who}@${DOMAIN}`;
const log = (...a) => console.log("•", ...a);
const warn = (...a) => console.warn("!", ...a);
const WHO = ["builder", "hse", "supervisor", "tradie", "other-builder"];

function must(res, what) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

async function asUser(mail) {
  const c = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: mail, password: PASSWORD });
  if (error) throw new Error(`sign in ${mail}: ${error.message}`);
  return c;
}

async function findAuthUser(mail) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === mail.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function ensureAuthUser(mail, name) {
  const existing = await findAuthUser(mail);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: mail, password: PASSWORD, email_confirm: true, user_metadata: { name },
  });
  if (error) throw new Error(`createUser ${mail}: ${error.message}`);
  return data.user;
}

async function profileOf(userId) {
  return must(await admin.from("profiles").select("*").eq("id", userId).maybeSingle(), "profile");
}

// Builder signup: the real path — auth user, then signup_create_org as that user.
async function ensureBuilderOrg(mail, name, orgName) {
  const user = await ensureAuthUser(mail, name);
  let p = await profileOf(user.id);
  if (!p?.organization_id) {
    const c = await asUser(mail);
    const orgId = must(await c.rpc("signup_create_org", { org_name: orgName }), `signup_create_org ${orgName}`);
    log(`Created org #${orgId} ${orgName} for ${mail}`);
    p = await profileOf(user.id);
  }
  const org = must(await admin.from("organizations").select("*").eq("id", p.organization_id).single(), "org");
  if (org.name !== orgName) {
    must(await admin.from("organizations").update({ name: orgName }).eq("id", org.id), "rename org");
    org.name = orgName;
  }
  return { user, profile: p, org };
}

// Staff invite: builder records the invite, the invitee accepts with the token.
async function ensureStaff(builderClient, orgId, mail, name, role) {
  const user = await ensureAuthUser(mail, name);
  let p = await profileOf(user.id);
  if (p?.organization_id === orgId && p.role === role) return { user, profile: p };
  let inv = must(await admin.from("invites").select("*").eq("organization_id", orgId).eq("email", mail).eq("role", role).maybeSingle(), "invite");
  if (!inv) {
    inv = must(await builderClient.from("invites").insert({ name, email: mail, role }).select().single(), `insert invite ${mail}`);
    inv = must(await admin.from("invites").select("*").eq("id", inv.id).single(), "read invite");
  }
  if (inv.status === "invited" && inv.invite_token) {
    const c = await asUser(mail);
    must(await c.rpc("accept_staff_invite", { token: inv.invite_token }), `accept_staff_invite ${mail}`);
  }
  p = await profileOf(user.id);
  if (p.organization_id !== orgId || p.role !== role) throw new Error(`${mail} is not ${role} of org ${orgId} (got ${p.role}/${p.organization_id})`);
  log(`${role} ${mail} active`);
  return { user, profile: p };
}

async function ensureProject(builderClient, orgId, name, patch = {}) {
  let pr = must(await admin.from("projects").select("*").eq("organization_id", orgId).eq("name", name).maybeSingle(), "project");
  if (!pr) {
    pr = must(await builderClient.from("projects").insert({ name, address: `${name} site, Melbourne VIC`, status: "Active", contract_type: "Lump Sum", contract_value: 1200000, project_manager: "QA PM", ...patch }).select().single(), `insert project ${name}`);
    log(`Project #${pr.id} ${name}`);
  }
  return pr;
}

async function ensureTemplate(builderClient, orgId, trade) {
  const existing = must(await admin.from("swms_templates").select("*").eq("organization_id", orgId).eq("trade", trade).maybeSingle(), "template");
  if (existing) return existing;
  return must(await builderClient.from("swms_templates").insert({
    trade, ref: `SWMS-${trade.replace(/[^A-Za-z]+/g, "").slice(0, 8).toUpperCase()}-Q${orgId}`, version: "v1.0", signed: 0, total: 1, status: "Pending",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic)",
  }).select().single(), `insert template ${trade}`);
}

async function ensureWorker(builderClient, orgId, projectId, name, trade, employer, mail = null) {
  let w = must(await admin.from("workers").select("*").eq("organization_id", orgId).eq("name", name).maybeSingle(), "worker");
  if (!w) {
    w = must(await builderClient.from("workers").insert({ name, trade, employer, project_id: projectId, email: mail }).select().single(), `insert worker ${name}`);
    w = must(await admin.from("workers").select("*").eq("id", w.id).single(), "read worker");
    log(`Worker #${w.id} ${name} (${trade})`);
  }
  await ensureTemplate(builderClient, orgId, trade);
  return w;
}

// Tradie invite: the worker's invite token becomes a real per-tradie account.
async function ensureTradie(worker, mail, name) {
  const user = await ensureAuthUser(mail, name);
  let p = await profileOf(user.id);
  if (p?.worker_id === worker.id) return { user, profile: p };
  const fresh = must(await admin.from("workers").select("*").eq("id", worker.id).single(), "worker");
  if (fresh.account_status !== "invited" || !fresh.invite_token) {
    // re-issue a token so a re-run can link a recreated auth user
    must(await admin.from("workers").update({ invite_token: crypto.randomUUID(), account_status: "invited", email: mail }).eq("id", worker.id), "reissue worker token");
  }
  const w2 = must(await admin.from("workers").select("*").eq("id", worker.id).single(), "worker");
  const c = await asUser(mail);
  must(await c.rpc("accept_worker_invite", { token: w2.invite_token }), `accept_worker_invite ${mail}`);
  p = await profileOf(user.id);
  log(`Tradie ${mail} linked to worker #${worker.id}`);
  return { user, profile: p };
}

async function ensureQuiz(builderClient, orgId) {
  const have = must(await admin.from("quiz_questions").select("id").eq("organization_id", orgId), "quiz");
  if (have.length) return;
  // The repo's signup_create_org (migration 001) does not seed the quiz; production
  // carries a later hot-fix that does. Seed it here so the worker quiz path can be tested.
  must(await builderClient.from("quiz_questions").insert([
    { position: 1, question: "What should you do FIRST if you witness a serious incident on site?", options: ["Take a photo for the report", "Ensure the area is safe and call for help / first aid", "Continue working and tell the supervisor later", "Move the injured person immediately"], answer_index: 1 },
    { position: 2, question: "When is a SWMS required to be signed?", options: ["Only after an incident occurs", "Once a year regardless of task", "Before commencing any high-risk construction work", "It is optional for experienced workers"], answer_index: 2 },
  ]), "insert quiz");
  log("Quiz questions seeded for the org");
}

// ---------------------------------------------------------------------------
async function reset() {
  const orgs = must(await admin.from("organizations").select("id, name").in("name", [ORG_NAME, OTHER_ORG_NAME]), "orgs");
  const orgIds = orgs.map((o) => o.id);
  const userIds = [];
  for (const who of WHO) { const u = await findAuthUser(email(who)); if (u) userIds.push(u.id); }
  if (orgIds.length) {
    if (userIds.length) must(await admin.from("profiles").update({ organization_id: null, worker_id: null, project_ids: null }).in("id", userIds), "unlink profiles");
    const order = [
      "swms_signatures", "swms_revisions", "toolbox_signatures", "induction_completions", "quiz_attempts",
      "compliance_documents", "company_documents", "record_photos", "project_documents", "site_checkins",
      "corrective_actions", "incidents", "diary_entries", "toolbox_meetings", "project_risks", "swms_templates",
      "workers", "subbie_companies", "projects", "policies", "invites", "quiz_questions", "audit_log", "security_audit", "presence_heartbeats",
    ];
    for (const t of order) {
      const r = await admin.from(t).delete().in("organization_id", orgIds);
      if (r.error) warn(`delete ${t}: ${r.error.message}`);
    }
    const r = await admin.from("organizations").delete().in("id", orgIds);
    if (r.error) warn(`delete organizations: ${r.error.message}`); else log(`Deleted ${orgIds.length} organisation(s)`);
  }
  for (const id of userIds) { const r = await admin.auth.admin.deleteUser(id); if (r.error) warn(`delete user: ${r.error.message}`); }
  log(`Deleted ${userIds.length} auth user(s)`);
}

async function seed() {
  const b = await ensureBuilderOrg(email("builder"), "Bree Builder", ORG_NAME);
  const builder = await asUser(email("builder"));
  const orgId = b.org.id;

  const hse = await ensureStaff(builder, orgId, email("hse"), "Harper HSE", "hse_manager");
  const sup = await ensureStaff(builder, orgId, email("supervisor"), "Sunny Supervisor", "site_supervisor");

  const p1 = await ensureProject(builder, orgId, "QA Alpha House");
  const p2 = await ensureProject(builder, orgId, "QA Bravo Townhouses");
  must(await builder.rpc("set_user_projects", { p_user: sup.user.id, p_projects: [p1.id] }), "assign supervisor");
  log(`Supervisor assigned to project #${p1.id}`);

  const w1 = await ensureWorker(builder, orgId, p1.id, "Quentin Tradie", "Carpenter", "QA Carpentry", email("tradie"));
  const w2 = await ensureWorker(builder, orgId, p1.id, "Wendy Sparky", "Electrician", "QA Electrical");
  const tradie = await ensureTradie(w1, email("tradie"), "Quentin Tradie");
  await ensureQuiz(builder, orgId);

  const o = await ensureBuilderOrg(email("other-builder"), "Otto Other", OTHER_ORG_NAME);
  const other = await asUser(email("other-builder"));
  const op = await ensureProject(other, o.org.id, "QA Other Project");

  const out = {
    url: URL, password: PASSWORD, createdAt: new Date().toISOString(),
    org: { id: orgId, name: ORG_NAME },
    otherOrg: { id: o.org.id, name: OTHER_ORG_NAME, projectId: op.id, builderUserId: o.user.id },
    accounts: {
      builder: { email: email("builder"), userId: b.user.id },
      hse: { email: email("hse"), userId: hse.user.id },
      supervisor: { email: email("supervisor"), userId: sup.user.id },
      tradie: { email: email("tradie"), userId: tradie.user.id, workerId: w1.id, trade: "Carpenter" },
      otherBuilder: { email: email("other-builder"), userId: o.user.id },
    },
    projects: { assigned: p1.id, unassigned: p2.id },
    workers: { tradie: w1.id, other: w2.id },
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\nIndustry regression seed ready (password for all: ${PASSWORD})`);
  for (const [k, v] of Object.entries(out.accounts)) console.log(`  ${k.padEnd(13)} ${v.email}`);
  console.log(`  org #${orgId} projects ${p1.id} (assigned) / ${p2.id}; other org #${o.org.id} project ${op.id}`);
  console.log(`Written to ${OUT}`);
}

try {
  if (RESET) await reset(); else await seed();
} catch (e) {
  console.error("FAILED:", e.message);
  process.exit(1);
}
