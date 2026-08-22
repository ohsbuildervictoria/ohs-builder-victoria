import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Notification";
import { RichText, ErrorCard, Loading, PageHeader } from "../../../components/education/EduBits";
import { useStudentHome } from "../../../hooks/useStudentHome";
import { acknowledgeEvent } from "../../../lib/eduApi";
import { resolveFeatureRoute } from "../../../data/education";
import { EDU_ROUTES } from "../../../lib/eduRoutes";

// ============================================================================
// Student — one task (scenario stage): what to achieve, why it matters, what
// evidence is needed, which real tool to use, and a button that opens it.
// ============================================================================

// Turn the evaluator's JSON answer into a sentence a student understands.
function describeEvidence(ev, labelHint) {
  if (!ev) return null;
  if (ev.submission) return ev.ok ? "Submitted." : "Completes when you submit your evidence.";
  if (ev.parts) {
    return ev.parts.map((p) => describeEvidence(p)).filter(Boolean).join(" · ");
  }
  if (ev.table) {
    const nice = {
      projects: "project", workers: "stakeholder", swms_templates: "SWMS document", swms_signatures: "SWMS sign-off",
      project_risks: "risk register entry", incidents: "incident report", corrective_actions: "corrective action",
      diary_entries: "diary entry", toolbox_meetings: "toolbox meeting", toolbox_signatures: "toolbox attendance record",
      induction_completions: "induction completion", policies: "policy", subbie_companies: "subcontractor company",
      compliance_documents: "compliance document", project_documents: "project document", record_photos: "photo",
      site_checkins: "site check-in", quiz_attempts: "quiz attempt", audit_log: "audit entry", swms_revisions: "SWMS revision",
    }[ev.table] || ev.table.replace(/_/g, " ");
    const need = ev.min || 1;
    const have = ev.count ?? 0;
    const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
    return `${plural(have, nice)} found${need > 1 || have < need ? ` (need ${need})` : ""}${ev.ok ? " ✓" : ""}`;
  }
  return labelHint || null;
}

export default function StudentTask() {
  const { code } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { home, loading, error, refresh, patch } = useStudentHome({ refreshOnMount: true });
  const [checking, setChecking] = useState(false);

  if (error && !home) return <ErrorCard message={error} onRetry={refresh} />;
  if (!home) return <Loading label="Loading task…" />;

  const { enrolment, institution, scenario, progress, events } = home;
  const primary = institution.primaryColour || "#1e3a8a";
  const stages = scenario?.stages || [];
  const idx = stages.findIndex((s) => s.code === code);
  const stage = stages[idx];
  if (!stage) {
    return (
      <div className="space-y-4">
        <p className="text-slate-500">That task doesn't exist in this scenario.</p>
        <Link to={EDU_ROUTES.student}><Button variant="secondary">← Back to My Training</Button></Link>
      </div>
    );
  }
  const prog = (progress?.stages || []).find((s) => s.stageId === stage.id);
  const done = !!prog?.complete;
  const prev = stages[idx - 1];
  const next = stages[idx + 1];
  const stageEvents = (events || []).filter((e) => e.stageId === stage.id && e.state !== "locked");
  const isSubmitStage = !!stage.evidenceRule?.submission;
  const route = resolveFeatureRoute(stage.featureRoute, { projectId: enrolment.projectId });
  const started = (prog?.evidence?.count || 0) > 0 || (prog?.evidence?.parts || []).some((p) => (p.count || 0) > 0);

  const openTool = async () => {
    // Acknowledge any new event attached to this task when the student acts on it.
    for (const ev of stageEvents.filter((e) => e.state === "new")) {
      try { await acknowledgeEvent(ev.id, { openedTask: stage.code }); } catch { /* best effort */ }
    }
    patch((h) => ({ ...h, events: h.events.map((x) => (x.stageId === stage.id && x.state === "new" ? { ...x, state: "acknowledged" } : x)) }));
    if (isSubmitStage) navigate(EDU_ROUTES.studentSubmit);
    else navigate(route);
  };

  const checkProgress = async () => {
    setChecking(true);
    try {
      const fresh = await refresh();
      const p = (fresh?.progress?.stages || []).find((s) => s.stageId === stage.id);
      toast(p?.complete ? "This task is complete ✓" : "Not complete yet — see what's still needed below", p?.complete ? "success" : "info");
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "My Training", to: EDU_ROUTES.student }, { label: `Task ${stage.position} of ${stages.length}` }]}
        title={stage.title}
        subtitle={stage.objective}
        action={
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${done ? "text-white" : "bg-slate-100 text-slate-600"}`}
            style={done ? { backgroundColor: primary } : undefined}
          >
            {done ? "✓ Complete" : started ? "In progress" : "Not started"}
          </span>
        }
      />

      {stageEvents.map((ev) => (
        <div key={ev.id} className={`rounded-xl border-2 p-5 ${ev.state === "new" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Site event</p>
          <h2 className="mt-1 text-lg font-bold text-slate-800">{ev.title}</h2>
          <RichText text={ev.body} className="mt-2" />
        </div>
      ))}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="1 · What you need to achieve" />
            <CardBody className="pt-2"><p className="text-sm leading-relaxed text-slate-700">{stage.objective}</p></CardBody>
          </Card>
          <Card>
            <CardHeader title="2 · Why this matters on a real site" />
            <CardBody className="pt-2"><p className="text-sm leading-relaxed text-slate-600">{stage.whyItMatters}</p></CardBody>
          </Card>
          <Card>
            <CardHeader title="3 · How to do it" subtitle={`Using ${stage.featureLabel}`} />
            <CardBody className="pt-2"><RichText text={stage.instructions} /></CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-2" style={{ borderColor: primary }}>
            <CardBody>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>
                {isSubmitStage ? "When you're ready" : "Do it on your site"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {isSubmitStage
                  ? "Submitting locks a snapshot of your evidence for your assessor."
                  : <>This opens <span className="font-semibold text-slate-800">{stage.featureLabel}</span> in your workspace. Come back here (🎓 My Training) when you've done it.</>}
              </p>
              <Button className="mt-3 w-full" size="lg" onClick={openTool}>
                {isSubmitStage ? "Go to Submit →" : done ? "Open again →" : started ? "Continue task →" : "Start task →"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="4 · Evidence required" subtitle={stage.evidenceLabel} />
            <CardBody className="space-y-2 pt-2 text-sm">
              <p className={`rounded-lg px-3 py-2 text-xs ${done ? "bg-green-50 text-green-800" : "bg-slate-50 text-slate-600"}`}>
                {describeEvidence(prog?.evidence, stage.evidenceLabel) || "Checked against the records on your site."}
              </p>
              {!isSubmitStage && (
                <Button variant="secondary" size="sm" className="w-full" disabled={checking} onClick={checkProgress}>
                  {checking ? "Checking…" : "Check my progress"}
                </Button>
              )}
              <p className="text-[11px] text-slate-400">
                A tick appears only when the real records exist — your assessor reviews those records, not the tick.
              </p>
            </CardBody>
          </Card>

          <div className="flex items-center justify-between text-sm">
            {prev ? <Link to={EDU_ROUTES.studentTask(prev.code)} className="font-medium text-blue-700 hover:underline">← {prev.title}</Link> : <span />}
            {next ? <Link to={EDU_ROUTES.studentTask(next.code)} className="font-medium text-blue-700 hover:underline">{next.title} →</Link> : <span />}
          </div>
        </div>
      </div>
      {loading && <p className="text-xs text-slate-400">Refreshing…</p>}
    </div>
  );
}
