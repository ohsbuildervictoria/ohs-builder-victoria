import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { useToast } from "../../../components/ui/Notification";
import { ErrorCard, Loading, PageHeader, StatusPill, ResultPill, BrandedProgress } from "../../../components/education/EduBits";
import EvidenceViewer from "../../../components/education/EvidenceViewer";
import MappingTable from "../../../components/education/MappingTable";
import { fetchReviewBundle, fetchSubmissionSnapshot, recordResult, finaliseAssessment } from "../../../lib/eduApi";
import { exportEvidencePortfolio } from "../../../lib/eduPdf";
import { useEducation } from "../../../hooks/useEducation";
import { EDU_ROUTES } from "../../../lib/eduRoutes";
import { fmtDateTime, fmtDate } from "../../../data/education";

// ============================================================================
// Assessment review — the student's evidence/workspace (read-only) on the
// left, the assessment panel on the right. The authorised assessor makes
// every decision; nothing here is automated. Institution admins see the same
// screen read-only (bundle.canAssess === false).
// ============================================================================

export default function AssessorReview() {
  const { enrolmentId } = useParams();
  const { education } = useEducation();
  const toast = useToast();
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);
  const [drafts, setDrafts] = useState({}); // criterionId -> { result, comment, saving, savedAt }
  const [finalise, setFinalise] = useState(null); // 'completed' | 'returned_nys' | null
  const [finalComment, setFinalComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [panelTab, setPanelTab] = useState("assess"); // assess | history | mapping
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetchReviewBundle(Number(enrolmentId))
      .then((b) => {
        if (!alive) return;
        setBundle(b);
        const latest = (b.submissions || [])[0];
        const d = {};
        for (const r of latest?.results || []) d[r.criterionId] = { result: r.result, comment: r.comment || "" };
        setDrafts(d);
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [enrolmentId, reload]);

  const primary = education?.primaryColour || "#1e3a8a";
  const latest = bundle?.submissions?.[0] || null;
  const open = latest && (latest.status === "submitted" || latest.status === "under_review");
  const canAssess = !!bundle?.canAssess && open;
  const criteria = bundle?.unit?.criteria || [];
  const stages = bundle?.scenario?.stages || [];
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]));
  const mappingRows = bundle?.mappings?.rows || [];
  const mappedIds = new Set(mappingRows.map((m) => m.criterionId));
  const requiredIds = mappedIds.size ? mappedIds : new Set(criteria.map((c) => c.id));
  const stagesFor = (cid) => mappingRows.filter((m) => m.criterionId === cid).map((m) => stageById[m.stageId]).filter(Boolean);
  const progressByStage = Object.fromEntries((bundle?.progress?.stages || []).map((s) => [s.stageId, s]));

  const decided = [...requiredIds].filter((id) => drafts[id]?.result).length;
  const nysCount = [...requiredIds].filter((id) => drafts[id]?.result === "not_yet_satisfactory").length;
  const allDecided = decided === requiredIds.size && requiredIds.size > 0;

  const save = async (criterionId, patch) => {
    const next = { ...(drafts[criterionId] || { result: null, comment: "" }), ...patch };
    setDrafts((d) => ({ ...d, [criterionId]: { ...next, saving: true } }));
    if (!next.result) return; // a comment without a decision is not recorded yet
    try {
      const saved = await recordResult({ submissionId: latest.id, criterionId, result: next.result, comment: next.comment });
      setDrafts((d) => ({ ...d, [criterionId]: { ...next, saving: false, savedAt: saved.assessedAt } }));
    } catch (e) {
      setDrafts((d) => ({ ...d, [criterionId]: { ...next, saving: false, error: e.message } }));
      toast(e.message || "Could not save", "error");
    }
  };

  const doFinalise = async () => {
    setBusy(true);
    try {
      await finaliseAssessment({ submissionId: latest.id, outcome: finalise, comment: finalComment });
      toast(finalise === "completed" ? "Assessment completed" : "Returned to the student for correction");
      setFinalise(null);
      setFinalComment("");
      setReload((k) => k + 1);
    } catch (e) {
      toast(e.message || "Could not finalise", "error");
    } finally {
      setBusy(false);
    }
  };

  const download = async (submission) => {
    setExporting(true);
    try {
      const snap = await fetchSubmissionSnapshot(submission.id);
      await exportEvidencePortfolio({ bundle, submission, snapshot: snap.snapshot });
    } catch (e) {
      toast(e.message || "Could not build the portfolio", "error");
    } finally {
      setExporting(false);
    }
  };

  if (error) return <ErrorCard message={error} onRetry={() => setReload((k) => k + 1)} />;
  if (!bundle) return <Loading label="Loading student…" />;

  const { enrolment, student, cohort, unit, scenario, progress, submissions = [], assessors } = bundle;
  const backTo = bundle.canAssess ? EDU_ROUTES.assessCohort(cohort.id) : `/education/admin/cohorts/${cohort.id}`;

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: bundle.canAssess ? "My cohorts" : "Cohorts", to: bundle.canAssess ? EDU_ROUTES.assess : "/education/admin/cohorts" }, { label: cohort.name, to: backTo }, { label: student.name }]}
        title={student.name}
        subtitle={`${student.email} · ${unit?.code || ""} · ${scenario?.title || ""} · last active ${fmtDateTime(student.lastLogin)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusPill status={enrolment.status} />
            <Button variant="secondary" size="sm" onClick={() => setReload((k) => k + 1)}>Refresh</Button>
          </div>
        }
      />

      {!bundle.canAssess && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Read-only view. Only an assessor assigned to this cohort can record results ({(assessors || []).map((a) => a.name).join(", ") || "none assigned yet"}).
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Evidence / workspace */}
        <div className="space-y-3 xl:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <BrandedProgress percent={progress?.percent || 0} primary={primary} label={`Simulation progress · ${progress?.completed || 0}/${progress?.total || 0} tasks evidenced (live)`} />
          </div>
          <EvidenceViewer sandboxOrgId={enrolment.sandboxOrgId} submissions={submissions} stages={stages} progress={progress} primary={primary} />
        </div>

        {/* Assessment panel */}
        <div className="space-y-3 xl:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-1 border-b border-slate-200 px-3 pt-2">
              {[["assess", "Assessment"], ["history", `History (${submissions.length})`], ["mapping", "Mapping"]].map(([k, l]) => (
                <button key={k} onClick={() => setPanelTab(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${panelTab === k ? "text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`} style={panelTab === k ? { borderColor: primary } : undefined}>{l}</button>
              ))}
            </div>

            {panelTab === "assess" && (
              <div className="p-4">
                {!latest ? (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800">Nothing submitted yet</p>
                    <p className="mt-1">The student is still working. You can look through their live records on the left; assessment opens once they submit.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Submission V{latest.version}</p>
                        <p className="text-xs text-slate-500">Submitted {fmtDateTime(latest.submittedAt)}</p>
                      </div>
                      <StatusPill status={latest.status} kind="submission" />
                    </div>
                    {latest.studentNote && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><span className="font-semibold">Student note:</span> {latest.studentNote}</p>}
                    {!open && (
                      <div className={`mt-3 rounded-lg p-3 text-sm ${latest.status === "completed" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                        <p className="font-semibold">{latest.status === "completed" ? "Completed" : "Returned — Not Yet Satisfactory"} · {fmtDateTime(latest.decidedAt)} · {latest.decidedByName}</p>
                        {latest.outcomeComment && <p className="mt-1">{latest.outcomeComment}</p>}
                        {latest.status === "returned_nys" && <p className="mt-1 text-xs">The student can correct the work and resubmit; the next version will appear here.</p>}
                      </div>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      {decided}/{requiredIds.size} criteria decided{nysCount ? ` · ${nysCount} NYS` : ""}. Mapping is controlled by {education?.institutionName}.
                    </p>

                    <ul className="mt-3 space-y-3">
                      {criteria.filter((c) => requiredIds.has(c.id)).map((c) => {
                        const d = drafts[c.id] || {};
                        const linked = stagesFor(c.id);
                        return (
                          <li key={c.id} className="rounded-lg border border-slate-200 p-3">
                            <p className="text-sm font-semibold text-slate-800">{c.code} <span className="font-normal text-slate-700">{c.text}</span></p>
                            {linked.length > 0 && (
                              <p className="mt-1 text-xs text-slate-500">
                                Evidence: {linked.map((s) => (
                                  <span key={s.id} className={`mr-1 inline-block rounded px-1.5 py-0.5 ${progressByStage[s.id]?.complete ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                    {progressByStage[s.id]?.complete ? "✓" : "○"} {s.title}
                                  </span>
                                ))}
                              </p>
                            )}
                            {c.evidenceHint && <p className="mt-0.5 text-[11px] text-slate-400">Look at: {c.evidenceHint}</p>}
                            {canAssess ? (
                              <>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => save(c.id, { result: "satisfactory" })}
                                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${d.result === "satisfactory" ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-slate-700 hover:bg-green-50"}`}
                                  >
                                    ✓ Satisfactory
                                  </button>
                                  <button
                                    onClick={() => save(c.id, { result: "not_yet_satisfactory" })}
                                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${d.result === "not_yet_satisfactory" ? "border-red-600 bg-red-600 text-white" : "border-slate-300 text-slate-700 hover:bg-red-50"}`}
                                  >
                                    Not Yet Satisfactory
                                  </button>
                                </div>
                                <textarea
                                  rows={2}
                                  value={d.comment || ""}
                                  onChange={(e) => setDrafts((x) => ({ ...x, [c.id]: { ...(x[c.id] || {}), comment: e.target.value } }))}
                                  onBlur={() => d.result && save(c.id, { comment: d.comment || "" })}
                                  placeholder={d.result === "not_yet_satisfactory" ? "Tell the student exactly what to fix and where (required for NYS)" : "Assessor comment (optional)"}
                                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                                />
                                <p className="mt-1 text-[11px] text-slate-400">
                                  {d.saving ? "Saving…" : d.error ? <span className="text-red-600">{d.error}</span> : d.savedAt ? `Saved ${fmtDateTime(d.savedAt)}` : d.result ? "Saved" : "Not decided"}
                                </p>
                              </>
                            ) : (
                              <div className="mt-2 flex items-start justify-between gap-2">
                                <p className="text-xs text-slate-600">{d.comment || ""}</p>
                                <ResultPill result={d.result} />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {canAssess && (
                      <div className="mt-4 rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Finalise</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {allDecided
                            ? nysCount > 0
                              ? `${nysCount} criteria are NYS — return the work so the student can correct and resubmit.`
                              : "Every criterion is Satisfactory — you can complete this assessment."
                            : `Decide every mapped criterion first (${decided}/${requiredIds.size}).`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button disabled={!allDecided || nysCount > 0} onClick={() => { setFinalise("completed"); setFinalComment(""); }}>Complete assessment</Button>
                          <Button variant="danger" disabled={!allDecided || nysCount === 0} onClick={() => { setFinalise("returned_nys"); setFinalComment(""); }}>Return for correction (NYS)</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {panelTab === "history" && (
              <div className="p-4">
                {submissions.length === 0 ? <p className="text-sm text-slate-400">No submissions yet.</p> : (
                  <ul className="space-y-3">
                    {submissions.map((s) => (
                      <li key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-800">Submission V{s.version} <span className="font-normal text-slate-500">· {fmtDateTime(s.submittedAt)}</span></p>
                          <div className="flex items-center gap-2">
                            <StatusPill status={s.status} kind="submission" />
                            <Button size="sm" variant="secondary" disabled={exporting} onClick={() => download(s)}>PDF</Button>
                          </div>
                        </div>
                        {s.decidedAt && <p className="text-xs text-slate-500">Assessment V{s.version} · {fmtDate(s.decidedAt)} · {s.decidedByName}{s.outcomeComment ? ` — “${s.outcomeComment}”` : ""}</p>}
                        {s.results?.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs">
                            {s.results.map((r) => (
                              <li key={r.id} className="flex items-start justify-between gap-2">
                                <span className="text-slate-700"><span className="font-semibold">{r.criterionCode}</span> {r.comment ? `— ${r.comment}` : ""}</span>
                                <ResultPill result={r.result} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {panelTab === "mapping" && (
              <div className="p-4">
                <MappingTable unit={unit} scenario={scenario} mappings={bundle.mappings} institutionName={education?.institutionName} compact />
              </div>
            )}
          </div>

          {latest && (
            <Button variant="secondary" className="w-full" disabled={exporting} onClick={() => download(latest)}>
              {exporting ? "Building PDF…" : `Download evidence portfolio (V${latest.version})`}
            </Button>
          )}
          <p className="text-[11px] text-slate-400">
            Cohort <Link to={backTo} className="text-blue-700 hover:underline">{cohort.name}</Link> · Assessors: {(assessors || []).map((a) => a.name).join(", ") || "—"}
          </p>
        </div>
      </div>

      <Modal
        open={!!finalise}
        onClose={() => !busy && setFinalise(null)}
        title={finalise === "completed" ? "Complete this assessment?" : "Return the work as Not Yet Satisfactory?"}
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setFinalise(null)}>Cancel</Button>
            <Button variant={finalise === "completed" ? "success" : "danger"} disabled={busy} onClick={doFinalise}>{busy ? "Saving…" : finalise === "completed" ? "Complete" : "Return to student"}</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            {finalise === "completed"
              ? `All ${requiredIds.size} mapped criteria are Satisfactory. The student will see “Assessment complete” with your name and today's date. This records the outcome in ${education?.institutionName}'s workflow; any formal credential is issued by the institution.`
              : `The student will see “Action Required” with every NYS criterion, your comments, and links to the tasks to correct. They can then resubmit as version ${(latest?.version || 0) + 1}. Version ${latest?.version} and these results are kept.`}
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Overall feedback {finalise === "returned_nys" ? "(recommended)" : "(optional)"}</span>
            <textarea rows={3} value={finalComment} onChange={(e) => setFinalComment(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder={finalise === "completed" ? "e.g. Thorough risk register and a well-handled incident." : "e.g. Your SWMS register needs the plumbing crew's sign-offs before they start trenching — see task 6."} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
