import { useAudit } from "../../hooks/useAudit";

const fmt = (d) =>
  new Date(d).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

// Shows the "edited by X on date — field: was → now" history for one record.
// Renders nothing when a record has never been edited.
export default function AuditTrail({ entity, entityId }) {
  const { entriesFor } = useAudit();
  const rows = entriesFor(entity, entityId);
  if (rows.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
        <span aria-hidden>✎</span> Edit history
      </p>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="text-xs text-slate-600">
            <span className="font-medium text-slate-700">{r.changedBy}</span>
            {" · "}
            {fmt(r.createdAt)}
            <ul className="mt-0.5 space-y-0.5 pl-3">
              {Object.entries(r.changes).map(([field, { from, to }]) => (
                <li key={field}>
                  <span className="font-medium">{field}:</span>{" "}
                  <span className="text-red-600 line-through">{from || "(blank)"}</span>{" "}
                  →{" "}
                  <span className="text-green-700">{to || "(blank)"}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
