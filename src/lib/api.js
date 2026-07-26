// ============================================================================
// OHS Builder Victoria — Supabase data layer
// Maps between snake_case DB rows and the camelCase shapes the UI uses.
// ============================================================================
import { supabase } from "./supabase";
import {
  CATEGORY_DB,
  DB_TO_KEY,
  projectCompliancePercent,
  indexDocuments,
} from "./compliance";

const COMPLIANCE_COLS = {
  induction: "induction",
  quiz: "quiz",
  whiteCard: "white_card",
  insurance: "insurance",
  medical: "medical",
  swms: "swms",
};

// Private Supabase Storage bucket holding compliance evidence files.
export const COMPLIANCE_BUCKET = "compliance-docs";

// Private bucket for diary/incident photo evidence.
export const PHOTO_BUCKET = "site-photos";

// Private bucket for project files (drawings, permits, certificates).
export const PROJECT_DOC_BUCKET = "project-docs";

// Public bucket for organisation branding (the builder's own logo).
export const BRANDING_BUCKET = "org-branding";

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
  projectManager: r.project_manager || "",
  startDate: r.start_date,
  checkinToken: r.checkin_token || null,
  // Builder's own induction content for this project (site rules, video link,
  // muster point, site contact). Empty object = use the generic defaults.
  induction: r.induction || {},
  // annotated after fetch from live data:
  workers: 0,
  incidents: 0,
});

const mapWorker = (r) => ({
  id: r.id,
  name: r.name,
  trade: r.trade,
  employer: r.employer,
  companyId: r.company_id ?? null,
  loginHandle: r.login_handle || "",
  email: r.email || "",
  inviteToken: r.invite_token || null,
  accountStatus: r.account_status || "legacy",
  createdAt: r.created_at,
  profile: r.profile || {},
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
  lostTime: r.lost_time,
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
  // Evidence that WorkSafe was actually called, not just that the incident
  // was classified as one that requires it. Absent until migration 011.
  notifiedAt: r.notified_at ?? null,
  notifiedBy: r.notified_by ?? null,
  notificationMethod: r.notification_method ?? null,
  worksafeReference: r.worksafe_reference ?? null,
  sitePreserved: r.site_preserved ?? null,
  // Marked points on the front/back body diagram (see src/lib/bodyMap.js).
  bodyMap: Array.isArray(r.body_map) ? r.body_map : [],
  correctiveActions: (r.corrective_actions || []).map(mapAction),
});

