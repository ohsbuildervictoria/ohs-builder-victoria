import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { signSwmsRpc, updateTemplateRow, fetchTemplateRow } from "../lib/api";

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
      // The RPC no-ops on locked templates, so status must come from what the
      // DB actually holds — never from an optimistic local increment.
      const fresh = await fetchTemplateRow(Number(id));
      if (!fresh) return;
      const status = computeStatus(fresh);
      if (status !== fresh.status) {
        updateTemplateRow(fresh.id, { status }).catch(() => {});
      }
      setTemplates((prev) =>
        prev.map((t) => (t.id === fresh.id ? { ...fresh, status } : t))
      );
      if (fresh.signed === current.signed) {
        throw new Error(
          "No signature recorded — this SWMS is locked for sign-off. Unlock it first."
        );
      }
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
