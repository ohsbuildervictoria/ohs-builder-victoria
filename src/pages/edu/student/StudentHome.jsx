import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Notification";
import {
  StatusPill, TourModal, BrandedProgress, RichText, ErrorCard, Loading,
} from "../../../components/education/EduBits";
import { useStudentHome } from "../../../hooks/useStudentHome";
import { setEduUiState, acknowledgeEvent } from "../../../lib/eduApi";
import { fmtDateTime, eduBrand, usablePrimary } from "../../../data/education";
import { EDU_ROUTES } from "../../../lib/eduRoutes";

// ============================================================================
// Student — first login (Welcome → Start Simulation → tour) and the training
// dashboard: progress, site events, the task list, and where to go next.
// ============================================================================

export default function StudentHome() {
  const { home, error, refresh, patch } = useStudentHome();
  const [tourOpen, setTourOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  if (error && !home) return <ErrorCard message={error} onRetry={refresh} />;
  if (!home) return <Loading label="Loading your training…" />;

  const { enrolment, student, institution, cohort, unit, scenario, progress, events, submissions, assessors } = home;
  const ui = enrolment.uiState || {};
  const primary = usablePrimary(institution.primaryColour);
  const stages = scenario?.stages || [];
  const progressByStage = Object.fromEntries((progress?.stages || []).map((s) => [s.stageId, s]));
  const latest = submissions?.[0] || null;

  const saveUi = async (p) => {
    patch((h) => ({ ...h, enrolment: { ...h.enrolment, uiState: { ...(h.enrolment.uiState || {}), ...p } } }));
    try { await setEduUiState(p); } catch { /* cosmetic */ }
  };

  // ---------------------------------------------------------------- Welcome
  if (!ui.welcomeSeen) {
    return (
      <>
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="px-8 pb-6 pt-8 text-white" style={{ backgroundColor: primary }}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">{institution.name}</p>
              <h1 className="mt-2 text-3xl font-bold">Welcome, {student.name?.split(" ")[0] || "there"}</h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed opacity-95">
                You're about to manage a simulated construction project. You will use the same safety
                software real builders use — your own private practice site where nothing is real, but
                everything you record counts as evidence.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2">
              <Info label="Institution" value={institution.name} />
              <Info label="Qualification / unit" value={`${unit?.qualification?.code || ""} · ${unit?.code || ""}`} sub={unit?.title} />
              <Info label="Cohort" value={cohort?.name} sub={cohort?.startDate ? `${cohort.startDate} → ${cohort.endDate || "…"}` : undefined} />
              <Info label="Scenario / project" value={scenario?.title} sub={scenario?.projectBrief?.address} />
              <Info label="Your simulated role" value={scenario?.studentRole} />
              <Info label="Your assessor" value={assessors?.length ? assessors.map((a) => a.name).join(", ") : "To be assigned"} />
            </div>
            <div className="px-8 pb-6">
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-700">What happens next</p>
                <ol className="ml-5 mt-1 list-decimal space-y-1">
                  <li>A two-minute tour of the tools (you can reopen it any time).</li>
                  <li>Your training dashboard lists ten tasks, in order. Each one tells you what to do, why, and which tool to use.</li>
                  <li>When everything is done you submit your evidence; your assessor reviews it and tells you the outcome.</li>
                </ol>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">{eduBrand.disclaimer}</p>
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await saveUi({ welcomeSeen: true });
                    setBusy(false);
                    setTourOpen(true);
                  }}
                >
                  Start Simulation →
                </Button>
              </div>
            </div>
          </div>
        </div>
        <TourModal open={tourOpen} primary={primary} onClose={() => setTourOpen(false)} onFinish={() => saveUi({ tourSeen: true })} />
      </>
    );
  }

  // ------------------------------------------------------------- Dashboard
  const firstIncomplete = stages.find((s) => !progressByStage[s.id]?.complete);
  const newEvents = (events || []).filter((e) => e.state === "new").slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
  // One prominent event at a time — the earliest unread; the rest are listed compactly.
  const headlineEvent = newEvents[0] || null;
  const otherNewEvents = newEvents.slice(1);
  const nysCount = latest?.results?.filter((r) => r.result === "not_yet_satisfactory").length || 0;
  const allButSubmitDone = stages.filter((s) => !s.evidenceRule?.submission).every((s) => progressByStage[s.id]?.complete);
  const awaiting = latest && (latest.status === "submitted" || latest.status === "under_review");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>My Training</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-800">
            {unit?.code} <span className="font-normal text-slate-500">· {unit?.title}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {scenario?.title} · you are the {scenario?.studentRole?.split("/")[0]?.trim() || "site manager"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={progress?.status || enrolment.status} />
          <Button variant="secondary" size="sm" onClick={() => setTourOpen(true)}>Reopen tour</Button>
          <Link to="/builder/dashboard"><Button size="sm">Open my site →</Button></Link>
        </div>
      </div>

      {/* Status banners */}
      {latest?.status === "returned_nys" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">Action Required — your assessor has returned some work</p>
          <p className="mt-1 text-sm text-red-700">
            {nysCount === 1 ? "1 criterion was" : `${nysCount} criteria were`} marked Not Yet Satisfactory.
            Read the feedback, correct the records on your site, then resubmit.
          </p>
          <Link to={EDU_ROUTES.studentResults} className="mt-2 inline-block text-sm font-semibold text-red-800 underline">See what to fix →</Link>
        </div>
      )}
      {awaiting && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-bold">Submitted (version {latest.version}) on {fmtDateTime(latest.submittedAt)}.</span>{" "}
          Your assessor is reviewing it. You can keep working on your site; you'll be told when there is a result.
        </div>
      )}
      {enrolment.status === "completed" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <span className="font-bold">Assessment complete.</span>{" "}
          <Link to={EDU_ROUTES.studentResults} className="font-semibold underline">View your result and evidence portfolio →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tasks */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardBody>
              <BrandedProgress percent={progress?.percent || 0} primary={primary} label={`Progress · ${progress?.completed || 0} of ${progress?.total || 0} tasks`} />
              {firstIncomplete && !awaiting && enrolment.status !== "completed" && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Up next</p>
                    <p className="text-sm font-semibold text-slate-800">Task {firstIncomplete.position}: {firstIncomplete.title}</p>
                  </div>
                  <Link to={EDU_ROUTES.studentTask(firstIncomplete.code)}>
                    <Button>{progressByStage[firstIncomplete.id]?.evidence?.count > 0 ? "Continue task" : "Start task"} →</Button>
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>

          {/* New site events */}
          {[headlineEvent].filter(Boolean).map((ev) => (
            <div key={ev.id} className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Site event · needs your response</p>
              <h2 className="mt-1 text-lg font-bold text-slate-800">{ev.title}</h2>
              <RichText text={ev.body} className="mt-2" />
              {ev.responseHint && (
                <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600">
                  <span className="font-semibold">What a site manager does now:</span> {ev.responseHint}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {ev.stageCode && (
                  <Link to={EDU_ROUTES.studentTask(ev.stageCode)}>
                    <Button>Respond — open task {ev.stageTitle ? `“${ev.stageTitle}”` : ev.stageCode} →</Button>
                  </Link>
                )}
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await acknowledgeEvent(ev.id, { acknowledgedFrom: "dashboard" });
                      patch((h) => ({ ...h, events: h.events.map((x) => (x.id === ev.id ? { ...x, state: "acknowledged" } : x)) }));
                      toast("Noted — it stays in your event log");
                    } catch (err) {
                      toast(err.message, "error");
                    }
                  }}
                >
                  Mark as read
                </Button>
              </div>
              {otherNewEvents.length > 0 && (
                <div className="mt-3 border-t border-amber-200 pt-2 text-xs text-amber-900">
                  <span className="font-semibold">Also new:</span>{" "}
                  {otherNewEvents.map((o, i) => (
                    <span key={o.id}>
                      {i > 0 && " · "}
                      {o.stageCode ? <Link to={EDU_ROUTES.studentTask(o.stageCode)} className="underline">{o.title}</Link> : o.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Card>
            <CardHeader title="Your tasks" subtitle="In order. Each one opens a real tool on your site; a tick only appears when the records exist." />
            <CardBody className="pt-2">
              <ol className="divide-y divide-slate-100">
                {stages.map((s) => {
                  const p = progressByStage[s.id];
                  const done = !!p?.complete;
                  const current = firstIncomplete?.id === s.id;
                  return (
                    <li key={s.id} className="flex items-start gap-3 py-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          done ? "text-white" : current ? "ring-2 text-slate-700" : "bg-slate-100 text-slate-400"
                        }`}
                        style={done ? { backgroundColor: primary } : current ? { borderColor: primary, boxShadow: `0 0 0 2px ${primary}` } : undefined}
                        aria-label={done ? "Complete" : current ? "Current" : "Not started"}
                      >
                        {done ? "✓" : s.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link to={EDU_ROUTES.studentTask(s.code)} className="text-sm font-semibold text-slate-800 hover:underline">
                          {s.title}
                        </Link>
                        <p className="text-xs text-slate-500">{s.objective}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Tool: {s.featureLabel} · Evidence: {s.evidenceLabel}
                        </p>
                      </div>
                      <Link to={EDU_ROUTES.studentTask(s.code)} className="shrink-0">
                        <Button size="sm" variant={current ? "primary" : "secondary"}>
                          {done ? "Review" : current ? "Continue →" : "Open"}
                        </Button>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {allButSubmitDone && !awaiting && enrolment.status !== "completed" && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-bold text-green-800">All tasks complete — ready to submit</p>
                  <p className="mt-1 text-sm text-green-700">Submitting creates a locked snapshot of your evidence for your assessor.</p>
                  <Button className="mt-3" onClick={() => navigate(EDU_ROUTES.studentSubmit)}>Submit for assessment →</Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Side: the project brief + help */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={scenario?.title || "Your project"} subtitle={scenario?.projectBrief?.address} />
            <CardBody className="space-y-3 pt-2 text-sm text-slate-600">
              <p>{scenario?.summary}</p>
              <details className="rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">Project brief & documents</summary>
                <RichText text={scenario?.description} className="mt-2" />
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs">
                  {[
                    ["Client", scenario?.projectBrief?.client],
                    ["Contract", `${scenario?.projectBrief?.contractType || ""} · ${scenario?.projectBrief?.contractValue ? `$${Number(scenario.projectBrief.contractValue).toLocaleString()}` : ""}`],
                    ["Duration", scenario?.projectBrief?.duration],
                  ].filter(([, v]) => v && v.trim() !== "·").map(([k, v]) => (
                    <div key={k}><dt className="font-semibold text-slate-500">{k}</dt><dd className="text-slate-700">{v}</dd></div>
                  ))}
                </dl>
                {(scenario?.supportingDocs || []).map((d, i) => (
                  <details key={i} className="mt-2 rounded border border-slate-200 bg-white p-2">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-700">📄 {d.title}</summary>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{d.content}</p>
                  </details>
                ))}
              </details>
            </CardBody>
          </Card>

          {(events || []).some((e) => e.state === "acknowledged") && (
            <Card>
              <CardHeader title="Event log" />
              <CardBody className="space-y-2 pt-2">
                {(events || []).filter((e) => e.state === "acknowledged").map((e) => (
                  <details key={e.id} className="rounded-lg bg-slate-50 p-2 text-xs">
                    <summary className="cursor-pointer font-semibold text-slate-700">{e.title}</summary>
                    <RichText text={e.body} className="mt-1 text-xs" />
                  </details>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Need a hand?" />
            <CardBody className="space-y-2 pt-2 text-sm text-slate-600">
              <p>Your assessor: <span className="font-medium text-slate-800">{assessors?.length ? assessors.map((a) => a.name).join(", ") : "to be assigned"}</span></p>
              {institution.supportEmail && (
                <p>Institution support: <a className="font-medium text-blue-700 hover:underline" href={`mailto:${institution.supportEmail}`}>{institution.supportEmail}</a></p>
              )}
              <button onClick={() => setTourOpen(true)} className="text-sm font-medium text-blue-700 hover:underline">Reopen the beginner tour →</button>
              <p className="pt-1 text-[11px] text-slate-400">Stuck on a tool? Every page of your site has a ❓ Help button in the top bar.</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <TourModal open={tourOpen} primary={primary} onClose={() => setTourOpen(false)} onFinish={() => saveUi({ tourSeen: true })} />
    </div>
  );
}

function Info({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value || "—"}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

