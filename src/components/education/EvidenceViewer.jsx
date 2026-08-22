import { useEffect, useState } from "react";
import Tabs from "../ui/Tabs";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { Table, THead, TBody, TR, TD } from "../ui/Table";
import { fetchSandboxData, fetchSubmissionSnapshot } from "../../lib/eduApi";
import { getPhotoUrl } from "../../lib/api";
import { ErrorCard, Loading, EmptyState } from "./EduBits";
import { fmtDate, fmtDateTime } from "../../data/education";
import { riskRating, RATING_STYLES } from "../../lib/risk";

// ============================================================================
// Read-only view of a student's sandbox for an assessor. Two sources:
//   live     — the current records, read through RLS (assessor of the cohort)
//   snapshot — the frozen records of a submission version
// Same shapes as the student's own workspace; no write controls exist here.
// ============================================================================

const TABS = ["Overview", "Project", "Risk register", "Stakeholders", "SWMS", "Incidents", "Toolbox", "Diary", "Other"];

const fromSnapshot = (snap) => {
  // Snapshot rows are raw DB rows; adapt the few field names the tables use.
  const arr = (k) => (Array.isArray(snap?.[k]) ? snap[k] : []);
  const projects = arr("projects").map((p) => ({ id: p.id, name: p.name, address: p.address, status: p.status, projectManager: p.project_manager, startDate: p.start_date, contractType: p.contract_type, contractValue: Number(p.contract_value || 0), induction: p.induction || {}, buildPercent: p.build_percent }));
  const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
  return {
    org: snap?.organization ? { name: snap.organization.name } : null,
    projects,
    workers: arr("workers").map((w) => ({ id: w.id, name: w.name, trade: w.trade, employer: w.employer, project: w.project_id, induction: w.induction, quiz: w.quiz, swms: w.swms, whiteCard: w.white_card, insurance: w.insurance, medical: w.medical, status: w.status })),
    templates: arr("swms_templates").map((t) => ({ id: t.id, trade: t.trade, ref: t.ref, version: t.version, signed: t.signed, total: t.total, status: t.status, locked: t.locked })),
    incidents: arr("incidents").map((i) => ({ id: i.id, type: i.type, severity: i.severity, date: i.date, status: i.status, description: i.description, location: i.location, involved: i.involved, immediateAction: i.immediate_action, notifiable: i.notifiable, notifiedAt: i.notified_at, projectId: i.project_id, project: byId[i.project_id]?.name || "—", lostTime: i.lost_time, bodyMap: i.body_map || [], correctiveActions: arr("corrective_actions").filter((a) => a.incident_id === i.id).map((a) => ({ id: a.id, description: a.description, assignedTo: a.assigned_to, due: a.due, status: a.status, closedAt: a.closed_at })) })),
    entries: arr("diary_entries").map((e) => ({ id: e.id, project: e.project_id, date: e.date, weather: e.weather, labour: e.labour, hours: Number(e.hours || 0), notes: e.notes, tags: e.tags || [], author: e.author, photos: e.photos })),
    meetings: arr("toolbox_meetings").map((m) => ({ id: m.id, project: m.project_id, topic: m.topic, date: m.date, presenter: m.presenter, attendees: m.attendees, points: m.points || [], signatures: m.signatures })),
    policies: arr("policies").map((p) => ({ id: p.id, name: p.name, version: p.version, category: p.category, status: p.status })),
    documents: arr("compliance_documents").map((d) => ({ id: d.id, workerId: d.worker_id, category: d.category, fileName: d.file_name, expiry: d.expiry_date })),
    audits: arr("audit_log").map((a) => ({ id: a.id, entity: a.entity, entityId: a.entity_id, action: a.action, changedBy: a.changed_by, createdAt: a.created_at })),
    checkins: arr("site_checkins").map((c) => ({ id: c.id, name: c.name, date: c.date })),
    companies: arr("subbie_companies").map((c) => ({ id: c.id, name: c.name, abn: c.abn })),
    photos: arr("record_photos").map((p) => ({ id: p.id, entity: p.entity, entityId: p.entity_id, filePath: p.file_path, fileName: p.file_name })),
    projectDocs: arr("project_documents").map((d) => ({ id: d.id, fileName: d.file_name, category: d.category })),
    projectRisks: arr("project_risks").map((r) => ({ id: r.id, projectId: r.project_id, hazard: r.hazard, category: r.category, likelihood: r.likelihood, consequence: r.consequence, controls: r.controls, residualLikelihood: r.residual_likelihood, residualConsequence: r.residual_consequence, status: r.status, reviewDate: r.review_date, source: r.source })),
    swmsSignatures: arr("swms_signatures").map((g) => ({ id: g.id, templateId: g.template_id, workerId: g.worker_id, signedName: g.signed_name, version: g.template_version, byStaff: g.signed_by_staff, signedAt: g.signed_at })),
    toolboxSignatures: arr("toolbox_signatures").map((g) => ({ id: g.id, meetingId: g.meeting_id, signedName: g.signed_name, byStaff: g.signed_by_staff, signedAt: g.signed_at })),
    inductions: arr("induction_completions").map((i) => ({ id: i.id, workerId: i.worker_id, completedAt: i.completed_at, onPaper: i.on_paper, recordedByName: i.recorded_by_name })),
    revisions: arr("swms_revisions").map((r) => ({ id: r.id, templateId: r.template_id, fromVersion: r.from_version, toVersion: r.to_version, reason: r.reason, revisedBy: r.revised_by_name, revisedAt: r.revised_at })),
    quizAttempts: arr("quiz_attempts").map((q) => ({ id: q.id, workerId: q.worker_id, score: q.score, total: q.total, passed: q.passed, attemptedAt: q.attempted_at })),
  };
};

