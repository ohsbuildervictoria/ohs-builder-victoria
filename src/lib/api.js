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

// Local calendar date (YYYY-MM-DD) — .toISOString() is the UTC date, which is
// yesterday in Australia until mid-morning. Exported because the daily
// fitness-for-work check compares against the tradie's LOCAL day.
export function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fail(error, action) {
  const err = new Error(`${action}: ${error.message}`);
  err.cause = error;
  throw err;
}

// ---------------------------------------------------------------------------
// Fetch everything the app needs after login
// ---------------------------------------------------------------------------
export async function fetchAppData() {
  const [projects, workers, templates, incidents, entries, meetings, policies, org, profiles, invites, documents, audits, checkins, companies, companyDocs, recordPhotos] =
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
      supabase.from("invites").select("*").order("id"),
      supabase.from("compliance_documents").select("*").order("id"),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }),
      supabase.from("site_checkins").select("*").order("created_at", { ascending: false }),
      supabase.from("subbie_companies").select("*").order("name"),
      supabase.from("company_documents").select("*").order("id"),
      supabase.from("record_photos").select("*").order("id"),
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
  };
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
  notifiable: "notifiable", lostTime: "lost_time",
};

export async function updateIncidentRow(id, patch) {
  const row = {};
  for (const [k, col] of Object.entries(INCIDENT_PATCH_COLS)) {
    if (patch[k] !== undefined) row[col] = patch[k];
  }
  const { error } = await supabase.from("incidents").update(row).eq("id", id);
  if (error) fail(error, "Updating incident");
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

export async function findWorkerByHandle(handle) {
  // RLS now hides other workers from a linked tradie, so the legacy shared
  // account resolves the username through a security-definer RPC (org-scoped).
  const { data, error } = await supabase.rpc("find_worker_by_handle", {
    handle: (handle || "").trim(),
  });
  if (error) fail(error, "Looking up stakeholder");
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapWorker(row) : null;
}

// Public invite preview shown on the /join page before the tradie sets a password.
export async function fetchInviteInfo(token) {
  const { data, error } = await supabase.rpc("worker_invite_info", { token });
  if (error) fail(error, "Loading invite");
  return data; // { workerName, trade, orgName, projectName, claimed } | null
}

// Link the signed-in account to the invited worker + org (role worker).
export async function acceptWorkerInvite(token) {
  const { data, error } = await supabase.rpc("accept_worker_invite", { token });
  if (error) fail(error, "Joining your builder");
  return data; // worker id
}

// PILOT ONLY: tradies share one auth account, so the worker id is explicit.
export async function pilotUpdateCompliance(workerId, categoryKey, value) {
  const col = COMPLIANCE_COLS[categoryKey];
  const { error } = await supabase.rpc("pilot_update_compliance", {
    wid: workerId,
    category: col,
    value,
  });
  if (error) fail(error, "Updating your compliance");
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

// Staff path: save a worker's registration details (contact, emergency, quals).
export async function saveWorkerProfileRow(workerId, profile) {
  const { error } = await supabase
    .from("workers")
    .update({ profile })
    .eq("id", workerId);
  if (error) fail(error, "Saving profile");
}

// PILOT ONLY: tradies share one auth account, so the worker id is explicit.
export async function pilotSaveProfile(workerId, profile) {
  const { error } = await supabase.rpc("pilot_save_profile", {
    wid: workerId,
    p: profile,
  });
  if (error) fail(error, "Saving your profile");
}

// Real tradie saving their own worker profile (RLS blocks direct writes).
export async function saveMyProfile(profile) {
  const { error } = await supabase.rpc("save_my_profile", { p: profile });
  if (error) fail(error, "Saving your profile");
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
      date: i.date || localDate(),
      status: i.status || "Open",
      severity: i.severity || "Low",
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

export async function signSwmsRpc(templateId) {
  const { error } = await supabase.rpc("sign_swms", { template_id: templateId });
  if (error) fail(error, "Signing SWMS");
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
