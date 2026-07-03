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
      setProjects((prev) => [...prev, created]);
      return created;
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
