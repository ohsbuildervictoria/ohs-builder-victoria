import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuthContext } from "../context/AuthContext";
import { complianceCategories } from "../data/constants";
import {
  updateWorkerComplianceRow,
  insertWorker,
  saveWorkerProfileRow,
  pilotSaveProfile,
} from "../lib/api";

// Derives a worker's overall status from their 6 compliance categories.
export function deriveStatus(worker) {
  const values = complianceCategories.map((c) => worker[c.key]);
  if (values.some((v) => v === "Missing")) return "Site Access Pending";
  if (values.some((v) => v === "Pending")) return "Action Required";
  return "Active";
}

// { workers, getWorker(id), updateCompliance, filterByStatus, getComplianceStats }
export function useWorkers(projectId = null) {
  const { workers, setWorkers } = useAppContext();
  const { user } = useAuthContext();

  const scoped = useMemo(
    () =>
      projectId == null
        ? workers
        : workers.filter((w) => w.project === Number(projectId)),
    [workers, projectId]
  );

  const getWorker = useCallback(
    (id) => workers.find((w) => w.id === Number(id)) || null,
    [workers]
  );

  const addWorker = useCallback(
    async (worker) => {
      const created = await insertWorker(worker);
      setWorkers((prev) => [...prev, created]);
      return created;
    },
    [setWorkers]
  );

  // Staff path: HSE/admin verifying any worker's compliance category.
  const updateCompliance = useCallback(
    async (id, category, value) => {
      const current = workers.find((w) => w.id === Number(id));
      if (!current) return;
      const updated = { ...current, [category]: value };
      const status = deriveStatus(updated);
      await updateWorkerComplianceRow(Number(id), category, value, status);
      setWorkers((prev) =>
        prev.map((w) => (w.id === Number(id) ? { ...updated, status } : w))
      );
    },
    [workers, setWorkers]
  );

  // Registration form details (contact, emergency, quals). Pilot tradies go
  // through the RPC because they share one auth account.
  const saveProfile = useCallback(
    async (id, profile) => {
      if (user?.pilotWorker) {
        await pilotSaveProfile(Number(id), profile);
      } else {
        await saveWorkerProfileRow(Number(id), profile);
      }
      setWorkers((prev) =>
        prev.map((w) => (w.id === Number(id) ? { ...w, profile } : w))
      );
    },
    [setWorkers, user?.pilotWorker]
  );

  const filterByStatus = useCallback(
    (status) =>
      !status || status === "All"
        ? scoped
        : scoped.filter((w) => w.status === status),
    [scoped]
  );

  const getComplianceStats = useCallback(() => {
    const stats = {};
    complianceCategories.forEach((c) => {
      const verified = scoped.filter((w) => w[c.key] === "Verified").length;
      stats[c.key] = scoped.length
        ? Math.round((verified / scoped.length) * 100)
        : 0;
    });
    return stats;
  }, [scoped]);

  return {
    workers: scoped,
    getWorker,
    addWorker,
    updateCompliance,
    saveProfile,
    filterByStatus,
    getComplianceStats,
  };
}
