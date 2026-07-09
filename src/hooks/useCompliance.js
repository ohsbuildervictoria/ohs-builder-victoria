import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { deriveStatus } from "./useWorkers";
import {
  complianceCategories,
  categoryStatus,
  overallStatus,
  canAccessSite as canAccessSiteFn,
  indexDocuments,
} from "../lib/compliance";
import {
  updateMyCompliance,
  updateWorkerComplianceRow,
  pilotUpdateCompliance,
} from "../lib/api";
import { enqueue, isNetworkError } from "../lib/offlineQueue";

// { compliance, updateCategory, overallStatus, canAccessSite, missingItems }
// RULE: canAccessSite = all 6 categories === "Verified"
// Worker (stakeholder) sessions write via the update_my_compliance RPC so RLS
// stays strict; builder staff write directly.
export function useCompliance(workerId) {
  const { workers, setWorkers, documents } = useAppContext();
  const { isWorker, user } = useAuthContext();
  const pilotWorker = !!user?.pilotWorker;

  const worker = useMemo(
    () => workers.find((w) => w.id === Number(workerId)) || null,
    [workers, workerId]
  );

  const workerDocs = useMemo(() => {
    const byWorker = indexDocuments(documents);
    return byWorker[Number(workerId)] || {};
  }, [documents, workerId]);

  const compliance = useMemo(() => {
    if (!worker) return {};
    return complianceCategories.reduce((acc, c) => {
      acc[c.key] = categoryStatus(worker, c.key, workerDocs[c.key]);
      return acc;
    }, {});
  }, [worker, workerDocs]);

  const updateCategory = useCallback(
    async (category, value) => {
      const current = workers.find((w) => w.id === Number(workerId));
      if (!current) return;
      const updated = { ...current, [category]: value };
      const status = deriveStatus(updated);
      try {
        if (pilotWorker) {
          // PILOT: shared auth account — worker id must be explicit.
          await pilotUpdateCompliance(Number(workerId), category, value);
        } else if (isWorker) {
          await updateMyCompliance(category, value);
        } else {
          await updateWorkerComplianceRow(Number(workerId), category, value, status);
        }
      } catch (err) {
        // Dead spot: queue the update (e.g. induction completed offline) and
        // let the UI proceed — the sync banner shows it is waiting to send.
        if (!isNetworkError(err)) throw err;
        enqueue("compliance_update", pilotWorker
          ? { mode: "pilot", workerId: Number(workerId), category, value }
          : isWorker
            ? { mode: "self", category, value }
            : { mode: "staff", workerId: Number(workerId), category, value, status });
      }
      setWorkers((prev) =>
        prev.map((w) => (w.id === Number(workerId) ? { ...updated, status } : w))
      );
    },
    [workers, setWorkers, workerId, isWorker, pilotWorker]
  );

  const missingItems = useMemo(
    () =>
      worker
        ? complianceCategories
            .filter((c) => {
              const s = categoryStatus(worker, c.key, workerDocs[c.key]);
              return s === "Missing" || s === "Expired";
            })
            .map((c) => c.label)
        : [],
    [worker, workerDocs]
  );

  const status = worker ? overallStatus(worker, workerDocs) : "—";
  const canAccessSite = worker ? canAccessSiteFn(worker, workerDocs) : false;

  return { compliance, updateCategory, overallStatus: status, canAccessSite, missingItems };
}
