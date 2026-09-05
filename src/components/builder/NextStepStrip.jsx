// ============================================================================
// Next-step strip — one line above every builder page (except the Dashboard,
// which shows the full checklist): "Project created ✓ · Next: … →".
//
// Derived from the same readiness result as the Dashboard card, so it moves
// the moment a setup action lands: when the item it was pointing at becomes
// done, that item is acknowledged and the following open item is offered.
// Hidden once everything is complete, and when the builder hid the checklist.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useReadiness, readHidden, HIDE_EVENT } from "../../hooks/useReadiness";
import { nextStep, progressOf } from "../../lib/readiness";

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

export default function NextStepStrip() {
  const location = useLocation();
  const { result, loading } = useReadiness(location.pathname);
  const [hidden, setHidden] = useState(readHidden);
  const [justDone, setJustDone] = useState(null);       // item acknowledged this session
  const lastNext = useRef(null);                        // id the strip last pointed at

  useEffect(() => {
    const onHide = () => setHidden(true);
    window.addEventListener(HIDE_EVENT, onHide);
    return () => window.removeEventListener(HIDE_EVENT, onHide);
  }, []);

  const next = loading ? null : nextStep(result);
  // Track the transition "the item we pointed at is now done" — that is the
  // moment the builder finished a setup action.
  useEffect(() => {
    if (loading) return;
    const prev = lastNext.current;
    if (prev && next?.id !== prev) {
      const prevItem = result.items.find((i) => i.id === prev);
      if (prevItem?.state === "done") setJustDone(prevItem);
    }
    lastNext.current = next?.id || null;
  }, [loading, next, result]);

  if (loading || hidden || result.complete || !next) return null;
  if (location.pathname === "/builder/dashboard") return null;

  const { done, total } = progressOf(result);
  return (
    <div
      data-testid="next-step-strip"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm"
    >
      {justDone && (
        <span className="font-medium text-green-700">{DONE_TEXT[justDone.id] || justDone.label} ✓</span>
      )}
      <span className="text-slate-700">
        <span className="font-semibold">Next:</span>{" "}
        <Link to={next.href} className="font-medium text-blue-900 underline decoration-yellow-400 underline-offset-2 hover:text-blue-700">
          {next.label} →
        </Link>
      </span>
      <Link to="/builder/dashboard" className="ml-auto text-xs text-slate-500 hover:text-slate-700">
        {done} of {total} set up · checklist
      </Link>
    </div>
  );
}
