import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  insertIncident,
  updateIncidentStatusRow,
  insertCorrectiveAction,
} from "../lib/api";

// { incidents, addIncident, updateStatus, addCorrectiveAction, getByType }
export function useIncidents(projectId = null) {
  const { incidents, setIncidents, projects } = useAppContext();

  const scoped = useMemo(() => {
    if (projectId == null) return incidents;
    return incidents.filter((i) => i.projectId === Number(projectId));
  }, [incidents, projectId]);

  const addIncident = useCallback(
    async (incident) => {
      const notifiable =
        incident.type === "Notifiable (WorkSafe)" ||
        incident.severity === "Critical";
      const row = await insertIncident({ ...incident, notifiable });
      const project = projects.find((p) => p.id === row.project_id);
      const created = {
        id: row.id,
        type: row.type,
        lostTime: row.lost_time,
        description: row.description,
        projectId: row.project_id,
        project: project?.name || "—",
        reportedBy: row.reported_by,
        date: row.date,
        status: row.status,
        severity: row.severity,
        location: row.location,
        involved: row.involved,
        witnesses: row.witnesses,
        immediateAction: row.immediate_action,
        notifiable: row.notifiable,
        correctiveActions: [],
      };
      setIncidents((prev) => [created, ...prev]);
      return created;
    },
    [setIncidents, projects]
  );

  const updateStatus = useCallback(
    async (id, status) => {
      await updateIncidentStatusRow(Number(id), status);
      setIncidents((prev) =>
        prev.map((i) => (i.id === Number(id) ? { ...i, status } : i))
      );
    },
    [setIncidents]
  );

  const addCorrectiveAction = useCallback(
    async (id, action) => {
      const created = await insertCorrectiveAction(Number(id), action);
      setIncidents((prev) =>
        prev.map((i) => {
          if (i.id !== Number(id)) return i;
          return {
            ...i,
            correctiveActions: [...(i.correctiveActions || []), created],
          };
        })
      );
    },
    [setIncidents]
  );

  const getByType = useCallback(
    (type) =>
      !type || type === "All"
        ? scoped
        : scoped.filter((i) => i.type === type),
    [scoped]
  );

  return { incidents: scoped, addIncident, updateStatus, addCorrectiveAction, getByType };
}
