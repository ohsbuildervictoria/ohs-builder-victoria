import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import Card, { CardHeader, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import ComplianceByProject from "../../components/charts/ComplianceByProject";
import IncidentBar from "../../components/charts/IncidentBar";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useAppContext } from "../../context/AppContext";
import { useProjects } from "../../hooks/useProjects";

// Evaluated once per page load — stable across re-renders.
const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;

const dateLabel = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
};

export default function Dashboard() {
  const { projects } = useProjects();
  const { workers, incidents, templates, entries, meetings, policies } = useAppContext();
  const [policyOpen, setPolicyOpen] = useState(false);

  // All KPIs are computed live from the database state.
  const kpis = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === "Active").length;
    const activeWorkers = workers.filter((w) => w.status === "Active").length;
    const activeProjectList = projects.filter((p) => p.status === "Active");
    const compliance = activeProjectList.length
      ? Math.round(
          activeProjectList.reduce((s, p) => s + p.compliance, 0) / activeProjectList.length
        )
      : 0;
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
  }, [projects, workers, incidents, templates, entries]);

  const incidentsByType = useMemo(() => {
    const counts = {};
    incidents.forEach((i) => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const complianceByProject = useMemo(
    () =>
      projects
        .filter((p) => p.status !== "Planning")
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Organisation-wide OHS overview</p>
        </div>
        <Button variant="gold" onClick={() => setPolicyOpen(true)}>
          OHS MGMT PLAN / POLICY / LEGISLATION
        </Button>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Active Projects" value={kpis.activeProjects} tone="blue" />
        <StatCard label="Active Stakeholders" value={kpis.activeWorkers} tone="blue" />
        <StatCard label="Achieved Compliance" value={`${kpis.compliance}%`} tone="green" />
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
            kpis.ltifr == null
              ? "per 1M hrs — record site diary hours to calculate"
              : `per 1M hrs · ${kpis.lostTimeInjuries} LTI / ${Math.round(kpis.totalHours).toLocaleString()} hrs`
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
                      <span className="font-semibold">{p.compliance}%</span>
                    </TD>
                    <TD className="w-48">
                      <ProgressBar value={p.compliance} threshold showLabel />
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

      {/* Policy modal */}
      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="OHS Management Plan / Policy / Legislation"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setPolicyOpen(false)}>
            Close
          </Button>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          Active policies governing this organisation. Refer to the Builder
          Policy Site Induction before commencing on any site.
        </p>
        <div className="space-y-2">
          {policies.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {p.category} · {p.version}
                </p>
              </div>
              <Badge status="Active">{p.status}</Badge>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
