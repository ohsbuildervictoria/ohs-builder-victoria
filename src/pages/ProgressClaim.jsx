import { useMemo, useState } from 'react'
import { Receipt, Plus, Trash2, FileDown, Mail, CheckCircle2, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/ui.jsx'
import { company, currentBuilder, projects } from '../data/mockData.js'

const DEFAULT_STAGES = [
  { label: 'Base stage', value: 38500, done: true },
  { label: 'Frame stage', value: 52000, done: true },
  { label: 'Lock-up stage', value: 61500, done: false },
  { label: 'Fixing stage', value: 44000, done: false },
]

const aud = (n) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n || 0)

export default function ProgressClaim() {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [stages, setStages] = useState(DEFAULT_STAGES)
  const [variations, setVariations] = useState([
    { desc: 'Upgrade to 40mm benchtop (client request)', amount: 2400 },
  ])
  const [retentionPct, setRetentionPct] = useState(5)
  const [status, setStatus] = useState('draft') // draft | generated | sent

  const project = projects.find((p) => p.id === projectId) || projects[0]

  const totals = useMemo(() => {
    const completed = stages.filter((s) => s.done).reduce((sum, s) => sum + s.value, 0)
    const variationsTotal = variations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
    const subtotal = completed + variationsTotal
    const retention = subtotal * (Number(retentionPct) || 0) / 100
    const afterRetention = subtotal - retention
    const gst = afterRetention * 0.1
    return { completed, variationsTotal, subtotal, retention, afterRetention, gst, total: afterRetention + gst }
  }, [stages, variations, retentionPct])

  const toggleStage = (i) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s)))
  const addVariation = () =>
    setVariations((prev) => [...prev, { desc: 'New variation', amount: 0 }])
  const removeVariation = (i) =>
    setVariations((prev) => prev.filter((_, idx) => idx !== i))
  const updateVariation = (i, patch) =>
    setVariations((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))

  const claimNumber = `PC-${(project?.id ?? 'p1').toUpperCase()}-007`
  const today = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div>
      <PageHeader
        title="Progress Claim"
        subtitle="Build a Security of Payment claim and send it before you leave site."
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            <button id="pc-generate" onClick={() => setStatus('generated')} className="btn-primary px-4 py-2">
              <FileDown size={17} /> Generate
            </button>
            <button
              id="pc-email"
              onClick={() => setStatus('sent')}
              disabled={status === 'draft'}
              className="btn bg-safety-500 text-white px-4 py-2 disabled:opacity-40"
            >
              <Mail size={17} /> Email to client
            </button>
          </div>
        }
      />

      {status === 'sent' && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="text-emerald-600" /> Claim {claimNumber} emailed to {project?.client || 'the client'}.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Builder form ── */}
        <div className="space-y-4">
          <div className="card p-5">
            <label htmlFor="pc-project" className="block text-xs font-semibold text-navy-500 uppercase mb-2">
              Project
            </label>
            <select
              id="pc-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-navy-200 px-3 py-2.5 text-sm bg-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="card p-5">
            <div className="text-xs font-semibold text-navy-500 uppercase mb-3">Completed stages</div>
            <div className="space-y-2">
              {stages.map((s, i) => (
                <label
                  key={s.label}
                  htmlFor={`pc-stage-${i}`}
                  className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer ${
                    s.done ? 'border-brand-200 bg-brand-50/50' : 'border-navy-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-sm font-medium text-navy-800">
                    <input
                      id={`pc-stage-${i}`}
                      type="checkbox"
                      checked={s.done}
                      onChange={() => toggleStage(i)}
                      className="rounded border-navy-300 text-brand-600"
                    />
                    {s.label}
                  </span>
                  <span className="text-sm font-semibold text-navy-700">{aud(s.value)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-navy-500 uppercase">Variations</div>
              <button id="pc-add-variation" onClick={addVariation} className="chip bg-brand-50 text-brand-700">
                <Plus size={13} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {variations.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={v.desc}
                    onChange={(e) => updateVariation(i, { desc: e.target.value })}
                    className="flex-1 rounded-lg border border-navy-200 px-2.5 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={v.amount}
                    onChange={(e) => updateVariation(i, { amount: e.target.value })}
                    className="w-28 rounded-lg border border-navy-200 px-2.5 py-2 text-sm"
                  />
                  <button onClick={() => removeVariation(i)} className="text-navy-400 hover:text-rose-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <label htmlFor="pc-retention" className="block text-xs font-semibold text-navy-500 uppercase mb-2">
              Retention (%)
            </label>
            <input
              id="pc-retention"
              type="number"
              value={retentionPct}
              onChange={(e) => setRetentionPct(e.target.value)}
              className="w-28 rounded-lg border border-navy-200 px-2.5 py-2 text-sm"
            />
          </div>
        </div>

        {/* ── SOPA-style claim preview ── */}
        <div className="card p-6 lg:sticky lg:top-6 self-start">
          <div className="flex items-start justify-between border-b border-navy-100 pb-4">
            <div>
              <div className="text-lg font-extrabold text-navy-900">Payment Claim</div>
              <div className="text-xs text-navy-500">Claim No. {claimNumber} · {today}</div>
            </div>
            <span className={`chip ${status === 'draft' ? 'bg-navy-100 text-navy-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {status === 'draft' ? 'Draft' : status === 'generated' ? 'Generated' : 'Sent'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 text-sm">
            <div>
              <div className="text-xs text-navy-400 uppercase">From (Claimant)</div>
              <div className="font-semibold text-navy-800">{company.builder}</div>
              <div className="text-navy-500 text-xs">ABN {company.abn}</div>
              <div className="text-navy-500 text-xs">{currentBuilder.name}</div>
            </div>
            <div>
              <div className="text-xs text-navy-400 uppercase">For (Project)</div>
              <div className="font-semibold text-navy-800">{project?.name}</div>
              <div className="text-navy-500 text-xs">{project?.address}</div>
            </div>
          </div>

          <table className="w-full text-sm border-t border-navy-100">
            <tbody>
              {stages.filter((s) => s.done).map((s) => (
                <tr key={s.label} className="border-b border-navy-50">
                  <td className="py-2 text-navy-700">{s.label}</td>
                  <td className="py-2 text-right text-navy-700">{aud(s.value)}</td>
                </tr>
              ))}
              {variations.map((v, i) => (
                <tr key={i} className="border-b border-navy-50">
                  <td className="py-2 text-navy-700">Variation: {v.desc}</td>
                  <td className="py-2 text-right text-navy-700">{aud(Number(v.amount))}</td>
                </tr>
              ))}
              <tr><td className="py-2 text-navy-500">Less retention ({retentionPct}%)</td><td className="py-2 text-right text-rose-600">-{aud(totals.retention)}</td></tr>
              <tr><td className="py-2 text-navy-500">GST (10%)</td><td className="py-2 text-right text-navy-700">{aud(totals.gst)}</td></tr>
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-3 rounded-xl bg-navy-900 text-white px-4 py-3">
            <span className="text-sm font-medium">Total claimed (inc. GST)</span>
            <span className="text-xl font-extrabold">{aud(totals.total)}</span>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-navy-500 flex gap-2">
            <ShieldCheck size={28} className="text-brand-600 shrink-0" />
            This is a payment claim made under the Building and Construction Industry Security of
            Payment Act 2002 (Vic). Payment is due within the period specified in the contract or,
            if none, 10 business days after this claim is served.
          </p>
        </div>
      </div>
    </div>
  )
}
