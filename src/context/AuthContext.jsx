/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfile, touchLastLogin } from "../lib/api";
// TEMPORARY pilot bypass — see src/lib/pilotBypass.js. Disable before any
// other real client's data enters this system.
import { PILOT_CREDENTIALS, isPilotBypassEnabled } from "../lib/pilotBypass";

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
          setUser(profile ? { ...profile } : null);
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
      if (!session?.user && !cancelled) {
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

  const logout = useCallback(async () => {
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
      logout,
      resetPassword,
      isBuilder: role === "builder_admin" || role === "hse_manager" || role === "site_supervisor",
      isWorker: role === "worker",
      hasRole: (roleName) => role === roleName,
    };
  }, [user, initialising, login, logout, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
