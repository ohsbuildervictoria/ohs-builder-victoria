// ============================================================================
// Getting your site ready — the builder's onboarding checklist (P0-2).
//
// Derived, never stored: computeReadiness() (src/lib/readiness.js) runs on
// the data AppContext already holds plus one read of the quiz bank (the same
// fetcher Policies → Safety Quiz uses; RLS scopes it to this organisation).
// Every item deep-links to the screen where it is done. The card hides
// itself once everything is complete; "Hide for now" is a per-browser
// convenience in localStorage only. No write path, no new permission.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardHeader, CardBody } from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";
import { useAppContext } from "../../context/AppContext";
import { fetchQuizBank } from "../../lib/api";
import { computeReadiness } from "../../lib/readiness";

const HIDE_KEY = "ohsb.readiness.hidden";

export default function ReadinessCard() {
  const { org, profiles, projects, policies, companies, companyDocs, workers, templates, projectRisks, meetings, loading } =
    useAppContext();
  const [quizBank, setQuizBank] = useState(undefined);   // undefined = not read yet / unreadable
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    let alive = true;
    fetchQuizBank()
      .then((rows) => { if (alive) setQuizBank(rows); })
      .catch(() => { if (alive) setQuizBank(undefined); });
    return () => { alive = false; };
  }, []);

  const result = useMemo(
    () => computeReadiness({ org, profiles, projects, quizBank, policies, companies, companyDocs, workers, templates, projectRisks, meetings }),
    [org, profiles, projects, quizBank, policies, companies, companyDocs, workers, templates, projectRisks, meetings]
  );

  if (loading || hidden || result.complete) return null;

  const done = result.items.length - result.outstanding;
  const pct = Math.round((done / result.items.length) * 100);
  const next = result.items.find((i) => !i.done);

  const hide = () => {
    try { localStorage.setItem(HIDE_KEY, "1"); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <Card>
      <CardHeader
        title="Getting your site ready"
        subtitle={`${done} of ${result.items.length} set up — the same checklist SiteIQ reads`}
        action={
          <button type="button" onClick={hide} className="text-xs font-medium text-slate-500 hover:text-slate-700">
            Hide for now
          </button>
        }
      />
      <CardBody>
        <ProgressBar value={pct} color="bg-green-500" />
        <ol className="mt-3 space-y-2">
          {result.items.map((it, i) => (
            <li key={it.id}>
              <Link
                to={it.href}
                className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${
                  it.done ? "border-slate-200" : next?.id === it.id ? "border-yellow-400" : "border-slate-200"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    it.done ? "bg-green-500 text-white" : "border-2 border-slate-300 text-slate-400"
                  }`}
                >
                  {it.done ? "✓" : i + 1}
                </span>
                <span className="flex-1">
                  <span className={`block text-sm ${it.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{it.label}</span>
                  {!it.done && (
                    <span className="block text-xs text-slate-500">
                      {it.unknown ? "couldn't check — open the page to confirm" : it.detail}
                    </span>
                  )}
                </span>
                <span className="text-xs font-medium text-slate-400">{it.done ? "Done ✓" : "Open →"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
