// ============================================================================
// Workspace state — the ONE rule for "does this signed-in account have the
// workspace it needs?" (onboarding step 0:00, blueprint G14/G15/G16).
//
// Signup is two server steps: auth.signUp (creates the auth user; the
// handle_new_user trigger creates a profile with role 'worker' and no
// organisation) and then the signup_create_org RPC (creates the organisation,
// promotes the profile to builder_admin, seeds the quiz). If the second step
// fails or never runs, the account is STRANDED: signed in, role 'worker', no
// organisation, no worker record — it belongs to no site and no workspace.
// The rehearsal on 2026-09-05 produced exactly that (organisation 16 was only
// completed by calling the RPC again), and the owner's own production profile
// is in the same state.
//
// The recovery is the same idempotent RPC, offered only to accounts in that
// exact state. A real tradie (worker record present, organisation set) is
// never offered it; a builder with an organisation is never offered it.
// Pure: no I/O, no React.
// ============================================================================

export const WORKSPACE_STATES = ["signed_out", "loading", "builder", "worker", "education", "missing_workspace"];

export function workspaceState({ user, permissions } = {}) {
  if (!user) return "signed_out";
  const edu = permissions?.education;
  if (edu?.role) return "education";
  if (user.role === "builder_admin" || user.role === "hse_manager" || user.role === "site_supervisor") return "builder";
  if (user.role === "institution_admin" || user.role === "assessor") return "education";
  if (user.role === "worker") {
    if (user.workerId) return "worker";                 // a tradie linked to a site
    if (permissions === undefined || permissions === null) return "loading";
    if (permissions.organizationId == null) return "missing_workspace";
    return "worker";
  }
  return "loading";
}

export function isStranded(ctx) {
  return workspaceState(ctx) === "missing_workspace";
}
