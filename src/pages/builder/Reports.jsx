import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ComplianceDonut from "../../components/charts/ComplianceDonut";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useProjects } from "../../hooks/useProjects";
import { useWorkers } from "../../hooks/useWorkers";
import { useIncidents } from "../../hooks/useIncidents";
import { useToast } from "../../components/ui/Notification";
import { downloadReport } from "../../utils/export";
import { useAppContext } from "../../context/AppContext";
import { complianceCategories, brand } from "../../data/constants";

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
  {
    title: "Monthly OHS Summary",
    file: "ohs-monthly-summary.txt",
    desc: "Org-wide compliance, incidents and toolbox activity",
    build: ({ org, projects, workers, incidents, overall }) => [
      `${org?.name || brand.fullName} — Monthly OHS Summary`,
      `Platform: ${brand.fullName} · ${brand.domain}`,
      `Generated: ${new Date().toLocaleString("en-AU")}`,
      "",
      `Organisation compliance: ${overall}%`,
      `Active projects: ${projects.filter((p) => p.status === "Active").length}`,
      `Active stakeholders: ${workers.filter((w) => w.status === "Active").length}`,
      `Open incidents: ${incidents.filter((i) => i.status !== "Closed").length}`,
      "",
      `Contact: ${brand.supportEmail}`,
    ],
  },
  {
    title: "WorkSafe Incident Register",
    file: "worksafe-incident-register.txt",
    desc: "All notifiable and recordable incidents",
    build: ({ org, incidents }) => [
      `${org?.name || brand.fullName} — WorkSafe Incident Register`,
      `Generated: ${new Date().toLocaleString("en-AU")}`,
      "",
      ...incidents.map(
        (i) =>
          `[${i.type}] ${i.description} — ${i.project} (${i.status})${i.notifiable ? " · NOTIFIABLE" : ""}`
      ),
      "",
      `Contact: ${brand.supportEmail}`,
    ],
  },
  {
    title: "SWMS Sign-off Report",
    file: "swms-signoff-report.txt",
    desc: "Sign-off status per trade template",
    build: ({ org, workers }) => {
      const signed = workers.filter((w) => w.swms === "Verified").length;
      return [
        `${org?.name || brand.fullName} — SWMS Sign-off Report`,
        `Generated: ${new Date().toLocaleString("en-AU")}`,
        "",
        `Signed: ${signed} / ${workers.length} stakeholders`,
        "",
        ...workers.map((w) => `${w.name} (${w.trade}): ${w.swms}`),
        "",
        `Contact: ${brand.supportEmail}`,
      ];
    },
  },
];

export default function Reports() {
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const { incidents } = useIncidents();
  const { org } = useAppContext();
  const toast = useToast();

  // Org-wide compliance: % of Verified cells across all workers/categories.
  const totalCells = workers.length * complianceCategories.length;
  const verifiedCells = workers.reduce(
    (s, w) => s + complianceCategories.filter((c) => w[c.key] === "Verified").length,
    0
  );
  const overall = totalCells ? Math.round((verifiedCells / totalCells) * 100) : 100;

  const exportReport = (r) => {
    const lines = r.build({ org, projects, workers, incidents, overall });
    downloadReport(r.file, lines);
    toast(`${r.file} downloaded`, "success");
  };

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
              <ComplianceDonut percent={overall} label="Overall" height={240} />
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
                  onClick={() => exportReport(r)}
                >
                  Download Report
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
