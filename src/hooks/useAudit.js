import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { logEdit } from "../lib/api";

// Compares the given fields on two objects and returns { field: {from, to} }
// for the ones that actually changed. Values are normalised to strings so a
// numeric "8" and a text "8" don't register as a change.
export function diffFields(before, after, fields) {
  const changes = {};
  for (const { key, label } of fields) {
    const a = before?.[key];
    const b = after?.[key];
    const av = Array.isArray(a) ? a.join(", ") : a == null ? "" : String(a);
    const bv = Array.isArray(b) ? b.join(", ") : b == null ? "" : String(b);
    if (av !== bv) changes[label || key] = { from: av, to: bv };
  }
  return changes;
}

// Shared audit trail. Both the diary and incident editors record through
// record() so the "edited by X, was: Y" history is written the same way, and
// entriesFor() reads the same audit_log rows both views display.
export function useAudit() {
  const { audits, setAudits } = useAppContext();
  const { user } = useAuthContext();

  const entriesFor = useCallback(
    (entity, entityId) =>
      audits
        .filter((a) => a.entity === entity && a.entityId === Number(entityId))
        .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)),
    [audits]
  );

  const record = useCallback(
    async (entity, entityId, changes) => {
      if (!changes || Object.keys(changes).length === 0) return null;
      const saved = await logEdit({
        entity,
        entityId: Number(entityId),
        changedBy: user?.name || "Unknown",
        changes,
      });
      setAudits((prev) => [saved, ...prev]);
      return saved;
    },
    [setAudits, user?.name]
  );

  return useMemo(() => ({ audits, entriesFor, record }), [audits, entriesFor, record]);
}
