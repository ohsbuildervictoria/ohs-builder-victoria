// ============================================================================
// OHS Builder Victoria — Supabase data layer
// Maps between snake_case DB rows and the camelCase shapes the UI uses.
// ============================================================================
import { supabase } from "./supabase";

const COMPLIANCE_COLS = {
  induction: "induction",
  quiz: "quiz",
  whiteCard: "white_card",
  insurance: "insurance",
  medical: "medical",
  swms: "swms",
};

// ---------------------------------------------------------------------------
// Row mappers (DB → UI)
// ---------------------------------------------------------------------------
const mapProject = (r) => ({
  id: r.id,
  name: r.name,
  address: r.address,
  status: r.status,
  buildPercent: r.build_percent,
  compliance: r.compliance,
  contractType: r.contract_type,
  contractValue: Number(r.contract_value),
  // annotated after fetch from live data:
  workers: 0,
  incidents: 0,
});

const mapWorker = (r) => ({
  id: r.id,
  name: r.name,
  trade: r.trade,
  employer: r.employer,
  project: r.project_id,
  induction: r.induction,
  quiz: r.quiz,
  whiteCard: r.white_card,
  insurance: r.insurance,
  medical: r.medical,
  swms: r.swms,
  status: r.status,
});

const mapTemplate = (r) => ({
  id: r.id,
  trade: r.trade,
  ref: r.ref,
  version: r.version,
  signed: r.signed,
  total: r.total,
  status: r.status,
  legislation: r.legislation,
  hrcw: r.hrcw || [],
  ppe: r.ppe || [],
  equipment: r.equipment || [],
  locked: r.locked,
});

const mapAction = (r) => ({
  id: r.id,
  description: r.description,
  assignedTo: r.assigned_to,
  due: r.due,
  status: r.status,
});

const mapIncident = (r, projectsById = {}) => ({
  id: r.id,
  type: r.type,
  description: r.description,
  projectId: r.project_id,
  project: projectsById[r.project_id]?.name || "—",
  reportedBy: r.reported_by,
  date: r.date,
  status: r.status,
  severity: r.severity,
  location: r.location,
  involved: r.involved,
  witnesses: r.witnesses,
  immediateAction: r.immediate_action,
  notifiable: r.notifiable,
  correctiveActions: (r.corrective_actions || []).map(mapAction),
});

const mapEntry = (r) => ({
  id: r.id,
  project: r.project_id,
  date: r.date,
  weather: r.weather,
  wind: r.wind,
  labour: r.labour,
  hours: r.hours,
  contacts: r.contacts,
  deliveries: r.deliveries || [],
  notes: r.notes,
  author: r.author,
  supervisor: r.author,
  photos: r.photos,
  tags: r.tags || [],
  hasAudio: r.has_audio,
});

const mapMeeting = (r) => ({
  id: r.id,
  project: r.project_id,
  topic: r.topic,
  title: r.topic,
  date: r.date,
  presenter: r.presenter,
  attendees: r.attendees,
  attendance: r.attendees,
  total: r.total,
  duration: r.duration,
  points: r.points || [],
  signatures: r.signatures,
});

const mapPolicy = (r) => ({
  id: r.id,
  name: r.name,
  version: r.version,
  category: r.category,
  status: r.status,
  updated: r.updated,
});

const mapProfile = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  status: r.status,
  workerId: r.worker_id,
  projectIds: r.project_ids,
  readNotifications: r.read_notifications || [],
  lastLogin: r.last_login,
});

const mapOrg = (r) => ({
  name: r.name,
  abn: r.abn,
  state: r.state,
  plan: r.plan,
  billingContact: r.billing_contact,
  tagline: r.tagline,
  builtBy: r.built_by,
  notifications: r.notifications || {},
});

const mapInvite = (r) => ({
  id: `invite-${r.id}`,
  inviteId: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  status: "Invited",
  lastLogin: "—",
});

function fail(error, action) {
  const err = new Error(`${action}: ${error.message}`);
  err.cause = error;
  throw err;
}

