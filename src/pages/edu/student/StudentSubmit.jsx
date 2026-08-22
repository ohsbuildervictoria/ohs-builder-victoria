import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { useToast } from "../../../components/ui/Notification";
import { ErrorCard, Loading, PageHeader, StatusPill } from "../../../components/education/EduBits";
import { useStudentHome, invalidateStudentHome } from "../../../hooks/useStudentHome";
import { submitForAssessment } from "../../../lib/eduApi";
import { fmtDateTime } from "../../../data/education";
import { EDU_ROUTES } from "../../../lib/eduRoutes";

// ============================================================================
// Student — Submit for assessment. Explains what a submission is (a locked,
// versioned snapshot), checks readiness, confirms, and shows history.
// ============================================================================

export default function StudentSubmit() {
  const { home, error, refresh } = useStudentHome();
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  if (error && !home) return <ErrorCard message={error} onRetry={refresh} />;
  if (!home) return <Loading label="Loading…" />;

  const { enrolment, scenario, progress, submissions = [] } = home;
  const stages = scenario?.stages || [];
  const byStage = Object.fromEntries((progress?.stages || []).map((s) => [s.stageId, s]));
  const incomplete = stages.filter((s) => !s.evidenceRule?.submission && !byStage[s.id]?.complete);
  const latest = submissions[0];
  const awaiting = latest && (latest.status === "submitted" || latest.status === "under_review");
  const completed = enrolment.status === "completed";
  const canSubmit = incomplete.length === 0 && !awaiting && !completed;
  const nextVersion = (latest?.version || 0) + 1;

  const doSubmit = async () => {
    setBusy(true);
    try {
      const res = await submitForAssessment(note);
      invalidateStudentHome();
      toast(`Submitted — version ${res.version}`);
      navigate(EDU_ROUTES.studentResults);
    } catch (err) {
      toast(err.message || "Could not submit", "error");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "My Training", to: EDU_ROUTES.student }, { label: "Submit for assessment" }]}
        title="Submit for Assessment"
        subtitle="Hand your evidence to your assessor."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="What happens when you submit" />
            <CardBody className="space-y-2 pt-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Submitting creates a locked snapshot of your evidence for assessor review.</span> Everything on your site as it is right now — project, risk register, stakeholders, inductions, SWMS sign-offs, incidents, toolbox records, diary — is frozen as version {nextVersion}, timestamped and linked to you, your cohort, your unit and your scenario.</p>
              <p>You can keep working on your site afterwards. If your assessor returns anything as Not Yet Satisfactory you correct it and submit again — the new version sits alongside the old one; nothing is deleted.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Readiness check" />
            <CardBody className="pt-2">
              {incomplete.length === 0 ? (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">✓ Every task has evidence behind it.</p>
              ) : (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <p className="font-semibold">Finish these first:</p>
                  <ul className="ml-5 mt-1 list-disc">
                    {incomplete.map((s) => (
                      <li key={s.id}><Link className="underline" to={EDU_ROUTES.studentTask(s.code)}>{s.title}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
              {awaiting && <p className="mt-2 text-sm text-amber-800">Version {latest.version} is still with your assessor — you'll be able to submit again once it's returned.</p>}
              {completed && <p className="mt-2 text-sm text-green-800">Your assessment is complete — no further submission is needed.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Note to your assessor (optional)" />
            <CardBody className="pt-2">
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                placeholder="Anything you want your assessor to know — e.g. which task you found hardest, or what you'd do differently on a real site."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                disabled={!canSubmit}
              />
              <div className="mt-3 flex items-center justify-between">
                <Link to={EDU_ROUTES.studentEvidence} className="text-sm font-medium text-blue-700 hover:underline">Review my evidence first →</Link>
                <Button size="lg" disabled={!canSubmit} onClick={() => setConfirm(true)}>Submit for assessment</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Submission history" />
          <CardBody className="pt-2">
            {submissions.length === 0 ? (
              <p className="text-sm text-slate-400">No submissions yet.</p>
            ) : (
              <ul className="space-y-2">
                {submissions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">Version {s.version}</span>
                      <StatusPill status={s.status} kind="submission" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Submitted {fmtDateTime(s.submittedAt)}</p>
                    {s.decidedAt && <p className="text-xs text-slate-500">Decided {fmtDateTime(s.decidedAt)} by {s.decidedByName || "assessor"}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={confirm}
        onClose={() => !busy && setConfirm(false)}
        title={`Submit version ${nextVersion}?`}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>Not yet</Button>
            <Button disabled={busy} onClick={doSubmit}>{busy ? "Submitting…" : "Yes, submit"}</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This creates a locked snapshot of your evidence for assessor review, stamped with the date, your name, your cohort, the unit and the scenario. You can keep working on your site and resubmit later if anything is returned.
        </p>
      </Modal>
    </div>
  );
}
