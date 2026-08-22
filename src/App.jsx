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
import Pricing from "./pages/Pricing";
import HelpCentre from "./pages/help/HelpCentre";
import HelpGuidePage from "./pages/help/HelpGuidePage";
import HelpFaqPage from "./pages/help/HelpFaqPage";

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
import Welcome from "./pages/builder/Welcome";
import PlatformAdmin from "./pages/platform/PlatformAdmin";

import WorkerHome from "./pages/worker/WorkerHome";
import Induction from "./pages/worker/Induction";
import Quiz from "./pages/worker/Quiz";
import SwmsSigning from "./pages/worker/SwmsSigning";
import Registration from "./pages/worker/Registration";
import ReportIncident from "./pages/worker/ReportIncident";

// Education — institutions, assessors, students (src/lib/eduApi.js)
import EducationLayout from "./layouts/EducationLayout";
import EduJoin from "./pages/edu/EduJoin";
import EduGo from "./pages/edu/EduGo";
import InstitutionDashboard from "./pages/edu/admin/InstitutionDashboard";
import InstitutionSetup from "./pages/edu/admin/InstitutionSetup";
import AdminCohorts from "./pages/edu/admin/AdminCohorts";
import AdminCohortDetail from "./pages/edu/admin/AdminCohortDetail";
import AdminPrograms from "./pages/edu/admin/AdminPrograms";
import AdminStudents from "./pages/edu/admin/AdminStudents";
import AdminAssessors from "./pages/edu/admin/AdminAssessors";
import AdminScenarios from "./pages/edu/admin/AdminScenarios";
import AdminSettings from "./pages/edu/admin/AdminSettings";
import AssessorHome from "./pages/edu/assess/AssessorHome";
import AssessorCohort from "./pages/edu/assess/AssessorCohort";
import AssessorReview from "./pages/edu/assess/AssessorReview";
import StudentHome from "./pages/edu/student/StudentHome";
import StudentTask from "./pages/edu/student/StudentTask";
import StudentEvidence from "./pages/edu/student/StudentEvidence";
import StudentSubmit from "./pages/edu/student/StudentSubmit";
import StudentResults from "./pages/edu/student/StudentResults";

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

// Platform super admin only — the flag comes from the database
// (platform_admins allow-list via my_permissions), never from the client.
// The RPCs behind the page refuse everyone else regardless of this guard.
function RequirePlatform({ children }) {
  const { user, permissions } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!permissions) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Loading…
      </div>
    );
  }
  if (!permissions.platform) return <Navigate to="/builder/dashboard" replace />;
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
      <Route path="/pricing" element={<Pricing />} />
      {/* Help & Documentation Centre — public, shared with the in-app drawers */}
      <Route path="/help" element={<HelpCentre />} />
      <Route path="/help/faq" element={<HelpFaqPage />} />
      <Route path="/help/:role" element={<HelpGuidePage />} />
      <Route path="/help/:role/:slug" element={<HelpGuidePage />} />
      {/* Tradie sign-in (real per-tradie accounts + legacy pilot usernames) */}
      <Route path="/stakeholder" element={<StakeholderLogin />} />
      {/* Subbie invite link — set up a real per-tradie account */}
      <Route path="/join/:token" element={<JoinTradie />} />
      <Route path="/join-staff/:token" element={<JoinStaff />} />
      {/* QR site sign-in — scanned from the poster at the gate */}
      <Route path="/checkin/:token" element={<SiteCheckin />} />

      {/* Education invitations (institution admin / assessor / student) and
          the post-sign-in resolver that routes each role home */}
      <Route path="/edu/join/:token" element={<EduJoin />} />
      <Route path="/go" element={<EduGo />} />

      {/* Education — institution administration */}
      <Route path="/education" element={<EduGo />} />
      <Route path="/education/admin" element={<EducationLayout role="institution_admin" />}>
        <Route index element={<InstitutionDashboard />} />
        <Route path="setup" element={<InstitutionSetup />} />
        <Route path="cohorts" element={<AdminCohorts />} />
        <Route path="cohorts/:id" element={<AdminCohortDetail />} />
        <Route path="programs" element={<AdminPrograms />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="assessors" element={<AdminAssessors />} />
        <Route path="scenarios" element={<AdminScenarios />} />
        <Route path="settings" element={<AdminSettings />} />
        {/* Read-only student review for administrators (same screen as the
            assessor's; the database refuses assessment writes from admins) */}
        <Route path="students/:enrolmentId" element={<AssessorReview />} />
      </Route>

      {/* Education — assessor */}
      <Route path="/education/assess" element={<EducationLayout role="assessor" />}>
        <Route index element={<AssessorHome />} />
        <Route path="cohorts/:id" element={<AssessorCohort />} />
        <Route path="students/:enrolmentId" element={<AssessorReview />} />
      </Route>

      {/* Education — student training dashboard (the simulation itself runs
          in the student's own Builder workspace under /builder) */}
      <Route path="/education/student" element={<EducationLayout role="student" />}>
        <Route index element={<StudentHome />} />
        <Route path="tasks/:code" element={<StudentTask />} />
        <Route path="evidence" element={<StudentEvidence />} />
        <Route path="submit" element={<StudentSubmit />} />
        <Route path="results" element={<StudentResults />} />
      </Route>

      {/* Platform administration — operator only, outside any tenant workspace */}
      <Route
        path="/platform"
        element={
          <RequirePlatform>
            <PlatformAdmin />
          </RequirePlatform>
        }
      />

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
        <Route path="welcome" element={<Welcome />} />
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
        <Route path="report" element={<ReportIncident />} />
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