// ---------------------------------------------------------------------------
// Fetch everything the app needs after login
// ---------------------------------------------------------------------------
export async function fetchAppData() {
  const [projects, workers, templates, incidents, entries, meetings, policies, org, profiles, invites] =
    await Promise.all([
      supabase.from("projects").select("*").order("id"),
      supabase.from("workers").select("*").order("id"),
      supabase.from("swms_templates").select("*").order("id"),
      supabase.from("incidents").select("*, corrective_actions(*)").order("id", { ascending: false }),
      supabase.from("diary_entries").select("*").order("date", { ascending: false }),
      supabase.from("toolbox_meetings").select("*").order("date", { ascending: false }),
      supabase.from("policies").select("*").order("id"),
      supabase.from("org_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("invites").select("*").order("id"),
    ]);

  for (const res of [projects, workers, templates, incidents, entries, meetings, policies, org, profiles]) {
    if (res.error) fail(res.error, "Loading data");
  }

  const projectList = (projects.data || []).map(mapProject);
  const projectsById = Object.fromEntries(projectList.map((p) => [p.id, p]));
  const workerList = (workers.data || []).map(mapWorker);
  const incidentList = (incidents.data || []).map((r) => mapIncident(r, projectsById));

  // Annotate live counts onto projects
  projectList.forEach((p) => {
    p.workers = workerList.filter((w) => w.project === p.id).length;
    p.incidents = incidentList.filter((i) => i.projectId === p.id).length;
  });

  return {
    projects: projectList,
    workers: workerList,
    templates: (templates.data || []).map(mapTemplate),
    incidents: incidentList,
    entries: (entries.data || []).map(mapEntry),
    meetings: (meetings.data || []).map(mapMeeting),
    policies: (policies.data || []).map(mapPolicy),
    org: org.data ? mapOrg(org.data) : null,
    profiles: (profiles.data || []).map(mapProfile),
    invites: invites.error ? [] : (invites.data || []).map(mapInvite),
  };
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail(error, "Loading profile");
  return data ? mapProfile(data) : null;
}

export function touchLastLogin(userId) {
  // fire-and-forget
  supabase
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", userId)
    .then(() => {});
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
export async function insertProject(p) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: p.name,
      address: p.address || "",
      status: p.status || "Planning",
      build_percent: p.buildPercent ?? 0,
      compliance: p.compliance ?? 100,
      contract_type: p.contractType || "Lump Sum",
      contract_value: p.contractValue ?? 0,
    })
    .select()
    .single();
  if (error) fail(error, "Creating project");
  return mapProject(data);
}

export async function updateProjectRow(id, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.buildPercent !== undefined) row.build_percent = patch.buildPercent;
  if (patch.compliance !== undefined) row.compliance = patch.compliance;
  if (patch.contractType !== undefined) row.contract_type = patch.contractType;
  if (patch.contractValue !== undefined) row.contract_value = patch.contractValue;
  const { error } = await supabase.from("projects").update(row).eq("id", id);
  if (error) fail(error, "Updating project");
}

// Staff path: direct update of any worker's compliance category.
export async function updateWorkerComplianceRow(workerId, categoryKey, value, newStatus) {
  const col = COMPLIANCE_COLS[categoryKey];
  if (!col) throw new Error(`Unknown compliance category: ${categoryKey}`);
  const { error } = await supabase
    .from("workers")
    .update({ [col]: value, status: newStatus })
    .eq("id", workerId);
  if (error) fail(error, "Updating compliance");
}

// Worker self-service path (RLS-safe RPC; only induction/quiz/swms allowed).
export async function updateMyCompliance(categoryKey, value) {
  const col = COMPLIANCE_COLS[categoryKey];
  const { error } = await supabase.rpc("update_my_compliance", {
    category: col,
    value,
  });
  if (error) fail(error, "Updating your compliance");
}

export async function insertIncident(i) {
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      type: i.type,
      description: i.description || "",
      project_id: i.projectId ?? null,
      reported_by: i.reportedBy || "",
      date: i.date || new Date().toISOString().slice(0, 10),
      status: i.status || "Open",
      severity: i.severity || "Low",
      location: i.location || "",
      involved: i.involved || "",
      witnesses: i.witnesses || "",
      immediate_action: i.immediateAction || "",
      notifiable: !!i.notifiable,
    })
    .select("*, corrective_actions(*)")
    .single();
  if (error) fail(error, "Reporting incident");
  return data;
}

