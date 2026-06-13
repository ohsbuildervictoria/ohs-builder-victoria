// Colour-coded progress bar. By default colour follows compliance thresholds
// (red <80, amber 80-89, green 90+); override with the `color` prop.
function thresholdColor(value) {
  if (value >= 90) return "bg-green-500";
  if (value >= 80) return "bg-amber-500";
  return "bg-red-500";
}

export default function ProgressBar({
  value = 0,
  color,
  showLabel = false,
  threshold = false,
  className = "",
  height = "h-2",
}) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor = color || (threshold ? thresholdColor(pct) : "bg-blue-900");
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-full overflow-hidden rounded-full bg-slate-200 ${height}`}>
        <div
          className={`${height} rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-600">
          {pct}%
        </span>
      ) : null}
    </div>
  );
}
