import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import StatCard from "../../../components/ui/StatCard";
import Badge from "../../../components/ui/Badge";
import { Table, THead, TBody, TR, TD } from "../../../components/ui/Table";
import { ErrorCard, Loading, EmptyState, PageHeader } from "../../../components/education/EduBits";
import { fetchInstitutionOverview } from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";
import { fmtDate, usablePrimary } from "../../../data/education";

// ============================================================================
// Institution dashboard — the operational view: is setup finished, how many
// programs/cohorts/students/assessors, who needs attention, and each cohort.
// ============================================================================

const SETUP_STEPS = [
  ["profile", "Institution profile", 2],
  ["branding", "Branding (logo & colours)", 3],
  ["program", "First training program", 4],
  ["cohort", "First cohort", 5],
  ["assessor", "An assessor", 6],
  ["students", "Students", 7],
];

export default function InstitutionDashboard() {
  const { education } = useEducation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!education?.institutionId) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing stale error before reload
    setError(null);
    fetchInstitutionOverview(education.institutionId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [education?.institutionId, reload]);

  if (error) return <ErrorCard message={error} onRetry={() => setReload((k) => k + 1)} />;
  if (!data) return <Loading label="Loading your institution…" />;

  const { institution, counts, cohorts = [] } = data;
  const onboarding = institution.onboarding || {};
  // Branding counts as done with a logo OR saved colours (the server flag only
  // knows about the logo).
  const setup = { ...(data.setup || {}), branding: !!(data.setup?.branding || onboarding.brandingSaved) };
  const missing = SETUP_STEPS.filter(([k]) => !setup?.[k]);
  const nothingDone = SETUP_STEPS.every(([k]) => !setup?.[k]);
  const primary = usablePrimary(institution.primaryColour);
  // First visit: go straight to the wizard's Welcome screen rather than a
  // dashboard full of zeros.
  if (nothingDone && !onboarding.welcomeSeen) return <Navigate to="/education/admin/setup" replace />;
  const setupStep = nothingDone ? 1 : missing[0]?.[2];

  return (
    <div className="space-y-6">
      <PageHeader
        title={institution.name}
        subtitle={`Education dashboard${institution.department ? ` · ${institution.department}` : ""}${institution.campus ? ` · ${institution.campus}` : ""}`}
        action={
          <div className="flex gap-2">
            <Link to="/education/admin/settings"><Button variant="secondary" size="sm">Institution & branding</Button></Link>
            <Link to="/education/admin/cohorts"><Button size="sm">Cohorts →</Button></Link>
          </div>
        }
      />

      {missing.length > 0 && (
        <Card className="border-2" style={{ borderColor: primary }}>
          <CardBody className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Finish setting up</p>
              <h2 className="mt-1 text-lg font-bold text-slate-800">
                {missing.length === SETUP_STEPS.length ? "Let's set up your construction training environment" : `${missing.length} step${missing.length === 1 ? "" : "s"} left`}
              </h2>
              <ul className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {SETUP_STEPS.map(([k, label]) => (
                  <li key={k} className={setup?.[k] ? "text-green-700" : "text-slate-600"}>
                    {setup?.[k] ? "✓" : "○"} {label}{k === "branding" && setup.branding && !data.setup?.branding ? " (colours set — add a logo any time)" : ""}
                  </li>
                ))}
              </ul>
            </div>
            <Link to={setupStep === 1 ? "/education/admin/setup" : `/education/admin/setup?step=${setupStep}`}><Button size="lg">{missing.length === SETUP_STEPS.length ? "Start setup" : "Continue setup"} →</Button></Link>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active programs" value={counts.programs} tone="blue" />
        <StatCard label="Active cohorts" value={counts.cohorts} tone="blue" />
        <StatCard label="Students" value={counts.students} tone="blue" sub={counts.invited ? `${counts.invited} haven't accepted their invite` : undefined} />
        <StatCard label="Assessors" value={counts.assessors} tone="blue" sub={counts.assessorsPending ? `${counts.assessorsPending} invited, not yet joined` : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Not started" value={Number(counts.notStarted) + Number(counts.invited)} />
        <StatCard label="In progress" value={counts.inProgress} tone="blue" />
        <StatCard label="Awaiting assessment" value={counts.readyForAssessment} tone={Number(counts.readyForAssessment) ? "amber" : "default"} />
        <StatCard label="Action required (NYS)" value={counts.actionRequired} tone={Number(counts.actionRequired) ? "red" : "default"} />
        <StatCard label="Completed" value={counts.completed} tone="green" />
      </div>

      <Card>
        <CardHeader
          title="Cohorts"
          subtitle="Institution → Department → Qualification → Unit → Cohort → Student"
          action={<Link to="/education/admin/cohorts"><Button size="sm" variant="secondary">Manage cohorts</Button></Link>}
        />
        <CardBody className="pt-2">
          {cohorts.length === 0 ? (
            <EmptyState icon="👥" title="No cohorts yet" body="A cohort is a group of students doing one unit with one scenario. Create your first one in the setup wizard." action={<Link to="/education/admin/setup?step=5"><Button>Create a cohort</Button></Link>} />
          ) : (
            <Table>
              <THead columns={["Cohort", "Program · unit", "Scenario", "Students", "Ready", "Action req.", "Completed", "Assessors", "Status", ""]} />
              <TBody>
                {cohorts.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}{c.campus ? ` · ${c.campus}` : ""}</p>
                    </TD>
                    <TD><p>{c.programName}</p><p className="text-xs text-slate-500">{c.unitCode}</p></TD>
                    <TD>{c.scenarioTitle || "—"}</TD>
                    <TD>{c.students}</TD>
                    <TD className={Number(c.readyForAssessment) ? "font-semibold text-amber-700" : ""}>{c.readyForAssessment}</TD>
                    <TD className={Number(c.actionRequired) ? "font-semibold text-red-700" : ""}>{c.actionRequired}</TD>
                    <TD>{c.completed}</TD>
                    <TD className="text-xs">{(c.assessors || []).join(", ") || <span className="text-amber-700">none</span>}</TD>
                    <TD><Badge status={c.status === "active" ? "Active" : c.status === "closed" ? "Closed" : "Planning"}>{c.status}</Badge></TD>
                    <TD><Link to={`/education/admin/cohorts/${c.id}`}><Button size="sm">Open</Button></Link></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
