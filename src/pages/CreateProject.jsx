import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft, Check, Building2, MapPin, CalendarDays, HardHat, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '../components/ui.jsx'
import { trades } from '../data/mockData.js'

const steps = ['Project Details', 'Site & Schedule', 'Safety Setup']

export default function CreateProject() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selectedTrades, setSelectedTrades] = useState(['Carpenter', 'Electrician'])

  const toggleTrade = (t) =>
    setSelectedTrades((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))

  return (
    <>
      <PageHeader
        title="Create Project"
        subtitle="Set up a new construction site with safety controls"
        icon={Plus}
        actions={<Link to="/projects" className="btn-ghost"><ArrowLeft size={18} /> Back</Link>}
      />

      {/* Stepper */}
      <div className="flex items-center mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`h-9 w-9 rounded-full grid place-items-center text-sm font-bold shrink-0 ${
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-navy-100 text-navy-400'
              }`}>
                {i < step ? <Check size={18} /> : i + 1}
              </div>
              <span className={`text-sm font-semibold hidden sm:block ${i === step ? 'text-navy-900' : 'text-navy-400'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-emerald-500' : 'bg-navy-100'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-5 sm:p-6 max-w-3xl">
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-navy-700 font-bold"><Building2 size={18} /> Project Details</div>
            <div><label className="label">Project Name</label><input className="input" placeholder="e.g. Southbank Riverside Tower" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Project Type</label>
                <select className="input">
                  <option>Commercial High-Rise</option><option>Residential Apartments</option>
                  <option>Healthcare</option><option>Industrial</option><option>Civic / Government</option><option>Hospitality</option>
                </select>
              </div>
              <div><label className="label">Contract Value</label><input className="input" placeholder="$0.0M" /></div>
            </div>
            <div><label className="label">Description</label><textarea className="input" rows={3} placeholder="Short scope of works..." /></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-navy-700 font-bold"><MapPin size={18} /> Site & Schedule</div>
            <div><label className="label">Site Address</label><input className="input" placeholder="Street address, Suburb VIC Postcode" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Suburb</label><input className="input" placeholder="Melbourne" /></div>
              <div><label className="label">Postcode</label><input className="input" placeholder="3000" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label"><CalendarDays size={12} className="inline mr-1" />Start Date</label><input className="input" type="date" /></div>
              <div><label className="label"><CalendarDays size={12} className="inline mr-1" />Estimated Completion</label><input className="input" type="date" /></div>
            </div>
            <div><label className="label"><HardHat size={12} className="inline mr-1" />Site Supervisor</label>
              <select className="input"><option>David Caruana</option><option>Tom Wallace</option><option>Greg Patterson</option></select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 text-navy-700 font-bold"><ClipboardCheck size={18} /> Safety Setup</div>
            <div>
              <label className="label">Trades on site (auto-assign SWMS templates)</label>
              <div className="flex flex-wrap gap-2">
                {trades.map((t) => (
                  <button key={t} onClick={() => toggleTrade(t)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${
                      selectedTrades.includes(t) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-navy-600 border-navy-200'
                    }`}>
                    {selectedTrades.includes(t) && <Check size={14} className="inline mr-1" />}{t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {['Require digital site induction', 'Require WHS knowledge quiz (pass mark 100%)', 'Require White Card verification', 'Require public liability insurance', 'Enable daily site diary'].map((opt, i) => (
                <label key={opt} className="flex items-center justify-between rounded-xl border border-navy-200 px-4 py-3">
                  <span className="text-sm font-medium text-navy-700">{opt}</span>
                  <input type="checkbox" defaultChecked={i < 4} className="h-5 w-9 appearance-none rounded-full bg-navy-200 checked:bg-emerald-500 relative transition cursor-pointer before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:before:translate-x-4" />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-navy-100">
          <button onClick={() => (step === 0 ? navigate('/projects') : setStep(step - 1))} className="btn-ghost">
            <ArrowLeft size={18} /> {step === 0 ? 'Cancel' : 'Previous'}
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary">Continue</button>
          ) : (
            <button onClick={() => navigate('/projects')} className="btn-safety"><Check size={18} /> Create Project</button>
          )}
        </div>
      </div>
    </>
  )
}
