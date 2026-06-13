import { useCallback } from "react";
import { useAppContext } from "../context/AppContext";

// { projects, getProject(id), addProject, updateProject, filterByStatus }
export function useProjects() {
  const { projects, setProjects } = useAppContext();

  const getProject = useCallback(
    (id) => projects.find((p) => p.id === Number(id)) || null,
    [projects]
  );

  const addProject = useCallback(
    (project) => {
      setProjects((prev) => {
        const id = prev.reduce((max, p) => Math.max(max, p.id), 0) + 1;
        return [...prev, { id, incidents: 0, workers: 0, ...project }];
      });
    },
    [setProjects]
  );

  const updateProject = useCallback(
    (id, patch) => {
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
