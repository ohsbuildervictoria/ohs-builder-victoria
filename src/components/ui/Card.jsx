export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-xl bg-white shadow-sm border border-slate-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 pt-5 ${className}`}>
      <div>
        {title ? (
          <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
        ) : null}
        {subtitle ? (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
