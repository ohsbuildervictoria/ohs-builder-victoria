// KPI metric card. `tone` controls the accent colour of the value.
const TONES = {
  default: "text-slate-800",
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
  blue: "text-blue-900",
};

const RINGS = {
  default: "border-slate-200",
  green: "border-green-200",
  amber: "border-amber-200",
  red: "border-red-200",
  blue: "border-blue-200",
};

export default function StatCard({ label, value, tone = "default", sub, icon }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${RINGS[tone] || RINGS.default}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {icon ? <span className="text-lg leading-none">{icon}</span> : null}
      </div>
      <p className={`mt-2 text-3xl font-bold ${TONES[tone] || TONES.default}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}
