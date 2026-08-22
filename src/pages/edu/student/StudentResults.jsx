import { useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Notification";
import { ErrorCard, Loading, PageHeader, StatusPill, ResultPill, EmptyState } from "../../../components/education/EduBits";
import { useStudentHome } from "../../../hooks/useStudentHome";
import { fetchSubmissionSnapshot } from "../../../lib/eduApi";
import { exportEvidencePortfolio } from "../../../lib/eduPdf";
import { fmtDate, fmtDateTime, eduBrand } from "../../../data/education";
import { EDU_ROUTES } from "../../../lib/eduRoutes";

// ============================================================================
// Student — Assessment: status, Action Required (NYS feedback mapped back to
// the tasks to fix), Completion, and the evidence portfolio download.
// ============================================================================

export default function StudentResults() {
  const { home, error, refresh } = useStudentHome();
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  if (error && !home) return <ErrorCard message={error} onRetry={refresh} />;
  if (!home) return <Loading label="Loading…" />;

  const { enrolment, institution, unit, cohort, scenario, mappings, submissions = [], assessors } = home;
  const latest = submissions[0];
  const stages = scenario?.stages || [];
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]));
  const stagesForCriterion = (cid) =>
    (mappings?.rows || []).filter((m) => m.criterionId === cid).map((m) => stageById[m.stageId]).filter(Boolean);

  const download = async (submission) => {
    setExporting(true);
    try {
      const snap = await fetchSubmissionSnapshot(submission.id);
      await exportEvidencePortfolio({ bundle: home, submission, snapshot: snap.snapshot });
    } catch (err) {
      toast(err.message || "Could not build the portfolio", "error");
    } finally {
      setExporting(false);
    }
  };

  if (!latest) {
    return (
      <div className="space-y-6">
        <PageHeader crumbs={[{ label: "My Training", to: EDU_ROUTES.student }, { label: "Assessment" }]} title="Assessment" />
        <EmptyState
          icon="📝"
          title="Nothing submitted yet"
          body="Finish your tasks, then submit your evidence. Your assessor's feedback and your result will appear here."
          action={<Link to={EDU_ROUTES.studentEvidence}><Button>Go to My Evidence</Button></Link>}
        />
      </div>
    );
  }

  const nys = (latest.results || []).filter((r) => r.result === "not_yet_satisfactory");
  // The first task linked to any NYS criterion — where the student should start.
  const firstFixStage = nys.flatMap((r) => stagesForCriterion(r.criterionId)).sort((a, b) => a.position - b.position)[0] || null;
  const sat = (latest.results || []).filter((r) => r.result === "satisfactory");

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "My Training", to: EDU_ROUTES.student }, { label: "Assessment" }]}
        title="Assessment"
        subtitle={`${unit?.code} · ${unit?.title}`}
        action={<StatusPill status={enrolment.status} />}
      />

      {/* Completion */}
      {enrolment.status === "completed" && latest.status === "completed" && (
        <div className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
          <div className="bg-green-600 px-6 py-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Assessment complete</p>
            <h2 className="mt-1 text-2xl font-bold">All criteria Satisfactory</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
            <Info label="Institution" value={institution.name} />
            <Info label="Qualification / unit" value={`${unit?.qualification?.code || ""} ${unit?.code || ""}`} sub={unit?.title} />
            <Info label="Result / status" value="Satisfactory — recorded by the institution" />
            <Info label="Completion date" value={fmtDate(latest.decidedAt)} />
            <Info label="Assessor" value={latest.decidedByName || assessors?.[0]?.name || "—"} />
            <Info label="Evidence portfolio" value={`Submission version ${latest.version}`} sub={`Submitted ${fmtDateTime(latest.submittedAt)}`} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
            <p className="max-w-xl text-xs text-slate-500">{eduBrand.disclaimer}</p>
            <Button disabled={exporting} onClick={() => download(latest)}>{exporting ? "Building PDF…" : "Download evidence portfolio (PDF)"}</Button>
          </div>
        </div>
      )}

      {/* Action required */}
      {latest.status === "returned_nys" && (
        <div className="rounded-2xl border-2 border-red-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-red-700">Action required</p>
          <h2 className="mt-1 text-xl font-bold text-slate-800">Your assessor has returned version {latest.version}</h2>
          {latest.outcomeComment && (
            <blockquote className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold">Overall feedback:</span> {latest.outcomeComment}
              <span className="block text-xs text-slate-500">— {latest.decidedByName}, {fmtDateTime(latest.decidedAt)}</span>
            </blockquote>
          )}
          <p className="mt-4 text-sm font-semibold text-slate-800">{nys.length === 1 ? "1 criterion to fix:" : `${nys.length} criteria to fix:`}</p>
          <ul className="mt-2 space-y-3">
            {nys.map((r) => {
              const linked = stagesForCriterion(r.criterionId);
              return (
                <li key={r.id} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{r.criterionCode} · {r.criterionText}</p>
                    <ResultPill result={r.result} />
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Assessor:</span> {r.comment}</p>}
                  {linked.length > 0 && (
                    <p className="mt-2 text-xs text-slate-600">
                      Evidence to correct:{" "}
                      {linked.map((s, i) => (
                        <span key={s.id}>
                          {i > 0 && ", "}
                          <Link to={EDU_ROUTES.studentTask(s.code)} className="font-medium text-blue-700 hover:underline">{s.title}</Link>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {firstFixStage ? (
              <>
                <Link to={EDU_ROUTES.studentTask(firstFixStage.code)}><Button>Go to task: {firstFixStage.title} →</Button></Link>
                <Link to="/builder/dashboard"><Button variant="secondary">Open my site</Button></Link>
              </>
            ) : (
              <Link to="/builder/dashboard"><Button>Open my site to correct the work →</Button></Link>
            )}
            <Link to={EDU_ROUTES.studentSubmit}><Button variant="secondary">Resubmit when ready</Button></Link>
          </div>
        </div>
      )}

      {(latest.status === "submitted" || latest.status === "under_review") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-bold">Version {latest.version} is {latest.status === "under_review" ? "being reviewed" : "waiting for an assessor"}.</p>
          <p className="mt-1">Submitted {fmtDateTime(latest.submittedAt)}. You'll see each criterion's result here once your assessor finalises it.</p>
        </div>
      )}

      {/* Full criteria view for the latest submission */}
      {latest.results?.length > 0 && (
        <Card>
          <CardHeader title={`Criteria — version ${latest.version}`} subtitle={`${sat.length} Satisfactory · ${nys.length} Not Yet Satisfactory · mapping is controlled by ${institution.name}`} />
          <CardBody className="pt-2">
            <ul className="divide-y divide-slate-100">
              {latest.results.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-slate-800"><span className="font-semibold">{r.criterionCode}</span> {r.criterionText}</p>
                    <ResultPill result={r.result} />
                  </div>
                  {r.comment && <p className="mt-1 text-xs text-slate-600">{r.comment}</p>}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader title="Submission & assessment history" subtitle="Every version is kept — nothing is overwritten." />
        <CardBody className="pt-2">
          <ul className="space-y-3">
            {submissions.map((s) => (
              <li key={s.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Submission V{s.version} <span className="font-normal text-slate-500">· {fmtDateTime(s.submittedAt)}</span></p>
                    {s.decidedAt && <p className="text-xs text-slate-500">Assessment V{s.version} · {fmtDateTime(s.decidedAt)} · {s.decidedByName}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={s.status} kind="submission" />
                    <Button size="sm" variant="secondary" disabled={exporting} onClick={() => download(s)}>PDF</Button>
                  </div>
                </div>
                {s.results?.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {s.results.filter((r) => r.result === "satisfactory").length} S · {s.results.filter((r) => r.result === "not_yet_satisfactory").length} NYS
                  </p>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <p className="text-xs text-slate-400">Cohort {cohort?.name} · {institution.name}</p>
    </div>
  );
}

function Info({ label, value, sub }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value || "—"}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
