import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { logEdit, recordFitnessDeclarationApi, localDate } from "../lib/api";

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

  // Daily fitness-for-work declaration → immutable audit row. The server
  // pins the row to the caller's own linked worker.
  const recordFitness = useCallback(
    async (worker, outcome) => {
      const saved = await recordFitnessDeclarationApi({
        outcome,
        day: localDate(),
        workerId: null,
      });
      setAudits((prev) => [saved, ...prev]);
      return saved;
    },
    [setAudits]
  );

  // Has this worker already confirmed fitness TODAY (local calendar day) for
  // their CURRENT project? A new day or a project change re-prompts; declines
  // never suppress (an unfit call today shouldn't block an honest one after
  // they've seen their supervisor).
  const fitnessConfirmedToday = useCallback(
    (worker) => {
      if (!worker) return false;
      const today = localDate();
      return audits.some(
        (a) =>
          a.entity === "fitness_declaration" &&
          a.action === "confirmed" &&
          a.entityId === Number(worker.id) &&
          a.changes?.localDate === today &&
          (a.changes?.projectId ?? null) === (worker.project ?? null)
      );
    },
    [audits]
  );

  return useMemo(
    () => ({ audits, entriesFor, record, recordFitness, fitnessConfirmedToday }),
    [audits, entriesFor, record, recordFitness, fitnessConfirmedToday]
  );
}
