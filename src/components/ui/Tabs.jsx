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

  return (
    <div className={`flex flex-wrap gap-1 border-b border-slate-200 ${className}`}>
      {tabs.map((tab) => {
        const value = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? tab : tab.label;
        const isActive = value === active;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
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