const mapEntry = (r) => ({
  id: r.id,
  project: r.project_id,
  date: r.date,
  weather: r.weather,
  wind: r.wind,
  labour: r.labour,
  hours: Number(r.hours) || 0,
  manHours: (Number(r.hours) || 0) * (r.labour || 0),
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

const mapDocument = (r) => ({
  id: r.id,
  workerId: r.worker_id,
  category: DB_TO_KEY[r.category] || r.category,
  filePath: r.file_path,
  fileName: r.file_name || "",
  expiry: r.expiry_date || null,
  uploadedAt: r.uploaded_at,
});

// Subcontractor company (org-scoped): business-level details + insurance.
const mapCompany = (r) => ({
  id: r.id,
  name: r.name,
  abn: r.abn || "",
  contactName: r.contact_name || "",
  contactPhone: r.contact_phone || "",
  contactEmail: r.contact_email || "",
  notes: r.notes || "",
  createdAt: r.created_at,
});

const COMPANY_CATEGORY_DB = { publicLiability: "public_liability", workcover: "workcover" };
const COMPANY_DB_TO_KEY = { public_liability: "publicLiability", workcover: "workcover" };

const mapCompanyDoc = (r) => ({
  id: r.id,
  companyId: r.company_id,
  category: COMPANY_DB_TO_KEY[r.category] || r.category,
  filePath: r.file_path,
  fileName: r.file_name || "",
  expiry: r.expiry_date || null,
  uploadedAt: r.uploaded_at,
});

// A file attached to a project (working drawing, permit, certificate…).
const mapProjectDoc = (r) => ({
  id: r.id,
  projectId: r.project_id,
  category: r.category || "General",
  filePath: r.file_path,
  fileName: r.file_name || "",
  fileSize: Number(r.file_size) || 0,
  mimeType: r.mime_type || "",
  uploadedBy: r.uploaded_by || "",
  createdAt: r.created_at,
});

const mapCheckin = (r) => ({
  id: r.id,
  projectId: r.project_id,
  workerId: r.worker_id,
  name: r.name,
  date: r.date,
  createdAt: r.created_at,
});

// Photo evidence attached to a diary entry or incident.
const mapPhoto = (r) => ({
  id: r.id,
  entity: r.entity,
  entityId: r.entity_id,
  filePath: r.file_path,
  fileName: r.file_name || "",
  uploadedBy: r.uploaded_by || "",
  createdAt: r.created_at,
});

const mapAudit = (r) => ({
  id: r.id,
  entity: r.entity,
  entityId: r.entity_id,
  action: r.action,
  changedBy: r.changed_by,
  changes: r.changes || {},
  createdAt: r.created_at,
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
  id: r.id,
  name: r.name,
  abn: r.abn,
  state: r.state,
  plan: r.plan,
  billingContact: r.billing_contact,
  tagline: r.tagline,
  builtBy: r.built_by,
  // The builder's own logo — used on their PDFs and anywhere client branding
  // shows. Blank falls back to the platform mark everywhere.
  logoUrl: r.logo_url || "",
  createdAt: r.created_at,
  notifications: r.notifications || {},
});

const mapInvite = (r) => ({
  id: `invite-${r.id}`,
  inviteId: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  inviteToken: r.invite_token,
  status: "Invited",
  lastLogin: "—",
});

// Local calendar date (YYYY-MM-DD) — .toISOString() is the UTC date, which is
// yesterday in Australia until mid-morning. Exported because the daily
// fitness-for-work check compares against the tradie's LOCAL day.
export function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Turns a Postgres error into something a builder can act on.
//
// Raw messages were reaching the UI — "violates foreign key constraint
// corrective_actions_incident_id_fkey" told a site supervisor nothing and
// leaked table and constraint names. The original is kept on `cause` for the
// console.
const DB_MESSAGES = [
  [/duplicate key|already exists|unique constraint/i, "That already exists."],
  [/violates foreign key/i, "That record no longer exists — refresh the page and try again."],
  [/violates row-level security|permission denied|42501/i, "You don't have permission to do that."],
  [/violates not-null/i, "Something required is missing."],
  [/violates check constraint/i, "That value isn't allowed here."],
  [/JWT|token is expired|invalid claim/i, "Your session has expired — sign in again."],
  [/Failed to fetch|NetworkError|network/i, "No connection — check your signal and try again."],
];

function friendlyDbMessage(raw) {
  for (const [pattern, message] of DB_MESSAGES) {
    if (pattern.test(raw || "")) return message;
  }
  return null;
}

function fail(error, action) {
  const friendly = friendlyDbMessage(error?.message);
  const err = new Error(friendly ? `${action}: ${friendly}` : `${action}: ${error.message}`);
  err.cause = error;
  if (friendly) console.error(`[db] ${action}:`, error.message);
  throw err;
}

// ---------------------------------------------------------------------------
// Fetch everything the app needs after login
// ---------------------------------------------------------------------------
export async function fetchAppData() {
  const [projects, workers, templates, incidents, entries, meetings, policies, org, profiles, invites, documents, audits, checkins, companies, companyDocs, recordPhotos, projectDocs] =
    await Promise.all([
      supabase.from("projects").select("*").order("id"),
      supabase.from("workers").select("*").order("id"),
      supabase.from("swms_templates").select("*").order("id"),
      supabase.from("incidents").select("*, corrective_actions(*)").order("id", { ascending: false }),
      supabase.from("diary_entries").select("*").order("date", { ascending: false }),
      supabase.from("toolbox_meetings").select("*").order("date", { ascending: false }),
      supabase.from("policies").select("*").order("id"),
      // Organisation branding/settings — RLS returns only the caller's own org.
      supabase.from("organizations").select("*").limit(1).maybeSingle(),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("invites").select("*").eq("status", "invited").order("id"),
      supabase.from("compliance_documents").select("*").order("id"),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }),
      supabase.from("site_checkins").select("*").order("created_at", { ascending: false }),
      supabase.from("subbie_companies").select("*").order("name"),
      supabase.from("company_documents").select("*").order("id"),
      supabase.from("record_photos").select("*").order("id"),
      supabase.from("project_documents").select("*").order("created_at", { ascending: false }),
    ]);

  for (const res of [projects, workers, templates, incidents, entries, meetings, policies, org, profiles]) {
    if (res.error) fail(res.error, "Loading data");
  }

  const projectList = (projects.data || []).map(mapProject);
  const projectsById = Object.fromEntries(projectList.map((p) => [p.id, p]));
  const workerList = (workers.data || []).map(mapWorker);
  const incidentList = (incidents.data || []).map((r) => mapIncident(r, projectsById));
  const companyList = companies.error ? [] : (companies.data || []).map(mapCompany);
  const companyDocList = companyDocs.error ? [] : (companyDocs.data || []).map(mapCompanyDoc);

  // For a worker employed by a subbie company, "Insurance" IS the company's
  // public liability certificate — one policy covers the whole crew. We inject
  // it here as that worker's insurance document (flagged viaCompany), so every
  // consumer (matrix, tradie view, notifications, project %) reads one truth.
  const companiesById = Object.fromEntries(companyList.map((c) => [c.id, c]));
  const plByCompany = {};
  for (const d of companyDocList) {
    if (d.category === "publicLiability") plByCompany[d.companyId] = d;
  }
  const workersById = Object.fromEntries(workerList.map((w) => [w.id, w]));
  const documentList = (documents.error ? [] : (documents.data || []).map(mapDocument))
    // A company-linked worker's personal insurance row (if any legacy one
    // exists) is superseded by the company certificate.
    .filter((d) => !(d.category === "insurance" && workersById[d.workerId]?.companyId));
  for (const w of workerList) {
    if (!w.companyId) continue;
    const pl = plByCompany[w.companyId];
    if (!pl) continue;
    documentList.push({
      id: `company-${pl.id}-worker-${w.id}`,
      workerId: w.id,
      category: "insurance",
      filePath: pl.filePath,
      fileName: pl.fileName,
      expiry: pl.expiry,
      uploadedAt: pl.uploadedAt,
      viaCompany: true,
      companyId: w.companyId,
      companyName: companiesById[w.companyId]?.name || "",
    });
  }
  const docsByWorker = indexDocuments(documentList);

  // Annotate live counts + evidence-based compliance % onto projects. Compliance
  // is derived from the crew's effective per-category status (uploaded documents
  // and their expiry for White Card/Insurance/Medical; completion for the rest).
  projectList.forEach((p) => {
    const crew = workerList.filter((w) => w.project === p.id);
    p.workers = crew.length;
    p.incidents = incidentList.filter((i) => i.projectId === p.id).length;
    p.compliance = projectCompliancePercent(crew, docsByWorker);
  });

  return {
    projects: projectList,
    workers: workerList,
    documents: documentList,
    templates: (templates.data || []).map(mapTemplate),
    incidents: incidentList,
    entries: (entries.data || []).map(mapEntry),
    meetings: (meetings.data || []).map(mapMeeting),
    policies: (policies.data || []).map(mapPolicy),
    org: org.data ? mapOrg(org.data) : null,
    profiles: (profiles.data || []).map(mapProfile),
    invites: invites.error ? [] : (invites.data || []).map(mapInvite),
    audits: audits.error ? [] : (audits.data || []).map(mapAudit),
    checkins: checkins.error ? [] : (checkins.data || []).map(mapCheckin),
    companies: companyList,
    companyDocs: companyDocList,
    photos: recordPhotos.error ? [] : (recordPhotos.data || []).map(mapPhoto),
    // Tolerant like the other optional tables: a builder-staff-only table
    // returns nothing for a tradie, and nothing at all until the migration
    // that creates it has run.
    projectDocs: projectDocs.error ? [] : (projectDocs.data || []).map(mapProjectDoc),
  };
}

