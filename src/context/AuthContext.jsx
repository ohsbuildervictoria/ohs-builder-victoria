/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfile, touchLastLogin, signUpBuilder } from "../lib/api";
import { acceptWorkerInvite } from "../lib/api";

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
          setUser(profile || null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    // Multi-tenant: no auto-login of any kind. A visitor with no session
    // sees the landing page / real signup+login.
    supabase.auth.getSession().then(({ data: { session } }) => {
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

  // Real per-tradie signup via an invite link: create the account, claim the
  // invite (links profile → worker + org, role worker), then load the profile.
  const joinAsTradie = useCallback(async ({ token, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: (email || "").trim(),
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error("Check your email to confirm your account, then open your invite link again.");
    }
    await acceptWorkerInvite(token);
    const profile = await fetchProfile(data.user.id);
    if (!profile?.workerId) throw new Error("Could not link your account to the invite.");
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

  // Real builder signup → new organisation → Builder Admin of that org.
  const signup = useCallback(async ({ email, password, name, orgName }) => {
    await signUpBuilder({ email, password, name, orgName });
    const { data } = await supabase.auth.getUser();
    const profile = await fetchProfile(data.user.id);
    if (!profile) throw new Error("Account created but profile is missing.");
    touchLastLogin(data.user.id);
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo(() => {
    const role = user?.role || null;
    return {
      user,
      role,
      initialising,
      login,
      signup,
      joinAsTradie,
      logout,
      resetPassword,
      isBuilder: role === "builder_admin" || role === "hse_manager" || role === "site_supervisor",
      isWorker: role === "worker",
      hasRole: (roleName) => role === roleName,
    };
  }, [user, initialising, login, signup, joinAsTradie, logout, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
