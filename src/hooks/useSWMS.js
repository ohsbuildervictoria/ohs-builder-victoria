import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";

// Recomputes a template's status from its signed/total counts and lock flag.
function computeStatus(t) {
  if (t.status === "Template Required") return "Template Required";
  if (t.signed >= t.total) return "Compliant";
  if (t.locked) return "Pending";
  return "Pending Compliance";
}

// { templates, getTemplate, signSWMS, lockTemplate, signOffStats }
export function useSWMS(trade = null) {
  const { templates, setTemplates } = useAppContext();

  const scoped = useMemo(
    () => (trade ? templates.filter((t) => t.trade === trade) : templates),
    [templates, trade]
  );

  const getTemplate = useCallback(
    (id) => templates.find((t) => t.id === Number(id)) || null,
    [templates]
  );

  const signSWMS = useCallback(
    (id) => {
      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id !== Number(id)) return t;
          const signed = Math.min(t.signed + 1, t.total);
          const updated = { ...t, signed };
          return { ...updated, status: computeStatus(updated) };
        })
      );
    },
    [setTemplates]
  );

  const lockTemplate = useCallback(
    (id) => {
      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id !== Number(id)) return t;
          const updated = { ...t, locked: true };
          return { ...updated, status: computeStatus(updated) };
        })
      );
    },
    [setTemplates]
  );

  const signOffStats = useMemo(() => {
    const totalTemplates = templates.length;
    const totalSigned = templates.reduce((s, t) => s + t.signed, 0);
    const totalRequired = templates.reduce((s, t) => s + t.total, 0);
    const percent = totalRequired
      ? Math.round((totalSigned / totalRequired) * 100)
      : 0;
    return { totalTemplates, totalSigned, totalRequired, percent };
  }, [templates]);

  return { templates: scoped, getTemplate, signSWMS, lockTemplate, signOffStats };
}
