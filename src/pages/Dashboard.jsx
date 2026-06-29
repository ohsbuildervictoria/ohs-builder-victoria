import { Link } from 'react-router-dom'
import {
  FolderKanban, Users2, GraduationCap, FileText, ShieldCheck, AlertTriangle,
  Plus, UserPlus, FileBarChart, Upload, ArrowUpRight, CheckCircle2, Eye, ClipboardList, BookOpen,
} from 'lucide-react'
import { PageHeader, StatCard, SectionCard } from '../components/ui.jsx'
import { ComplianceArea, TradeBars } from '../components/Charts.jsx'
import { stats, recentActivity, complianceTrend, workersByTrade, projects } from '../data/mockData.js'

const activityIcon = {
  induction: GraduationCap, swms: FileText, incident: AlertTriangle,
  toolbox: ClipboardList, diary: BookOpen, worker: UserPlus,
}
const activityTone = {
  induction: 'bg-brand-50 text-brand-600', swms: 'bg-emerald-50 text-emerald-600',
  incident: 'bg-rose-50 text-rose-600', toolbox: 'bg-safety-50 text-safety-600',
  diary: 'bg-navy-100 text-navy-700', worker: 'bg-brand-50 text-brand-600',
}

const quickActions = [
  { label: 'Create Project', to: '/projects/new', icon: Plus, tone: 'btn-primary' },
  { label: 'Invite Worker', to: '/admin', icon: UserPlus, tone: 'btn-dark' },
  { label: 'Generate Report', to: '/reports', icon: FileBarChart, tone: 'btn-ghost' },
  { label: 'Upload Induction', to: '/compliance', icon: Upload, tone: 'btn-ghost' },
]

export default function Dashboard() {
  return (
    <>
      <PageHeader
        title="Builder Dashboard"
        subtitle="Arlington Homes · Live safety overview across all sites"
        actions={<Link to="/projects/new" className="btn-safety"><Plus size={18} /> New Project</Link>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard label="Active Projects" value={stats.projects} icon={FolderKanban} tone="brand" />
        <StatCard label="Workers" value={stats.workers} icon={Users2} tone="navy" />
        <StatCard label="Pending Inductions" value={stats.pendingInductions} icon={GraduationCap} tone="safety" />
        <StatCard label="Pending SWMS" value={stats.pendingSwms} icon={FileText} tone="safety" />
        <StatCard label="Compliance" value={stats.compliance} suffix="%" icon={ShieldCheck} tone="green" />
        <StatCard label="Open Incidents" value={stats.incidents} icon={AlertTriangle} tone="red" />
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((a) => (
          <Link key={a.label} to={a.to} className={`${a.tone} py-3 justify-start`}>
            <a.icon size={18} /> {a.label}
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-4 grid lg:grid-cols-3 gap-4">
        <SectionCard title="Compliance Trend (6 months)" className="lg:col-span-2"
          action={<span className="chip bg-emerald-50 text-emerald-700"><ArrowUpRight size={14} /> +11%</span>}>
          <ComplianceArea data={complianceTrend} />
        </SectionCard>
        <SectionCard title="Workforce by Trade">
          <TradeBars data={workersByTrade} />
        </SectionCard>
      </div>

      {/* Activity + projects */}
      <div className="mt-4 grid lg:grid-cols-3 gap-4">
        <SectionCard title="Recent Activity" className="lg:col-span-2"
          action={<Link to="/reports" className="text-sm font-semibold text-brand-600">View all</Link>}>
          <ul className="divide-y divide-navy-50 -my-2">
            {recentActivity.map((a) => {
              const Icon = activityIcon[a.type] || CheckCircle2
              return (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${activityTone[a.type]}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-navy-800">
                      <span className="font-semibold">{a.who}</span> {a.text}
                    </p>
                    <p className="text-xs text-navy-400 truncate">{a.project}</p>
                  </div>
                  <span className="text-xs text-navy-400 whitespace-nowrap">{a.time}</span>
                </li>
              )
            })}
          </ul>
        </SectionCard>

        <SectionCard title="Top Projects"
          action={<Link to="/projects" className="text-sm font-semibold text-brand-600">All</Link>}>
          <div className="space-y-4 -my-1">
            {projects.slice(0, 4).map((p) => (
              <Link to={`/projects/${p.id}`} key={p.id} className="block group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-navy-800 group-hover:text-brand-600 truncate pr-2">{p.name}</span>
                  <span className="text-xs font-bold text-navy-500">{p.compliance}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-navy-100 overflow-hidden">
                  <div className={`h-full rounded-full ${p.compliance >= 90 ? 'bg-emerald-500' : p.compliance >= 80 ? 'bg-safety-500' : 'bg-rose-500'}`} style={{ width: `${p.compliance}%` }} />
                </div>
                <div className="text-[11px] text-navy-400 mt-1">{p.suburb} · {p.workers} workers</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  )
}
