import { useAuthContext } from "../context/AuthContext";

// { user, role, login(email, password), logout, isBuilder, isWorker, hasRole(roleName) }
export function useAuth() {
  return useAuthContext();
}