// ---------------------------------------------------------------------------
// Project documents — private project-docs bucket + project_documents rows.
// Same shape as compliance evidence and site photos: bytes in Storage,
// org-scoped metadata in Postgres, short-lived signed URLs for viewing.
// ---------------------------------------------------------------------------

export async function uploadProjectDocument({ projectId, category, file, uploadedBy }) {
  const path = `${projectId}/${Date.now()}-${safeName(file.name)}`;
  const up = await supabase.storage
    .from(PROJECT_DOC_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (up.error) fail(up.error, "Uploading document");

  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: Number(projectId),
      category: category || "General",
      file_path: path,
      file_name: file.name || "document",
      file_size: file.size || 0,
      mime_type: file.type || "",
      uploaded_by: uploadedBy || "",
    })
    .select()
    .single();
  if (error) {
    // Don't leave an orphan file in the bucket if the metadata row is rejected.
    await supabase.storage.from(PROJECT_DOC_BUCKET).remove([path]);
    fail(error, "Recording document");
  }
  return mapProjectDoc(data);
}

export async function deleteProjectDocument(doc) {
  if (doc.filePath) {
    await supabase.storage.from(PROJECT_DOC_BUCKET).remove([doc.filePath]);
  }
  const { error } = await supabase.from("project_documents").delete().eq("id", doc.id);
  if (error) fail(error, "Removing document");
}

export async function getProjectDocUrl(filePath) {
  const { data, error } = await supabase.storage
    .from(PROJECT_DOC_BUCKET)
    .createSignedUrl(filePath, 300);
  if (error) fail(error, "Opening document");
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Organisation branding
// ---------------------------------------------------------------------------

// Uploads the builder's logo to the public branding bucket and stores its URL
// on the organisation. Public by design: a logo on a PDF and in an <img> needs
// a plain URL, and a company logo is not private information.
export async function uploadOrgLogo(orgId, file) {
  const path = `${orgId}/logo-${Date.now()}-${safeName(file.name)}`;
  const up = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (up.error) fail(up.error, "Uploading logo");
  const { data: pub } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
  const url = pub?.publicUrl || "";
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: url })
    .eq("id", orgId);
  if (error) fail(error, "Saving logo");
  return url;
}

export async function clearOrgLogo(orgId) {
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: "" })
    .eq("id", orgId);
  if (error) fail(error, "Removing logo");
}

// ---------------------------------------------------------------------------
// Photo evidence (diary entries + incidents) — private site-photos bucket
// ---------------------------------------------------------------------------

export async function uploadRecordPhoto({ entity, entityId, blob, fileName, uploadedBy }) {
  const path = `${entity}/${entityId}/${Date.now()}-${safeName(fileName)}`;
  const up = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { upsert: false, contentType: blob.type || "image/jpeg" });
  if (up.error) fail(up.error, "Uploading photo");
  const { data, error } = await supabase
    .from("record_photos")
    .insert({
      entity,
      entity_id: entityId,
      file_path: path,
      file_name: fileName || "photo.jpg",
      uploaded_by: uploadedBy || "",
    })
    .select()
    .single();
  if (error) fail(error, "Recording photo");
  return mapPhoto(data);
}

export async function deleteRecordPhoto(photo) {
  if (photo.filePath) {
    await supabase.storage.from(PHOTO_BUCKET).remove([photo.filePath]);
  }
  const { error } = await supabase.from("record_photos").delete().eq("id", photo.id);
  if (error) fail(error, "Removing photo");
}

