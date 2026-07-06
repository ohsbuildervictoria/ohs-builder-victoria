// Status badge with colour mapping for all OH&S statuses.
const STYLES = {
  // compliance categories / generic
  Verified: "bg-green-100 text-green-700 ring-green-600/20",
  Pending: "bg-amber-100 text-amber-700 ring-amber-600/20",
  Missing: "bg-red-100 text-red-700 ring-red-600/20",
  // document expiry states
  Expiring: "bg-amber-100 text-amber-800 ring-amber-600/30",
  Expired: "bg-red-100 text-red-700 ring-red-600/20",
  // worker overall status
  Active: "bg-green-100 text-green-700 ring-green-600/20",
  "Action Required": "bg-amber-100 text-amber-700 ring-amber-600/20",
  "Site Access Pending": "bg-red-100 text-red-700 ring-red-600/20",
  // swms statuses
  Compliant: "bg-green-100 text-green-700 ring-green-600/20",
  "Pending Compliance": "bg-amber-100 text-amber-700 ring-amber-600/20",
  "Template Required": "bg-red-100 text-red-700 ring-red-600/20",
  // project statuses
  Planning: "bg-blue-100 text-blue-700 ring-blue-600/20",
  "On Hold": "bg-slate-200 text-slate-600 ring-slate-500/20",
  Closed: "bg-slate-200 text-slate-600 ring-slate-500/20",
  // incident severity / status
  Low: "bg-green-100 text-green-700 ring-green-600/20",
  Medium: "bg-amber-100 text-amber-700 ring-amber-600/20",
  High: "bg-orange-100 text-orange-700 ring-orange-600/20",
  Critical: "bg-red-100 text-red-700 ring-red-600/20",
  Open: "bg-red-100 text-red-700 ring-red-600/20",
  Investigating: "bg-amber-100 text-amber-700 ring-amber-600/20",
  "Corrective Action": "bg-blue-100 text-blue-700 ring-blue-600/20",
  "In Progress": "bg-blue-100 text-blue-700 ring-blue-600/20",
  Done: "bg-green-100 text-green-700 ring-green-600/20",
  Completed: "bg-green-100 text-green-700 ring-green-600/20",
  Scheduled: "bg-blue-100 text-blue-700 ring-blue-600/20",
  Invited: "bg-blue-100 text-blue-700 ring-blue-600/20",
};

const ICONS = {
  Verified: "✓",
  Pending: "⏳",
  Missing: "✕",
  Expiring: "⚠",
  Expired: "✕",
};

export default function Badge({ status, children, icon = false, className = "" }) {
  const label = children ?? status;
  const style = STYLES[status] || "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
    >
      {icon && ICONS[status] ? <span aria-hidden>{ICONS[status]}</span> : null}
      {label}
    </span>
  );
}
