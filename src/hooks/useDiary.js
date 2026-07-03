import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { insertDiaryEntry } from "../lib/api";

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
    async (entry) => {
      const created = await insertDiaryEntry(entry);
      setEntries((prev) => [created, ...prev]);
      return created;
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
