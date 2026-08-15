// Project Risk Register — the 5x5 assessment matrix and its vocabulary.
// One place defines the rating maths so the table, the matrix picker, the
// dashboard counts and the PDF all agree.

export const RISK_CATEGORIES = [
  "Falls",
  "Electrical",
  "Manual Handling",
  "Plant & Equipment",
  "Hazardous Substances",
  "Environment",
  "Public Safety",
  "General",
];

export const RISK_STATUSES = ["Open", "Controlled", "Closed"];

export const LIKELIHOOD_LABELS = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
export const CONSEQUENCE_LABELS = ["Insignificant", "Minor", "Moderate", "Major", "Severe"];

// Standard qualitative bands over likelihood x consequence (1–5 each).
export function riskRating(likelihood, consequence) {
  const l = Number(likelihood), c = Number(consequence);
  if (!(l >= 1 && l <= 5 && c >= 1 && c <= 5)) return null;
  const score = l * c;
  if (score >= 20) return "Extreme";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export const RATING_STYLES = {
  Low: { badge: "bg-green-100 text-green-800", cell: "bg-green-500", hex: "#16a34a" },
  Medium: { badge: "bg-yellow-100 text-yellow-800", cell: "bg-yellow-400", hex: "#ca8a04" },
  High: { badge: "bg-orange-100 text-orange-800", cell: "bg-orange-500", hex: "#ea580c" },
  Extreme: { badge: "bg-red-100 text-red-800", cell: "bg-red-600", hex: "#dc2626" },
};

// A risk that should be visible on dashboards: still open, rated High/Extreme
// on its CURRENT (pre-residual) assessment unless residual numbers exist —
// once controls are recorded, the residual rating is the honest one.
export function effectiveRating(risk) {
  if (risk.residualLikelihood && risk.residualConsequence) {
    return riskRating(risk.residualLikelihood, risk.residualConsequence);
  }
  return riskRating(risk.likelihood, risk.consequence);
}

export function isOpenHighRisk(risk) {
  if (risk.status === "Closed") return false;
  const rating = effectiveRating(risk);
  return rating === "High" || rating === "Extreme";
}

// Best-effort mapping of a free-text hazard/task onto a register category so
// SWMS-seeded rows arrive pre-classified instead of all "General".
export function guessCategory(text) {
  const t = (text || "").toLowerCase();
  if (/fall|height|scaffold|ladder|roof|edge/.test(t)) return "Falls";
  if (/electri|shock|arc|power lead|rcd|live/.test(t)) return "Electrical";
  if (/manual handling|lift|musculoskeletal|strain|carry/.test(t)) return "Manual Handling";
  if (/plant|crane|excavator|bobcat|forklift|machine|saw|nail gun|tool/.test(t)) return "Plant & Equipment";
  if (/silica|dust|asbestos|chemical|fume|solvent|epoxy/.test(t)) return "Hazardous Substances";
  if (/weather|storm|heat|environment|spill|sediment/.test(t)) return "Environment";
  if (/public|pedestrian|traffic|passer/.test(t)) return "Public Safety";
  return "General";
}

// Seed likelihood/consequence for SWMS-imported hazards from the library's own
// qualitative risk word; the builder refines afterwards.
export function seedScores(riskWord) {
  switch ((riskWord || "").toLowerCase()) {
    case "extreme": return { likelihood: 4, consequence: 5 };
    case "high": return { likelihood: 4, consequence: 4 };
    case "medium": return { likelihood: 3, consequence: 3 };
    case "low": return { likelihood: 2, consequence: 2 };
    default: return { likelihood: 3, consequence: 3 };
  }
}
