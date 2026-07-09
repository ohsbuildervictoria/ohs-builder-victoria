import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  insertIncident,
  updateIncidentStatusRow,
  updateIncidentRow,
  insertCorrectiveAction,
} from "../lib/api";
import { enqueue, isNetworkError } from "../lib/offlineQueue";
import { useAudit, diffFields } from "./useAudit";

// Incident fields that are editable + audited.
export const INCIDENT_EDIT_FIELDS = [
  { key: "type", label: "Type" },
  { key: "date", label: "Date" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "description", label: "Description" },
  { key: "location", label: "Location" },
  { key: "involved", label: "Injured / involved" },
  { key: "immediateAction", label: "Immediate action" },
  { key: "notifiable", label: "WorkSafe notifiable" },
  { key: "lostTime", label: "Lost-time injury" },
];

// { incidents, addIncident, updateStatus, editIncident, addCorrectiveAction, getByType }
export function useIncidents(projectId = null) {
  const { incidents, setIncidents, projects } = useAppContext();
  const { record } = useAudit();

  const scoped = useMemo(() => {
    if (projectId == null) return incidents;
    return incidents.filter((i) => i.projectId === Number(projectId));
  }, [incidents, projectId]);

  const addIncident = useCallback(
    async (incident) => {
      const notifiable =
        incident.type === "Notifiable (WorkSafe)" ||
        incident.severity === "Critical";
      let row;
      try {
        row = await insertIncident({ ...incident, notifiable });
      } catch (err) {
        // Dead spot on site: keep the report on the device and replay it when
        // the connection returns. Caller tells the user what happened.
        if (isNetworkError(err)) {
          enqueue("incident", { ...incident, notifiable });
          return { queued: true };
        }
        throw err;
      }
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

  // Correct an incident, recording the "edited by X, was: Y" trail first.
  const editIncident = useCallback(
    async (id, patch) => {
      const before = incidents.find((i) => i.id === Number(id));
      if (!before) return;
      const notifiable =
        patch.type === "Notifiable (WorkSafe)" ||
        patch.severity === "Critical" ||
        !!patch.notifiable;
      const full = { ...patch, notifiable };
      const after = { ...before, ...full };
      const changes = diffFields(before, after, INCIDENT_EDIT_FIELDS);
      if (Object.keys(changes).length === 0) return false;
      await updateIncidentRow(Number(id), full);
      await record("incident", Number(id), changes);
      setIncidents((prev) =>
        prev.map((i) => (i.id === Number(id) ? { ...i, ...full } : i))
      );
      return true;
    },
    [incidents, setIncidents, record]
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

  return { incidents: scoped, addIncident, updateStatus, editIncident, addCorrectiveAction, getByType };
}