export default function EvidenceViewer({ sandboxOrgId, submissions = [], stages = [], progress, primary = "#1e3a8a" }) {
  const [source, setSource] = useState("live"); // 'live' | submission id
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [photoUrls, setPhotoUrls] = useState({});

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/reload fetch; same pattern as the rest of the app
    setData(null);
    setError(null);
    const load = source === "live"
      ? (sandboxOrgId ? fetchSandboxData(sandboxOrgId) : Promise.resolve(null))
      : fetchSubmissionSnapshot(Number(source)).then((s) => fromSnapshot(s.snapshot));
    load.then((d) => alive && setData(d || emptyData())).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [source, sandboxOrgId]);

  const openPhoto = async (p) => {
    try {
      const url = await getPhotoUrl(p.filePath);
      setPhotoUrls((m) => ({ ...m, [p.id]: url }));
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e.message);
    }
  };

  const srcOptions = [{ value: "live", label: "Live workspace (now)" }, ...submissions.map((s) => ({ value: String(s.id), label: `Submission V${s.version} (${fmtDate(s.submittedAt)})` }))];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Viewing</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            {srcOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">Read-only</span>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {error && <ErrorCard message={error} onRetry={() => setSource((s) => s)} />}
      {!data && !error && <Loading label="Loading records…" />}
      {data && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {tab === "Overview" && <Overview data={data} stages={stages} progress={progress} primary={primary} />}
          {tab === "Project" && <ProjectTab data={data} />}
          {tab === "Risk register" && <RiskTab data={data} />}
          {tab === "Stakeholders" && <StakeholderTab data={data} />}
          {tab === "SWMS" && <SwmsTab data={data} />}
          {tab === "Incidents" && <IncidentTab data={data} openPhoto={openPhoto} photoUrls={photoUrls} />}
          {tab === "Toolbox" && <ToolboxTab data={data} />}
          {tab === "Diary" && <DiaryTab data={data} openPhoto={openPhoto} />}
          {tab === "Other" && <OtherTab data={data} />}
        </div>
      )}
    </div>
  );
}

const emptyData = () => ({ projects: [], workers: [], templates: [], incidents: [], entries: [], meetings: [], policies: [], documents: [], audits: [], checkins: [], companies: [], photos: [], projectDocs: [], projectRisks: [], swmsSignatures: [], toolboxSignatures: [], inductions: [], revisions: [], quizAttempts: [] });

