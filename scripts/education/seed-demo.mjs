#!/usr/bin/env node
// ============================================================================
// OHS Builder Education — demo seed
//
// Creates ONE isolated demo institution ("Demo Training Institute",
// is_demo = true) with an institution admin, an assessor and six students in
// different states, using the REAL product paths wherever the product has
// one (invite → accept → sandbox provisioning → records created as the
// student under RLS → submit → assess). Never touches any other organisation.
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
//     node scripts/education/seed-demo.mjs            # create / top-up
//     node scripts/education/seed-demo.mjs --reset    # remove the demo again
//
// Optional: SEED_PASSWORD (default Demo!Edu2026), SEED_EMAIL_DOMAIN
// (default example.edu.au), SEED_PREFIX (default edu-demo), APP_ORIGIN.
// Writes scripts/education/seed-output.local.json (git-ignored) with the
// accounts the isolation tests sign in as.
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
const PREFIX = env.SEED_PREFIX || "edu-demo";
const ORIGIN = env.APP_ORIGIN || "http://localhost:5173";
const RESET = process.argv.includes("--reset");
const INSTITUTION_NAME = "Demo Training Institute";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "seed-output.local.json");

if (!URL || !ANON || !SERVICE) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const email = (who) => `${PREFIX}-${who}@${DOMAIN}`;
const log = (...a) => console.log("•", ...a);
const warn = (...a) => console.warn("!", ...a);

function must(res, what) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

// Signed-in anon client for one user (RLS applies — exactly what the app does).
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
    // Keep the password known so the tests can sign in.
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: mail, password: PASSWORD, email_confirm: true, user_metadata: { name },
  });
  if (error) throw new Error(`createUser ${mail}: ${error.message}`);
  return data.user;
}

async function membership(instId, mail, role) {
  return must(
    await admin.from("edu_memberships").select("*").eq("institution_id", instId).eq("email", mail).eq("edu_role", role).maybeSingle(),
    "read membership"
  );
}

async function acceptIfInvited(instId, mail, role, name) {
  const m = await membership(instId, mail, role);
  if (!m) throw new Error(`no ${role} membership for ${mail}`);
  await ensureAuthUser(mail, name);
  if (m.status === "active") return m;
  const c = await asUser(mail);
  must(await c.rpc("edu_accept_invite", { p_token: m.invite_token }), `accept invite ${mail}`);
  return membership(instId, mail, role);
}

// ---------------------------------------------------------------------------
// Evidence builders — run AS THE STUDENT (RLS + triggers + defaults apply).
// ---------------------------------------------------------------------------
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function buildProject(c, orgId) {
  const existing = must(await c.from("projects").select("*").eq("organization_id", orgId).order("id").limit(1), "projects");
  if (existing.length) return existing[0];
  return must(
    await c.from("projects").insert({
      name: "Riverside Apartments",
      address: "14-18 Creekside Drive, Riverside VIC 3099",
      status: "Active",
      contract_type: "Lump Sum",
      contract_value: 18400000,
      project_manager: "Site Manager (student)",
      start_date: daysAhead(14),
      induction: {
        rules: "Site hours 7:00am-4:00pm, no noisy work before 7 or on Sundays. One gate only (north-west corner) - sign in on the QR poster every day. Deliveries through the gate, never queue on Creekside Drive. Keep 3 m off the creek bank. Hard hat, hi-vis, boots and glasses at all times. Overhead power lines at the frontage - no tipping trucks or raised loads near the gate.",
        musterPoint: "Nature strip outside the site gate, Creekside Drive",
        contactName: "Site Manager",
        contactPhone: "0400 000 000",
      },
    }).select().single(),
    "create project"
  );
}

