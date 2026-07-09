import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useNotifications } from "../hooks/useNotifications";
import { useAppContext } from "../context/AppContext";
import Logo from "../components/shared/Logo";
import OfflineSyncBanner from "../components/shared/OfflineSyncBanner";
import RoleBadge from "../components/shared/RoleBadge";
import { NotificationItem } from "../components/ui/Notification";
import { brand, rolePermissions } from "../data/constants";

const NAV = [
  { to: "/builder/dashboard", label: "Dashboard", icon: "📊", perm: "dashboard" },
  { to: "/builder/projects", label: "Projects", icon: "🏗️", perm: "projects" },
  { to: "/builder/compliance", label: "Compliance", icon: "✅", perm: "compliance" },
  { to: "/builder/swms", label: "SWMS", icon: "📋", perm: "swms" },
  { to: "/builder/diary", label: "Site Diary", icon: "📓", perm: "diary" },
  { to: "/builder/incidents", label: "Incidents", icon: "⚠️", perm: "incidents" },
  { to: "/builder/toolbox", label: "Toolbox Meetings", icon: "🧰", perm: "toolbox" },
  { to: "/builder/reports", label: "Reports", icon: "📈", perm: "reports" },
  { to: "/builder/admin", label: "Admin Portal", icon: "🛡️", perm: "admin" },
  { to: "/builder/policies", label: "Policies", icon: "📜", perm: "policies" },
];

export default function BuilderLayout() {
  const { user, role, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { org, loading, loadError, refresh } = useAppContext();
  const [bellOpen, setBellOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const perms = rolePermissions[role] || rolePermissions.builder_admin;
  const visibleNav = NAV.filter((n) => perms[n.perm]);

  // Workers (stakeholders) have no builder workspace access at all.
  if (role === "worker") {
    return <Navigate to="/worker/home" replace />;
  }

  const currentPerm = NAV.find((n) => location.pathname.startsWith(n.to))?.perm;
  if (currentPerm && !perms[currentPerm]) {
    return <Navigate to="/builder/dashboard" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 lg:flex">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <Logo light />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-900 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="my-3 border-t border-slate-800" />

          <NavLink
            to="/worker/home"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-yellow-400 hover:bg-slate-800"
          >
            <span aria-hidden>📱</span>
            Stakeholder View
          </NavLink>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <span aria-hidden>↩️</span>
            Sign Out
          </button>
        </nav>
        <div className="border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">
          {org?.name || brand.fullName}
          <br />
          {org?.tagline || brand.tagline}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-slate-500">
              {org ? `${org.name} · ${org.state} · ${org.plan} Plan` : brand.fullName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                    <span className="text-sm font-semibold text-slate-700">
                      Notifications
                    </span>
                    <button
                      onClick={markAllRead}
                      className="text-xs font-medium text-blue-700 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        No notifications
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onRead={markRead}
                          onOpen={(link) => {
                            setBellOpen(false);
                            navigate(link);
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                <RoleBadge role={role} />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile nav (when sidebar hidden) */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 lg:hidden scrollbar-thin">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-blue-900 text-white" : "text-slate-600"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
          {loadError ? (
            <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-semibold text-red-700">Couldn't load your data</p>
              <p className="mt-1 text-xs text-red-600">{loadError}</p>
              <button
                onClick={refresh}
                className="mt-4 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Loading…
            </div>
          ) : (
            <>
              <OfflineSyncBanner />
              <Outlet />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
