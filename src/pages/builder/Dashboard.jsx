import { useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/ui/StatCard";
import Card, { CardHeader, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import ComplianceTrend from "../../components/charts/ComplianceTrend";
import IncidentBar from "../../components/charts/IncidentBar";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import {
  dashboardKpis,
  complianceTrend,
  incidentsByType,
  activityFeed,
  policies,
} from "../../data/mockData";
import { useProjects } from "../../hooks/useProjects";

export default function Dashboard() {
  const { projects } = useProjects();
  const [policyOpen, setPolicyOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Organisation-wide OH&amp;S overview ·{" "}
            <span className="font-medium text-slate-400">READ ONLY</span>
          </p>
        </div>
        <Button variant="gold" onClick={() => setPolicyOpen(true)}>
          OH&amp;S MGMT PLAN / POLICY / LEGISLATION
        </Button>
      </div>

      {/* Primary KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Active Projects" value={dashboardKpis.activeProjects} tone="blue" />
        <StatCard label="Active Stakeholders" value={dashboardKpis.activeWorkers} tone="blue" />
        <StatCard
          label="Achieved Compliance"
          value={`${dashboardKpis.compliance}%`}
          tone="green"
        />
        <StatCard
          label="Pending Inductions"
          value={dashboardKpis.pendingInductions}
          tone="amber"
        />
        <StatCard label="Open Incidents" value={dashboardKpis.openIncidents} tone="red" />
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Pending SWMS Sign-offs" value={dashboardKpis.pendingSwms} tone="amber" />
        <StatCard
          label="WorkSafe Notifications"
          value={dashboardKpis.workSafeNotifications}
          tone="red"
          sub="Urgent"
        />
        <StatCard label="Near Misses (30d)" value={dashboardKpis.nearMisses30d} />
        <StatCard
          label="LTI Rate"
          value={dashboardKpis.ltiRate.toFixed(1)}
          tone="green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Compliance Trend" subtitle="Last 6 months · 88% → 92%" />
          <CardBody>
            <ComplianceTrend data={complianceTrend} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Incidents by Type" subtitle="Rolling 30 days" />
          <CardBody>
            <IncidentBar data={incidentsByType} />
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
          <CardHeader title="Recent Activity" subtitle="Last 5 actions" />
          <CardBody className="space-y-3 pt-2">
            {activityFeed.map((a) => (
              <div key={a.id} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-900" />
                <div>
                  <p className="text-sm text-slate-700">{a.text}</p>
                  <p className="text-xs text-slate-400">{a.time}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Policy modal */}
      <Modal
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="OH&S Management Plan / Policy / Legislation"
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
  