// ============================================================================
// OHS Builder Education — data layer
// Every Education query and RPC lives here. The client only ever names ids;
// all decisions (who may see what, provisioning a sandbox, recording an
// assessment) are re-checked inside SECURITY DEFINER functions in the DB
// (supabase/migrations/022_education_rpcs.sql).
// ============================================================================
import { supabase } from "./supabase";
import { rowMappers, dbFail as fail, safeName } from "./api";

export const EDU_BRANDING_BUCKET = "edu-branding";

// Explicit column list — invite tokens are never selectable through the
// table (migration 022 revokes them); "*" would 42501.
const MEMBERSHIP_COLS =
  "id, institution_id, user_id, edu_role, name, email, status, accepted_at, last_login, created_at";

const mapMembership = (r) => ({
  id: r.id,
  institutionId: r.institution_id,
  userId: r.user_id,
  role: r.edu_role,
  name: r.name,
  email: r.email,
  status: r.status,
  acceptedAt: r.accepted_at,
  lastLogin: r.last_login,
  createdAt: r.created_at,
});

const mapInstitution = (r) => ({
  id: r.id,
  name: r.name,
  legalName: r.legal_name || "",
  rtoNumber: r.rto_number || "",
  website: r.website || "",
  address: r.address || "",
  contactName: r.contact_name || "",
  contactEmail: r.contact_email || "",
  supportEmail: r.support_email || "",
  department: r.department || "",
  campus: r.campus || "",
  logoUrl: r.logo_url || "",
  primaryColour: r.primary_colour || "#1e3a8a",
  secondaryColour: r.secondary_colour || "#fbbf24",
  status: r.status,
  isDemo: !!r.is_demo,
  onboarding: r.onboarding || {},
  createdAt: r.created_at,
});

const mapProgram = (r) => ({
  id: r.id,
  institutionId: r.institution_id,
  name: r.name,
  qualificationId: r.qualification_id,
  unitId: r.unit_id,
  intake: r.intake || "",
  campus: r.campus || "",
  department: r.department || "",
  status: r.status,
  createdAt: r.created_at,
});

const mapCohort = (r) => ({
  id: r.id,
  institutionId: r.institution_id,
  programId: r.program_id,
  name: r.name,
  startDate: r.start_date,
  endDate: r.end_date,
  campus: r.campus || "",
  expectedStudents: r.expected_students || 0,
  scenarioId: r.scenario_id,
  status: r.status,
  createdAt: r.created_at,
});

const mapEnrolment = (r) => ({
  id: r.id,
  institutionId: r.institution_id,
  cohortId: r.cohort_id,
  membershipId: r.membership_id,
  name: r.student_name,
  email: r.student_email,
  status: r.status,
  sandboxOrgId: r.sandbox_org_id,
  startedAt: r.started_at,
  submittedAt: r.submitted_at,
  completedAt: r.completed_at,
  createdAt: r.created_at,
});

export const eduJoinLink = (token) => `${window.location.origin}/edu/join/${token}`;

async function rpc(name, args, action) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) fail(error, action);
  return data;
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------
export const fetchEduInviteInfo = (token) => rpc("edu_invite_info", { p_token: token }, "Loading invitation");
export const acceptEduInvite = (token) => rpc("edu_accept_invite", { p_token: token }, "Joining your institution");

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------
export const fetchPlatformInstitutions = () => rpc("edu_platform_institutions", {}, "Loading institutions");
export const createInstitution = ({ name, adminName, adminEmail, isDemo = false }) =>
  rpc("edu_create_institution", { p_name: name, p_admin_name: adminName, p_admin_email: adminEmail, p_is_demo: !!isDemo }, "Creating institution");

// ---------------------------------------------------------------------------
// Institution admin
// ---------------------------------------------------------------------------
export const fetchInstitutionOverview = (institutionId) =>
  rpc("edu_institution_overview", { p_institution: institutionId }, "Loading your institution");

