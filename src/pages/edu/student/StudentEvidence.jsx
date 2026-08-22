import { Link } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { ErrorCard, Loading, PageHeader, BrandedProgress } from "../../../components/education/EduBits";
import { useStudentHome } from "../../../hooks/useStudentHome";
import { resolveFeatureRoute, usablePrimary } from "../../../data/education";
import { EDU_ROUTES } from "../../../lib/eduRoutes";

// ============================================================================
// Student — My Evidence: each task's status and the real records behind it,
// with links back to where each record lives. Nothing here is typed in; it is
// derived from the sandbox.
// ============================================================================

const RECORD_LABELS = [
  ["projects", "Projects", "/builder/projects"],
  ["workers", "Stakeholders", "/builder/compliance"],
  ["induction_completions", "Induction completions", "/builder/compliance"],
  ["project_risks", "Risk register entries", "/builder/projects/{projectId}?tab=Risk%20Register"],
  ["swms_templates", "SWMS documents", "/builder/swms"],
  ["swms_signatures", "SWMS sign-offs", "/builder/swms"],
  ["incidents", "Incident reports", "/builder/incidents"],
  ["corrective_actions", "Corrective actions", "/builder/incidents"],
  ["toolbox_meetings", "Toolbox meetings", "/builder/toolbox"],
  ["toolbox_signatures", "Toolbox attendance records", "/builder/toolbox"],
  ["diary_entries", "Site diary entries", "/builder/diary"],
  ["record_photos", "Photos attached to records", "/builder/diary"],
  ["policies", "Policies", "/builder/policies"],
  ["subbie_companies", "Subcontractor companies", "/builder/compliance"],
  ["compliance_documents", "Compliance documents", "/builder/compliance"],
  ["project_documents", "Project documents", "/builder/projects/{projectId}?tab=Documents"],
  ["site_checkins", "Site check-ins", "/builder/projects"],
];

export default function StudentEvidence() {
  const { home, error, refresh } = useStudentHome();
  if (error && !home) return <ErrorCard message={error} onRetry={refresh} />;
  if (!home) return <Loading label="Loading your evidence…" />;

  const { enrolment, institution, scenario, progress, evidenceCounts = {}, submissions } = home;
  const primary = usablePrimary(institution.primaryColour);
  const stages = scenario?.stages || [];
  const byStage = Object.fromEntries((progress?.stages || []).map((s) => [s.stageId, s]));
  const latest = submissions?.[0];
  const allDone = stages.filter((s) => !s.evidenceRule?.submission).every((s) => byStage[s.id]?.complete);
  const awaiting = latest && (latest.status === "submitted" || latest.status === "under_review");

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "My Training", to: EDU_ROUTES.student }, { label: "My Evidence" }]}
        title="My Evidence"
        subtitle="What your site records prove so far. Your assessor sees these same records."
        action={<Button variant="secondary" size="sm" onClick={() => refresh()}>Refresh</Button>}
      />

      <Card>
        <CardBody>
          <BrandedProgress percent={progress?.percent || 0} primary={primary} label={`${progress?.completed || 0} of ${progress?.total || 0} tasks evidenced`} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By task" />
          <CardBody className="pt-2">
            <ul className="divide-y divide-slate-100">
              {stages.map((s) => {
                const p = byStage[s.id];
                const done = !!p?.complete;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.evidenceLabel}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-xs font-semibold ${done ? "text-green-700" : "text-amber-700"}`}>{done ? "✓ Evidenced" : "Pending"}</span>
                      <Link to={EDU_ROUTES.studentTask(s.code)} className="text-xs font-medium text-blue-700 hover:underline">Task →</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="By record type" subtitle="Live counts from your site. Click through to open the tool." />
          <CardBody className="pt-2">
            <ul className="divide-y divide-slate-100">
              {RECORD_LABELS.map(([key, label, route]) => {
                const n = Number(evidenceCounts?.[key] || 0);
                return (
                  <li key={key} className="flex items-center justify-between py-2">
                    <span className={`text-sm ${n ? "text-slate-800" : "text-slate-400"}`}>{label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${n ? "text-slate-800" : "text-slate-400"}`}>{n}</span>
                      <Link to={resolveFeatureRoute(route, { projectId: enrolment.projectId })} className="text-xs font-medium text-blue-700 hover:underline">Open</Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>

      {allDone && !awaiting && enrolment.status !== "completed" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-bold text-green-800">Your evidence is complete</p>
          <p className="mt-1 text-sm text-green-700">Submit it to lock a snapshot for your assessor. You can still correct and resubmit later if anything is returned.</p>
          <Link to={EDU_ROUTES.studentSubmit}><Button className="mt-3">Submit for assessment →</Button></Link>
        </div>
      )}
      {awaiting && (
        <p className="text-sm text-amber-800">Version {latest.version} is with your assessor. You can keep working; a new submission will be possible once it is returned.</p>
      )}
    </div>
  );
}
