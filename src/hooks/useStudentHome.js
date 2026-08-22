import { useCallback, useEffect, useState } from "react";
import { fetchStudentHome } from "../lib/eduApi";

// One call (public.edu_student_home) feeds every student page. A tiny module
// cache stops each navigation between the training pages from re-evaluating
// progress; refresh() forces it (after a task, a submit, a reopen).
let cache = null;
let inflight = null;
const listeners = new Set();

function broadcast() {
  for (const l of listeners) l(cache);
}

export function invalidateStudentHome() {
  cache = null;
}

export function useStudentHome({ refreshOnMount = true } = {}) {
  const [home, setHome] = useState(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      inflight ||= fetchStudentHome();
      const data = await inflight;
      cache = data;
      broadcast();
      return data;
    } catch (err) {
      setError(err.message || "Could not load your training.");
      throw err;
    } finally {
      inflight = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const l = (v) => setHome(v);
    listeners.add(l);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/reload fetch; same pattern as the rest of the app
    if (!cache || refreshOnMount) refresh().catch(() => {});
    return () => listeners.delete(l);
  }, [refresh, refreshOnMount]);

  // Optimistic local patch (e.g. ui state) without a round trip.
  const patch = useCallback((fn) => {
    if (!cache) return;
    cache = fn(cache);
    broadcast();
  }, []);

  return { home, loading, error, refresh, patch };
}
