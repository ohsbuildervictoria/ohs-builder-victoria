// OH&S Builder Victoria wordmark + hard-hat glyph.
export default function Logo({ compact = false, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500 text-lg shadow-sm">
        <span aria-hidden>⛑️</span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p
            className={`text-sm font-bold ${light ? "text-white" : "text-slate-800"}`}
          >
            OH&amp;S Builder
          </p>
          <p
            className={`text-[11px] font-medium ${
              light ? "text-yellow-400" : "text-yellow-600"
            }`}
          >
            Victoria
          </p>
        </div>
      )}
    </div>
  );
}
