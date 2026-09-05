// ============================================================================
// Account kind — is this account a HUMAN or the SiteIQ AUTOMATED persona?
//
// Attribution model (SiteIQ operator architecture): [SITEIQ] intelligence,
// [AGENT] browser action, [USER] human action, [SERVER/AUTOMATION] backend.
// The SiteIQ persona is an ordinary hse_manager login under RLS; the database
// has no "automated" flag on profiles and adding one would be a migration.
// The deterministic rule used everywhere instead: an account whose display
// name starts with the reserved word "SiteIQ" is the automated persona. That
// name is what the server stamps into evidence (verified_by_name,
// completed_by_name, audit changed_by), so the marker follows the persona
// into every place its identity is shown without touching the schema.
//
// Guard rails so the marker never lands on an ordinary person:
//   * stakeholders/tradies (role 'worker') are ALWAYS human, whatever the name;
//   * the reserved word must be at the start and whole ("SiteIQ (assistant)",
//     "SiteIQ" — never "Siteiqbal", "Site IQ Pty Ltd" or "my SiteIQ");
//   * the runbook reserves the name for the persona invite; a human staff
//     member should not be given it (the Admin Portal says so at invite time).
// Pure: no I/O, no React.
// ============================================================================

export const AUTOMATED_NAME_RX = /^siteiq(?![a-z0-9])/i;
export const AUTOMATED_LABEL = "Automated account · SiteIQ";
export const AUTOMATED_SHORT = "automated";
export const STAFF_ROLES = ["builder_admin", "hse_manager", "site_supervisor"];

/** accountKind({ name, role }) -> "automated" | "human". role is optional;
 *  when it is a known non-staff role (worker, education) the answer is human. */
export function accountKind({ name, role } = {}) {
  if (role && !STAFF_ROLES.includes(role)) return "human";
  const n = String(name ?? "").trim();
  return AUTOMATED_NAME_RX.test(n) ? "automated" : "human";
}

export function isAutomatedAccount(input) {
  return accountKind(typeof input === "string" ? { name: input } : input || {}) === "automated";
}

/** Name for evidence lines ("Verified by …"): appends the marker for the
 *  persona, leaves a human name untouched. Names on evidence rows are always
 *  staff (only staff can verify/complete), so no role is needed. */
export function attributedName(name, fallback = "") {
  const n = String(name ?? "").trim() || fallback;
  if (!n) return "";
  return isAutomatedAccount(n) ? `${n} (${AUTOMATED_SHORT} account)` : n;
}
