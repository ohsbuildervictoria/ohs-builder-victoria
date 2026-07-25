// Controlled pill/underline tab bar.
export default function Tabs({ tabs, active, onChange, variant = "underline", className = "" }) {
  if (variant === "pills") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {tabs.map((tab) => {
          const value = typeof tab === "string" ? tab : tab.value;
          const label = typeof tab === "string" ? tab : tab.label;
          const isActive = value === active;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-900 text-white"
                  : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  // Scroll, never wrap. A wrapped tab strip drops the last tab onto its own
  // row where it reads as a stray heading rather than a tab — on the tradie's
  // phone that made "Documents" look like it did nothing when tapped.
  return (
    <div
      className={`flex flex-nowrap gap-1 overflow-x-auto border-b border-slate-200 scrollbar-thin ${className}`}
    >
      {tabs.map((tab) => {
        const value = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? tab : tab.label;
        const isActive = value === active;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