export async function updateInstitution(id, patch) {
  const row = {};
  const map = {
    name: "name", legalName: "legal_name", rtoNumber: "rto_number", website: "website", address: "address",
    contactName: "contact_name", contactEmail: "contact_email", supportEmail: "support_email",
    department: "department", campus: "campus", logoUrl: "logo_url",
    primaryColour: "primary_colour", secondaryColour: "secondary_colour", onboarding: "onboarding",
  };
  for (const [k, col] of Object.entries(map)) {
    if (patch[k] !== undefined) row[col] = typeof patch[k] === "string" ? patch[k].trim() : patch[k];
  }
  const { data, error } = await supabase.from("edu_institutions").update(row).eq("id", id).select().single();
  if (error) fail(error, "Saving institution");
  return mapInstitution(data);
}

export async function uploadInstitutionLogo(institutionId, file) {
  const path = `${institutionId}/logo-${Date.now()}-${safeName(file.name)}`;
  const up = await supabase.storage
    .from(EDU_BRANDING_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (up.error) fail(up.error, "Uploading logo");
  const { data: pub } = supabase.storage.from(EDU_BRANDING_BUCKET).getPublicUrl(path);
  const url = pub?.publicUrl || "";
  await updateInstitution(institutionId, { logoUrl: url });
  return url;
}

export async function fetchLibrary() {
  const [q, u, c, s, st] = await Promise.all([
    supabase.from("edu_qualifications").select("*").order("code"),
    supabase.from("edu_units").select("*").eq("active", true).order("code"),
    supabase.from("edu_unit_criteria").select("*").order("position"),
    supabase.from("edu_scenarios").select("*").eq("active", true).order("title"),
    supabase.from("edu_scenario_stages").select("id, scenario_id, position, code, title, objective, feature_label, evidence_label").order("position"),
  ]);
  for (const r of [q, u, c, s, st]) if (r.error) fail(r.error, "Loading the training library");
  return {
    qualifications: (q.data || []).map((r) => ({ id: r.id, institutionId: r.institution_id, code: r.code, title: r.title })),
    units: (u.data || []).map((r) => ({
      id: r.id, institutionId: r.institution_id, qualificationId: r.qualification_id, code: r.code, title: r.title,
      release: r.release || "", sourceNote: r.source_note || "",
      criteria: (c.data || []).filter((x) => x.unit_id === r.id).map((x) => ({
        id: x.id, code: x.code, element: x.element, text: x.text, evidenceHint: x.evidence_hint, position: x.position,
      })),
    })),
    scenarios: (s.data || []).map((r) => ({
      id: r.id, institutionId: r.institution_id, code: r.code, title: r.title, summary: r.summary, description: r.description,
      projectBrief: r.project_brief || {}, studentRole: r.student_role, supportingDocs: r.supporting_docs || [],
      stages: (st.data || []).filter((x) => x.scenario_id === r.id).map((x) => ({
        id: x.id, code: x.code, position: x.position, title: x.title, objective: x.objective,
        featureLabel: x.feature_label, evidenceLabel: x.evidence_label,
      })),
    })),
  };
}

// Institution-owned curriculum rows (for qualifications/units not in the library).
export async function insertQualification({ institutionId, code, title }) {
  const { data, error } = await supabase
    .from("edu_qualifications")
    .insert({ institution_id: institutionId, code: (code || "").trim(), title: (title || "").trim() })
    .select()
    .single();
  if (error) fail(error, "Adding qualification");
  return { id: data.id, institutionId: data.institution_id, code: data.code, title: data.title };
}

export async function insertUnit({ institutionId, qualificationId, code, title }) {
  const { data, error } = await supabase
    .from("edu_units")
    .insert({ institution_id: institutionId, qualification_id: qualificationId || null, code: (code || "").trim(), title: (title || "").trim() })
    .select()
    .single();
  if (error) fail(error, "Adding unit");
  return { id: data.id, institutionId: data.institution_id, qualificationId: data.qualification_id, code: data.code, title: data.title, criteria: [] };
}

export async function fetchPrograms(institutionId) {
  const { data, error } = await supabase.from("edu_programs").select("*").eq("institution_id", institutionId).order("id");
  if (error) fail(error, "Loading programs");
  return (data || []).map(mapProgram);
}

export async function insertProgram(p) {
  const { data, error } = await supabase
    .from("edu_programs")
    .insert({
      institution_id: p.institutionId,
      name: (p.name || "").trim(),
      qualification_id: p.qualificationId || null,
      unit_id: p.unitId || null,
      intake: p.intake || "",
      campus: p.campus || "",
      department: p.department || "",
    })
    .select()
    .single();
  if (error) fail(error, "Creating program");
  return mapProgram(data);
}

export async function updateProgram(id, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.qualificationId !== undefined) row.qualification_id = patch.qualificationId || null;
  if (patch.unitId !== undefined) row.unit_id = patch.unitId || null;
  if (patch.intake !== undefined) row.intake = patch.intake;
  if (patch.campus !== undefined) row.campus = patch.campus;
  if (patch.department !== undefined) row.department = patch.department;
  if (patch.status !== undefined) row.status = patch.status;
  const { data, error } = await supabase.from("edu_programs").update(row).eq("id", id).select().single();
  if (error) fail(error, "Updating program");
  return mapProgram(data);
}

