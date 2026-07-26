import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchSwmsSignatures } from "../lib/api";

// The SWMS signature register, loaded on demand.
//
// It isn't in AppContext because it is only needed on the SWMS screen and in
// the sign-off export — and because it should be read fresh when someone is
// about to rely on it as evidence, not served from a cache that was warm when
// the page loaded.
export function useSwmsSignatures() {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSignatures(await fetchSwmsSignatures());
      setError(null);
    } catch (err) {
      setError(err.message || "Could not load the signature register");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetchSwmsSignatures()
      .then((rows) => alive && setSignatures(rows))
      .catch((err) => alive && setError(err.message || "Could not load the signature register"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const byTemplate = useMemo(() => {
    const map = {};
    for (const s of signatures) (map[s.templateId] ||= []).push(s);
    return map;
  }, [signatures]);

  // Signatures against a version the template has moved past. A tick that
  // stands on an old version is not the same as a current one, and until the
  // register was visible there was no way to tell them apart.
  const staleFor = useCallback(
    (template) =>
      (byTemplate[template?.id] || []).filter(
        (s) => (s.version || "") !== (template?.version || "")
      ),
    [byTemplate]
  );

  const currentFor = useCallback(
    (template) =>
      (byTemplate[template?.id] || []).filter(
        (s) => (s.version || "") === (template?.version || "")
      ),
    [byTemplate]
  );

  return { signatures, byTemplate, currentFor, staleFor, loading, error, reload };
}