const RISKS = [
  ["Basement excavation to 3.2 m beside Merri Creek - collapse / inundation", "Excavation", 4, 5, "Engineered shoring to geotech design; daily inspection of batters; exclusion zone 2 m from edge; dewatering plan; no spoil within 5 m of creek", 2, 4, "Controlled"],
  ["Tower crane lifting over Creekside Drive and neighbouring houses", "Plant & equipment", 3, 5, "Lift plan and exclusion zones; no lifts over occupied houses; traffic management for road lifts; certified dogman", 2, 4, "Controlled"],
  ["Overhead 22 kV lines 1.2 m outside the front boundary", "Electrical", 3, 5, "Tiger tails and goal posts at the gate; no raised tray / boom within 3 m; spotter for every delivery", 1, 5, "Controlled"],
  ["Live traffic and school bus route at the single gate", "Traffic", 3, 4, "Traffic management plan; gate person 8-9am and 3-4pm; no deliveries in bus windows", 2, 3, "Controlled"],
  ["Silica dust from concrete cutting and masonry", "Hazardous substances", 4, 4, "Wet cutting and on-tool extraction; P2 respirators; exclusion of others during cutting", 2, 3, "Controlled"],
  ["Falls from height - formwork and slab edges from level 2 up", "Working at height", 4, 5, "Perimeter screens / edge protection before the slab is struck; harness zones with anchors; void covers", 2, 4, "Controlled"],
  ["Noise and dust affecting neighbours 1.5 m from the hoarding", "Environment", 4, 2, "Hoarding with dust mesh; water cart; council hours observed; neighbour letter drop", 3, 1, "Controlled"],
  ["Extension leads across corridors during fit-out (trip, electric shock)", "Electrical", 3, 3, "Lead stands and covers; tag & test; RCD boards", 2, 2, "Open"],
  ["Concrete pump hose whip / line blockage", "Plant & equipment", 2, 4, "", null, null, "Open"],
];

async function buildRisks(c, orgId, projectId, withReviewDates) {
  const have = must(await c.from("project_risks").select("id").eq("organization_id", orgId), "risks");
  if (have.length >= 8) return;
  const rows = RISKS.map(([hazard, category, l, k, controls, rl, rk, status], i) => ({
    project_id: projectId, hazard, category, likelihood: l, consequence: k, controls,
    residual_likelihood: rl, residual_consequence: rk, status,
    review_date: withReviewDates && i < 6 ? daysAhead(30) : null,
    source: "manual",
  }));
  must(await c.from("project_risks").insert(rows), "insert risks");
}

const CREW = [
  ["Sam Okafor", "Formworker", "MasterForm Pty Ltd"],
  ["Kelly Tran", "Crane Operator", "Skyline Cranes"],
  ["Liam Brooks", "Electrician", "BrightSpark Electrical"],
];

async function ensureTemplate(c, orgId, trade, required) {
  const existing = must(await c.from("swms_templates").select("*").eq("organization_id", orgId).eq("trade", trade).maybeSingle(), "template");
  if (existing) return existing;
  const ref = `SWMS-${trade.replace(/[^A-Za-z]+/g, "").slice(0, 8).toUpperCase()}-E${orgId}`;
  return must(
    await c.from("swms_templates").insert({
      trade, ref, version: "v1.0", signed: 0, total: required, status: "Pending",
      legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic)",
    }).select().single(),
    "insert template"
  );
}

async function buildCrew(c, orgId, projectId, extra = []) {
  const all = [...CREW, ...extra];
  const workers = [];
  for (const [name, trade, employer] of all) {
    let w = must(await c.from("workers").select("*").eq("organization_id", orgId).eq("name", name).maybeSingle(), "worker");
    if (!w) {
      w = must(await c.from("workers").insert({ name, trade, employer, project_id: projectId }).select().single(), `insert worker ${name}`);
    }
    await ensureTemplate(c, orgId, trade, 1);
    workers.push(w);
  }
  return workers;
}

async function recordInduction(c, worker) {
  const have = must(await c.from("induction_completions").select("id").eq("worker_id", worker.id), "inductions");
  if (have.length) return;
  must(await c.rpc("record_compliance_signoff", { p_worker_id: worker.id, p_category: "induction", p_value: "Verified", p_note: "Inducted at the gate (demo)" }), "record induction");
}

async function signSwms(c, orgId, worker) {
  const t = must(await c.from("swms_templates").select("*").eq("organization_id", orgId).eq("trade", worker.trade).maybeSingle(), "template for sign");
  if (!t) return;
  must(await c.rpc("sign_swms_v2", { p_template_id: t.id, p_signed_name: worker.name, p_worker_id: worker.id }), `sign swms ${worker.name}`);
}

