import { useState } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import ComplianceDonut from "../../components/charts/ComplianceDonut";
import EmailReportModal from "../../components/shared/EmailReportModal";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useProjects } from "../../hooks/useProjects";
import { useWorkers } from "../../hooks/useWorkers";
import { useIncidents } from "../../hooks/useIncidents";
import { useSwmsSignatures } from "../../hooks/useSwmsSignatures";
import { useToast } from "../../components/ui/Notification";
import { useAppContext } from "../../context/AppContext";
import {
  exportMonthlySummary,
  exportIncidentRegister,
  exportSwmsSignoff,
} from "../../lib/pdf";
import { complianceCategories } from "../../data/constants";
import {
  categoryStatus,
  isCompliant,
  orgCompliancePercent,
  formatPercent,
} from "../../lib/compliance";
import { useDocuments } from "../../hooks/useDocuments";

// Per-project, per-category compliance %, derived from the same evidence rules
// the matrix uses (uploaded documents and their expiry), not the raw worker
// column — otherwise this table disagrees with the Compliance page.
// null means "no crew on this project", which is not the same as 100%.
function projectCompliance(workers, docsFor, projectId) {
  const list = workers.filter((w) => w.project === projectId);
  const stats = {};
  let totalValid = 0;
  let totalCells = 0;
  complianceCategories.forEach((c) => {
    const valid = list.filter((w) =>
      isCompliant(categoryStatus(w, c.key, docsFor(w.id)[c.key]))
    ).length;
    stats[c.key] = list.length ? Math.round((valid / list.length) * 100) : null;
    totalValid += valid;
    totalCells += list.length;
  });
  stats.overall = totalCells ? Math.round((totalValid / totalCells) * 100) : null;
  stats.crew = list.length;
  return stats;
}

// The three management reports. Each renders a real branded PDF (src/lib/pdf.js)
// that can either be downloaded or emailed — `kind` is the identifier the
// server-side send endpoint validates against its own allow-list.
const REPORTS = [
  {
    kind: "monthly_summary",
    title: "Monthly OHS Summary",
    desc: "Org-wide compliance, incidents and toolbox activity",
    run: (ctx, mode) =>
      exportMonthlySummary({
        org: ctx.org,
        projects: ctx.projects,
        workers: ctx.workers,
        incidents: ctx.incidents,
        meetings: ctx.meetings,
        overall: ctx.overall,
        mode,
      }),
    summary: (ctx) =>
      `${ctx.overall}% organisation compliance · ${ctx.projects.filter((p) => p.status === "Active").length} active projects · ${ctx.incidents.filter((i) => i.status !== "Closed").length} open incidents.`,
  },
  {
    kind: "incident_register",
    title: "WorkSafe Incident Register",
    desc: "All notifiable and recordable incidents",
    run: (ctx, mode) => exportIncidentRegister({ org: ctx.org, incidents: ctx.incidents, mode }),
    summary: (ctx) =>
      `${ctx.incidents.length} incident${ctx.incidents.length === 1 ? "" : "s"} on record · ${ctx.incidents.filter((i) => i.notifiable).length} notifiable to WorkSafe Victoria.`,
  },
  {
    kind: "swms_signoff",
    title: "SWMS Sign-off Report",
    desc: "Sign-off status per trade template",
    run: (ctx, mode) =>
      exportSwmsSignoff({
        org: ctx.org,
        templates: ctx.templates,
        workers: ctx.workers,
        signatures: ctx.signatures,
        mode,
      }),
    summary: (ctx) =>
      `${ctx.workers.filter((w) => w.swms === "Verified").length} of ${ctx.workers.length} stakeholders have signed their SWMS · ${ctx.signatures.length} signature${ctx.signatures.length === 1 ? "" : "s"} on the register.`,
  },
];

// useDocuments exposes a lookup function; the shared calculator wants a map.
const byWorkerFrom = (docsFor, workers) =>
  Object.fromEntries(workers.map((w) => [w.id, docsFor(w.id)]));

export default function Reports() {
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const { incidents } = useIncidents();
  const { org, meetings, templates } = useAppContext();
  // The sign-off report carries the signatures themselves, not just a count.
  const { signatures } = useSwmsSignatures();
  const toast = useToast();
  const [emailing, setEmailing] = useState(null); // report being emailed
  const [busy, setBusy] = useState(null); // report currently rendering

  // Org-wide compliance: % of Verified cells across all workers/categories.
  const { docsFor } = useDocuments();
  const overall = orgCompliancePercent(workers, byWorkerFrom(docsFor, workers));

  const ctx = { org, projects, workers, incidents, meetings, templates, signatures, overall };

  const downloadReportPdf = async (r) => {
    setBusy(r.kind);
    try {
      const { filename } = await r.run(ctx, "save");
      toast(`${filename} downloaded`, "success");
    } catch (err) {
      toast(err.message || "Could not build the report", "error");
    } finally {
      setBusy(null);
    }
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
                  const stats = projectCompliance(workers, docsFor, p.id);
                  return (
                    <TR key={p.id}>
                      <TD className="font-medium text-slate-800">{p.name}</TD>
                      {complianceCategories.map((c) => (
                        <TD key={c.key}>{formatPercent(stats[c.key])}</TD>
                      ))}
                      <TD>
                        <span className="font-semibold">{formatPercent(stats.overall)}</span>
                        {stats.crew === 0 && (
                          <span className="ml-1 text-xs text-slate-400">no crew</span>
                        )}
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
              {overall == null ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  No stakeholders on the books yet.
                </p>
              ) : (
                <ComplianceDonut percent={overall} label="Overall" height={240} />
              )}
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
                <div className="mt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={busy === r.kind}
                    onClick={() => downloadReportPdf(r)}
                  >
                    {busy === r.kind ? "Building…" : "Download PDF"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setEmailing(r)}
                    title={`Email ${r.title}`}
                  >
                    ✉️ Send
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Email a report — renders the same PDF in "attach" mode and posts it
          to /api/send-report (Resend). */}
      <EmailReportModal
        open={!!emailing}
        onClose={() => setEmailing(null)}
        kind={emailing?.kind}
        title={emailing?.title || "report"}
        summary={emailing ? emailing.summary(ctx) : ""}
        defaultTo={org?.billingContact || ""}
        build={() => emailing.run(ctx, "attach")}
      />
    </div>
  );
}
