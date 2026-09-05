// ============================================================================
// Quiz evidence — read-only summary of a stakeholder's graded attempts.
//
// The database grades every attempt (submit_quiz, migration 008) and stores
// it in quiz_attempts; nobody can mark the Quiz category by hand
// (record_compliance_signoff refuses it). This module only SUMMARISES what
// the server recorded, for an auditor: how many attempts, when, pass/fail,
// score. It never reads the answers, never changes grading, never sets a
// status. Pure: no I/O, no React.
// ============================================================================

export const ATTEMPT_FIELDS = ["id", "worker_id", "score", "total", "passed", "attempted_at"];

export function mapAttempt(r) {
  return {
    id: r.id,
    workerId: r.worker_id,
    score: r.score,
    total: r.total,
    passed: r.passed === true,
    attemptedAt: r.attempted_at,
  };
}

/** summariseAttempts(attempts, quizStatus) — attempts newest first.
 *  quizStatus is the worker's current Quiz column ('Verified' | 'Pending' | 'Missing'). */
export function summariseAttempts(attempts = [], quizStatus = null) {
  const list = [...attempts].sort((a, b) => String(b.attemptedAt).localeCompare(String(a.attemptedAt)));
  const passed = list.filter((a) => a.passed);
  const firstPass = passed.length ? passed[passed.length - 1] : null;
  const latest = list[0] || null;
  let evidence;
  if (!list.length) evidence = quizStatus === "Verified" ? "tick_without_attempt" : "no_attempt";
  else if (firstPass) evidence = quizStatus === "Verified" ? "passed" : "passed_tick_missing";
  else evidence = "failed_only";
  return { count: list.length, passedCount: passed.length, latest, firstPass, evidence, attempts: list };
}

export const EVIDENCE_TEXT = {
  no_attempt: "No attempt recorded yet — the stakeholder has not sat the quiz.",
  failed_only: "Attempted but not yet passed — every question must be answered correctly.",
  passed: "Passed — graded by the database; the tick is backed by the attempt below.",
  passed_tick_missing: "A passing attempt is recorded but the Quiz column is not Verified — re-check with support.",
  tick_without_attempt: "The Quiz column is Verified but no graded attempt is recorded (legacy or education sandbox data) — treat the tick as unevidenced.",
};