async function buildIncident(c, orgId, projectId) {
  const have = must(await c.from("incidents").select("id").eq("organization_id", orgId), "incidents");
  let inc = have[0];
  if (!inc) {
    inc = must(
      await c.from("incidents").insert({
        type: "Injury / Illness", severity: "Minor", project_id: projectId, date: today(), status: "Investigating",
        description: "Apprentice Jordan Pike tripped over an extension lead across the level 1 corridor near the lift core; grazed palm and sore right wrist. First aid on site.",
        reported_by: "Site Manager (student)", location: "Level 1 corridor, lift core", involved: "Jordan Pike (MasterForm apprentice)",
        immediate_action: "First aid given; lead removed and area cleared; formwork crew told to use lead stands.",
        notifiable: false, lost_time: false,
      }).select().single(),
      "insert incident"
    );
  }
  const acts = must(await c.from("corrective_actions").select("id").eq("incident_id", inc.id), "actions");
  if (!acts.length) {
    must(await c.from("corrective_actions").insert([
      { incident_id: inc.id, description: "Issue lead stands and cable covers to every crew; no leads across walkways", assigned_to: "Sam Okafor (MasterForm)", due: daysAhead(3), status: "In Progress" },
      { incident_id: inc.id, description: "Raise lead management at next toolbox; add to site induction", assigned_to: "Site Manager", due: daysAhead(7), status: "Open" },
    ]), "insert actions");
  }
  return inc;
}

async function buildToolbox(c, orgId, projectId, workers) {
  const have = must(await c.from("toolbox_meetings").select("id").eq("organization_id", orgId), "toolbox");
  let m = have[0];
  if (!m) {
    m = must(
      await c.from("toolbox_meetings").insert({
        project_id: projectId, topic: "Trip incident & lead management; crane lifts this week", date: today(), presenter: "Site Manager (student)",
        attendees: workers.length, total: workers.length, duration: "15 min",
        points: ["Incident on level 1 - leads across walkways", "Lead stands and covers from today", "Crane exclusion zones for Thursday lifts", "Report every near miss"],
      }).select().single(),
      "insert toolbox"
    );
  }
  const sigs = must(await c.from("toolbox_signatures").select("id").eq("meeting_id", m.id), "tb sigs");
  if (sigs.length < 2) {
    for (const w of workers.slice(0, 2)) {
      must(await c.rpc("record_toolbox_attendance", { p_meeting_id: m.id, p_worker_id: w.id, p_signed_name: w.name }), `attendance ${w.name}`);
    }
  }
}

async function buildDiary(c, orgId, projectId) {
  const have = must(await c.from("diary_entries").select("id").eq("organization_id", orgId), "diary");
  if (have.length >= 2) return;
  must(await c.from("diary_entries").insert([
    { project_id: projectId, date: daysAgo(1), weather: "Partly cloudy", wind: "Light", labour: 9, hours: 8, author: "Site Manager (student)", tags: ["Subcontractor", "Delivery"],
      notes: "Hydro-Flow crew arrived without an acceptable SWMS for the services trench. Work held until SWMS reviewed and signed by the crew. Deliveries rescheduled out of the bus window." },
    { project_id: projectId, date: today(), weather: "Sunny", wind: "Moderate", labour: 11, hours: 8, author: "Site Manager (student)", tags: ["Inspection"],
      notes: "Walk-through after the trip incident: leads now on stands in level 1; shoring inspected and tagged; crane exclusion zone taped; goal posts under the power lines at the gate intact; housekeeping acceptable. Risk register reviewed." },
  ]), "insert diary");
}

// The full ten-stage evidence set (stage 10 is the submission itself).
async function buildFullEvidence(c, orgId) {
  const project = await buildProject(c, orgId);
  await buildRisks(c, orgId, project.id, true);
  const workers = await buildCrew(c, orgId, project.id, [["Dean Walsh", "Plumber", "Hydro-Flow Plumbing"]]);
  await recordInduction(c, workers[0]);
  await signSwms(c, orgId, workers[0]);                       // formworker
  await signSwms(c, orgId, workers.find((w) => w.trade === "Plumber")); // plumber
  await buildIncident(c, orgId, project.id);
  await buildToolbox(c, orgId, project.id, workers);
  await buildDiary(c, orgId, project.id);
  must(await c.rpc("edu_my_progress"), "progress");
}

