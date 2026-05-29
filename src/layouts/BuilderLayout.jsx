import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, ShieldCheck, BookOpen, AlertTriangle,
  Eye, Users2, FileText, Settings as SettingsIcon, BarChart3, ClipboardList,
  Menu, X, Bell, Search, LogOut, ChevronDown, HardHat, Receipt,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { currentBuilder } from '../data/mockData.js'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/progress-claim', label: 'Progress Claim', icon: Receipt },
  { to: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { to: '/swms', label: 'SWMS', icon: FileText },
  { to: '/site-diary', label: 'Site Diary', icon: BookOpen },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/near-miss', label: 'Near Miss', icon: Eye },
  { to: '/toolbox', label: 'Toolbox Meetings', icon: ClipboardList },
  { to: '/reports', label: 'Reporting', icon: BarChart3 },
  { to: '/admin', label: 'Admin Portal', icon: Users2 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

const bottomNav = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center border-b border-white/10">
        <Logo light />
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-navy-200 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon size={19} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <NavLink to="/worker" onClick={onNavigate} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-safety-300 hover:bg-white/5 transition">
          <HardHat size={19} /> Worker View
        </NavLink>
        <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-navy-300 hover:bg-white/5 transition">
          <LogOut size={19} /> Sign Out
        </NavLink>
      </div>
    </div>
  )
}

export default function BuilderLayout() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-navy-900 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-navy-900 animate-fade-in">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X size={22} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-navy-100 flex items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden text-navy-700">
            <Menu size={24} />
          </button>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input className="input pl-9 py-2" placeholder="Search projects, workers, SWMS..." />
            </div>
          </div>
          <div className="flex-1 md:hidden" />
          <button className="relative h-10 w-10 grid place-items-center rounded-xl hover:bg-navy-50 text-navy-600">
            <Bell size={20} />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-safety-500 ring-2 ring-white" />
          </button>
          <button className="flex items-center gap-2 pl-2 pr-1 sm:pr-3 py-1.5 rounded-xl hover:bg-navy-50">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-navy-700 text-white grid place-items-center text-sm font-bold">
              {currentBuilder.initials}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-sm font-semibold text-navy-900">{currentBuilder.name}</div>
              <div className="text-[11px] text-navy-400">{currentBuilder.role}</div>
            </div>
            <ChevronDown size={16} className="hidden sm:block text-navy-400" />
          </button>
        </header>

        <main className="p-4 sm:p-6 pb-24 lg:pb-8 max-w-7xl mx-auto animate-fade-in" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-navy-100 grid grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
        {bottomNav.map((item) => {
          const active = location.pathname === item.to
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                active ? 'text-brand-600' : 'text-navy-400'
              }`}
            >
              <item.icon size={21} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
