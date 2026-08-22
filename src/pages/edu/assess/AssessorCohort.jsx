import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Tabs from "../../../components/ui/Tabs";
import { Table, THead, TBody, TR, TD } from "../../../components/ui/Table";
import { ErrorCard, Loading, PageHeader, StatusPill, BrandedProgress, RichText, EmptyState } from "../../../components/education/EduBits";
import MappingTable from "../../../components/education/MappingTable";
import { fetchCohortBoard } from "../../../lib/eduApi";
import { EDU_ROUTES } from "../../../lib/eduRoutes";
import { enrolmentStatus, fmtDateTime, fmtDate } from "../../../data/education";
import { useEducation } from "../../../hooks/useEducation";

// ============================================================================
// Cohort board — used by assessors (and reused by institution admins via the
// admin cohort page). Who needs attention first, then everyone else.
// ============================================================================

const ORDER = ["ready_for_assessment", "action_required", "in_progress", "not_started", "invited", "completed", "withdrawn"];
const TABS = ["Students", "Unit & mapping", "Scenario", "Assessors"];

export default function AssessorCohort({ backTo, backLabel = "My cohorts", studentRoute = EDU_ROUTES.assessStudent }) {
  const { id } = useParams();
  const { education } = useEducation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Students");
  const [filter, setFilter] = useState("all");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/reload fetch; same pattern as the rest of the app
    setError(null);
    fetchCohortBoard(Number(id)).then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [id, reload]);

  const students = useMemo(() => {
    const list = (data?.students || []).slice();
    list.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name));
    return filter === "all" ? list : list.filter((s) => s.status === filter);
  }, [data, filter]);

  if (error) return <ErrorCard message={error} onRetry={() => setReload((k) => k + 1)} />;
  if (!data) return <Loading label="Loading cohort…" />;

  const { cohort, program, unit, scenario, mappings, assessors } = data;
  const primary = education?.primaryColour || "#1e3a8a";
  const counts = (data.students || []).reduce((a, s) => ({ ...a, [s.status]: (a[s.status] || 0) + 1 }), {});
  const back = backTo || EDU_ROUTES.assess;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: backLabel, to: back }, { label: cohort.name }]}
        title={cohort.name}
        subtitle={`${program.name}${program.intake ? ` · ${program.intake}` : ""} · ${unit?.code || ""} ${unit?.title || ""} · ${fmtDate(cohort.startDate)} → ${fmtDate(cohort.endDate)}`}
        action={<Button variant="secondary" size="sm" onClick={() => setReload((k) => k + 1)}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[["all", "All", (data.students || []).length], ...ORDER.filter((k) => k !== "withdrawn").map((k) => [k, enrolmentStatus[k].label, counts[k] || 0])].map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-xl border bg-white p-3 text-left transition ${filter === k ? "ring-2" : "hover:bg-slate-50"} ${k === "ready_for_assessment" && n > 0 ? "border-amber-300" : "border-slate-200"}`}
            style={filter === k ? { boxShadow: `0 0 0 2px ${primary}` } : undefined}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`text-2xl font-bold ${k === "ready_for_assessment" && n > 0 ? "text-amber-700" : k === "action_required" && n > 0 ? "text-red-700" : "text-slate-800"}`}>{n}</p>
          </button>
        ))}
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Students" && (
        <Card>
          <CardBody className="pt-2">
            {students.length === 0 ? (
              <EmptyState icon="🎓" title={filter === "all" ? "No students enrolled yet" : `No students are ${enrolmentStatus[filter]?.label?.toLowerCase()}`} />
            ) : (
              <Table>
                <THead columns={["Student", "Status", "Progress", "Last activity", "Latest submission", ""]} />
                <TBody>
                  {students.map((s) => (
                    <TR key={s.enrolmentId} className={s.status === "ready_for_assessment" ? "bg-amber-50/50" : ""}>
                      <TD>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </TD>
                      <TD><StatusPill status={s.status} /></TD>
                      <TD className="w-44">
                        <BrandedProgress percent={s.totalStages ? (100 * s.completedStages) / s.totalStages : 0} primary={primary} />
                        <p className="mt-0.5 text-[11px] text-slate-500">{s.completedStages}/{s.totalStages} tasks</p>
                      </TD>
                      <TD className="text-xs">{fmtDateTime(s.lastActivity)}</TD>
                      <TD className="text-xs">
                        {s.latestSubmission ? (
                          <>V{s.latestSubmission.version} · <StatusPill status={s.latestSubmission.status} kind="submission" /></>
                        ) : "—"}
                      </TD>
                      <TD>
                        <Link to={studentRoute(s.enrolmentId)}>
                          <Button size="sm" variant={s.status === "ready_for_assessment" ? "primary" : "secondary"}>
                            {s.status === "ready_for_assessment" ? "Assess →" : "Review →"}
                          </Button>
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "Unit & mapping" && (
        <Card>
          <CardHeader title={`${unit?.code || ""} — ${unit?.title || ""}`} subtitle={unit?.qualification ? `${unit.qualification.code} ${unit.qualification.title}` : undefined} />
          <CardBody className="pt-2">
            <MappingTable unit={unit} scenario={scenario} mappings={mappings} institutionName={education?.institutionName} />
          </CardBody>
        </Card>
      )}

      {tab === "Scenario" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={scenario?.title} subtitle={scenario?.projectBrief?.address} />
            <CardBody className="space-y-4 pt-2">
              <RichText text={scenario?.description} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tasks the student works through</p>
                <ol className="mt-2 divide-y divide-slate-100">
                  {(scenario?.stages || []).map((s) => (
                    <li key={s.id} className="py-2">
                      <p className="text-sm font-semibold text-slate-800">{s.position}. {s.title}</p>
                      <p className="text-xs text-slate-500">{s.objective}</p>
                      <p className="text-[11px] text-slate-400">Tool: {s.featureLabel} · Evidence: {s.evidenceLabel}</p>
                      {s.assessorNotes && <p className="mt-0.5 text-xs text-slate-600"><span className="font-semibold">Assessor note:</span> {s.assessorNotes}</p>}
                    </li>
                  ))}
                </ol>
              </div>
              {scenario?.assessorNotes && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><span className="font-semibold">Notes for assessors:</span> {scenario.assessorNotes}</div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Site events" subtitle="Delivered to students as they progress" />
            <CardBody className="space-y-2 pt-2">
              {(scenario?.events || []).map((e) => (
                <details key={e.id} className="rounded-lg border border-slate-200 p-2 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-800">{e.title}</summary>
                  <RichText text={e.body} className="mt-1 text-xs" />
                  {e.responseHint && <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Expected response:</span> {e.responseHint}</p>}
                </details>
              ))}
              <p className="pt-2 text-xs font-bold uppercase tracking-wider text-slate-500">Supporting documents</p>
              {(scenario?.supportingDocs || []).map((d, i) => (
                <details key={i} className="rounded-lg border border-slate-200 p-2 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-800">📄 {d.title}</summary>
                  <p className="mt-1 text-xs text-slate-600">{d.content}</p>
                </details>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "Assessors" && (
        <Card>
          <CardHeader title="Assessors on this cohort" />
          <CardBody className="pt-2">
            {assessors?.length ? (
              <ul className="divide-y divide-slate-100">
                {assessors.map((a) => (
                  <li key={a.membershipId} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-slate-800">{a.name}</span>
                    <span className="text-xs text-slate-500">{a.email} · {a.status}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400">No assessors assigned yet.</p>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
