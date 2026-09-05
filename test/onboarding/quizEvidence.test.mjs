// ============================================================================
// Quiz evidence summary — pure tests. The server grades; this only reads.
//   npm run test:onboarding
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapAttempt, summariseAttempts, ATTEMPT_FIELDS, EVIDENCE_TEXT } from "../../src/lib/quizEvidence.js";

const row = (id, passed, score, at) => ({ id, worker_id: 114, score, total: 5, passed, answers: [{ id: 1, answer: 1 }], attempted_at: at });

test("mapAttempt keeps only auditor fields — never the answers", () => {
  const m = mapAttempt(row(1, true, 5, "2026-09-05T06:00:00Z"));
  assert.deepEqual(Object.keys(m).sort(), ["attemptedAt", "id", "passed", "score", "total", "workerId"].sort());
  assert.equal("answers" in m, false);
  assert.equal(ATTEMPT_FIELDS.includes("answers"), false);
});

test("no attempts", () => {
  const s = summariseAttempts([], "Missing");
  assert.equal(s.count, 0); assert.equal(s.evidence, "no_attempt"); assert.equal(s.latest, null);
});

test("failed only", () => {
  const s = summariseAttempts([mapAttempt(row(1, false, 3, "2026-09-05T06:00:00Z"))], "Missing");
  assert.equal(s.evidence, "failed_only"); assert.equal(s.passedCount, 0); assert.equal(s.latest.score, 3);
});

test("passed with tick: newest first, firstPass is the earliest passing attempt", () => {
  const s = summariseAttempts([
    mapAttempt(row(1, false, 2, "2026-09-05T06:00:00Z")),
    mapAttempt(row(3, true, 5, "2026-09-05T06:20:00Z")),
    mapAttempt(row(2, true, 5, "2026-09-05T06:10:00Z")),
  ], "Verified");
  assert.equal(s.evidence, "passed");
  assert.deepEqual(s.attempts.map((a) => a.id), [3, 2, 1]);
  assert.equal(s.firstPass.id, 2);
  assert.equal(s.latest.id, 3);
});

test("inconsistencies are named, never smoothed over", () => {
  assert.equal(summariseAttempts([mapAttempt(row(1, true, 5, "2026-09-05T06:00:00Z"))], "Missing").evidence, "passed_tick_missing");
  assert.equal(summariseAttempts([], "Verified").evidence, "tick_without_attempt");
  for (const k of ["no_attempt", "failed_only", "passed", "passed_tick_missing", "tick_without_attempt"]) assert.ok(EVIDENCE_TEXT[k]);
});

test("pure: input not mutated", () => {
  const input = [mapAttempt(row(1, false, 2, "2026-09-05T06:00:00Z")), mapAttempt(row(2, true, 5, "2026-09-05T06:10:00Z"))];
  const snap = JSON.stringify(input);
  summariseAttempts(input, "Verified");
  assert.equal(JSON.stringify(input), snap);
});
