import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ComplianceDonut from "../../components/charts/ComplianceDonut";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useProjects } from "../../hooks/useProjects";
import { useWorkers } from "../../hooks/useWorkers";
import { useToast } from "../../components/ui/Notification";
import { complianceCategories, dashboardKpis } from "../../data/mockData";

// Per-project, per-category compliance %, derived from worker records.
function projectCompliance(workers, projectId) {
  const list = workers.filter((w) => w.project === projectId);
  const stats = {};
  let totalVerified = 0;
  let totalCells = 0;
  complianceCategories.forEach((c) => {
    const verified = list.filter((w) => w[c.key] === "Verified").length;
    stats[c.key] = list.length ? Math.round((verified / list.length) * 100) : 100;
    totalVerified += verified;
    totalCells += list.length;
  });
  stats.overall = totalCells ? Math.round((totalVerified / totalCells) * 100) : 100;
  return stats;
}

const REPORTS = [
  { title: "Monthly OH&S Summary", file: "ohs-monthly-summary-2026-06.pdf", desc: "Org-wide compliance, incidents and toolbox activity" },
  { title: "WorkSafe Incident Register", file: "worksafe-incident-register.pdf", desc: "All notifiable and recordable incidents" },
  { title: "SWMS Sign-off Report", file: "swms-signoff-report.pdf", desc: "Sign-off status per trade template" },
];

export default function Reports() {
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const toast = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports &amp; Analytics</h1>
        <p className="text-sm text-slate-500">
          Compliance and incident reporting across all projects
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Compliance by Project" />
          <CardBody className="pt-2">
            <Table>
              <THead
                columns={[
                  "Project",
                  ...complianceCategories.map((c) => c.label),
                  "Overall",
                ]}
              />
              <TBody>
                {projects.map((p) => {
                  const stats = projectCompliance(workers, p.id);
                  return (
                    <TR key={p.id}>
                      <TD className="font-medium text-slate-800">{p.name}</TD>
                      {complianceCategories.map((c) => (
                        <TD key={c.key}>{stats[c.key]}%</TD>
                      ))}
                      <TD>
                        <span className="font-semibold">{stats.overall}%</span>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Org-wide Compliance" />
          <CardBody className="flex items-center justify-center">
            <div className="w-56">
              <ComplianceDonut percent={dashboardKpis.compliance} label="Overall" height={240} />
            </div>
          </CardBody>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-700">
          Auto-generated Reports
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {REPORTS.map((r) => (
            <Card key={r.title}>
              <CardBody className="flex h-full flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">📄</span>
                  <Badge status="Active">Ready</Badge>
                </div>
                <h3 className="text-base font-semibold text-slate-800">{r.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500">{r.desc}</p>
                <Button
                  className="mt-4 w-full"
                  onClick={() => toast(`${r.file} exported`, "success")}
                >
                  Export PDF
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
