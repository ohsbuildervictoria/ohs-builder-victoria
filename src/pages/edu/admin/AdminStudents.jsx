import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { Table, THead, TBody, TR, TD } from "../../../components/ui/Table";
import { useToast } from "../../../components/ui/Notification";
import { PageHeader, EmptyState, ErrorCard, Loading, StatusPill, inputClass } from "../../../components/education/EduBits";
import { fetchEnrolments, fetchCohorts, fetchInviteLink, withdrawEnrolment, eduJoinLink } from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";
import { enrolmentStatus, fmtDateTime } from "../../../data/education";

// ============================================================================
// Students — every enrolment across cohorts, filterable; invite links;
// withdraw. Enrolling happens on a cohort (or in the setup wizard).
// ============================================================================

export default function AdminStudents() {
  const { education } = useEducation();
  const toast = useToast();
  const instId = education?.institutionId;
  const [enrolments, setEnrolments] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [error, setError] = useState(null);
  const [cohortFilter, setCohortFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setError(null);
    try {
      const [e, c] = await Promise.all([fetchEnrolments(instId), fetchCohorts(instId)]);
      setEnrolments(e); setCohorts(c);
    } catch (err) { setError(err.message); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(() => { if (instId) load(); }, [instId]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => (enrolments || []).filter((e) =>
    (cohortFilter === "all" || e.cohortId === Number(cohortFilter)) &&
    (statusFilter === "all" || e.status === statusFilter) &&
    (!q || `${e.name} ${e.email}`.toLowerCase().includes(q.toLowerCase()))
  ), [enrolments, cohortFilter, statusFilter, q]);

  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!enrolments) return <Loading label="Loading students…" />;

  const cohortName = (id) => cohorts.find((c) => c.id === id)?.name || "—";

  const copyLink = async (e) => {
    try {
      const r = await fetchInviteLink(e.membershipId);
      if (r.claimed) { toast("This student has already set up their account", "warning"); return; }
      navigator.clipboard?.writeText(eduJoinLink(r.inviteToken));
      toast(`Invite link for ${e.name} copied`);
    } catch (err) { toast(err.message, "error"); }
  };
  const withdraw = async (e) => {
    if (!window.confirm(`Withdraw ${e.name} from ${cohortName(e.cohortId)}? They lose access to their simulated site; their evidence is kept.`)) return;
    try {
      await withdrawEnrolment(e.id);
      setEnrolments((es) => es.filter((x) => x.id !== e.id));
      toast(`${e.name} withdrawn`);
    } catch (err) { toast(err.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/education/admin" }, { label: "Students" }]}
        title="Students"
        subtitle={`${enrolments.length} enrolled across ${cohorts.length} cohort${cohorts.length === 1 ? "" : "s"}. To enrol more, open a cohort → Add students.`}
        action={<Link to="/education/admin/cohorts"><Button>Enrol students (via cohort) →</Button></Link>}
      />
      <div className="flex flex-wrap gap-2">
        <input className={`${inputClass} sm:max-w-xs`} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputClass} sm:max-w-xs`} value={cohortFilter} onChange={(e) => setCohortFilter(e.target.value)}>
          <option value="all">All cohorts</option>
          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={`${inputClass} sm:max-w-xs`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(enrolmentStatus).filter(([k]) => k !== "withdrawn").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <Card>
        <CardBody className="pt-2">
          {list.length === 0 ? (
            <EmptyState icon="🎓" title={enrolments.length ? "No students match these filters" : "No students enrolled yet"} body={enrolments.length ? undefined : "Open a cohort and use Add students — by typing names in or importing a CSV."} />
          ) : (
            <Table>
              <THead columns={["Student", "Cohort", "Status", "Started", "Submitted", "Completed", ""]} />
              <TBody>
                {list.map((e) => (
                  <TR key={e.id}>
                    <TD><p className="font-medium text-slate-800">{e.name}</p><p className="text-xs text-slate-500">{e.email}</p></TD>
                    <TD className="text-xs"><Link className="text-blue-700 hover:underline" to={`/education/admin/cohorts/${e.cohortId}`}>{cohortName(e.cohortId)}</Link></TD>
                    <TD><StatusPill status={e.status} /></TD>
                    <TD className="text-xs">{fmtDateTime(e.startedAt)}</TD>
                    <TD className="text-xs">{fmtDateTime(e.submittedAt)}</TD>
                    <TD className="text-xs">{fmtDateTime(e.completedAt)}</TD>
                    <TD>
                      <div className="flex gap-2">
                        {e.status === "invited" && <Button size="sm" variant="secondary" onClick={() => copyLink(e)}>Copy invite link</Button>}
                        {e.status !== "invited" && <Link to={`/education/admin/students/${e.id}`}><Button size="sm" variant="secondary">View</Button></Link>}
                        <Button size="sm" variant="danger" onClick={() => withdraw(e)}>Withdraw</Button>
                      </div>
                    </TD>
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
