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

// "Hide for now" is a per-browser convenience kept in localStorage. Both the
// Dashboard card and the next-step strip follow it, and either can bring the
// guidance back ("Show setup guidance"); a change in one is announced to the
// other through a window event so nothing needs a reload.
export const HIDE_KEY = "ohsb.readiness.hidden";
export const HIDE_EVENT = "ohsb:readiness-hidden";

export function readHidden() {
  try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; }
}

export function setReadinessHidden(hidden) {
  try {
    if (hidden) localStorage.setItem(HIDE_KEY, "1");
    else localStorage.removeItem(HIDE_KEY);
  } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(HIDE_EVENT)); } catch { /* ignore */ }
}

export const hideReadiness = () => setReadinessHidden(true);
export const showReadiness = () => setReadinessHidden(false);

/** [hidden, hide, show] — shared across every mounted card/strip. */
export function useReadinessHidden() {
  const [hidden, setHidden] = useState(readHidden);
  useEffect(() => {
    const sync = () => setHidden(readHidden());
    window.addEventListener(HIDE_EVENT, sync);
    return () => window.removeEventListener(HIDE_EVENT, sync);
  }, []);
  return [hidden, hideReadiness, showReadiness];
}
