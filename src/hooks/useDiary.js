import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";

// { entries, addEntry, getByProject, getByDate }
export function useDiary(projectId = null) {
  const { entries, setEntries } = useAppContext();

  const scoped = useMemo(
    () =>
      projectId == null
        ? entries
        : entries.filter((e) => e.project === Number(projectId)),
    [entries, projectId]
  );

  const addEntry = useCallback(
    (entry) => {
      setEntries((prev) => {
        const id = prev.reduce((max, e) => Math.max(max, e.id), 0) + 1;
        return [{ id, tags: [], ...entry }, ...prev];
      });
    },
    [setEntries]
  );

  const getByProject = useCallback(
    (id) => entries.filter((e) => e.project === Number(id)),
    [entries]
  );

  const getByDate = useCallback(
    (date) => scoped.filter((e) => e.date === date),
    [scoped]
  );

  return { entries: scoped, addEntry, getByProject, getByDate };
}