export async function fetchCohorts(institutionId) {
  const { data, error } = await supabase.from("edu_cohorts").select("*").eq("institution_id", institutionId).order("id");
  if (error) fail(error, "Loading cohorts");
  return (data || []).map(mapCohort);
}

export async function insertCohort(c) {
  const { data, error } = await supabase
    .from("edu_cohorts")
    .insert({
      institution_id: c.institutionId,
      program_id: c.programId,
      name: (c.name || "").trim(),
      start_date: c.startDate || null,
      end_date: c.endDate || null,
      campus: c.campus || "",
      expected_students: Number(c.expectedStudents) || 0,
      scenario_id: c.scenarioId || null,
      status: c.status || "planned",
    })
    .select()
    .single();
  if (error) fail(error, "Creating cohort");
  return mapCohort(data);
}

export async function updateCohort(id, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.startDate !== undefined) row.start_date = patch.startDate || null;
  if (patch.endDate !== undefined) row.end_date = patch.endDate || null;
  if (patch.campus !== undefined) row.campus = patch.campus;
  if (patch.expectedStudents !== undefined) row.expected_students = Number(patch.expectedStudents) || 0;
  if (patch.scenarioId !== undefined) row.scenario_id = patch.scenarioId || null;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.programId !== undefined) row.program_id = patch.programId;
  const { data, error } = await supabase.from("edu_cohorts").update(row).eq("id", id).select().single();
  if (error) fail(error, "Updating cohort");
  return mapCohort(data);
}

export async function fetchMemberships(institutionId, role = null) {
  let q = supabase.from("edu_memberships").select(MEMBERSHIP_COLS).eq("institution_id", institutionId).order("name");
  if (role) q = q.eq("edu_role", role);
  const { data, error } = await q;
  if (error) fail(error, "Loading people");
  return (data || []).map(mapMembership);
}

export async function fetchCohortAssessors(institutionId) {
  const { data, error } = await supabase
    .from("edu_cohort_assessors")
    .select("cohort_id, membership_id, assigned_at, edu_cohorts!inner(institution_id)")
    .eq("edu_cohorts.institution_id", institutionId);
  if (error) fail(error, "Loading assessor assignments");
  return (data || []).map((r) => ({ cohortId: r.cohort_id, membershipId: r.membership_id, assignedAt: r.assigned_at }));
}

export async function fetchEnrolments(institutionId) {
  const { data, error } = await supabase
    .from("edu_enrolments")
    .select("*")
    .eq("institution_id", institutionId)
    .neq("status", "withdrawn")
    .order("student_name");
  if (error) fail(error, "Loading students");
  return (data || []).map(mapEnrolment);
}

