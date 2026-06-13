// Lightweight table primitives with consistent OH&S styling.
export function Table({ children, className = "" }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className={`min-w-full divide-y divide-slate-200 ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function THead({ columns }) {
  return (
    <thead className="bg-slate-50">
      <tr>
        {columns.map((col) => (
          <th
            key={col}
            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function TR({ children, className = "", ...props }) {
  return (
    <tr className={`hover:bg-slate-50/70 ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TD({ children, className = "", ...props }) {
  return (
    <td className={`px-4 py-3 text-sm text-slate-600 ${className}`} {...props}>
      {children}
    </td>
  );
}