function Overview({ data, stages, progress, primary }) {
  const byStage = Object.fromEntries((progress?.stages || []).map((s) => [s.stageId, s]));
  const counts = [
    ["Projects", data.projects.length], ["Risk register entries", data.projectRisks.length], ["Stakeholders", data.workers.length],
    ["Induction completions", data.inductions.length], ["SWMS documents", data.templates.length], ["SWMS sign-offs", data.swmsSignatures.length],
    ["Incidents", data.incidents.length], ["Corrective actions", data.incidents.reduce((a, i) => a + (i.correctiveActions?.length || 0), 0)],
    ["Toolbox meetings", data.meetings.length], ["Toolbox attendance", data.toolboxSignatures.length], ["Diary entries", data.entries.length], ["Photos", data.photos.length],
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Tasks</p>
        <ul className="divide-y divide-slate-100">
          {stages.map((s) => {
            const p = byStage[s.id];
            return (
              <li key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-slate-700">{s.position}. {s.title}</span>
                <span className={`text-xs font-semibold ${p?.complete ? "text-white" : "text-slate-500"} rounded-full px-2 py-0.5`} style={p?.complete ? { backgroundColor: primary } : { backgroundColor: "#f1f5f9" }}>
                  {p?.complete ? "Evidenced" : "Pending"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Records</p>
        <div className="grid grid-cols-2 gap-2">
          {counts.map(([l, n]) => (
            <div key={l} className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-lg font-bold text-slate-800">{n}</p>
              <p className="text-[11px] text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectTab({ data }) {
  if (!data.projects.length) return <EmptyState icon="🏗️" title="No project yet" body="The student hasn't created their project." />;
  return (
    <div className="space-y-4">
      {data.projects.map((p) => (
        <div key={p.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{p.name}</h3>
              <p className="text-sm text-slate-500">{p.address}</p>
              <p className="mt-1 text-xs text-slate-500">{p.contractType} · ${Number(p.contractValue || 0).toLocaleString()} · PM {p.projectManager || "—"} · start {p.startDate || "—"}</p>
            </div>
            <Badge status={p.status} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Site induction content</p>
              {p.induction?.rules ? (
                <>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{p.induction.rules}</p>
                  <p className="mt-2 text-xs text-slate-500">Muster: {p.induction.musterPoint || "—"} · Contact: {p.induction.contactName || "—"} {p.induction.contactPhone || ""}</p>
                </>
              ) : <p className="mt-1 text-slate-400">Not written — the generic default would show to stakeholders.</p>}
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">On this project</p>
              <p className="mt-1 text-slate-700">{data.workers.filter((w) => w.project === p.id).length} stakeholders · {data.projectRisks.filter((r) => r.projectId === p.id).length} risks · {data.incidents.filter((i) => i.projectId === p.id).length} incidents · {data.entries.filter((e) => e.project === p.id).length} diary entries</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskTab({ data }) {
  if (!data.projectRisks.length) return <EmptyState icon="🛡️" title="Risk register is empty" />;
  const rate = (l, c) => (l && c ? riskRating(l, c) : null);
  const pill = (label) => label && (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RATING_STYLES[label]?.badge || "bg-slate-100 text-slate-600"}`}>{label}</span>
  );
  return (
    <Table>
      <THead columns={["Hazard", "Category", "Inherent", "Controls", "Residual", "Status", "Review", "Source"]} />
      <TBody>
        {data.projectRisks.map((r) => {
          const inh = rate(r.likelihood, r.consequence);
          const res = rate(r.residualLikelihood, r.residualConsequence);
          return (
            <TR key={r.id}>
              <TD className="max-w-xs font-medium text-slate-800">{r.hazard}</TD>
              <TD>{r.category}</TD>
              <TD><span className="whitespace-nowrap">{r.likelihood}×{r.consequence} {pill(inh)}</span></TD>
              <TD className="max-w-sm whitespace-pre-wrap text-xs">{r.controls || <span className="text-slate-400">—</span>}</TD>
              <TD>{res ? <span className="whitespace-nowrap">{r.residualLikelihood}×{r.residualConsequence} {pill(res)}</span> : "—"}</TD>
              <TD><Badge status={r.status === "Controlled" ? "Verified" : r.status === "Closed" ? "Closed" : "Open"}>{r.status}</Badge></TD>
              <TD className="text-xs">{r.reviewDate || "—"}</TD>
              <TD className="text-xs">{r.source === "swms_library" ? "SWMS library" : "Manual"}</TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

function StakeholderTab({ data }) {
  if (!data.workers.length) return <EmptyState icon="👷" title="No stakeholders added" />;
  return (
    <div className="space-y-4">
      <Table>
        <THead columns={["Name", "Trade", "Employer", "Induction", "Quiz", "SWMS", "Status", "Induction record"]} />
        <TBody>
          {data.workers.map((w) => {
            const ic = data.inductions.filter((i) => i.workerId === w.id).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0];
            return (
              <TR key={w.id}>
                <TD className="font-medium text-slate-800">{w.name}</TD>
                <TD>{w.trade}</TD>
                <TD>{w.employer}</TD>
                <TD><Badge status={w.induction} icon>{w.induction}</Badge></TD>
                <TD><Badge status={w.quiz} icon>{w.quiz}</Badge></TD>
                <TD><Badge status={w.swms} icon>{w.swms}</Badge></TD>
                <TD><Badge status={w.status} /></TD>
                <TD className="text-xs">{ic ? `${fmtDateTime(ic.completedAt)}${ic.onPaper ? ` · recorded by ${ic.recordedByName || "staff"}` : " · completed on phone"}` : "—"}</TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      {data.companies?.length > 0 && (
        <p className="text-xs text-slate-500">Subcontractor companies: {data.companies.map((c) => c.name).join(", ")}</p>
      )}
    </div>
  );
}

function SwmsTab({ data }) {
  if (!data.templates.length) return <EmptyState icon="📋" title="No SWMS documents" body="SWMS templates appear when a stakeholder with a trade is added." />;
  return (
    <div className="space-y-3">
      {data.templates.map((t) => {
        const sigs = data.swmsSignatures.filter((g) => g.templateId === t.id);
        const revs = data.revisions.filter((r) => r.templateId === t.id);
        return (
          <div key={t.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{t.trade} <span className="font-normal text-slate-500">· {t.ref} · {t.version}</span></p>
              <span className="text-xs text-slate-600">{t.signed}/{t.total} signed · <Badge status={t.status}>{t.status}</Badge>{t.locked ? " · locked" : ""}</span>
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Signature register</p>
            {sigs.length ? (
              <ul className="mt-1 text-xs text-slate-700">
                {sigs.map((g) => <li key={g.id}>{g.signedName} · {g.version} · {fmtDateTime(g.signedAt)}{g.byStaff ? " · recorded by builder (paper sign-off)" : ""}</li>)}
              </ul>
            ) : <p className="text-xs text-slate-400">No signatures.</p>}
            {revs.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">Revisions: {revs.map((r) => `${r.fromVersion}→${r.toVersion} (${r.reason})`).join("; ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IncidentTab({ data, openPhoto }) {
  if (!data.incidents.length) return <EmptyState icon="⚠️" title="No incidents reported" />;
  return (
    <div className="space-y-3">
      {data.incidents.map((i) => {
        const photos = data.photos.filter((p) => p.entity === "incident" && p.entityId === i.id);
        return (
          <div key={i.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800"><Badge status={i.severity}>{i.type}</Badge> <span className="ml-1">{i.date} · {i.project}</span></p>
              <Badge status={i.status} />
            </div>
            <p className="mt-1 text-sm text-slate-700">{i.description}</p>
            <p className="mt-1 text-xs text-slate-500">Location: {i.location || "—"} · Involved: {i.involved || "—"} · Immediate action: {i.immediateAction || "—"}{i.lostTime ? " · lost time" : ""}{i.bodyMap?.length ? ` · body map: ${i.bodyMap.length} mark(s)` : ""}</p>
            <p className="mt-1 text-xs">
              {i.notifiable ? (
                i.notifiedAt ? <span className="text-green-700">Notifiable — WorkSafe notification recorded {fmtDateTime(i.notifiedAt)}</span> : <span className="text-red-700">Notifiable — WorkSafe notification NOT recorded</span>
              ) : <span className="text-slate-500">Not notifiable</span>}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Corrective actions</p>
            {i.correctiveActions?.length ? (
              <ul className="mt-1 text-xs text-slate-700">
                {i.correctiveActions.map((a) => <li key={a.id}>• {a.description} — {a.assignedTo || "unassigned"}{a.due ? `, due ${a.due}` : ""} · <Badge status={a.status}>{a.status}</Badge></li>)}
              </ul>
            ) : <p className="text-xs text-slate-400">None.</p>}
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((p) => <Button key={p.id} size="sm" variant="secondary" onClick={() => openPhoto(p)}>📷 {p.fileName || "photo"}</Button>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ToolboxTab({ data }) {
  if (!data.meetings.length) return <EmptyState icon="🧰" title="No toolbox meetings" />;
  return (
    <div className="space-y-3">
      {data.meetings.map((m) => {
        const sigs = data.toolboxSignatures.filter((g) => g.meetingId === m.id);
        return (
          <div key={m.id} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">{m.topic} <span className="font-normal text-slate-500">· {m.date} · {m.presenter}</span></p>
            {m.points?.length > 0 && <ul className="mt-1 ml-4 list-disc text-xs text-slate-700">{m.points.map((p, i) => <li key={i}>{p}</li>)}</ul>}
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance register ({sigs.length})</p>
            {sigs.length ? <p className="text-xs text-slate-700">{sigs.map((g) => `${g.signedName} (${fmtDate(g.signedAt)}${g.byStaff ? ", recorded by staff" : ""})`).join(" · ")}</p> : <p className="text-xs text-slate-400">No attendance recorded.</p>}
          </div>
        );
      })}
    </div>
  );
}

function DiaryTab({ data, openPhoto }) {
  if (!data.entries.length) return <EmptyState icon="📓" title="No diary entries" />;
  return (
    <div className="space-y-2">
      {data.entries.map((e) => {
        const photos = data.photos.filter((p) => p.entity === "diary_entry" && p.entityId === e.id);
        return (
          <div key={e.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{e.date}</p>
              <span className="text-xs text-slate-500">{e.weather} · {e.labour} on site · {e.hours} h</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{e.notes}</p>
            <div className="mt-1 flex flex-wrap gap-1">{(e.tags || []).map((t) => <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t}</span>)}</div>
            {photos.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{photos.map((p) => <Button key={p.id} size="sm" variant="secondary" onClick={() => openPhoto(p)}>📷 {p.fileName || "photo"}</Button>)}</div>}
          </div>
        );
      })}
    </div>
  );
}

function OtherTab({ data }) {
  return (
    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Policies ({data.policies.length})</p>
        <ul className="mt-1 text-xs text-slate-700">{data.policies.map((p) => <li key={p.id}>• {p.name} · {p.version} · {p.status}</li>)}</ul>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Compliance documents ({data.documents.length})</p>
        <ul className="mt-1 text-xs text-slate-700">{data.documents.map((d) => <li key={d.id}>• {d.category} · {d.fileName}{d.expiry ? ` · exp ${d.expiry}` : ""}</li>)}</ul>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Project documents ({data.projectDocs.length})</p>
        <ul className="mt-1 text-xs text-slate-700">{data.projectDocs.map((d) => <li key={d.id}>• {d.category} · {d.fileName}</li>)}</ul>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Site check-ins ({data.checkins.length})</p>
        <ul className="mt-1 text-xs text-slate-700">{data.checkins.slice(0, 20).map((c) => <li key={c.id}>• {c.name} · {c.date}</li>)}</ul>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Quiz attempts ({data.quizAttempts.length})</p>
        <ul className="mt-1 text-xs text-slate-700">{data.quizAttempts.map((q) => <li key={q.id}>• worker #{q.workerId} · {q.score}/{q.total} · {q.passed ? "passed" : "not passed"} · {fmtDateTime(q.attemptedAt)}</li>)}</ul>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Audit trail ({data.audits.length})</p>
        <ul className="mt-1 text-xs text-slate-700">{data.audits.slice(0, 30).map((a) => <li key={a.id}>• {a.entity} #{a.entityId} · {a.action} · {a.changedBy} · {fmtDateTime(a.createdAt)}</li>)}</ul>
      </div>
    </div>
  );
}
