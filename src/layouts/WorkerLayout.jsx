import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAppContext } from "../context/AppContext";
import Logo from "../components/shared/Logo";
import OfflineSyncBanner from "../components/shared/OfflineSyncBanner";
import HelpDrawer from "../components/shared/HelpDrawer";

// Reporting sits in the middle of the bar, where a thumb lands. The induction
// asks every stakeholder to report near misses straight away; burying it two
// screens deep would be asking for something the app makes hard.
const NAV = [
  { to: "/worker/home", label: "My Site", icon: "🏠" },
  { to: "/worker/induction", label: "Induction", icon: "🎓" },
  { to: "/worker/report", label: "Report", icon: "⚠️" },
  { to: "/worker/swms", label: "SWMS", icon: "📋" },
  { to: "/worker/registration", label: "Profile", icon: "👷" },
];

export default function WorkerLayout() {
  const { logout, isBuilder, isWorker, user } = useAuth();
  const { org, loading, loadError, refresh } = useAppContext();
  const navigate = useNavigate();

  // Show the loading screen only before the FIRST load. Later refreshes (the
  // quiz refreshes compliance after a pass, for example) must not unmount the
  // page mid-flow — that threw a student back to question 1 with no result.
  const initialLoading = loading && !org;

  // A worker session that hasn't identified a tradie yet belongs on the
  // stakeholder sign-in screen.
  if (isWorker && !user?.workerId) {
    return <Navigate to="/stakeholder" replace />;
  }

  // Builders previewing the stakeholder portal go back to their dashboard —
  // never sign the whole session out. Tradies exit to their sign-in screen.
  const handleExit = async () => {
    if (isBuilder) {
      navigate("/builder/dashboard");
      return;
    }
    // Navigate first: once the session clears, RequireAuth would bounce a
    // worker route to /login before we could reach /stakeholder.
    navigate("/stakeholder");
    await logout();
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-200">
      {/* Mobile phone frame — max 430px */}
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-slate-50 shadow-xl">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-blue-900 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Logo light compact={!!org?.logoUrl} />
            {/* Whose site this is — the tradie's builder, branded. */}
            {org?.logoUrl && (
              <img
                src={org.logoUrl}
                alt={`${org.name} logo`}
                className="max-h-7 max-w-[110px] rounded bg-white/95 object-contain p-0.5"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <HelpDrawer compact />
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[11px] font-bold text-blue-950">
              STAKEHOLDER
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20 scrollbar-thin">
          {/* Without this, a failed load renders WorkerHome with no worker —
              which looks exactly like a correctly-provisioned empty account. */}
          {loadError ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-semibold text-red-700">Couldn't load your site data</p>
              <p className="mt-1 text-xs text-red-600">{loadError}</p>
              <button
                onClick={refresh}
                className="mt-4 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Try again
              </button>
            </div>
          ) : initialLoading ? (
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

        {/* Bottom nav */}
        <nav className="fixed bottom-0 z-20 flex w-full max-w-[430px] items-stretch border-t border-slate-200 bg-white">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  isActive ? "text-blue-900" : "text-slate-400"
                }`
              }
            >
              <span className="text-lg" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={handleExit}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-slate-400 hover:text-red-500"
          >
            <span className="text-lg" aria-hidden>
              🚪
            </span>
            {isBuilder ? "Back" : "Exit"}
          </button>
        </nav>
      </div>
    </div>
  );
}
