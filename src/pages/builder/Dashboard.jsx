import { useMemo } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import Card, { CardHeader, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import ComplianceByProject from "../../components/charts/ComplianceByProject";
import IncidentBar from "../../components/charts/IncidentBar";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useAppContext } from "../../context/AppContext";
import { useProjects } from "../../hooks/useProjects";
import { useDocuments } from "../../hooks/useDocuments";
import { orgCompliancePercent, formatPercent } from "../../lib/compliance";

// Evaluated once per page load — stable across re-renders.
const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;

const dateLabel = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
};

export default function Dashboard() {
  const { projects } = useProjects();
  const { workers, incidents, templates, entries, meetings } = useAppContext();
  const { byWorker: docsByWorker } = useDocuments();

  // All KPIs are computed live from the database state.
  const kpis = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === "Active").length;
    // "Stakeholders on site" — every person on the books. The old count used
    // status === "Active", which a worker only reaches once every one of their
    // six categories is valid, so a builder with a full site read zero.
    const activeWorkers = workers.length;
    const fullyCompliantWorkers = workers.filter((w) => w.status === "Active").length;
    // One definition of organisation compliance, shared with Reports and the
    // emailed PDF (src/lib/compliance.js). These three used to disagree.
    const compliance = orgCompliancePercent(workers, docsByWorker);
    const pendingInductions = workers.filter((w) => w.induction !== "Verified").length;
    const openIncidents = incidents.filter((i) => i.status !== "Closed").length;
    const pendingSwms = templates.reduce(
      (s, t) => s + Math.max(0, t.total - t.signed),
      0
    );
    const workSafeNotifications = incidents.filter(
      (i) => i.notifiable && i.status !== "Closed"
    ).length;
    const nearMisses30d = incidents.filter(
      (i) => i.type === "Near Miss" && new Date(i.date).getTime() >= THIRTY_DAYS_AGO
    ).length;
    const openActions = incidents.reduce(
      (s, i) =>
        s + (i.correctiveActions || []).filter((a) => a.status !== "Done").length,
      0
    );
    // LTIFR (WorkSafe formula): lost-time injuries × 1,000,000 ÷ hours worked.
    // Hours worked = Σ site-diary (hours on site × stakeholders present).
    const totalHours = entries.reduce((s, e) => s + (e.manHours || 0), 0);
    const lostTimeInjuries = incidents.filter((i) => i.lostTime).length;
    const ltifr =
      totalHours > 0 ? (lostTimeInjuries * 1_000_000) / totalHours : null;
    return {
      activeProjects,
      activeWorkers,
      fullyCompliantWorkers,
      compliance,
      pendingInductions,
      openIncidents,
      pendingSwms,
      workSafeNotifications,
      nearMisses30d,
      openActions,
      ltifr,
      totalHours,
      lostTimeInjuries,
    };
  }, [projects, workers, incidents, templates, entries, docsByWorker]);

  const incidentsByType = useMemo(() => {
    const counts = {};
    incidents.forEach((i) => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const complianceByProject = useMemo(
    () =>
      // Every project the table below lists, so the chart and the table can't
      // disagree. Projects with no crew have no percentage to plot.
      projects
        .filter((p) => p.compliance != null)
        .map((p) => ({ name: p.name, compliance: p.compliance })),
    [projects]
  );

  // Recent activity, merged from real records (most recent first).
  const activity = useMemo(() => {
    const items = [];
    incidents.forEach((i) =>
      items.push({
        id: `i-${i.id}`,
        date: i.date,
        text: `${i.type} logged — ${i.project}`,
      })
    );
    entries.forEach((e) =>
      items.push({
        id: `d-${e.id}`,
        date: e.date,
        text: `Site diary entry — ${e.notes?.slice(0, 60) || "entry"}${e.notes?.length > 60 ? "…" : ""}`,
      })
    );
    meetings.forEach((m) =>
      items.push({
        id: `t-${m.id}`,
        date: m.date,
        text: `Toolbox meeting — ${m.topic} (${m.signatures}/${m.attendees} signed)`,
      })
    );
    return items
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [incidents, entries, meetings]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Organisation-wide OHS overview</p>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Active Projects" value={kpis.activeProjects} tone="blue" />
        <StatCard label="Stakeholders on Site" value={kpis.activeWorkers} tone="blue" />
        <StatCard label="Achieved Compliance" value={formatPercent(kpis.compliance)} tone="green" />
        <StatCard label="Pending Inductions" value={kpis.pendingInductions} tone="amber" />
        <StatCard label="Open Incidents" value={kpis.openIncidents} tone="red" />
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Pending SWMS Sign-offs" value={kpis.pendingSwms} tone="amber" />
        <StatCard
          label="WorkSafe Notifications"
          value={kpis.workSafeNotifications}
          tone="red"
          sub={kpis.workSafeNotifications > 0 ? "Urgent" : undefined}
        />
        <StatCard label="Near Misses (30d)" value={kpis.nearMisses30d} />
        <StatCard label="Open Corrective Actions" value={kpis.openActions} tone="amber" />
        <StatCard
          label="LTIFR"
          value={kpis.ltifr == null ? "—" : kpis.ltifr.toFixed(1)}
          tone={kpis.ltifr == null || kpis.ltifr === 0 ? "green" : "red"}
          sub={
            kpis.ltifr == null ? (
              "per 1M hrs — record site diary hours to calculate"
            ) : (
              <>
                {kpis.lostTimeInjuries} LTI / {Math.round(kpis.totalHours).toLocaleString()} hrs worked
                <br />
                <span className="text-slate-400">
                  Industry benchmark: under ~10 is good. Early on, few logged
                  hours make this read high.
                </span>
              </>
            )
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Compliance by Project" subtitle="Live from project records" />
          <CardBody>
            <ComplianceByProject data={complianceByProject} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Incidents by Type" subtitle="All recorded incidents" />
          <CardBody>
            {incidentsByType.length === 0 ? (
              <p className="flex h-48 items-center justify-center text-sm text-slate-400">
                No incidents recorded
              </p>
            ) : (
              <IncidentBar data={incidentsByType} />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="BUILDERS PROJECT COMPLIANCE" />
          <CardBody className="pt-2">
            <Table>
              <THead columns={["Project", "Compliance", "Progress", "Status"]} />
              <TBody>
                {projects.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium text-slate-800">
                      <Link
                        to={`/builder/projects/${p.id}`}
                        className="hover:text-blue-900 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TD>
                    <TD>
                      <span className="font-semibold">{formatPercent(p.compliance)}</span>
                    </TD>
                    <TD className="w-48">
                      <ProgressBar value={p.compliance ?? 0} threshold showLabel />
                    </TD>
                    <TD>
                      <Badge status={p.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Activity" subtitle="Latest site records" />
          <CardBody className="space-y-3 pt-2">
            {activity.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No activity yet</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-900" />
                  <div>
                    <p className="text-sm text-slate-700">{a.text}</p>
                    <p className="text-xs text-slate-400">{dateLabel(a.date)}</p>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

    </div>
  );
}
