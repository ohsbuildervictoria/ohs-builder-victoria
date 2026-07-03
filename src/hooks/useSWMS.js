import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { signSwmsRpc, updateTemplateRow } from "../lib/api";

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
    async (id) => {
      const current = templates.find((t) => t.id === Number(id));
      if (!current) return;
      await signSwmsRpc(Number(id));
      const updated = { ...current, signed: current.signed + 1 };
      const status = computeStatus(updated);
      // keep the derived status in sync in the DB (best effort)
      updateTemplateRow(updated.id, { status }).catch(() => {});
      setTemplates((prev) =>
        prev.map((t) => (t.id === Number(id) ? { ...updated, status } : t))
      );
    },
    [templates, setTemplates]
  );

  const lockTemplate = useCallback(
    async (id) => {
      const current = templates.find((t) => t.id === Number(id));
      if (!current) return;
      const updated = { ...current, locked: true };
      const status = computeStatus(updated);
      await updateTemplateRow(Number(id), { locked: true, status });
      setTemplates((prev) =>
        prev.map((t) => (t.id === Number(id) ? { ...updated, status } : t))
      );
    },
    [templates, setTemplates]
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