// Short-lived signed URL to view a private photo.
export async function getPhotoUrl(filePath) {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(filePath, 300);
  if (error) fail(error, "Opening photo");
  return data.signedUrl;
}

// Keep the diary entry's photo count column in step (used by list badges/PDF).
export async function setDiaryPhotoCount(entryId, count) {
  await supabase.from("diary_entries").update({ photos: count }).eq("id", entryId);
}

// ---------------------------------------------------------------------------
// QR site sign-in
// ---------------------------------------------------------------------------
export async function fetchCheckinInfo(token) {
  const { data, error } = await supabase.rpc("checkin_info", { token });
  if (error) fail(error, "Loading site");
  return data; // { projectName, orgName, address } | null
}

export async function performCheckin(token, name) {
  const { data, error } = await supabase.rpc("site_checkin", { token, p_name: name || "" });
  if (error) fail(error, "Checking in");
  return data; // { projectName, name, date, alreadyCheckedIn }
}

// ---------------------------------------------------------------------------
// Edit + audit trail
// ---------------------------------------------------------------------------

// Writes an immutable audit row. `changes` is { field: { from, to } }.
export async function logEdit({ entity, entityId, changedBy, changes }) {
  const { data, error } = await supabase
    .from("audit_log")
    .insert({ entity, entity_id: entityId, changed_by: changedBy || "", changes })
    .select()
    .single();
  if (error) fail(error, "Recording the edit");
  return mapAudit(data);
}

// Daily fitness-for-work declaration → immutable audit row, written through a
// security-definer RPC. The server pins the record to the caller's OWN linked
// worker; workerId is only honoured for the legacy shared pilot account.
export async function recordFitnessDeclarationApi({ outcome, day, workerId }) {
  const { data, error } = await supabase.rpc("record_fitness_declaration", {
    outcome,
    p_local_date: day,
    p_worker_id: workerId ?? null,
  });
  if (error) fail(error, "Recording your declaration");
  return mapAudit(data);
}

const DIARY_PATCH_COLS = {
  date: "date", weather: "weather", wind: "wind", labour: "labour",
  hours: "hours", contacts: "contacts", notes: "notes", tags: "tags",
};

export async function updateDiaryEntryRow(id, patch) {
  const row = {};
  for (const [k, col] of Object.entries(DIARY_PATCH_COLS)) {
    if (patch[k] !== undefined) row[col] = patch[k];
  }
  if (patch.hours !== undefined) row.hours = Number(patch.hours) || 0;
  if (patch.labour !== undefined) row.labour = Number(patch.labour) || 0;
  const { error } = await supabase.from("diary_entries").update(row).eq("id", id);
  if (error) fail(error, "Updating diary entry");
}

const INCIDENT_PATCH_COLS = {
  type: "type", description: "description", date: "date", status: "status",
  severity: "severity", location: "location", involved: "involved",
  witnesses: "witnesses", immediateAction: "immediate_action",
  notifiable: "notifiable", lostTime: "lost_time", bodyMap: "body_map",
};

export async function updateIncidentRow(id, patch) {
  const row = {};
  for (const [k, col] of Object.entries(INCIDENT_PATCH_COLS)) {
    if (patch[k] !== undefined) row[col] = patch[k];
  }
  const { error } = await supabase.from("incidents").update(row).eq("id", id);
  if (error) {
    if (missingBodyMap(error) && row.body_map !== undefined) {
      // Same pre-migration fallback as insertIncident: save the correction,
      // just without the diagram.
      delete row.body_map;
      const retry = await supabase.from("incidents").update(row).eq("id", id);
      if (retry.error) fail(retry.error, "Updating incident");
      return;
    }
    fail(error, "Updating incident");
  }
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
      project_manager: p.projectManager || "",
      start_date: p.startDate || null,
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
  if (patch.projectManager !== undefined) row.project_manager = patch.projectManager;
  if (patch.startDate !== undefined) row.start_date = patch.startDate || null;
  if (patch.induction !== undefined) row.induction = patch.induction || {};
  const { error } = await supabase.from("projects").update(row).eq("id", id);
  if (error) fail(error, "Updating project");
}

// Creates a stakeholder (worker) record with a pilot login handle, and makes
// sure a signable SWMS template exists for their trade (sourced counts only —
// content comes from the static library).
export async function insertWorker(w) {
  const { data, error } = await supabase
    .from("workers")
    .insert({
      name: w.name,
      trade: w.trade || "",
      employer: w.employer || "",
      company_id: w.companyId ?? null,
      project_id: w.project ?? null,
      email: (w.email || "").trim() || null,
      login_handle: (w.loginHandle || "").trim().toLowerCase() || null,
      // New subbies get a real per-tradie account via the invite link; the DB
      // default fills invite_token + account_status='invited'.
    })
    .select()
    .single();
  if (error) {
    if (/login_handle/.test(error.message) && /duplicate|unique/i.test(error.message)) {
      fail(new Error("That username is already taken — pick another."), "Adding stakeholder");
    }
    fail(error, "Adding stakeholder");
  }

  // Ensure a SWMS template row exists for this trade; bump the required count.
  if (w.trade) {
    const { data: tmpl } = await supabase
      .from("swms_templates")
      .select("id, total")
      .eq("trade", w.trade)
      .maybeSingle();
    if (tmpl) {
      await supabase
        .from("swms_templates")
        .update({ total: (tmpl.total || 0) + 1 })
        .eq("id", tmpl.id);
    } else {
      const ref = `SWMS-${w.trade.replace(/[^A-Za-z]+/g, "").slice(0, 8).toUpperCase() || "TRADE"}-01`;
      await supabase.from("swms_templates").insert({
        trade: w.trade,
        ref: `${ref}-${data.id}`,
        version: "v1.0",
        signed: 0,
        total: 1,
        status: "Pending",
        legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic)",
      });
    }
  }
  return mapWorker(data);
}

