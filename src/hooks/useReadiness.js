import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { fetchQuizBank } from "../lib/api";
import { computeReadiness } from "../lib/readiness";

// The builder's onboarding readiness, derived from what AppContext already
// holds plus one read of the quiz bank (the same fetcher Policies → Safety
// Quiz uses; RLS scopes it to this organisation). Re-read after every
// background refresh and whenever the caller's refreshKey changes (the
// next-step strip passes the route, so a question added on the Policies page
// is seen on the next navigation). No write path, no new permission.
export function useReadiness(refreshKey = null) {
  const { org, profiles, invites, projects, policies, companies, companyDocs, workers, templates, projectRisks, meetings, loading } =
    useAppContext();
  const [quizBank, setQuizBank] = useState(undefined);   // undefined = not read yet / unreadable

  useEffect(() => {
    if (loading) return undefined;
    let alive = true;
    fetchQuizBank()
      .then((rows) => { if (alive) setQuizBank(rows); })
      .catch(() => { if (alive) setQuizBank(undefined); });
    return () => { alive = false; };
  }, [loading, refreshKey]);

  const result = useMemo(
    () => computeReadiness({ org, profiles, invites, projects, quizBank, policies, companies, companyDocs, workers, templates, projectRisks, meetings }),
    [org, profiles, invites, projects, quizBank, policies, companies, companyDocs, workers, templates, projectRisks, meetings]
  );

  return { result, loading };
}

// "Hide for now" on the Dashboard card is a per-browser convenience; the
// next-step strip follows it so hiding the checklist really hides it.
export const HIDE_KEY = "ohsb.readiness.hidden";
export const HIDE_EVENT = "ohsb:readiness-hidden";

export function readHidden() {
  try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; }
}

export function hideReadiness() {
  try { localStorage.setItem(HIDE_KEY, "1"); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(HIDE_EVENT)); } catch { /* ignore */ }
}
