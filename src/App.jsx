import { Routes, Route, Navigate } from 'react-router-dom'
import BuilderLayout from './layouts/BuilderLayout.jsx'
import WorkerLayout from './layouts/WorkerLayout.jsx'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProjectList from './pages/ProjectList.jsx'
import CreateProject from './pages/CreateProject.jsx'
import ProjectDetails from './pages/ProjectDetails.jsx'
import ProgressClaim from './pages/ProgressClaim.jsx'
import Compliance from './pages/Compliance.jsx'
import SiteDiary from './pages/SiteDiary.jsx'
import Incidents from './pages/Incidents.jsx'
import NearMiss from './pages/NearMiss.jsx'
import Toolbox from './pages/Toolbox.jsx'
import SwmsManagement from './pages/SwmsManagement.jsx'
import Admin from './pages/Admin.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'

import WorkerHome from './pages/worker/WorkerHome.jsx'
import WorkerRegistration from './pages/worker/WorkerRegistration.jsx'
import Induction from './pages/worker/Induction.jsx'
import Quiz from './pages/worker/Quiz.jsx'
import SwmsSigning from './pages/worker/SwmsSigning.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Builder workspace */}
      <Route element={<BuilderLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<CreateProject />} />
        <Route path="/projects/:id" element={<ProjectDetails />} />
        <Route path="/progress-claim" element={<ProgressClaim />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/site-diary" element={<SiteDiary />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/near-miss" element={<NearMiss />} />
        <Route path="/toolbox" element={<Toolbox />} />
        <Route path="/swms" element={<SwmsManagement />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Worker (tradie) workspace — restricted */}
      <Route element={<WorkerLayout />}>
        <Route path="/worker" element={<WorkerHome />} />
        <Route path="/worker/register" element={<WorkerRegistration />} />
        <Route path="/worker/induction" element={<Induction />} />
        <Route path="/worker/quiz" element={<Quiz />} />
        <Route path="/worker/swms" element={<SwmsSigning />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
