// ============================================================================
// OHS Builder Victoria — Compliance status derivation (SINGLE SOURCE OF TRUTH)
//
// Both the builder-side compliance matrix and the tradie-side Documents tab
// import categoryStatus() from here. Neither view is allowed its own status
// logic — that is exactly the split-source bug we are avoiding. If a category's
// colour/label ever needs to change, it changes once, here.
// ============================================================================

// The six matrix categories (camelCase keys used across the UI).
export const complianceCategories = [
  { key: "induction", label: "Induction" },
  { key: "quiz", label: "Quiz" },
  { key: "whiteCard", label: "White Card" },
  { key: "insurance", label: "Insurance" },
  { key: "medical", label: "Medical" },
  { key: "swms", label: "SWMS" },
];

export const CATEGORY_KEYS = complianceCategories.map((c) => c.key);

// Categories that accept a supporting file (Quiz is a knowledge check, no file).
export const DOC_CATEGORIES = ["induction", "whiteCard", "insurance", "medical", "swms"];

// Categories whose validity is time-bound and therefore expiry-driven.
export const EXPIRY_CATEGORIES = ["whiteCard", "insurance", "medical"];

// camelCase UI key <-> snake_case DB column / storage category.
export const CATEGORY_DB = {
  induction: "induction",
  quiz: "quiz",
  whiteCard: "white_card",
  insurance: "insurance",
  medical: "medical",
  swms: "swms",
};
export const DB_TO_KEY = Object.fromEntries(
  Object.entries(CATEGORY_DB).map(([k, v]) => [v, k])
);

export const EXPIRY_WARNING_DAYS = 30;

// Evaluated once per load — keeps derivation pure across re-renders (the
// react-compiler rejects Date.now() inside render).
const TODAY_MS = Date.parse(new Date().toISOString().slice(0, 10));

export function daysUntil(dateStr, nowMs = TODAY_MS) {
  if (!dateStr) return null;
  const target = Date.parse(String(dateStr).slice(0, 10));
  if (Number.isNaN(target)) return null;
  return Math.round((target - nowMs) / 86_400_000);
}

// THE shared status function. Returns one of:
//   "Missing" | "Verified" | "Expiring" | "Expired" | "Pending"
// - Expiry categories (White Card / Insurance / Medical) are driven entirely by
//   the uploaded document + its expiry date. No file → Missing.
// - Induction / Quiz / SWMS are completion-driven (worker column set when the
//   tradie finishes the module / quiz / signs). A file, if present, is just
//   supporting evidence and does not change the status.
export function categoryStatus(worker, key, doc, nowMs = TODAY_MS) {
  if (EXPIRY_CATEGORIES.includes(key)) {
    if (!doc || !doc.filePath) return "Missing";
    if (!doc.expiry) return "Verified";
    const days = daysUntil(doc.expiry, nowMs);
    if (days == null) return "Verified";
    if (days < 0) return "Expired";
    if (days <= EXPIRY_WARNING_DAYS) return "Expiring";
    return "Verified";
  }
  return worker?.[key] || "Missing";
}

// A category counts toward "compliant" if it is currently valid.
export function isCompliant(status) {
  return status === "Verified" || status === "Expiring";
}

// Blocks site access: no evidence at all, or expired evidence.
export function isBlocking(status) {
  return status === "Missing" || status === "Expired";
}

// Overall worker status derived live from all six effective statuses.
export function overallStatus(worker, docsForWorker = {}, nowMs = TODAY_MS) {
  const statuses = CATEGORY_KEYS.map((k) =>
    categoryStatus(worker, k, docsForWorker[k], nowMs)
  );
  if (statuses.some(isBlocking)) return "Site Access Pending";
  if (statuses.some((s) => s === "Expiring" || s === "Pending")) return "Action Required";
  return "Active";
}

// Every category is currently valid → tradie may access site.
export function canAccessSite(worker, docsForWorker = {}, nowMs = TODAY_MS) {
  return CATEGORY_KEYS.every((k) =>
    isCompliant(categoryStatus(worker, k, docsForWorker[k], nowMs))
  );
}

// Project compliance %: share of category-slots across the crew that are valid.
export function projectCompliancePercent(crew, docsByWorker, nowMs = TODAY_MS) {
  if (!crew.length) return 100;
  let compliant = 0;
  for (const w of crew) {
    const docs = docsByWorker[w.id] || {};
    for (const k of CATEGORY_KEYS) {
      if (isCompliant(categoryStatus(w, k, docs[k], nowMs))) compliant += 1;
    }
  }
  return Math.round((compliant / (crew.length * CATEGORY_KEYS.length)) * 100);
}

// { [workerId]: { [camelKey]: doc } } — the lookup both views index into.
export function indexDocuments(documents = []) {
  const byWorker = {};
  for (const d of documents) {
    (byWorker[d.workerId] ||= {})[d.category] = d;
  }
  return byWorker;
}
