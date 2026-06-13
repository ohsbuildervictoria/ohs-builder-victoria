import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { projectName } from "../data/mockData";

// { incidents, addIncident, updateStatus, addCorrectiveAction, getByType }
export function useIncidents(projectId = null) {
  const { incidents, setIncidents } = useAppContext();

  const scoped = useMemo(() => {
    if (projectId == null) return incidents;
    const name = projectName(Number(projectId));
    return incidents.filter((i) => i.project === name);
  }, [incidents, projectId]);

  const addIncident = useCallback(
    (incident) => {
      setIncidents((prev) => {
        const id = prev.reduce((max, i) => Math.max(max, i.id), 0) + 1;
        return [
          {
            id,
            status: "Open",
            notifiable:
              incident.type === "Notifiable (WorkSafe)" ||
              incident.severity === "Critical",
            correctiveActions: [],
            ...incident,
          },
          ...prev,
        ];
      });
    },
    [setIncidents]
  );

  const updateStatus = useCallback(
    (id, status) => {
      setIncidents((prev) =>
        prev.map((i) => (i.id === Number(id) ? { ...i, status } : i))
      );
    },
    [setIncidents]
  );

  const addCorrectiveAction = useCallback(
    (id, action) => {
      setIncidents((prev) =>
        prev.map((i) => {
          if (i.id !== Number(id)) return i;
          const actions = i.correctiveActions || [];
          const actionId = actions.reduce((m, a) => Math.max(m, a.id), 0) + 1;
          return {
            ...i,
            correctiveActions: [...actions, { id: actionId, status: "Open", ...action }],
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
