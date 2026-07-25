import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import {
  insertIncident,
  updateIncidentStatusRow,
  updateIncidentRow,
  insertCorrectiveAction,
  updateCorrectiveActionRow,
} from "../lib/api";
import { enqueue, isNetworkError } from "../lib/offlineQueue";
import { summariseMarks } from "../lib/bodyMap";
import { isNotifiableIncident } from "../data/constants";
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
  // Body-diagram marks are audited as their written regions ("Front — Left
  // forearm"), not raw coordinates — that's what a reader of the trail needs.
  { key: "bodyMapSummary", label: "Body diagram" },
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
      const notifiable = isNotifiableIncident(incident.type, incident.severity);
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
        bodyMap: Array.isArray(row.body_map) ? row.body_map : [],
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
        isNotifiableIncident(patch.type, patch.severity) || !!patch.notifiable;
      const full = { ...patch, notifiable };
      const after = { ...before, ...full };
      const changes = diffFields(
        { ...before, bodyMapSummary: summariseMarks(before.bodyMap).join("; ") },
        { ...after, bodyMapSummary: summariseMarks(after.bodyMap).join("; ") },
        INCIDENT_EDIT_FIELDS
      );
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

  const updateCorrectiveAction = useCallback(
    async (incidentId, actionId, patch) => {
      const saved = await updateCorrectiveActionRow(Number(actionId), patch);
      setIncidents((prev) =>
        prev.map((i) =>
          i.id !== Number(incidentId)
            ? i
            : {
                ...i,
                correctiveActions: (i.correctiveActions || []).map((a) =>
                  a.id === saved.id ? saved : a
                ),
              }
        )
      );
      return saved;
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

  return { incidents: scoped, addIncident, updateStatus, editIncident, addCorrectiveAction, updateCorrectiveAction, getByType };
}
