/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import {
  projects as seedProjects,
  workers as seedWorkers,
  incidents as seedIncidents,
  swmsTemplates as seedSwms,
  diaryEntries as seedDiary,
  toolboxMeetings as seedToolbox,
} from "../data/mockData";
import { loadAppState, saveAppState } from "../utils/storage";

const AppContext = createContext(null);

const defaultState = {
  projects: seedProjects,
  workers: seedWorkers,
  incidents: seedIncidents,
  templates: seedSwms,
  entries: seedDiary,
  meetings: seedToolbox,
  readNotifications: [],
};

function hydrateState() {
  const saved = loadAppState(null);
  if (!saved) return defaultState;
  return {
    projects: saved.projects ?? seedProjects,
    workers: saved.workers ?? seedWorkers,
    incidents: saved.incidents ?? seedIncidents,
    templates: saved.templates ?? seedSwms,
    entries: saved.entries ?? seedDiary,
    meetings: saved.meetings ?? seedToolbox,
    readNotifications: saved.readNotifications ?? [],
  };
}

// Central store for the prototype. Persisted to localStorage so demo data
// survives refresh without a backend.
export function AppProvider({ children }) {
  const initial = hydrateState();
  const [projects, setProjects] = useState(initial.projects);
  const [workers, setWorkers] = useState(initial.workers);
  const [incidents, setIncidents] = useState(initial.incidents);
  const [templates, setTemplates] = useState(initial.templates);
  const [entries, setEntries] = useState(initial.entries);
  const [meetings, setMeetings] = useState(initial.meetings);
  const [readNotifications, setReadNotifications] = useState(
    () => new Set(initial.readNotifications)
  );

  useEffect(() => {
    saveAppState({
      projects,
      workers,
      incidents,
      templates,
      entries,
      meetings,
      readNotifications: [...readNotifications],
    });
  }, [projects, workers, incidents, templates, entries, meetings, readNotifications]);

  const value = useMemo(
    () => ({
      projects,
      setProjects,
      workers,
      setWorkers,
      incidents,
      setIncidents,
      templates,
      setTemplates,
      entries,
      setEntries,
      meetings,
      setMeetings,
      readNotifications,
      setReadNotifications,
    }),
    [projects, workers, incidents, templates, entries, meetings, readNotifications]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
