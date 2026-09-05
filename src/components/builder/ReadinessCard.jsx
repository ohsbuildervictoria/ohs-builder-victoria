// ============================================================================
// Getting your site ready — the builder's onboarding checklist (P0-2).
//
// Derived, never stored: computeReadiness() (src/lib/readiness.js) via
// useReadiness(). Every actionable item deep-links to the exact screen (tab,
// modal or project) where it is done. A fresh organisation shows what is
// genuinely set up — items that cannot be checked yet (no project, no
// stakeholder) read "Not yet", never a tick. The card hides itself once
// everything is complete; "Hide for now" is a per-browser convenience that
// leaves a "Show setup guidance" control in its place.
// ============================================================================
import { Link } from "react-router-dom";
import Card, { CardHeader, CardBody } from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";
import { useReadiness, useReadinessHidden } from "../../hooks/useReadiness";
import { nextStep, progressOf } from "../../lib/readiness";
import { ShowGuidanceButton } from "./NextStepStrip";

// How each state reads on the right-hand side of a row.
const STATE_LABEL = {
  done: "Done ✓",
  open: "Open →",
  invited: "Invited · waiting →",
  in_progress: "In progress →",
  not_applicable: "Not yet",
  unknown: "Check →",
};

export default function ReadinessCard() {
  const { result, loading } = useReadiness();
  const [hidden, hide, show] = useReadinessHidden();

  if (loading || result.complete) return null;
  if (hidden) {
    return (
      <div className="flex justify-end" data-testid="readiness-card-hidden">
        <ShowGuidanceButton onClick={show} />
      </div>
    );
  }

  const { done, total, notApplicable } = progressOf(result);
  const pct = Math.round((done / total) * 100);
  const next = nextStep(result);

  return (
    <Card>
      <CardHeader
        title="Getting your site ready"
        subtitle={`${done} of ${total} set up${notApplicable ? ` · ${notApplicable} not yet applicable` : ""} — the same checklist SiteIQ reads`}
        action={
          <button type="button" onClick={hide} className="text-xs font-medium text-slate-500 hover:text-slate-700">
            Hide for now
          </button>
        }
      />
      <CardBody>
        <ProgressBar value={pct} color="bg-green-500" />
        <ol className="mt-3 space-y-2">
          {result.items.map((it, i) => {
            const isNext = next?.id === it.id;
            const actionable = it.state !== "done" && it.state !== "not_applicable";
            const row = (
              <>
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    it.done
                      ? "bg-green-500 text-white"
                      : it.state === "not_applicable"
                        ? "border-2 border-dashed border-slate-200 text-slate-300"
                        : "border-2 border-slate-300 text-slate-400"
                  }`}
                >
                  {it.done ? "✓" : i + 1}
                </span>
                <span className="flex-1">
                  <span
                    className={`block text-sm ${
                      it.done ? "text-slate-400 line-through" : it.state === "not_applicable" ? "text-slate-400" : "text-slate-700"
                    }`}
                  >
                    {it.label}
                  </span>
                  {!it.done && it.detail && <span className="block text-xs text-slate-500">{it.detail}</span>}
                </span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    it.state === "invited" ? "text-violet-700" : isNext ? "text-yellow-700" : "text-slate-400"
                  }`}
                >
                  {STATE_LABEL[it.state]}
                </span>
              </>
            );
            const cls = `flex items-center gap-3 rounded-xl border bg-white p-3 ${isNext ? "border-yellow-400" : "border-slate-200"}`;
            return (
              <li key={it.id} data-state={it.state}>
                {actionable ? (
                  <Link to={it.href} className={cls}>{row}</Link>
                ) : (
                  <div className={cls}>{row}</div>
                )}
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
