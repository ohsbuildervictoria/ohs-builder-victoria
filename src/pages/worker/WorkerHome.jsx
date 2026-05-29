import { Link } from 'react-router-dom'
import { GraduationCap, FileText, BadgeCheck, ShieldCheck, ChevronRight, MapPin, Clock, CheckCircle2, AlertTriangle, HardHat, CreditCard, HeartPulse } from 'lucide-react'
import { currentWorker, projects } from '../../data/mockData.js'

const project = projects[0]

const tasks = [
  { label: 'Complete Site Induction', sub: '2 modules remaining', to: '/worker/induction', icon: GraduationCap, done: false, tone: 'safety' },
  { label: 'OH&S Knowledge Quiz', sub: '4 questions · pass required', to: '/worker/quiz', icon: BadgeCheck, done: false, tone: 'safety' },
  { label: 'Sign Carpentry SWMS', sub: 'Awaiting your signature', to: '/worker/swms', icon: FileText, done: false, tone: 'brand' },
]

const myCompliance = [
  { label: 'White Card', ok: true, icon: CreditCard },
  { label: 'Insurance', ok: true, icon: ShieldCheck },
  { label: 'Medical Declaration', ok: true, icon: HeartPulse },
  { label: 'Induction', ok: false, icon: GraduationCap },
]

export default function WorkerHome() {
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">G&apos;day, {currentWorker.name.split(' ')[0]} 👷</h1>
        <p className="text-navy-500 text-sm">Here&apos;s what you need to complete for site access.</p>
      </div>

      {/* Assigned project */}
      <div className="rounded-2xl bg-navy-900 text-white p-5 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-600/30 blur-2xl" />
        <div className="relative">
          <div className="text-xs text-safety-400 font-bold uppercase tracking-wide flex items-center gap-1.5"><HardHat size={14} /> Your Assigned Site</div>
          <h2 className="text-xl font-extrabold mt-1">{project.name}</h2>
          <p className="text-navy-200 text-sm flex items-center gap-1.5 mt-1"><MapPin size={14} />{project.address}</p>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="chip bg-white/10 text-white">{currentWorker.trade}</span>
            <span className="chip bg-white/10 text-white">{currentWorker.company}</span>
          </div>
        </div>
      </div>

      {/* Access status banner */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 grid place-items-center shrink-0"><AlertTriangle size={20} /></div>
        <div className="flex-1"><div className="font-bold text-amber-800 text-sm">Site access pending</div><div className="text-xs text-amber-700">Complete the tasks below to be cleared for site entry.</div></div>
        <div className="text-right"><div className="text-xl font-extrabold text-amber-700">60%</div></div>
      </div>

      {/* Action tasks */}
      <div>
        <h3 className="font-bold text-navy-900 mb-2">Required Actions</h3>
        <div className="space-y-2.5">
          {tasks.map((t) => (
            <Link key={t.label} to={t.to} className="card p-4 flex items-center gap-3 hover:shadow-card-lg transition active:scale-[0.99]">
              <div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${t.tone === 'safety' ? 'bg-safety-50 text-safety-600' : 'bg-brand-50 text-brand-600'}`}><t.icon size={22} /></div>
              <div className="flex-1 min-w-0"><div className="font-semibold text-navy-800">{t.label}</div><div className="text-xs text-navy-400">{t.sub}</div></div>
              <ChevronRight size={20} className="text-navy-300" />
            </Link>
          ))}
        </div>
      </div>

      {/* My compliance */}
      <div>
        <h3 className="font-bold text-navy-900 mb-2">My Compliance</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {myCompliance.map((c) => (
            <div key={c.label} className={`card p-3 flex items-center gap-2.5 ${c.ok ? '' : 'border-rose-200'}`}>
              <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${c.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><c.icon size={18} /></div>
              <div className="min-w-0"><div className="text-sm font-semibold text-navy-800 truncate">{c.label}</div>
                <div className={`text-[11px] font-semibold flex items-center gap-1 ${c.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {c.ok ? <><CheckCircle2 size={12} /> Verified</> : <><Clock size={12} /> Pending</>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
