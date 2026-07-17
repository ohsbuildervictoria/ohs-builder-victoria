import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./components/ui/Notification";
import { useAuth } from "./hooks/useAuth";

import BuilderLayout from "./layouts/BuilderLayout";
import WorkerLayout from "./layouts/WorkerLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import StakeholderLogin from "./pages/StakeholderLogin";
import JoinTradie from "./pages/JoinTradie";
import JoinStaff from "./pages/JoinStaff";
import SiteCheckin from "./pages/SiteCheckin";

import Dashboard from "./pages/builder/Dashboard";
import Projects from "./pages/builder/Projects";
import ProjectDetail from "./pages/builder/ProjectDetail";
import Compliance from "./pages/builder/Compliance";
import SWMS from "./pages/builder/SWMS";
import SiteDiary from "./pages/builder/SiteDiary";
import Incidents from "./pages/builder/Incidents";
import NearMiss from "./pages/builder/NearMiss";
import Toolbox from "./pages/builder/Toolbox";
import Reports from "./pages/builder/Reports";
import AdminPortal from "./pages/builder/AdminPortal";
import Policies from "./pages/builder/Policies";

import WorkerHome from "./pages/worker/WorkerHome";
import Induction from "./pages/worker/Induction";
import Quiz from "./pages/worker/Quiz";
import SwmsSigning from "./pages/worker/SwmsSigning";
import Registration from "./pages/worker/Registration";

// Blocks rendering until the Supabase session has been restored.
function AuthGate({ children }) {
  const { initialising } = useAuth();
  if (initialising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  return children;
}

// Gates builder routes; redirects to /login when no session.
function RequireBuilder({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Any authenticated user (stakeholder portal). Signed-out visitors go to the
// stakeholder sign-in — that's the front door for tradies during the pilot.
function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/stakeholder" replace />;
  return children;
}

// Builder Admin only.
function RequireAdmin({ children }) {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "builder_admin") return <Navigate to="/builder/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing page — the front door. The workspace is the second
          layer behind "Enter Builder Workspace" / the stakeholder sign-in. */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {/* Tradie sign-in (real per-tradie accounts + legacy pilot usernames) */}
      <Route path="/stakeholder" element={<StakeholderLogin />} />
      {/* Subbie invite link — set up a real per-tradie account */}
      <Route path="/join/:token" element={<JoinTradie />} />
      <Route path="/join-staff/:token" element={<JoinStaff />} />
      {/* QR site sign-in — scanned from the poster at the gate */}
      <Route path="/checkin/:token" element={<SiteCheckin />} />

      {/* Builder web */}
      <Route
        path="/builder"
        element={
          <RequireBuilder>
            <BuilderLayout />
          </RequireBuilder>
        }
      >
        <Route index element={<Navigate to="/builder/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="swms" element={<SWMS />} />
        <Route path="diary" element={<SiteDiary />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/near-miss" element={<NearMiss />} />
        <Route path="toolbox" element={<Toolbox />} />
        <Route path="reports" element={<Reports />} />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminPortal />
            </RequireAdmin>
          }
        />
        <Route path="policies" element={<Policies />} />
        <Route path="settings" element={<Navigate to="/builder/policies" replace />} />
      </Route>

      {/* Worker mobile */}
      <Route
        path="/worker"
        element={
          <RequireAuth>
            <WorkerLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/worker/home" replace />} />
        <Route path="home" element={<WorkerHome />} />
        <Route path="induction" element={<Induction />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="swms" element={<SwmsSigning />} />
        <Route path="registration" element={<Registration />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}
