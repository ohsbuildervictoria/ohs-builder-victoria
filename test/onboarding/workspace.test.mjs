// ============================================================================
// Workspace state (signup step 0:00) — pure-rule tests.
//   npm run test:onboarding
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { workspaceState, isStranded, WORKSPACE_STATES } from "../../src/lib/workspace.js";
import { homeRouteFor } from "../../src/lib/eduRoutes.js";

const builder = { id: "u1", role: "builder_admin", workerId: null };
const hse = { id: "u2", role: "hse_manager", workerId: null };
const tradie = { id: "u3", role: "worker", workerId: 114 };
const stranded = { id: "u4", role: "worker", workerId: null };
const withOrg = { organizationId: 16, role: "builder_admin" };
const noOrg = { organizationId: null, role: "worker" };
const tradiePerms = { organizationId: 16, role: "worker" };

test("states are the documented set", () => {
  assert.deepEqual(WORKSPACE_STATES, ["signed_out", "loading", "builder", "worker", "education", "missing_workspace"]);
});

test("signed out / loading", () => {
  assert.equal(workspaceState({}), "signed_out");
  assert.equal(workspaceState({ user: null, permissions: withOrg }), "signed_out");
  assert.equal(workspaceState({ user: stranded, permissions: undefined }), "loading");
  assert.equal(workspaceState({ user: stranded, permissions: null }), "loading");
});

test("builders and staff are never stranded, whatever permissions say", () => {
  assert.equal(workspaceState({ user: builder, permissions: withOrg }), "builder");
  assert.equal(workspaceState({ user: hse, permissions: withOrg }), "builder");
  assert.equal(workspaceState({ user: builder, permissions: noOrg }), "builder");   // owner's prod profile: builder without org is NOT offered recovery
  assert.equal(isStranded({ user: builder, permissions: noOrg }), false);
});

test("a real tradie (worker record) is never offered the recovery, even with a null organisation", () => {
  assert.equal(workspaceState({ user: tradie, permissions: tradiePerms }), "worker");
  assert.equal(workspaceState({ user: tradie, permissions: noOrg }), "worker");
  assert.equal(isStranded({ user: tradie, permissions: noOrg }), false);
});

test("stranded = role worker, no worker record, permissions loaded with no organisation", () => {
  assert.equal(workspaceState({ user: stranded, permissions: noOrg }), "missing_workspace");
  assert.equal(isStranded({ user: stranded, permissions: noOrg }), true);
  // the moment the organisation exists (RPC done, permissions reloaded) it is a worker no more
  assert.equal(workspaceState({ user: stranded, permissions: { organizationId: 17, role: "worker" } }), "worker");
  assert.equal(workspaceState({ user: { ...stranded, role: "builder_admin" }, permissions: { organizationId: 17, role: "builder_admin" } }), "builder");
});

test("education roles take precedence and are never stranded", () => {
  assert.equal(workspaceState({ user: stranded, permissions: { organizationId: null, education: { role: "student" } } }), "education");
  assert.equal(workspaceState({ user: { id: "u5", role: "institution_admin" }, permissions: noOrg }), "education");
});

test("home route: stranded -> /signup (recovery); everyone else unchanged", () => {
  assert.equal(homeRouteFor(null, null), "/login");
  assert.equal(homeRouteFor(stranded, noOrg), "/signup");
  assert.equal(homeRouteFor(stranded, undefined), "/worker/home");   // permissions not loaded yet: old behaviour, no guess
  assert.equal(homeRouteFor(tradie, tradiePerms), "/worker/home");
  assert.equal(homeRouteFor(tradie, noOrg), "/worker/home");
  assert.equal(homeRouteFor(builder, withOrg), "/builder/dashboard");
  assert.equal(homeRouteFor(builder, noOrg), "/builder/dashboard");
  assert.equal(homeRouteFor(stranded, { organizationId: null, education: { role: "assessor" } }), "/education/assess");
});
