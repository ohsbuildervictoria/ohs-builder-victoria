import { useCallback, useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { insertDiaryEntry, updateDiaryEntryRow } from "../lib/api";
import { enqueue, isNetworkError } from "../lib/offlineQueue";
import { useAudit, diffFields } from "./useAudit";

// Diary fields that are editable + audited (label used in the trail).
export const DIARY_EDIT_FIELDS = [
  { key: "date", label: "Date" },
  { key: "weather", label: "Weather" },
  { key: "hours", label: "Hours on site" },
  { key: "labour", label: "Workers present" },
  { key: "notes", label: "Notes" },
];

// { entries, addEntry, editEntry, getByProject, getByDate }
export function useDiary(projectId = null) {
  const { entries, setEntries } = useAppContext();
  const { record } = useAudit();

  const scoped = useMemo(
    () =>
      projectId == null
        ? entries
        : entries.filter((e) => e.project === Number(projectId)),
    [entries, projectId]
  );

  const addEntry = useCallback(
    async (entry) => {
      try {
        const created = await insertDiaryEntry(entry);
        setEntries((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        // Dead spot on site: keep the entry on the device and replay it when
        // the connection returns. Caller tells the user what happened.
        if (isNetworkError(err)) {
          enqueue("diary_entry", entry);
          return { queued: true };
        }
        throw err;
      }
    },
    [setEntries]
  );

  // Correct an existing entry. Records "edited by X, was: Y" first, then writes
  // the change — safety records are correctable but never silently rewritten.
  const editEntry = useCallback(
    async (id, patch) => {
      const before = entries.find((e) => e.id === Number(id));
      if (!before) return;
      const after = { ...before, ...patch };
      const changes = diffFields(before, after, DIARY_EDIT_FIELDS);
      if (Object.keys(changes).length === 0) return false;
      await updateDiaryEntryRow(Number(id), patch);
      await record("diary_entry", Number(id), changes);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === Number(id)
            ? { ...e, ...patch, manHours: (Number(patch.hours ?? e.hours) || 0) * (Number(patch.labour ?? e.labour) || 0) }
            : e
        )
      );
      return true;
    },
    [entries, setEntries, record]
  );

  const getByProject = useCallback(
    (id) => entries.filter((e) => e.project === Number(id)),
    [entries]
  );

  const getByDate = useCallback(
    (date) => scoped.filter((e) => e.date === date),
    [scoped]
  );

  return { entries: scoped, addEntry, editEntry, getByProject, getByDate };
}
