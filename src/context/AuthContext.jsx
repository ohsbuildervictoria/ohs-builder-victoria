/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { users, demoCredentials } from "../data/mockData";
import { loadAuthUser, saveAuthUser } from "../utils/storage";

const AuthContext = createContext(null);

// Simulated authentication — no real backend, no tokens.
// Session persisted in localStorage for prototype continuity.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = loadAuthUser();
    return saved ? users.find((u) => u.id === saved.id) || null : null;
  });

  useEffect(() => {
    saveAuthUser(user);
  }, [user]);

  const login = useCallback((email, _password, fallbackRole = "builder_admin") => {
    const key = (email || "").trim().toLowerCase();
    const matchedId = demoCredentials[key];
    let nextUser = matchedId ? users.find((u) => u.id === matchedId) : null;

    if (!nextUser) {
      nextUser =
        users.find((u) => u.role === fallbackRole) ||
        users.find((u) => u.role === "builder_admin");
    }
    setUser(nextUser);
    return nextUser;
  }, []);

  const loginDemo = useCallback((role) => {
    const nextUser =
      users.find((u) => u.role === role) ||
      users.find((u) => u.role === "builder_admin");
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const value = useMemo(() => {
    const role = user?.role || null;
    return {
      user,
      role,
      login,
      loginDemo,
      logout,
      isBuilder: role === "builder_admin" || role === "hse_manager" || role === "site_supervisor",
      isWorker: role === "worker",
      hasRole: (roleName) => role === roleName,
    };
  }, [user, login, loginDemo, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
