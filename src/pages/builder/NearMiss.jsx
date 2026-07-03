import { Link } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import { useIncidents } from "../../hooks/useIncidents";

// Evaluated once per page load — stable across re-renders.
const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;

export default function NearMiss() {
  const { getByType } = useIncidents();
  const nearMisses = getByType("Near Miss");
  const last30d = nearMisses.filter(
    (i) => new Date(i.date).getTime() >= THIRTY_DAYS_AGO
  ).length;
  const open = nearMisses.filter((i) => i.status !== "Closed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Near Miss Register</h1>
          <p className="text-sm text-slate-500">
            Proactive reporting — capture hazards before they cause harm
          </p>
        </div>
        <Link to="/builder/incidents">
          <Button variant="secondary">← All Incidents</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Near Misses (30d)" value={last30d} tone="amber" />
        <StatCard label="Total Logged" value={nearMisses.length} tone="blue" />
        <StatCard label="Open" value={open} tone={open > 0 ? "amber" : "green"} />
      </div>

      <Card>
        <CardHeader title="Reported Near Misses" />
        <CardBody className="space-y-3 pt-2">
          {nearMisses.length ? (
            nearMisses.map((i) => (
              <div key={i.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={i.severity}>{i.type}</Badge>
                  <Badge status={i.status} />
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {i.description}
                </p>
                <p className="text-xs text-slate-500">
                  {i.project} · Reported by {i.reportedBy} · {i.date}
                </p>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">
              No near misses recorded.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
