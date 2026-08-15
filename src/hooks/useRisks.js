import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  insertProjectRisks,
  updateProjectRisk,
  deleteProjectRisk,
} from "../lib/api";

// Project Risk Register rows. Same contract as every other hook: write to
// Supabase first, then update in-memory state — never the other way round.
export function useRisks(projectId = null) {
  const { projectRisks, setProjectRisks } = useAppContext();

  const scoped = useMemo(() => {
    if (projectId == null) return projectRisks;
    return projectRisks.filter((r) => r.projectId === Number(projectId));
  }, [projectRisks, projectId]);

  // Accepts one risk or an array (the SWMS-library seed adds many at once).
  const addRisks = useCallback(
    async (pid, risks) => {
      const created = await insertProjectRisks(pid, Array.isArray(risks) ? risks : [risks]);
      setProjectRisks((prev) => [...prev, ...created]);
      return created;
    },
    [setProjectRisks]
  );

  const updateRisk = useCallback(
    async (id, patch) => {
      const updated = await updateProjectRisk(id, patch);
      setProjectRisks((prev) => prev.map((r) => (r.id === id ? updated : r)));
      return updated;
    },
    [setProjectRisks]
  );

  const removeRisk = useCallback(
    async (id) => {
      await deleteProjectRisk(id);
      setProjectRisks((prev) => prev.filter((r) => r.id !== id));
    },
    [setProjectRisks]
  );

  return { risks: scoped, addRisks, updateRisk, removeRisk };
}
