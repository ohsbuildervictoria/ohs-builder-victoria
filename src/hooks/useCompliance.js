import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { complianceCategories } from "../data/constants";
import { deriveStatus } from "./useWorkers";
import {
  updateMyCompliance,
  updateWorkerComplianceRow,
  pilotUpdateCompliance,
} from "../lib/api";

// { compliance, updateCategory, overallStatus, canAccessSite, missingItems }
// RULE: canAccessSite = all 6 categories === "Verified"
// Worker (stakeholder) sessions write via the update_my_compliance RPC so RLS
// stays strict; builder staff write directly.
export function useCompliance(workerId) {
  const { workers, setWorkers } = useAppContext();
  const { isWorker, user } = useAuthContext();

  const worker = useMemo(
    () => workers.find((w) => w.id === Number(workerId)) || null,
    [workers, workerId]
  );

  const compliance = useMemo(() => {
    if (!worker) return {};
    return complianceCategories.reduce((acc, c) => {
      acc[c.key] = worker[c.key];
      return acc;
    }, {});
  }, [worker]);

  const updateCategory = useCallback(
    async (category, value) => {
      const current = workers.find((w) => w.id === Number(workerId));
      if (!current) return;
      const updated = { ...current, [category]: value };
      const status = deriveStatus(updated);
      if (user?.pilotWorker) {
        // PILOT: shared auth account — worker id must be explicit.
        await pilotUpdateCompliance(Number(workerId), category, value);
      } else if (isWorker) {
        await updateMyCompliance(category, value);
      } else {
        await updateWorkerComplianceRow(Number(workerId), category, value, status);
      }
      setWorkers((prev) =>
        prev.map((w) => (w.id === Number(workerId) ? { ...updated, status } : w))
      );
    },
    [workers, setWorkers, workerId, isWorker, user?.pilotWorker]
  );

  const missingItems = useMemo(
    () =>
      worker
        ? complianceCategories
            .filter((c) => worker[c.key] === "Missing")
            .map((c) => c.label)
        : [],
    [worker]
  );

  const overallStatus = worker ? deriveStatus(worker) : "—";
  const canAccessSite = worker
    ? complianceCategories.every((c) => worker[c.key] === "Verified")
    : false;

  return { compliance, updateCategory, overallStatus, canAccessSite, missingItems };
}
