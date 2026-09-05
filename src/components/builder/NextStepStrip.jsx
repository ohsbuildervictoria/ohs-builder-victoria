// ============================================================================
// Next-step strip — one line above every builder page (except the Dashboard,
// which shows the full checklist): "Project created ✓ · Next: … →".
//
// Derived from the same readiness result as the Dashboard card, so it moves
// the moment a setup action lands: when the item it was pointing at becomes
// done, that item is acknowledged and the following actionable item is
// offered. An "invited" item is waiting on somebody else, so it is never
// offered as the builder's next task: it is named as waiting, and the strip
// points past it to the first thing the builder can do now.
// Hidden once everything is complete. "Hide for now" hides it, leaving a
// small "Show setup guidance" control so the builder can bring it back.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useReadiness, useReadinessHidden } from "../../hooks/useReadiness";
import { nextAction, waitingItems, progressOf } from "../../lib/readiness";

// Short past-tense acknowledgement per item, for the "✓" half of the strip.
const DONE_TEXT = {
  setup_org_profile_incomplete: "Organisation profile saved",
  setup_no_hse_manager: "HSE manager active",
  setup_no_active_project: "Project created and Active",
  setup_induction_incomplete: "Induction set on every active project",
  setup_quiz_bank_empty: "Safety quiz ready",
  setup_no_published_policy: "Policy published",
  setup_company_uninsured: "Subcontractor insurance in place",
  setup_worker_without_trade: "Every stakeholder has a work type",
  setup_swms_not_locked: "SWMS locked for every work type",
  setup_risk_register_empty: "Risk register started",
  setup_no_toolbox_scheduled: "Toolbox meeting scheduled",
};

// How a waiting item reads: what has been done, and what is being waited for.
const WAITING_TEXT = {
  setup_no_hse_manager: { done: "HSE manager invited", waiting: "waiting for them to accept and set a password" },
};

export function ShowGuidanceButton({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 ${className}`}
    >
      Show setup guidance
    </button>
  );
}

export default function NextStepStrip() {
  const location = useLocation();
  const { result, loading } = useReadiness(location.pathname);
  const [hidden, , show] = useReadinessHidden();
  const [justDone, setJustDone] = useState(null);       // item acknowledged this session
  const lastNext = useRef(null);                        // { id, state } the strip last pointed at

  const action = loading ? null : nextAction(result);
  const waiting = loading ? [] : waitingItems(result);
  // Track the transition "the item we pointed at is now done" — that is the
  // moment the builder finished a setup action. A waiting item never blocks
  // this: the pointer only ever rests on something the builder can act on.
  // An "unknown" item resolving to done (the quiz bank finishing its read)
  // is not the builder's doing and is not acknowledged.
  useEffect(() => {
    if (loading) return;
    const prev = lastNext.current;
    if (prev && action?.id !== prev.id) {
      const prevItem = result.items.find((i) => i.id === prev.id);
      if (prevItem?.state === "done" && prev.state !== "unknown") setJustDone(prevItem);
    }
    lastNext.current = action ? { id: action.id, state: action.state } : null;
  }, [loading, action, result]);

  if (loading || result.complete) return null;
  if (location.pathname === "/builder/dashboard") return null;
  if (hidden) {
    return (
      <div className="mb-2 flex justify-end" data-testid="next-step-strip-hidden">
        <ShowGuidanceButton onClick={show} />
      </div>
    );
  }
  if (!action && !waiting.length) return null;

  const { done, total } = progressOf(result);
  const waitingOn = waiting[0];
  const waitingText = waitingOn && (WAITING_TEXT[waitingOn.id] || { done: waitingOn.label, waiting: waitingOn.detail });
  return (
    <div
      data-testid="next-step-strip"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm"
    >
      {justDone && (
        <span className="font-medium text-green-700">{DONE_TEXT[justDone.id] || justDone.label} ✓</span>
      )}
      {waitingOn && (
        <span className="text-violet-800" data-testid="next-step-waiting">
          <span className="font-medium">{waitingText.done} ✓</span>
          {!action && (
            <>
              {" · "}
              <Link to={waitingOn.href} className="underline decoration-violet-300 underline-offset-2 hover:text-violet-900">
                Waiting for them to accept →
              </Link>
            </>
          )}
        </span>
      )}
      {action && (
        <span className="text-slate-700">
          <span className="font-semibold">Next:</span>{" "}
          <Link to={action.href} className="font-medium text-blue-900 underline decoration-yellow-400 underline-offset-2 hover:text-blue-700">
            {action.label} →
          </Link>
        </span>
      )}
      <Link to="/builder/dashboard" className="ml-auto text-xs text-slate-500 hover:text-slate-700">
        {done} of {total} set up · checklist
      </Link>
    </div>
  );
}
