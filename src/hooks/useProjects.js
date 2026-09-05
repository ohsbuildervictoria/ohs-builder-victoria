import { useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import { insertProject, updateProjectRow } from "../lib/api";

// { projects, getProject(id), addProject, updateProject, filterByStatus }
export function useProjects() {
  const { projects, setProjects } = useAppContext();

  const getProject = useCallback(
    (id) => projects.find((p) => p.id === Number(id)) || null,
    [projects]
  );

  const addProject = useCallback(
    async (project) => {
      const created = await insertProject(project);
      // A brand-new project has no crew, so it has no compliance figure yet —
      // never the DB column's default. Same annotation fetchAll applies.
      const annotated = { ...created, compliance: null, workers: 0, incidents: 0, openIncidents: 0, openHighRisks: 0 };
      setProjects((prev) => [...prev, annotated]);
      return annotated;
    },
    [setProjects]
  );

  const updateProject = useCallback(
    async (id, patch) => {
      await updateProjectRow(Number(id), patch);
      setProjects((prev) =>
        prev.map((p) => (p.id === Number(id) ? { ...p, ...patch } : p))
      );
    },
    [setProjects]
  );

  const filterByStatus = useCallback(
    (status) =>
      !status || status === "All"
        ? projects
        : projects.filter((p) => p.status === status),
    [projects]
  );

  return { projects, getProject, addProject, updateProject, filterByStatus };
}