export const inviteMember = ({ institutionId, role, name, email, cohortIds = [] }) =>
  rpc("edu_invite_member", { p_institution: institutionId, p_role: role, p_name: name, p_email: email, p_cohort_ids: cohortIds }, "Inviting");
export const fetchInviteLink = (membershipId) => rpc("edu_invite_link", { p_membership: membershipId }, "Loading invite link");
export const assignAssessor = (cohortId, membershipId, assign = true) =>
  rpc("edu_assign_assessor", { p_cohort: cohortId, p_membership: membershipId, p_assign: assign }, "Assigning assessor");
export const addStudents = (cohortId, students) =>
  rpc("edu_add_students", { p_cohort: cohortId, p_students: students }, "Enrolling students");
export const withdrawEnrolment = (enrolmentId) => rpc("edu_withdraw_enrolment", { p_enrolment: enrolmentId }, "Withdrawing student");
export const fetchCohortBoard = (cohortId) => rpc("edu_cohort_board", { p_cohort: cohortId }, "Loading cohort");

export async function deactivateMembership(id, active) {
  const { error } = await supabase
    .from("edu_memberships")
    .update({ status: active ? "active" : "deactivated" })
    .eq("id", id);
  if (error) fail(error, "Updating person");
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------
export const fetchStudentHome = () => rpc("edu_student_home", {}, "Loading your training");
export const fetchMyProgress = () => rpc("edu_my_progress", {}, "Checking your progress");
export const setEduUiState = (patch) => rpc("edu_set_ui_state", { p_patch: patch }, "Saving");
export const acknowledgeEvent = (eventId, response = {}) =>
  rpc("edu_acknowledge_event", { p_event: eventId, p_response: response }, "Recording your response");
export const submitForAssessment = (note = "") => rpc("edu_submit_for_assessment", { p_note: note }, "Submitting for assessment");

// ---------------------------------------------------------------------------
// Assessor
// ---------------------------------------------------------------------------
export const fetchAssessorHome = () => rpc("edu_assessor_home", {}, "Loading your cohorts");
export const fetchReviewBundle = (enrolmentId) => rpc("edu_review_bundle", { p_enrolment: enrolmentId }, "Loading student");
export const fetchSubmissionSnapshot = (submissionId) => rpc("edu_submission_snapshot", { p_submission: submissionId }, "Loading submission");
export const recordResult = ({ submissionId, criterionId, result, comment }) =>
  rpc("edu_record_result", { p_submission: submissionId, p_criterion: criterionId, p_result: result, p_comment: comment || "" }, "Recording result");
export const finaliseAssessment = ({ submissionId, outcome, comment }) =>
  rpc("edu_finalise_assessment", { p_submission: submissionId, p_outcome: outcome, p_comment: comment || "" }, "Finalising assessment");
export const evaluateProgress = (enrolmentId) => rpc("edu_evaluate_progress", { p_enrolment: enrolmentId }, "Checking progress");

// Read-only view of a student's sandbox for an assessor. Same tables and the
// same mappers as the student's own workspace (fetchAppData), scoped to one
// organisation; RLS returns rows only for an assessor assigned to that cohort.
export async function fetchSandboxData(orgId) {
  const m = rowMappers;
  const byOrg = (table, order = "id") => supabase.from(table).select("*").eq("organization_id", orgId).order(order);
  const [org, projects, workers, templates, incidents, entries, meetings, policies, documents, audits, checkins,
    companies, companyDocs, photos, projectDocs, risks, swmsSigs, toolboxSigs, inductions, revisions, quizAttempts] =
    await Promise.all([
      supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
      byOrg("projects"),
      byOrg("workers"),
      byOrg("swms_templates"),
      supabase.from("incidents").select("*, corrective_actions(*)").eq("organization_id", orgId).order("id", { ascending: false }),
      supabase.from("diary_entries").select("*").eq("organization_id", orgId).order("date", { ascending: false }),
      supabase.from("toolbox_meetings").select("*").eq("organization_id", orgId).order("date", { ascending: false }),
      byOrg("policies"),
      byOrg("compliance_documents"),
      supabase.from("audit_log").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      supabase.from("site_checkins").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      byOrg("subbie_companies", "name"),
      byOrg("company_documents"),
      byOrg("record_photos"),
      supabase.from("project_documents").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      byOrg("project_risks"),
      supabase.from("swms_signatures").select("*").eq("organization_id", orgId).order("signed_at", { ascending: false }),
      supabase.from("toolbox_signatures").select("*").eq("organization_id", orgId).order("signed_at"),
      supabase.from("induction_completions").select("*").eq("organization_id", orgId).order("completed_at", { ascending: false }),
      supabase.from("swms_revisions").select("*").eq("organization_id", orgId).order("revised_at", { ascending: false }),
      supabase.from("quiz_attempts").select("*").eq("organization_id", orgId).order("attempted_at", { ascending: false }),
    ]);
  for (const res of [org, projects, workers, templates, incidents, entries, meetings, policies]) {
    if (res.error) fail(res.error, "Loading the student's workspace");
  }
  const projectList = (projects.data || []).map(m.mapProject);
  const projectsById = Object.fromEntries(projectList.map((p) => [p.id, p]));
  const workerList = (workers.data || []).map(m.mapWorker);
  const ok = (r) => (r.error ? [] : r.data || []);
  return {
    org: org.data ? m.mapOrg(org.data) : null,
    projects: projectList,
    workers: workerList,
    templates: (templates.data || []).map(m.mapTemplate),
    incidents: (incidents.data || []).map((r) => m.mapIncident(r, projectsById)),
    entries: (entries.data || []).map(m.mapEntry),
    meetings: (meetings.data || []).map(m.mapMeeting),
    policies: (policies.data || []).map(m.mapPolicy),
    documents: ok(documents).map(m.mapDocument),
    audits: ok(audits).map(m.mapAudit),
    checkins: ok(checkins).map(m.mapCheckin),
    companies: ok(companies).map(m.mapCompany),
    companyDocs: ok(companyDocs).map(m.mapCompanyDoc),
    photos: ok(photos).map(m.mapPhoto),
    projectDocs: ok(projectDocs).map(m.mapProjectDoc),
    projectRisks: ok(risks).map(m.mapProjectRisk),
    swmsSignatures: ok(swmsSigs).map((r) => ({
      id: r.id, templateId: r.template_id, workerId: r.worker_id, signedName: r.signed_name,
      version: r.template_version || "", byStaff: r.signed_by_staff, signedAt: r.signed_at,
    })),
    toolboxSignatures: ok(toolboxSigs).map((r) => ({
      id: r.id, meetingId: r.meeting_id, workerId: r.worker_id, signedName: r.signed_name, byStaff: r.signed_by_staff, signedAt: r.signed_at,
    })),
    inductions: ok(inductions).map((r) => ({
      id: r.id, workerId: r.worker_id, projectId: r.project_id, completedAt: r.completed_at,
      recordedByName: r.recorded_by_name, onPaper: r.on_paper, note: r.note,
    })),
    revisions: ok(revisions).map((r) => ({
      id: r.id, templateId: r.template_id, fromVersion: r.from_version, toVersion: r.to_version, reason: r.reason,
      revisedBy: r.revised_by_name, invalidated: r.signatures_invalidated, revisedAt: r.revised_at,
    })),
    quizAttempts: ok(quizAttempts).map((r) => ({
      id: r.id, workerId: r.worker_id, score: r.score, total: r.total, passed: r.passed, attemptedAt: r.attempted_at,
    })),
  };
}

// Emails an Education invitation via the server-side endpoint (Cloudflare
// Pages Function → Resend). The server re-checks that the caller administers
// the invitee's institution and composes the email itself; we only name the
// membership id.
export async function emailEduInvite(membershipId) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch("/api/send-edu-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify({ membershipId: Number(membershipId) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) fail(new Error(j.error || `HTTP ${r.status}`), "Emailing the invite");
  return j; // { sent, to }
}

export { mapMembership, mapInstitution, mapProgram, mapCohort, mapEnrolment };
