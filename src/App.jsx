import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ToastProvider } from "./components/ui/Notification";
import { useAuth } from "./hooks/useAuth";

import BuilderLayout from "./layouts/BuilderLayout";
import WorkerLayout from "./layouts/WorkerLayout";

import Login from "./pages/Login";

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

// Gates builder routes; redirects to /login when no session.
function RequireBuilder({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
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
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

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
      <Route path="/worker" element={<WorkerLayout />}>
        <Route index element={<Navigate to="/worker/home" replace />} />
        <Route path="home" element={<WorkerHome />} />
        <Route path="induction" element={<Induction />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="swms" element={<SwmsSigning />} />
        <Route path="registration" element={<Registration />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}
