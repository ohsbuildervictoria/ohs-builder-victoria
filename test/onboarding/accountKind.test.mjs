// ============================================================================
// Account kind — the SiteIQ persona is marked "automated", nobody else is.
//   npm run test:onboarding
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { accountKind, isAutomatedAccount, attributedName, AUTOMATED_NAME_RX, STAFF_ROLES } from "../../src/lib/accountKind.js";

const humans = [
  "Saroj Sanjel", "P0 Tenant Admin", "Site Supervisor", "Siteiqbal Khan", "Site IQ Pty Ltd",
  "my SiteIQ", "SITEIQ2 Holdings", "siteiqx", "", " ", null, undefined, "Mia Kowalski", "Rehearsal Worker",
];
const personas = ["SiteIQ (assistant)", "SiteIQ", "siteiq", "SITEIQ (assistant)", "SiteIQ assistant", "  SiteIQ (assistant)  ", "SiteIQ-2"];

test("ordinary human names are human, in every staff role and with no role", () => {
  for (const name of humans) {
    assert.equal(accountKind({ name }), "human", `name=${name}`);
    for (const role of STAFF_ROLES) assert.equal(accountKind({ name, role }), "human", `name=${name} role=${role}`);
    assert.equal(isAutomatedAccount(name), false);
  }
});

test("the persona name is automated for staff roles and when the role is unknown", () => {
  for (const name of personas) {
    assert.equal(accountKind({ name }), "automated", `name=${name}`);
    for (const role of STAFF_ROLES) assert.equal(accountKind({ name, role }), "automated", `name=${name} role=${role}`);
  }
});

test("a stakeholder/tradie is NEVER marked automated, whatever the name", () => {
  for (const name of personas) {
    assert.equal(accountKind({ name, role: "worker" }), "human", `name=${name}`);
    assert.equal(isAutomatedAccount({ name, role: "worker" }), false);
  }
  assert.equal(accountKind({ name: "SiteIQ (assistant)", role: "student" }), "human");
  assert.equal(accountKind({ name: "SiteIQ (assistant)", role: "assessor" }), "human");
});

test("reserved word must be whole and at the start", () => {
  assert.equal(AUTOMATED_NAME_RX.test("SiteIQ"), true);
  assert.equal(AUTOMATED_NAME_RX.test("SiteIQ (assistant)"), true);
  assert.equal(AUTOMATED_NAME_RX.test("Siteiqbal"), false);
  assert.equal(AUTOMATED_NAME_RX.test("SITEIQ2"), false);
  assert.equal(AUTOMATED_NAME_RX.test("Ask SiteIQ"), false);
});

test("evidence lines: persona gets the marker, humans and fallbacks do not", () => {
  assert.equal(attributedName("SiteIQ (assistant)"), "SiteIQ (assistant) (automated account)");
  assert.equal(attributedName("Saroj Sanjel"), "Saroj Sanjel");
  assert.equal(attributedName(null, "builder"), "builder");
  assert.equal(attributedName("", "your builder"), "your builder");
  assert.equal(attributedName(undefined), "");
});

test("deterministic and pure", () => {
  const a = accountKind({ name: "SiteIQ (assistant)", role: "hse_manager" });
  const b = accountKind({ name: "SiteIQ (assistant)", role: "hse_manager" });
  assert.equal(a, b);
});