// ---------------------------------------------------------------------------
// Subcontractor companies + their insurance certificates
// ---------------------------------------------------------------------------

export async function insertCompany(c) {
  const { data, error } = await supabase
    .from("subbie_companies")
    .insert({
      name: (c.name || "").trim(),
      abn: (c.abn || "").trim(),
      contact_name: c.contactName || "",
      contact_phone: c.contactPhone || "",
      contact_email: (c.contactEmail || "").trim(),
      notes: c.notes || "",
    })
    .select()
    .single();
  if (error) fail(error, "Adding company");
  return mapCompany(data);
}

export async function updateCompanyRow(id, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = (patch.name || "").trim();
  if (patch.abn !== undefined) row.abn = (patch.abn || "").trim();
  if (patch.contactName !== undefined) row.contact_name = patch.contactName;
  if (patch.contactPhone !== undefined) row.contact_phone = patch.contactPhone;
  if (patch.contactEmail !== undefined) row.contact_email = (patch.contactEmail || "").trim();
  if (patch.notes !== undefined) row.notes = patch.notes;
  const { data, error } = await supabase
    .from("subbie_companies")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) fail(error, "Updating company");
  return mapCompany(data);
}

// Deleting a company: its workers stay (FK sets their company_id to null and
// they go back to holding their own insurance); its certificate files are
// removed from storage; keep the employer text on workers as history.
export async function deleteCompanyRow(companyId, docs = []) {
  const paths = docs.map((d) => d.filePath).filter(Boolean);
  if (paths.length) {
    await supabase.storage.from(COMPLIANCE_BUCKET).remove(paths);
  }
  const { error } = await supabase.from("subbie_companies").delete().eq("id", companyId);
  if (error) fail(error, "Removing company");
}

// Uploads a company insurance certificate (public liability / WorkCover) to
// the same private bucket, one row per company+category (re-upload replaces).
export async function uploadCompanyDocApi({ companyId, category, file, expiry }) {
  const dbCat = COMPANY_CATEGORY_DB[category] || category;
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const path = `company/${companyId}/${dbCat}/${Date.now()}-${safeName(file.name)}`;

  const up = await supabase.storage
    .from(COMPLIANCE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (up.error) fail(up.error, "Uploading certificate");

  const { data, error } = await supabase
    .from("company_documents")
    .upsert(
      {
        company_id: companyId,
        category: dbCat,
        file_path: path,
        file_name: file.name || `document.${ext || "bin"}`,
        expiry_date: expiry || null,
      },
      { onConflict: "company_id,category" }
    )
    .select()
    .single();
  if (error) fail(error, "Recording certificate");
  return mapCompanyDoc(data);
}

export async function deleteCompanyDocApi(doc) {
  if (doc.filePath) {
    await supabase.storage.from(COMPLIANCE_BUCKET).remove([doc.filePath]);
  }
  const { error } = await supabase.from("company_documents").delete().eq("id", doc.id);
  if (error) fail(error, "Removing certificate");
}

// ---------------------------------------------------------------------------
// Compliance evidence documents (Supabase Storage + compliance_documents)
// ---------------------------------------------------------------------------

const safeName = (name) =>
  (name || "file").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-60);

