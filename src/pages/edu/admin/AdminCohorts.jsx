import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { Table, THead, TBody, TR, TD } from "../../../components/ui/Table";
import { useToast } from "../../../components/ui/Notification";
import { Field, inputClass, PageHeader, EmptyState, ErrorCard, Loading } from "../../../components/education/EduBits";
import {
  fetchCohorts, fetchPrograms, fetchLibrary, fetchEnrolments, fetchCohortAssessors, fetchMemberships, insertCohort, updateCohort,
} from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";
import { fmtDate } from "../../../data/education";

// ============================================================================
// Cohorts — groups of students doing one unit with one scenario.
// ============================================================================

const STATUSES = ["planned", "active", "closed"];
const empty = { programId: "", name: "", startDate: "", endDate: "", campus: "", expectedStudents: "", scenarioId: "", status: "active" };

export default function AdminCohorts() {
  const { education } = useEducation();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const instId = education?.institutionId;

  const load = async () => {
    setError(null);
    try {
      const [cohorts, programs, library, enrolments, assignments, assessors] = await Promise.all([
        fetchCohorts(instId), fetchPrograms(instId), fetchLibrary(), fetchEnrolments(instId), fetchCohortAssessors(instId), fetchMemberships(instId, "assessor"),
      ]);
      setData({ cohorts, programs, library, enrolments, assignments, assessors });
    } catch (e) { setError(e.message); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(() => { if (instId) load(); }, [instId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!data) return <Loading label="Loading cohorts…" />;

  const { cohorts, programs, library, enrolments, assignments, assessors } = data;
  const program = (id) => programs.find((p) => p.id === id);
  const scenario = (id) => library.scenarios.find((s) => s.id === id);
  const assessorNames = (cid) => assignments.filter((a) => a.cohortId === cid).map((a) => assessors.find((m) => m.id === a.membershipId)?.name || "?");
  const studentsIn = (cid) => enrolments.filter((e) => e.cohortId === cid);

  const open = (c) => {
    setForm(c === "new"
      ? { ...empty, programId: programs[0]?.id || "", scenarioId: library.scenarios.find((s) => s.code === "RIVERSIDE")?.id || library.scenarios[0]?.id || "" }
      : { programId: c.programId, name: c.name, startDate: c.startDate || "", endDate: c.endDate || "", campus: c.campus, expectedStudents: c.expectedStudents || "", scenarioId: c.scenarioId || "", status: c.status });
    setEditing(c);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { toast("Give the cohort a name", "error"); return; }
    if (!form.programId) { toast("Choose a program", "error"); return; }
    setBusy(true);
    try {
      const payload = { ...form, programId: Number(form.programId), scenarioId: form.scenarioId ? Number(form.scenarioId) : null };
      if (editing === "new") {
        const created = await insertCohort({ institutionId: instId, ...payload });
        setData((d) => ({ ...d, cohorts: [...d.cohorts, created] }));
        toast("Cohort created");
      } else {
        const updated = await updateCohort(editing.id, payload);
        setData((d) => ({ ...d, cohorts: d.cohorts.map((c) => (c.id === updated.id ? updated : c)) }));
        toast("Cohort updated");
      }
      setEditing(null);
    } catch (e) { toast(e.message || "Could not save", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/education/admin" }, { label: "Cohorts" }]}
        title="Cohorts"
        subtitle="Open a cohort to see its students, assessors, unit mapping and scenario."
        action={<Button onClick={() => open("new")} disabled={!programs.length}>+ New cohort</Button>}
      />
      {!programs.length && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Create a <Link className="underline" to="/education/admin/programs">program</Link> first — cohorts sit under a program.</p>}
      <Card>
        <CardBody className="pt-2">
          {cohorts.length === 0 ? (
            <EmptyState icon="👥" title="No cohorts yet" body="A cohort is a group of students who do the unit together with one scenario and one or more assessors." action={programs.length ? <Button onClick={() => open("new")}>Create your first cohort</Button> : undefined} />
          ) : (
            <Table>
              <THead columns={["Cohort", "Program", "Scenario", "Dates", "Students", "Ready / NYS / Done", "Assessors", "Status", ""]} />
              <TBody>
                {cohorts.map((c) => {
                  const st = studentsIn(c.id);
                  const n = (s) => st.filter((e) => e.status === s).length;
                  const names = assessorNames(c.id);
                  return (
                    <TR key={c.id}>
                      <TD><Link to={`/education/admin/cohorts/${c.id}`} className="font-medium text-slate-800 hover:underline">{c.name}</Link>{c.campus && <p className="text-xs text-slate-500">{c.campus}</p>}</TD>
                      <TD className="text-xs">{program(c.programId)?.name || "—"}</TD>
                      <TD className="text-xs">{scenario(c.scenarioId)?.title || "—"}</TD>
                      <TD className="text-xs">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</TD>
                      <TD>{st.length}{c.expectedStudents ? <span className="text-xs text-slate-400"> / {c.expectedStudents}</span> : null}</TD>
                      <TD className="text-xs"><span className={n("ready_for_assessment") ? "font-semibold text-amber-700" : ""}>{n("ready_for_assessment")}</span> / <span className={n("action_required") ? "font-semibold text-red-700" : ""}>{n("action_required")}</span> / {n("completed")}</TD>
                      <TD className="text-xs">{names.join(", ") || <span className="text-amber-700">none</span>}</TD>
                      <TD><Badge status={c.status === "active" ? "Active" : c.status === "closed" ? "Closed" : "Planning"}>{c.status}</Badge></TD>
                      <TD><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => open(c)}>Edit</Button><Link to={`/education/admin/cohorts/${c.id}`}><Button size="sm">Open</Button></Link></div></TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={!!editing} onClose={() => !busy && setEditing(null)} title={editing === "new" ? "New cohort" : "Edit cohort"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Program" className="sm:col-span-2">
            <select className={inputClass} value={form.programId} onChange={set("programId")}>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}{p.intake ? ` · ${p.intake}` : ""}</option>)}
            </select>
          </Field>
          <Field label="Cohort name *" className="sm:col-span-2"><input className={inputClass} placeholder="e.g. Semester 1 — Group A" value={form.name} onChange={set("name")} /></Field>
          <Field label="Start date"><input type="date" className={inputClass} value={form.startDate} onChange={set("startDate")} /></Field>
          <Field label="End date"><input type="date" className={inputClass} value={form.endDate} onChange={set("endDate")} /></Field>
          <Field label="Campus"><input className={inputClass} value={form.campus} onChange={set("campus")} /></Field>
          <Field label="Expected students"><input type="number" min="0" className={inputClass} value={form.expectedStudents} onChange={set("expectedStudents")} /></Field>
          <Field label="Scenario" hint="Changing the scenario of a running cohort changes every student's task list." >
            <select className={inputClass} value={form.scenarioId} onChange={set("scenarioId")}>
              {library.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
