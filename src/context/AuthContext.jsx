/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { users, demoCredentials } from "../data/mockData";

const AuthContext = createContext(null);

// Simulated authentication — no real backend, no tokens.
// The "password" is accepted as-is; only the email is matched to a demo user.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback((email, _password, fallbackRole = "builder_admin") => {
    const key = (email || "").trim().toLowerCase();
    const matchedId = demoCredentials[key];
    let nextUser = matchedId ? users.find((u) => u.id === matchedId) : null;

    // Unknown email → spin up a demo user for the selected role so the
    // prototype is always navigable.
    if (!nextUser) {
      nextUser =
        users.find((u) => u.role === fallbackRole) ||
        users.find((u) => u.role === "builder_admin");
    }
    setUser(nextUser);
    return nextUser;
  }, []);

  // Demo bypass — logs in as the given role with the matching demo user.
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
