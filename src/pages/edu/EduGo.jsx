import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { homeRouteFor } from "../../lib/eduRoutes";

// /go — waits for the database's permission set, then sends the account to
// the right home (Education role, worker, or builder workspace).
export default function EduGo() {
  const { user, permissions, initialising } = useAuth();
  if (initialising) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (permissions === null || permissions === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">Loading…</div>
    );
  }
  return <Navigate to={homeRouteFor(user, permissions)} replace />;
}
