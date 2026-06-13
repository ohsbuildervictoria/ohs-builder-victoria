import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";

const NAV = [
  { to: "/worker/home", label: "My Site", icon: "🏠" },
  { to: "/worker/induction", label: "Induction", icon: "🎓" },
  { to: "/worker/swms", label: "SWMS", icon: "📋" },
  { to: "/worker/registration", label: "Profile", icon: "👷" },
];

export default function WorkerLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleExit = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-200">
      {/* Mobile phone frame — max 430px */}
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-slate-50 shadow-xl">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-blue-900 px-4 py-3">
          <Logo light />
          <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[11px] font-bold text-blue-950">
            STAKEHOLDER
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-20 scrollbar-thin">
          <Outlet />
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
            Exit
          </button>
        </nav>
      </div>
    </div>
  