// Uploads a file to the private bucket and upserts its compliance_documents
// row (one row per worker+category; a re-upload replaces the file + metadata).
export async function uploadComplianceDoc({ workerId, category, file, expiry }) {
  const dbCat = CATEGORY_DB[category] || category;
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const stamp = Date.now();
  const path = `${workerId}/${dbCat}/${stamp}-${safeName(file.name)}`;

  const up = await supabase.storage
    .from(COMPLIANCE_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (up.error) fail(up.error, "Uploading document");

  const { data, error } = await supabase
    .from("compliance_documents")
    .upsert(
      {
        worker_id: workerId,
        category: dbCat,
        file_path: path,
        file_name: file.name || `document.${ext || "bin"}`,
        expiry_date: expiry || null,
      },
      { onConflict: "worker_id,category" }
    )
    .select()
    .single();
  if (error) fail(error, "Recording document");
  return mapDocument(data);
}

// Updates just the expiry date on an existing document row.
export async function updateDocExpiry(docId, expiry) {
  const { data, error } = await supabase
    .from("compliance_documents")
    .update({ expiry_date: expiry || null })
    .eq("id", docId)
    .select()
    .single();
  if (error) fail(error, "Updating expiry date");
  return mapDocument(data);
}

// Removes the file from storage and its metadata row.
export async function deleteComplianceDoc(doc) {
  if (doc.filePath) {
    await supabase.storage.from(COMPLIANCE_BUCKET).remove([doc.filePath]);
  }
  const { error } = await supabase
    .from("compliance_documents")
    .delete()
    .eq("id", doc.id);
  if (error) fail(error, "Removing document");
}

// Short-lived signed URL so a builder/tradie can view or download a private file.
export async function getDocUrl(filePath) {
  const { data, error } = await supabase.storage
    .from(COMPLIANCE_BUCKET)
    .createSignedUrl(filePath, 120);
  if (error) fail(error, "Opening document");
  return data.signedUrl;
}

// Emails a tradie their invite link via the server-side send endpoint
// (Cloudflare Pages Function -> Resend). The server re-checks role + org and
// composes the email itself; we only name the worker.
export async function emailInvite(workerId) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch("/api/send-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify({ workerId: Number(workerId) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) fail(new Error(j.error || `HTTP ${r.status}`), "Emailing the invite");
  return j; // { sent, to }
}

// Emails a generated report/incident PDF via the server-side send endpoint
// (Cloudflare Pages Function -> Resend). The server re-checks role + org and
// composes the wording itself; we supply the recipients, the builder's note
// and the document bytes.
export async function emailReport({ kind, to, note, filename, base64, summary }) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch("/api/send-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify({ kind, to, note, filename, pdfBase64: base64, summary }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) fail(new Error(j.error || `HTTP ${r.status}`), "Emailing the report");
  return j; // { sent, to, filename }
}

// Public invite preview shown on the /join page before the tradie sets a password.
export async function fetchInviteInfo(token) {
  const { data, error } = await supabase.rpc("worker_invite_info", { token });
  if (error) fail(error, "Loading invite");
  return data; // { workerName, trade, orgName, projectName, claimed } | null
}

// Public staff-invite preview shown on the /join-staff page.
export async function fetchStaffInviteInfo(token) {
  const { data, error } = await supabase.rpc("staff_invite_info", { token });
  if (error) fail(error, "Loading invite");
  return data; // { name, email, role, orgName, claimed } | null
}

// Attach the signed-in account to the inviting org with the invited role.
export async function acceptStaffInvite(token) {
  const { error } = await supabase.rpc("accept_staff_invite", { token });
  if (error) fail(error, "Joining the team");
}

// Emails invited staff their invite link via the server-side send endpoint
// (Cloudflare Pages Function -> Resend). Admin-only; server re-checks.
export async function emailStaffInvite(inviteId) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch("/api/send-staff-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: JSON.stringify({ inviteId: Number(inviteId) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) fail(new Error(j.error || `HTTP ${r.status}`), "Emailing the invite");
  return j; // { sent, to }
}

// Link the signed-in account to the invited worker + org (role worker).
export async function acceptWorkerInvite(token) {
  const { data, error } = await supabase.rpc("accept_worker_invite", { token });
  if (error) fail(error, "Joining your builder");
  return data; // worker id
}

// Staff path: record a compliance category against a worker.
//
// Induction and SWMS are evidence-backed — a green tick has to stand on a
// signature or a recorded completion, so those go through an RPC that writes
// the evidence first. The quiz has no manual path at all; it is graded when
// it is sat. Documents (White Card, insurance, medical) are a staff
// verification of a file that was uploaded, so they stay a direct update.
const EVIDENCE_BACKED = new Set(["induction", "swms"]);

export async function updateWorkerComplianceRow(workerId, categoryKey, value, newStatus, note) {
  const col = COMPLIANCE_COLS[categoryKey];
  if (!col) throw new Error(`Unknown compliance category: ${categoryKey}`);

  if (EVIDENCE_BACKED.has(categoryKey)) {
    const { error } = await supabase.rpc("record_compliance_signoff", {
      p_worker_id: workerId,
      p_category: categoryKey,
      p_value: value,
      p_note: note ?? null,
    });
    if (!error) return;
    // Until migration 011 is applied the RPC won't exist; fall back to the
    // direct write rather than blocking the builder.
    if (!/record_compliance_signoff|PGRST202|does not exist|schema cache/i.test(error.message || "")) {
      fail(error, "Recording sign-off");
    }
  }

  const { error } = await supabase
    .from("workers")
    .update({ [col]: value, status: newStatus })
    .eq("id", workerId);
  if (error) fail(error, "Updating compliance");
}

// The SWMS signature register: who signed which version, when, and whether
// they signed it themselves or a supervisor recorded a paper sign-off.
//
// This has always been in the database and has never been visible anywhere.
// Every screen and every export showed only "7 of 9 signed", which cannot
// answer the one question an inspector asks: prove this person signed this
// version on this date.
export async function fetchSwmsSignatures(templateId = null) {
  let q = supabase
    .from("swms_signatures")
    .select("id, template_id, worker_id, signed_name, template_version, signed_by_staff, signed_at")
    .order("signed_at", { ascending: false });
  if (templateId != null) q = q.eq("template_id", Number(templateId));
  const { data, error } = await q;
  if (error) {
    // The register is evidence, not decoration — if it can't be read, say so
    // rather than rendering an empty list that looks like "nobody signed".
    fail(error, "Loading the SWMS signature register");
  }
  return (data || []).map((r) => ({
    id: r.id,
    templateId: r.template_id,
    workerId: r.worker_id,
    signedName: r.signed_name,
    version: r.template_version || "",
    byStaff: r.signed_by_staff,
    signedAt: r.signed_at,
  }));
}

// Per-person toolbox attendance. The meeting's signature count is derived
// from these rows by the database — a number on its own could never answer
// "was this person at the talk?", which is the only thing consultation
// evidence is for.
export async function recordToolboxAttendanceRpc(meetingId, workerId, signedName) {
  const { data, error } = await supabase.rpc("record_toolbox_attendance", {
    p_meeting_id: meetingId,
    p_worker_id: workerId,
    p_signed_name: signedName || null,
  });
  if (error) fail(error, "Recording attendance");
  return data;
}

export async function fetchToolboxAttendance(meetingId) {
  const { data, error } = await supabase
    .from("toolbox_signatures")
    .select("id, worker_id, signed_name, signed_by_staff, signed_at")
    .eq("meeting_id", meetingId)
    .order("signed_at");
  if (error) return [];
  return (data || []).map((r) => ({
    id: r.id,
    workerId: r.worker_id,
    signedName: r.signed_name,
    byStaff: r.signed_by_staff,
    signedAt: r.signed_at,
  }));
}

// Records that WorkSafe was actually notified about a notifiable incident.
// Until this exists against an incident, the database refuses to let it close.
export async function recordWorkSafeNotification(incidentId, { method, reference, sitePreserved } = {}) {
  const { data, error } = await supabase.rpc("record_worksafe_notification", {
    p_incident_id: incidentId,
    p_method: method || "Telephone 13 23 60",
    p_reference: reference || null,
    p_site_preserved: sitePreserved ?? null,
  });
  if (error) fail(error, "Recording the WorkSafe notification");
  return data;
}

// Staff path: save a worker's registration details (contact, emergency, quals).
export async function saveWorkerProfileRow(workerId, profile) {
  const { error } = await supabase
    .from("workers")
    .update({ profile })
    .eq("id", workerId);
  if (error) fail(error, "Saving profile");
}

// Real tradie saving their own worker profile (RLS blocks direct writes).
export async function saveMyProfile(profile) {
  const { error } = await supabase.rpc("save_my_profile", { p: profile });
  if (error) fail(error, "Saving your profile");
}

// Staff path: set or correct a worker's email after they were added (a blank
// email is common when a subbie is added quickly). Only touches the email
// column; the invite token/status are untouched, so the existing invite link
// stays valid and can now be emailed. Returns the updated (mapped) worker.
export async function updateWorkerEmail(workerId, email) {
  const clean = (email || "").trim() || null;
  const { data, error } = await supabase
    .from("workers")
    .update({ email: clean })
    .eq("id", workerId)
    .select()
    .single();
  if (error) fail(error, "Updating email");
  return mapWorker(data);
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

// True when Postgres rejected a write because the body_map column isn't there
// yet. The app is deployed from git and the migration is applied separately;
// if the two land out of order, reporting an incident must still work — the
// body diagram is an addition to the report, never a gate on filing one.
const missingBodyMap = (error) =>
  /body_map/.test(error?.message || "") &&
  /column|schema cache|does not exist/i.test(error?.message || "");

export async function insertIncident(i) {
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      type: i.type,
      description: i.description || "",
      project_id: i.projectId ?? null,
      reported_by: i.reportedBy || "",
      date: i.date || localDate(),
      status: i.status || "Open",
      severity: i.severity || "Minor",
      location: i.location || "",
      involved: i.involved || "",
      witnesses: i.witnesses || "",
      immediate_action: i.immediateAction || "",
      notifiable: !!i.notifiable,
      lost_time: !!i.lostTime,
      body_map: Array.isArray(i.bodyMap) ? i.bodyMap : [],
    })
    .select("*, corrective_actions(*)")
    .single();
  if (error) {
    if (missingBodyMap(error)) return insertIncidentWithoutBodyMap(i);
    fail(error, "Reporting incident");
  }
  return data;
}

