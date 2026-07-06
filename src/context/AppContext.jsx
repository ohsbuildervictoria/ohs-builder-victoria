/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { fetchAppData } from "../lib/api";
import { useAuthContext } from "./AuthContext";

const AppContext = createContext(null);

const emptyState = {
  projects: [],
  workers: [],
  documents: [],
  incidents: [],
  templates: [],
  entries: [],
  meetings: [],
  policies: [],
  profiles: [],
  invites: [],
  org: null,
};

// Central store, loaded from Supabase once a session exists.
// Mutations happen through the hooks (src/hooks/*), which write to Supabase
// first and then update this in-memory state.
export function AppProvider({ children }) {
  const { user } = useAuthContext();
  const [projects, setProjects] = useState(emptyState.projects);
  const [workers, setWorkers] = useState(emptyState.workers);
  const [documents, setDocuments] = useState(emptyState.documents);
  const [incidents, setIncidents] = useState(emptyState.incidents);
  const [templates, setTemplates] = useState(emptyState.templates);
  const [entries, setEntries] = useState(emptyState.entries);
  const [meetings, setMeetings] = useState(emptyState.meetings);
  const [policies, setPolicies] = useState(emptyState.policies);
  const [profiles, setProfiles] = useState(emptyState.profiles);
  const [invites, setInvites] = useState(emptyState.invites);
  const [org, setOrg] = useState(emptyState.org);
  const [readNotifications, setReadNotifications] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAppData();
      setProjects(data.projects);
      setWorkers(data.workers);
      setDocuments(data.documents);
      setIncidents(data.incidents);
      setTemplates(data.templates);
      setEntries(data.entries);
      setMeetings(data.meetings);
      setPolicies(data.policies);
      setProfiles(data.profiles);
      setInvites(data.invites);
      setOrg(data.org);
    } catch (err) {
      setLoadError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing store with the auth session is intentional
      setReadNotifications(new Set(user.readNotifications || []));
      refresh();
    } else {
      setProjects(emptyState.projects);
      setWorkers(emptyState.workers);
      setDocuments(emptyState.documents);
      setIncidents(emptyState.incidents);
      setTemplates(emptyState.templates);
      setEntries(emptyState.entries);
      setMeetings(emptyState.meetings);
      setPolicies(emptyState.policies);
      setProfiles(emptyState.profiles);
      setInvites(emptyState.invites);
      setOrg(emptyState.org);
      setReadNotifications(new Set());
      setLoadError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo(
    () => ({
      projects, setProjects,
      workers, setWorkers,
      documents, setDocuments,
      incidents, setIncidents,
      templates, setTemplates,
      entries, setEntries,
      meetings, setMeetings,
      policies, setPolicies,
      profiles, setProfiles,
      invites, setInvites,
      org, setOrg,
      readNotifications, setReadNotifications,
      loading, loadError, refresh,
    }),
    [projects, workers, documents, incidents, templates, entries, meetings, policies,
     profiles, invites, org, readNotifications, loading, loadError, refresh]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
