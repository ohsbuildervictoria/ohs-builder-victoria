import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, FileDown, PenLine, Eraser, CheckCircle2, ShieldCheck, HardHat, Trophy } from 'lucide-react'
import { swmsDetail } from '../../data/mockData.js'

const riskTone = { High: 'bg-rose-50 text-rose-700', Medium: 'bg-amber-50 text-amber-700', Low: 'bg-brand-50 text-brand-700' }

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#16223d'
  }, [])

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const p = e.touches ? e.touches[0] : e
    return { x: p.clientX - rect.left, y: p.clientY - rect.top }
  }
  const start = (e) => { drawing.current = true; const ctx = canvasRef.current.getContext('2d'); const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y) }
  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d'); const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke()
    if (!hasInk) { setHasInk(true); onChange(true) }
  }
  const end = () => { drawing.current = false }
  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false); onChange(false)
  }

  return (
    <div>
      <div className="relative rounded-xl border-2 border-navy-200 bg-navy-50/40 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-36 touch-none cursor-crosshair"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
        {!hasInk && <span className="absolute inset-0 grid place-items-center text-navy-300 italic pointer-events-none text-sm">✍️ Sign with your finger or mouse</span>}
        <button onClick={clear} className="absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold text-navy-500 bg-white rounded-lg px-2 py-1 shadow-sm"><Eraser size={13} /> Clear</button>
      </div>
    </div>
  )
}

export default function SwmsSigning() {
  const navigate = useNavigate()
  const detail = swmsDetail.Carpenter
  const [signed, setSigned] = useState(false)
  const [agreed, setAgreed] = useState(true)
  const [hasInk, setHasInk] = useState(false)

  if (signed) {
    return (
      <div className="max-w-md mx-auto pt-8">
        <div className="card p-6 text-center animate-fade-in">
          <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto"><Trophy size={40} /></div>
          <h2 className="text-2xl font-extrabold text-navy-900 mt-4">You&apos;re Site Ready! 🎉</h2>
          <p className="text-navy-500 mt-1">SWMS signed. Induction, quiz and safety docs complete.</p>
          <div className="mt-5 space-y-2 text-left">
            {['Site induction completed', 'OH&S quiz passed (100%)', 'Carpentry SWMS signed'].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-navy-700"><CheckCircle2 size={18} className="text-emerald-500" />{t}</div>
            ))}
          </div>
          <button onClick={() => navigate('/worker')} className="btn-primary w-full mt-6 py-3">Back to My Site</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">Sign SWMS</h1>
        <p className="text-navy-500 text-sm">Carpentry & Formwork SWMS · v3.2</p>
      </div>

      {/* Doc header */}
      <div className="rounded-2xl bg-navy-900 text-white p-5 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-white/10 grid place-items-center"><FileText size={24} className="text-safety-400" /></div>
        <div className="flex-1"><div className="font-bold">Carpentry & Formwork SWMS</div><div className="text-xs text-navy-300 flex items-center gap-1.5"><HardHat size={13} /> Docklands Tower Stage 2</div></div>
        <button className="btn bg-white/10 text-white px-3 py-2 text-xs"><FileDown size={15} /> PDF</button>
      </div>

      {/* Hazards */}
      <div className="card p-5">
        <div className="text-xs font-semibold text-navy-500 uppercase mb-3">Hazards & Risk Controls</div>
        <div className="space-y-2">
          {detail.hazards.map((h, i) => (
            <div key={i} className="rounded-xl border border-navy-100 p-3">
              <div className="flex items-center justify-between"><span className="font-semibold text-navy-800 text-sm">{h.hazard}</span><span className={`chip ${riskTone[h.risk]}`}>{h.risk}</span></div>
              <p className="text-xs text-navy-500 mt-1"><b>Control:</b> {h.control}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PPE */}
      <div className="card p-5">
        <div className="text-xs font-semibold text-navy-500 uppercase mb-3">Required PPE</div>
        <div className="flex flex-wrap gap-2">
          {detail.ppe.map((p) => <span key={p} className="chip bg-brand-50 text-brand-700"><CheckCircle2 size={13} />{p}</span>)}
        </div>
      </div>

      {/* Signature */}
      <div className="card p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-navy-500 uppercase mb-3"><PenLine size={15} /> Digital Signature</div>
        <SignaturePad onChange={setHasInk} />
        <label className="flex items-start gap-2 mt-4 text-sm text-navy-600">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded border-navy-300 text-brand-600" />
          I have read, understood and will comply with this SWMS and all site safety requirements.
        </label>
        <button onClick={() => setSigned(true)} disabled={!hasInk || !agreed} className="btn-safety w-full mt-4 py-3 disabled:opacity-40">
          <PenLine size={18} /> Sign & Submit
        </button>
        {(!hasInk || !agreed) && <p className="text-xs text-navy-400 text-center mt-2">Add your signature and confirm the declaration to continue.</p>}
      </div>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-center gap-2.5 text-xs text-brand-800">
        <ShieldCheck size={24} className="text-brand-600 shrink-0" /> Your signature is timestamped and recorded against this project.
      </div>
    </div>
  )
}