// Fallback for the window before the body_map migration is applied.
async function insertIncidentWithoutBodyMap(i) {
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      type: i.type,
      description: i.description || "",
      project_id: i.projectId ?? null,
      reported_by: i.reportedBy || "",
      date: i.date || localDate(),
      status: i.status || "Open",
      severity: i.severity || "Minor",
      location: i.location || "",
      involved: i.involved || "",
      witnesses: i.witnesses || "",
      immediate_action: i.immediateAction || "",
      notifiable: !!i.notifiable,
      lost_time: !!i.lostTime,
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

// Corrective actions could only ever be created. The dashboard's "Open
// Corrective Actions" counter could only go up, and the Welcome page sells
// exactly this ("assigned to a responsible person and tracked through to
// completion"), so the one thing the feature promised was the one thing it
// couldn't do.
export async function updateCorrectiveActionRow(id, patch) {
  const row = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.assignedTo !== undefined) row.assigned_to = patch.assignedTo;
  if (patch.due !== undefined) row.due = patch.due || null;
  const { data, error } = await supabase
    .from("corrective_actions")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) fail(error, "Updating corrective action");
  return mapAction(data);
}

// Records WHO signed WHICH VERSION and when, not just a counter. Falls back to
// the old counter-only RPC if migration 006 hasn't been applied yet, so signing
// never breaks between a deploy and the migration.
export async function signSwmsRpc(templateId, { signedName, workerId } = {}) {
  const { data, error } = await supabase.rpc("sign_swms_v2", {
    p_template_id: templateId,
    p_signed_name: signedName || "",
    p_worker_id: workerId ?? null,
  });
  if (!error) return data;
  if (/sign_swms_v2|PGRST202|does not exist|schema cache/i.test(error.message || "")) {
    const legacy = await supabase.rpc("sign_swms", { template_id: templateId });
    if (legacy.error) fail(legacy.error, "Signing SWMS");
    return { recorded: true, signedName: signedName || "", legacy: true };
  }
  fail(error, "Signing SWMS");
}