export async function updateIncidentStatusRow(id, status) {
  const { error } = await supabase.from("incidents").update({ status }).eq("id", id);
  if (error) fail(error, "Updating incident");
}

export async function insertCorrectiveAction(incidentId, action) {
  const { data, error } = await supabase
    .from("corrective_actions")
    .insert({
      incident_id: incidentId,
      description: action.description,
      assigned_to: action.assignedTo || "",
      due: action.due || null,
      status: action.status || "Open",
    })
    .select()
    .single();
  if (error) fail(error, "Adding corrective action");
  return mapAction(data);
}

export async function signSwmsRpc(templateId) {
  const { error } = await supabase.rpc("sign_swms", { template_id: templateId });
  if (error) fail(error, "Signing SWMS");
}

export async function updateTemplateRow(id, patch) {
  const row = {};
  if (patch.locked !== undefined) row.locked = patch.locked;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.signed !== undefined) row.signed = patch.signed;
  const { error } = await supabase.from("swms_templates").update(row).eq("id", id);
  if (error) fail(error, "Updating SWMS template");
}

export async function insertDiaryEntry(e) {
  const { data, error } = await supabase
    .from("diary_entries")
    .insert({
      project_id: e.project ?? null,
      date: e.date,
      weather: e.weather || "",
      wind: e.wind || "",
      labour: Number(e.labour ?? e.workersPresent ?? 0) || 0,
      hours: e.hours || "",
      contacts: e.contacts || "",
      deliveries: Array.isArray(e.deliveries)
        ? e.deliveries
        : (e.deliveries || "").split("\n").map((s) => s.trim()).filter(Boolean),
      notes: e.notes || "",
      author: e.author || "",
      photos: e.photos ?? 0,
      tags: e.tags || [],
      has_audio: !!e.audioNote,
    })
    .select()
    .single();
  if (error) fail(error, "Saving diary entry");
  return mapEntry(data);
}

export async function insertToolboxMeeting(m) {
  const { data, error } = await supabase
    .from("toolbox_meetings")
    .insert({
      project_id: m.project ?? null,
      topic: m.topic || m.title || "Toolbox Meeting",
      date: m.date || new Date().toISOString().slice(0, 10),
      presenter: m.presenter || "",
      attendees: m.attendees ?? m.attendance ?? 0,
      total: m.total ?? m.attendees ?? m.attendance ?? 0,
      duration: m.duration || "",
      points: m.points || [],
      signatures: m.signatures ?? 0,
    })
    .select()
    .single();
  if (error) fail(error, "Saving toolbox meeting");
  return mapMeeting(data);
}

export async function updateMeetingSignatures(id, signatures) {
  const { error } = await supabase
    .from("toolbox_meetings")
    .update({ signatures })
    .eq("id", id);
  if (error) fail(error, "Recording signature");
}

export async function bumpPolicyVersion(policy) {
  const versionNum = parseFloat(String(policy.version).replace(/^v/i, "")) || 1.0;
  const next = `v${(versionNum + 0.1).toFixed(1)}`;
  const { data, error } = await supabase
    .from("policies")
    .update({ version: next, updated: new Date().toISOString().slice(0, 10) })
    .eq("id", policy.id)
    .select()
    .single();
  if (error) fail(error, "Updating policy");
  return mapPolicy(data);
}

export async function updateOrgNotifications(notifications) {
  const { error } = await supabase
    .from("org_settings")
    .update({ notifications })
    .eq("id", 1);
  if (error) fail(error, "Saving notification settings");
}

export async function updateProfileStatus(id, status) {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) fail(error, "Updating user");
}

export async function insertInvite(invite) {
  const { data, error } = await supabase
    .from("invites")
    .insert({
      name: invite.name,
      email: invite.email,
      role: invite.role || "worker",
    })
    .select()
    .single();
  if (error) fail(error, "Recording invitation");
  return mapInvite(data);
}

export async function saveReadNotifications(userId, ids) {
  const { error } = await supabase
    .from("profiles")
    .update({ read_notifications: ids })
    .eq("id", userId);
  if (error) fail(error, "Saving notifications");
}
