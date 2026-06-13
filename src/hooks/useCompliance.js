import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { complianceCategories } from "../data/mockData";
import { deriveStatus } from "./useWorkers";

// { compliance, updateCategory, overallStatus, canAccessSite, missingItems }
// RULE: canAccessSite = all 6 categories === "Verified"
export function useCompliance(workerId) {
  const { workers, setWorkers } = useAppContext();

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
    (category, value) => {
      setWorkers((prev) =>
        prev.map((w) => {
          if (w.id !== Number(workerId)) return w;
          const updated = { ...w, [category]: value };
          return { ...updated, status: deriveStatus(updated) };
        })
      );
    },
    [setWorkers, workerId]
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