// The quiz questions, WITHOUT their answers. The answer key stays in the
// database — it used to ship in the JS bundle, so anyone could read it.
// The effective permission set, computed by the database from the caller's
// role. The client renders navigation from this instead of a hardcoded table,
// so the UI cannot claim an access level the database won't honour.
export async function fetchPermissions() {
  const { data, error } = await supabase.rpc("my_permissions");
  if (error) fail(error, "Loading your permissions");
  return data;
}

export async function fetchQuiz() {
  const { data, error } = await supabase.rpc("get_quiz");
  if (error) fail(error, "Loading the quiz");
  return Array.isArray(data) ? data : [];
}

// Grading happens server-side. Only this RPC can set quiz = 'Verified', and it
// records the attempt either way, so a pass is evidence rather than a claim.
export async function submitQuiz(answers) {
  const { data, error } = await supabase.rpc("submit_quiz", { p_answers: answers });
  if (error) fail(error, "Submitting the quiz");
  return data;
}

export async function insertPolicy(policy) {
  const { data, error } = await supabase
    .from("policies")
    .insert({
      name: (policy.name || "").trim(),
      version: (policy.version || "v1.0").trim(),
      category: policy.category || "",
      status: policy.status || "Active",
      updated: localDate(),
    })
    .select()
    .single();
  if (error) fail(error, "Adding policy");
  return mapPolicy(data);
}

export async function updatePolicyRow(id, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.version !== undefined) row.version = patch.version;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.status !== undefined) row.status = patch.status;
  row.updated = localDate();
  const { data, error } = await supabase
    .from("policies")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) fail(error, "Updating policy");
  return mapPolicy(data);
}

export async function deletePolicyRow(id) {
  const { error } = await supabase.from("policies").delete().eq("id", id);
  if (error) fail(error, "Removing policy");
}

// Re-reads one template so callers can derive status from what the DB really
// holds (the sign_swms RPC silently no-ops on locked templates).
export async function fetchTemplateRow(id) {
  const { data, error } = await supabase
    .from("swms_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error, "Loading SWMS template");
  return data ? mapTemplate(data) : null;
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
      hours: Number(e.hours) || 0,
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
      date: m.date || localDate(),
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
    .update({ version: next, updated: localDate() })
    .eq("id", policy.id)
    .select()
    .single();
  if (error) fail(error, "Updating policy");
  return mapPolicy(data);
}

// A paying customer could not enter their own ABN, org name or billing
// contact — the Organisation tab was labelled "Read-only" with no way in, and
// the blank ABN then printed on every exported PDF.
export async function updateOrgDetails(orgId, patch) {
  const row = {};
  if (patch.name !== undefined) row.name = (patch.name || "").trim();
  if (patch.abn !== undefined) row.abn = (patch.abn || "").trim();
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.billingContact !== undefined) row.billing_contact = (patch.billingContact || "").trim();
  if (patch.tagline !== undefined) row.tagline = patch.tagline;
  const { data, error } = await supabase
    .from("organizations")
    .update(row)
    .eq("id", orgId)
    .select()
    .single();
  if (error) fail(error, "Saving organisation details");
  return mapOrg(data);
}

export async function updateOrgNotifications(orgId, notifications) {
  const { error } = await supabase
    .from("organizations")
    .update({ notifications })
    .eq("id", orgId);
  if (error) fail(error, "Saving notification settings");
}

// Real builder signup: create an auth user, then (via a security-definer RPC)
// create their organisation and make them its Builder Admin. Returns the new
// org id. Requires the project's email auto-confirm so a session exists.
export async function signUpBuilder({ email, password, name, orgName }) {
  const { data, error } = await supabase.auth.signUp({
    email: (email || "").trim(),
    password,
    options: { data: { name } },
  });
  if (error) fail(error, "Creating your account");
  if (!data.session) {
    // Auto-confirm is off — user must confirm by email before continuing.
    throw new Error("Check your email to confirm your account, then log in.");
  }
  const { error: rpcError } = await supabase.rpc("signup_create_org", {
    org_name: orgName,
  });
  if (rpcError) fail(rpcError, "Setting up your workspace");
  return data.user.id;
}

// Activating or deactivating someone is an access decision, so it goes
// through the audited RPC rather than a bare column write. Until migration 010
// is applied the RPC won't exist, so fall back to the direct update — which is
// what the button did before, and no worse.
export async function updateProfileStatus(id, status) {
  const { error } = await supabase.rpc("set_user_status", {
    p_user: id,
    p_status: status,
  });
  if (!error) return;
  if (/set_user_status|PGRST202|does not exist|schema cache/i.test(error.message || "")) {
    const legacy = await supabase.from("profiles").update({ status }).eq("id", id);
    if (legacy.error) fail(legacy.error, "Updating user");
    return;
  }
  fail(error, "Updating user");
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
