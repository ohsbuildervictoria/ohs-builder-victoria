import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import StatCard from "../../../components/ui/StatCard";
import { ErrorCard, Loading, EmptyState } from "../../../components/education/EduBits";
import { fetchAssessorHome } from "../../../lib/eduApi";
import { EDU_ROUTES } from "../../../lib/eduRoutes";
import { eduBrand, fmtDate } from "../../../data/education";

// ============================================================================
// Assessor — first-time welcome + "my cohorts". Shows what you're teaching,
// how many students, and who needs assessment right now. Never exposes
// institution configuration.
// ============================================================================

const FIRST_TIME_KEY = (id) => `ohsbv-edu-assessor-welcomed-${id}`;

export default function AssessorHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/reload fetch; same pattern as the rest of the app
    setError(null);
    fetchAssessorHome()
      .then((d) => {
        if (!alive) return;
        setData(d);
        try {
          const k = FIRST_TIME_KEY(d.assessor.membershipId);
          if (!localStorage.getItem(k)) setShowGuide(true);
        } catch { /* private mode */ }
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [reload]);

  if (error) return <ErrorCard message={error} onRetry={() => setReload((k) => k + 1)} />;
  if (!data) return <Loading label="Loading your cohorts…" />;

  const { assessor, institution, cohorts = [] } = data;
  const primary = institution.primaryColour || "#1e3a8a";
  const totals = cohorts.reduce(
    (a, c) => ({ students: a.students + Number(c.students || 0), ready: a.ready + Number(c.readyForAssessment || 0), action: a.action + Number(c.actionRequired || 0), done: a.done + Number(c.completed || 0) }),
    { students: 0, ready: 0, action: 0, done: 0 }
  );
  const dismissGuide = () => {
    setShowGuide(false);
    try { localStorage.setItem(FIRST_TIME_KEY(assessor.membershipId), "1"); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>{institution.name}</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-800">Welcome, {assessor.name?.split(" ")[0] || "there"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {cohorts.length === 0
              ? "You haven't been assigned a cohort yet — your institution administrator will do that."
              : `You assess ${cohorts.length} cohort${cohorts.length === 1 ? "" : "s"} · ${totals.students} student${totals.students === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowGuide((v) => !v)}>{showGuide ? "Hide guide" : "How this works"}</Button>
      </div>

      {showGuide && (
        <Card className="border-2" style={{ borderColor: primary }}>
          <CardHeader title="Getting started as an assessor" subtitle="Five steps, in order. Takes about ten minutes the first time." />
          <CardBody className="pt-2">
            <ol className="ml-5 list-decimal space-y-2 text-sm text-slate-700">
              <li><span className="font-semibold">Review the assigned unit.</span> Open a cohort → Unit & mapping tab. Check the criteria against your RTO's current unit text.</li>
              <li><span className="font-semibold">Review the indicative assessment mapping.</span> It shows which simulation task evidences which criterion. It is a starting point controlled by {institution.name}, not a rule set by OHS Builder.</li>
              <li><span className="font-semibold">Review the scenario.</span> Read the project brief and the site events your students will face, so you know what "good" looks like.</li>
              <li><span className="font-semibold">Review the student list.</span> Who has started, who has submitted, who is stuck.</li>
              <li><span className="font-semibold">Start assessing.</span> Click a student who is Ready for Assessment: their records on the left, the criteria on the right. Mark each Satisfactory or Not Yet Satisfactory with a comment, then finalise — either Complete or Return for correction.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">{eduBrand.disclaimer}</p>
            <Button className="mt-3" size="sm" onClick={dismissGuide}>Got it</Button>
          </CardBody>
        </Card>
      )}

      {cohorts.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Students" value={totals.students} tone="blue" />
          <StatCard label="Ready for assessment" value={totals.ready} tone={totals.ready ? "amber" : "default"} sub={totals.ready ? "waiting on you" : "nothing waiting"} />
          <StatCard label="Action required" value={totals.action} tone={totals.action ? "red" : "default"} sub="returned to students" />
          <StatCard label="Completed" value={totals.done} tone="green" />
        </div>
      )}

      {cohorts.length === 0 ? (
        <EmptyState icon="👥" title="No cohorts assigned yet" body="Once your institution administrator assigns you to a cohort it appears here with its students, unit and scenario." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cohorts.map((c) => (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">{c.name}</h2>
                    <p className="text-sm text-slate-500">{c.programName}{c.campus ? ` · ${c.campus}` : ""}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{c.qualificationCode}</span> {c.qualificationTitle}
                    </p>
                    <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{c.unitCode}</span> {c.unitTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">Scenario: <span className="font-medium text-slate-700">{c.scenarioTitle || "—"}</span> · {fmtDate(c.startDate)} → {fmtDate(c.endDate)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{c.students} students</span>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-1 text-center text-xs">
                  <Mini label="Not started" n={c.notStarted} />
                  <Mini label="In progress" n={c.inProgress} tone="text-blue-700" />
                  <Mini label="Ready" n={c.readyForAssessment} tone="text-amber-700" strong />
                  <Mini label="Action req." n={c.actionRequired} tone="text-red-700" />
                  <Mini label="Completed" n={c.completed} tone="text-green-700" />
                </div>
                <div className="mt-4 flex justify-end">
                  <Link to={EDU_ROUTES.assessCohort(c.id)}>
                    <Button>{Number(c.readyForAssessment) > 0 ? `Assess ${c.readyForAssessment} waiting →` : "Open cohort →"}</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, n, tone = "text-slate-700", strong }) {
  return (
    <div className={`rounded-lg bg-slate-50 py-2 ${strong && Number(n) > 0 ? "ring-2 ring-amber-300" : ""}`}>
      <p className={`text-lg font-bold ${tone}`}>{n || 0}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}