async function buildPartialEvidence(c, orgId) {
  const project = await buildProject(c, orgId);
  await buildRisks(c, orgId, project.id, false);
  const workers = await buildCrew(c, orgId, project.id);
  await recordInduction(c, workers[0]);
  must(await c.rpc("edu_my_progress"), "progress");
}

async function submit(c) {
  const home = must(await c.rpc("edu_student_home"), "student home");
  if ((home.submissions || []).length) return home.submissions[0];
  must(await c.rpc("edu_submit_for_assessment", { p_note: "Demo submission" }), "submit");
  const again = must(await c.rpc("edu_student_home"), "student home");
  return again.submissions[0];
}

async function assess(assessorClient, enrolmentId, outcome) {
  const bundle = must(await assessorClient.rpc("edu_review_bundle", { p_enrolment: enrolmentId }), "review bundle");
  const sub = (bundle.submissions || [])[0];
  if (!sub) throw new Error("no submission to assess");
  if (sub.status === "completed" || sub.status === "returned_nys") return sub;
  const mapped = [...new Set((bundle.mappings?.rows || []).map((m) => m.criterionId))];
  const criteria = (bundle.unit?.criteria || []).filter((cr) => !mapped.length || mapped.includes(cr.id));
  const nysCodes = outcome === "returned_nys" ? ["3.3", "4.3"] : [];
  for (const cr of criteria) {
    const nys = nysCodes.includes(cr.code);
    must(await assessorClient.rpc("edu_record_result", {
      p_submission: sub.id, p_criterion: cr.id,
      p_result: nys ? "not_yet_satisfactory" : "satisfactory",
      p_comment: nys
        ? (cr.code === "3.3"
          ? "Controls are listed but several High risks have no residual rating and the concrete pump hazard has no controls at all. Record the controls and the residual L x C for every High/Extreme hazard."
          : "The incident has corrective actions but neither has been progressed or closed. Update the action status (and close the incident once the lead-management action is done).")
        : `Evidence sighted in the ${cr.evidenceHint || "submitted records"}.`,
    }), `record result ${cr.code}`);
  }
  must(await assessorClient.rpc("edu_finalise_assessment", {
    p_submission: sub.id, p_outcome: outcome,
    p_comment: outcome === "completed"
      ? "Well done - a complete, joined-up WHS system for Riverside. Good handling of both site events."
      : "Good progress. Two criteria need more evidence - see the comments, fix the records on your site and resubmit.",
  }), "finalise");
  return sub;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
async function reset() {
  const inst = must(await admin.from("edu_institutions").select("id, name").eq("name", INSTITUTION_NAME).eq("is_demo", true).maybeSingle(), "find demo institution");
  if (!inst) { log("No demo institution found — nothing to reset."); return; }
  const members = must(await admin.from("edu_memberships").select("id, user_id, email").eq("institution_id", inst.id), "members");
  const enrolments = must(await admin.from("edu_enrolments").select("id, sandbox_org_id").eq("institution_id", inst.id), "enrolments");
  const orgIds = enrolments.map((e) => e.sandbox_org_id).filter(Boolean);
  const userIds = members.map((m) => m.user_id).filter(Boolean);

  // Education rows (results/submissions are RESTRICT; everything else cascades from the institution).
  const subs = must(await admin.from("edu_submissions").select("id").eq("institution_id", inst.id), "subs");
  if (subs.length) {
    must(await admin.from("edu_assessment_results").delete().in("submission_id", subs.map((s) => s.id)), "del results");
    must(await admin.from("edu_submissions").delete().eq("institution_id", inst.id), "del submissions");
  }
  if (orgIds.length) {
    must(await admin.from("organizations").update({ edu_enrolment_id: null }).in("id", orgIds), "unlink orgs");
  }
  must(await admin.from("edu_institutions").delete().eq("id", inst.id), "del institution");
  log(`Deleted institution #${inst.id} and its Education rows.`);

  if (orgIds.length) {
    if (userIds.length) must(await admin.from("profiles").update({ organization_id: null }).in("id", userIds), "unlink profiles");
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
    if (r.error) warn(`delete organizations: ${r.error.message}`); else log(`Deleted ${orgIds.length} sandbox organisation(s).`);
  }
  for (const m of members) {
    const u = m.user_id ? { id: m.user_id } : await findAuthUser(m.email);
    if (!u) continue;
    const r = await admin.auth.admin.deleteUser(u.id);
    if (r.error) warn(`delete user ${m.email}: ${r.error.message}`); else log(`Deleted auth user ${m.email}`);
  }
  // Users created for students whose membership was already gone (re-runs).
  for (const who of ["admin", "assessor", "student1", "student2", "student3", "student4", "student5", "student6"]) {
    const u = await findAuthUser(email(who));
    if (u) { await admin.auth.admin.deleteUser(u.id); log(`Deleted auth user ${email(who)}`); }
  }
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  // 0. Library rows (migration 023 must be applied)
  const qual = must(await admin.from("edu_qualifications").select("id").is("institution_id", null).eq("code", "CPC40120").maybeSingle(), "qualification");
  const unit = must(await admin.from("edu_units").select("id").is("institution_id", null).eq("code", "CPCCBC4002").maybeSingle(), "unit");
  const scenario = must(await admin.from("edu_scenarios").select("id").is("institution_id", null).eq("code", "RIVERSIDE").maybeSingle(), "scenario");
  if (!qual || !unit || !scenario) throw new Error("Library rows missing — apply migration 023 first.");

  // 1. Institution + first admin membership (what edu_create_institution does, minus the platform-admin session)
  let inst = must(await admin.from("edu_institutions").select("*").eq("name", INSTITUTION_NAME).eq("is_demo", true).maybeSingle(), "institution");
  if (!inst) {
    inst = must(await admin.from("edu_institutions").insert({
      name: INSTITUTION_NAME, is_demo: true, legal_name: "Demo Training Institute Pty Ltd", rto_number: "00000",
      website: "https://example.edu.au", address: "1 Training Way, Melbourne VIC 3000",
      contact_name: "Dana Whitfield", contact_email: email("admin"), support_email: email("admin"),
      department: "Building & Construction", campus: "Melbourne City", primary_colour: "#0f766e", secondary_colour: "#f59e0b",
    }).select().single(), "insert institution");
    log(`Created institution #${inst.id} ${inst.name}`);
  } else log(`Institution #${inst.id} exists`);
  if (!(await membership(inst.id, email("admin"), "institution_admin"))) {
    must(await admin.from("edu_memberships").insert({ institution_id: inst.id, edu_role: "institution_admin", name: "Dana Whitfield", email: email("admin") }), "insert admin membership");
  }
  await acceptIfInvited(inst.id, email("admin"), "institution_admin", "Dana Whitfield");
  const adminClient = await asUser(email("admin"));
  log("Institution admin active");

  // 2. Program + cohort (as the admin, through RLS)
  let program = must(await adminClient.from("edu_programs").select("*").eq("institution_id", inst.id).eq("name", "CPCCBC4002 — Semester 1 Demo").maybeSingle(), "program");
  if (!program) {
    program = must(await adminClient.from("edu_programs").insert({
      institution_id: inst.id, name: "CPCCBC4002 — Semester 1 Demo", qualification_id: qual.id, unit_id: unit.id,
      intake: "Semester 1 2026", campus: "Melbourne City", department: "Building & Construction",
    }).select().single(), "insert program");
  }
  let cohort = must(await adminClient.from("edu_cohorts").select("*").eq("institution_id", inst.id).eq("name", "Semester 1 — Demo").maybeSingle(), "cohort");
  if (!cohort) {
    cohort = must(await adminClient.from("edu_cohorts").insert({
      institution_id: inst.id, program_id: program.id, name: "Semester 1 — Demo", start_date: daysAgo(21), end_date: daysAhead(90),
      campus: "Melbourne City", expected_students: 6, scenario_id: scenario.id, status: "active",
    }).select().single(), "insert cohort");
  }
  log(`Program #${program.id}, cohort #${cohort.id}`);

  // 3. Assessor: invite (real RPC), accept (real RPC), assign
  if (!(await membership(inst.id, email("assessor"), "assessor"))) {
    must(await adminClient.rpc("edu_invite_member", { p_institution: inst.id, p_role: "assessor", p_name: "Marcus Doyle", p_email: email("assessor"), p_cohort_ids: [cohort.id] }), "invite assessor");
  }
  const assessorM = await acceptIfInvited(inst.id, email("assessor"), "assessor", "Marcus Doyle");
  must(await adminClient.rpc("edu_assign_assessor", { p_cohort: cohort.id, p_membership: assessorM.id, p_assign: true }), "assign assessor");
  const assessorClient = await asUser(email("assessor"));
  log("Assessor active and assigned");

  // 4. Students: enrol (real RPC)
  const studentNames = { student1: "Ava Nguyen", student2: "Ben Carter", student3: "Chloe Dimitriou", student4: "Dev Patel", student5: "Ella Hoang", student6: "Finn O'Brien" };
  const who = Object.keys(studentNames);
  must(await adminClient.rpc("edu_add_students", { p_cohort: cohort.id, p_students: who.map((w) => ({ name: studentNames[w], email: email(w) })) }), "add students");

  const out = { url: URL, institutionId: inst.id, cohortId: cohort.id, password: PASSWORD, accounts: { admin: { email: email("admin"), membershipId: null }, assessor: { email: email("assessor"), membershipId: assessorM.id }, students: [] } };
  const adminM = await membership(inst.id, email("admin"), "institution_admin");
  out.accounts.admin.membershipId = adminM.id;

  const enrolmentFor = async (mail) => {
    const m = await membership(inst.id, mail, "student");
    return { m, e: must(await admin.from("edu_enrolments").select("*").eq("membership_id", m.id).eq("cohort_id", cohort.id).maybeSingle(), "enrolment") };
  };

  for (const w of who) {
    const mail = email(w);
    const target = { student1: "invited", student2: "not_started", student3: "in_progress", student4: "ready_for_assessment", student5: "completed", student6: "action_required" }[w];
    try {
      if (target === "invited") {
        const { m, e } = await enrolmentFor(mail);
        out.accounts.students.push({ who: w, name: studentNames[w], email: mail, enrolmentId: e.id, status: e.status, inviteLink: m.invite_token ? `${ORIGIN}/edu/join/${m.invite_token}` : null, accepted: m.status === "active" });
        log(`${w}: left invited`);
        continue;
      }
      await acceptIfInvited(inst.id, mail, "student", studentNames[w]);
      let { e } = await enrolmentFor(mail);
      const c = await asUser(mail);
      if (target !== "not_started") {
        if (target === "in_progress") await buildPartialEvidence(c, e.sandbox_org_id);
        else await buildFullEvidence(c, e.sandbox_org_id);
      }
      if (target === "ready_for_assessment" || target === "completed" || target === "action_required") {
        await submit(c);
      }
      if (target === "completed") await assess(assessorClient, e.id, "completed");
      if (target === "action_required") await assess(assessorClient, e.id, "returned_nys");
      ({ e } = await enrolmentFor(mail));
      out.accounts.students.push({ who: w, name: studentNames[w], email: mail, enrolmentId: e.id, sandboxOrgId: e.sandbox_org_id, status: e.status, accepted: true });
      log(`${w}: ${e.status}${e.sandbox_org_id ? ` (sandbox org #${e.sandbox_org_id})` : ""}`);
    } catch (err) {
      warn(`${w}: ${err.message}`);
      out.accounts.students.push({ who: w, name: studentNames[w], email: mail, error: err.message });
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log("\n=== Demo accounts (password for all: " + PASSWORD + ") ===");
  console.log(`Institution admin  ${email("admin")}`);
  console.log(`Assessor           ${email("assessor")}`);
  for (const s of out.accounts.students) {
    console.log(`Student ${s.who.padEnd(9)} ${s.email.padEnd(40)} ${s.status || s.error}${s.inviteLink ? `  invite: ${s.inviteLink}` : ""}`);
  }
  console.log(`\nWritten to ${OUT}`);
  console.log(`Sign in at ${ORIGIN}/login → each account is routed to its Education home.`);
}

(RESET ? reset() : seed()).catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
