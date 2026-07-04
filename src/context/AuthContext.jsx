/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfile, touchLastLogin } from "../lib/api";
// TEMPORARY pilot bypass — see src/lib/pilotBypass.js. Disable before any
// other real client's data enters this system.
import {
  PILOT_CREDENTIALS,
  PILOT_STAKEHOLDER_CREDENTIALS,
  PILOT_STAKEHOLDER_PASSWORD,
  STAKEHOLDER_LOGIN_PATH,
  isPilotBypassEnabled,
  savePilotWorker,
  loadPilotWorker,
  clearPilotWorker,
} from "../lib/pilotBypass";
import { findWorkerByHandle } from "../lib/api";

// Attaches the pilot tradie identity to the shared stakeholder session so the
// portal scopes to that tradie only.
function withPilotWorker(profile) {
  if (!profile || profile.email !== PILOT_STAKEHOLDER_CREDENTIALS.email) {
    return profile;
  }
  const pilot = loadPilotWorker();
  if (!pilot) return profile;
  return { ...profile, workerId: pilot.id, name: pilot.name, pilotWorker: true };
}

const AuthContext = createContext(null);

// Real authentication backed by Supabase Auth.
// `user` is the app profile (name, role, workerId, …); the Supabase session
// is managed by supabase-js and survives refreshes automatically.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileFor(session) {
      if (!session?.user) {
        if (!cancelled) setUser(null);
        return;
      }
      try {
        const profile = await fetchProfile(session.user.id);
        if (!cancelled) {
          setUser(profile ? withPilotWorker({ ...profile }) : null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // TEMPORARY pilot bypass: with app_config.bypass_auth = true, a visitor
      // with no session is signed straight in as the Builder Admin account.
      // Real session, real writes. Flag off → this block is a no-op and the
      // normal login screen is shown. See src/lib/pilotBypass.js.
      // Tradies must be able to reach their own sign-in screen, so the
      // builder auto-login never fires on the stakeholder entry route.
      const onStakeholderRoute =
        window.location.pathname.startsWith(STAKEHOLDER_LOGIN_PATH);
      if (!session?.user && !cancelled && !onStakeholderRoute) {
        try {
          if (await isPilotBypassEnabled()) {
            const { data, error } =
              await supabase.auth.signInWithPassword(PILOT_CREDENTIALS);
            if (!error && data?.session) {
              session = data.session;
              touchLastLogin(data.session.user.id);
            }
          }
        } catch {
          // fail closed — fall through to the normal login screen
        }
      }
      loadProfileFor(session).finally(() => {
        if (!cancelled) setInitialising(false);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        loadProfileFor(session);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    clearPilotWorker();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: (email || "").trim(),
      password,
    });
    if (error) throw new Error(error.message);
    const profile = await fetchProfile(data.user.id);
    if (!profile) throw new Error("No profile found for this account.");
    if (profile.status && profile.status !== "Active") {
      await supabase.auth.signOut();
      throw new Error("This account has been deactivated. Contact your administrator.");
    }
    touchLastLogin(data.user.id);
    setUser(profile);
    return profile;
  }, []);

  // PILOT ONLY: tradie sign-in by personal username + the shared pilot
  // password. Uses one shared worker-role auth account under the hood and
  // pins the tradie's own worker id to the session (per-user data scoping).
  const loginStakeholder = useCallback(async (handle, password) => {
    const username = (handle || "").trim();
    if (!username) throw new Error("Enter your username.");
    if (password !== PILOT_STAKEHOLDER_PASSWORD) {
      throw new Error("Incorrect username or password.");
    }
    const { error } = await supabase.auth.signInWithPassword(
      PILOT_STAKEHOLDER_CREDENTIALS
    );
    if (error) throw new Error("Sign-in is unavailable right now — try again shortly.");
    const worker = await findWorkerByHandle(username);
    if (!worker) {
      await supabase.auth.signOut();
      throw new Error("Incorrect username or password.");
    }
    savePilotWorker(worker);
    const profile = await fetchProfile(
      (await supabase.auth.getUser()).data.user.id
    );
    const pilotUser = {
      ...profile,
      workerId: worker.id,
      name: worker.name,
      pilotWorker: true,
    };
    setUser(pilotUser);
    return pilotUser;
  }, []);

  const logout = useCallback(async () => {
    clearPilotWorker();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail((email || "").trim(), {
      redirectTo: window.location.origin + "/login",
    });
    if (error) throw new Error(error.message);
  }, []);

  const value = useMemo(() => {
    const role = user?.role || null;
    return {
      user,
      role,
      initialising,
      login,
      loginStakeholder,
      logout,
      resetPassword,
      isBuilder: role === "builder_admin" || role === "hse_manager" || role === "site_supervisor",
      isWorker: role === "worker",
      hasRole: (roleName) => role === roleName,
    };
  }, [user, initialising, login, loginStakeholder, logout, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
