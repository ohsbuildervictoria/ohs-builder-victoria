import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEducation } from "../hooks/useEducation";
import Logo from "../components/shared/Logo";
import { eduBrand, eduRoleLabels } from "../data/education";

// ============================================================================
// Education shell — shared by the three Education roles. Branded by the
// institution (logo + primary colour), always attributed to OHS Builder
// Victoria, with a role-appropriate navigation. The student also keeps the
// normal Builder workspace for the simulation itself.
// ============================================================================

const NAV = {
  institution_admin: [
    { to: "/education/admin", label: "Dashboard", icon: "🏫", end: true },
    { to: "/education/admin/cohorts", label: "Cohorts", icon: "👥" },
    { to: "/education/admin/programs", label: "Programs", icon: "📚" },
    { to: "/education/admin/students", label: "Students", icon: "🎓" },
    { to: "/education/admin/assessors", label: "Assessors", icon: "🧑‍🏫" },
    { to: "/education/admin/scenarios", label: "Scenarios", icon: "🏗️" },
    { to: "/education/admin/settings", label: "Institution & branding", icon: "⚙️" },
  ],
  assessor: [
    { to: "/education/assess", label: "My cohorts", icon: "👥", end: true },
  ],
  student: [
    { to: "/education/student", label: "My Training", icon: "🎓", end: true },
    { to: "/education/student/evidence", label: "My Evidence", icon: "📁" },
    { to: "/education/student/results", label: "Assessment", icon: "✅" },
    { to: "/builder/dashboard", label: "Open my site →", icon: "🏗️", external: true },
  ],
};

export default function EducationLayout({ role }) {
  const { user, logout } = useAuth();
  const { education, ready } = useEducation();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">Loading…</div>
    );
  }
  // Fail closed: the database says what this account is.
  if (!education || (role && education.role !== role)) {
    if (education?.role === "institution_admin") return <Navigate to="/education/admin" replace />;
    if (education?.role === "assessor") return <Navigate to="/education/assess" replace />;
    if (education?.role === "student") return <Navigate to="/education/student" replace />;
    return <Navigate to="/builder/dashboard" replace />;
  }

  const items = NAV[education.role] || [];
  const primary = education.primaryColour || "#1e3a8a";
  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Institution brand bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: primary }} aria-hidden />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {education.logoUrl ? (
              <img
                src={education.logoUrl}
                alt={`${education.institutionName} logo`}
                className="max-h-10 max-w-[160px] object-contain"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white"
                style={{ backgroundColor: primary }}
                aria-hidden
              >
                {(education.institutionName || "I").charAt(0)}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-slate-800">{education.institutionName}</p>
              <p className="text-[11px] font-medium text-slate-500">
                {eduBrand.productName} · {eduRoleLabels[education.role]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
        {items.length > 1 && (
          <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2 lg:px-4 scrollbar-thin" aria-label="Education">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive && !item.external
                      ? "text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
                style={({ isActive }) => (isActive && !item.external ? { backgroundColor: primary } : undefined)}
              >
                <span aria-hidden className="mr-1.5">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-slate-500 lg:px-6">
          <div className="flex items-center gap-2">
            <Logo compact />
            <span>{eduBrand.attribution} · ohsbuildervictoria.com.au</span>
          </div>
          <span className="max-w-xl">{eduBrand.disclaimer}</span>
        </div>
      </footer>
    </div>
  );
}
