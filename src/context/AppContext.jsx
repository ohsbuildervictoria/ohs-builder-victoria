/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo } from "react";
import {
  projects as seedProjects,
  workers as seedWorkers,
  incidents as seedIncidents,
  swmsTemplates as seedSwms,
  diaryEntries as seedDiary,
  toolboxMeetings as seedToolbox,
} from "../data/mockData";

const AppContext = createContext(null);

// Central in-memory store for the prototype. Seeded from mockData; all
// mutations live here so screens share one source of truth during a session.
export function AppProvider({ children }) {
  const [projects, setProjects] = useState(seedProjects);
  const [workers, setWorkers] = useState(seedWorkers);
  const [incidents, setIncidents] = useState(seedIncidents);
  const [templates, setTemplates] = useState(seedSwms);
  const [entries, setEntries] = useState(seedDiary);
  const [meetings, setMeetings] = useState(seedToolbox);
  const [readNotifications, setReadNotifications] = useState(() => new Set());

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
