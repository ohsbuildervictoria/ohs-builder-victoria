import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { useToast } from "../../../components/ui/Notification";
import { Field, inputClass } from "../../../components/education/EduBits";
import AddStudentsPanel from "../../../components/education/AddStudentsPanel";
import AssessorCohort from "../assess/AssessorCohort";
import {
  fetchCohorts, fetchLibrary, fetchMemberships, fetchCohortAssessors, fetchEnrolments, assignAssessor, updateCohort,
  fetchInviteLink, eduJoinLink,
} from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";

// ============================================================================
// Admin view of one cohort: the shared cohort board plus an admin toolbar —
// edit cohort, assign assessors, enrol students, copy invite links.
// ============================================================================

export default function AdminCohortDetail() {
  const { id } = useParams();
  const { education } = useEducation();
  const toast = useToast();
  const instId = education?.institutionId;
  const [cohort, setCohort] = useState(null);
  const [library, setLibrary] = useState(null);
  const [assessors, setAssessors] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [enrolments, setEnrolments] = useState([]);
  const [panel, setPanel] = useState(null); // 'edit' | 'assessors' | 'students' | 'links'
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState({});
  const [boardKey, setBoardKey] = useState(0);

  const load = async () => {
    try {
      const [cs, lib, ms, as, es] = await Promise.all([fetchCohorts(instId), fetchLibrary(), fetchMemberships(instId, "assessor"), fetchCohortAssessors(instId), fetchEnrolments(instId)]);
      const c = cs.find((x) => x.id === Number(id)) || null;
      setCohort(c); setLibrary(lib); setAssessors(ms);
      setAssigned(as.filter((a) => a.cohortId === Number(id)).map((a) => a.membershipId));
      setEnrolments(es.filter((e) => e.cohortId === Number(id)));
    } catch (e) { toast(e.message, "error"); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(() => { if (instId) load(); }, [instId, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = () => {
    setForm({ name: cohort.name, startDate: cohort.startDate || "", endDate: cohort.endDate || "", campus: cohort.campus, expectedStudents: cohort.expectedStudents || "", scenarioId: cohort.scenarioId || "", status: cohort.status });
    setPanel("edit");
  };
  const saveEdit = async () => {
    setBusy(true);
    try {
      const updated = await updateCohort(cohort.id, { ...form, scenarioId: form.scenarioId ? Number(form.scenarioId) : null });
      setCohort(updated); setPanel(null); setBoardKey((k) => k + 1); toast("Cohort updated");
    } catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const toggleAssessor = async (m) => {
    const on = assigned.includes(m.id);
    try {
      await assignAssessor(cohort.id, m.id, !on);
      setAssigned((a) => (on ? a.filter((x) => x !== m.id) : [...a, m.id]));
      setBoardKey((k) => k + 1);
      toast(on ? `${m.name || m.email} unassigned` : `${m.name || m.email} assigned`);
    } catch (e) { toast(e.message, "error"); }
  };
  const copyLink = async (e) => {
    try {
      const r = links[e.membershipId] || (await fetchInviteLink(e.membershipId));
      setLinks((l) => ({ ...l, [e.membershipId]: r }));
      if (r.claimed) { toast("This student has already set up their account", "warning"); return; }
      navigator.clipboard?.writeText(eduJoinLink(r.inviteToken));
      toast(`Invite link for ${e.name} copied`);
    } catch (err) { toast(err.message, "error"); }
  };

  const invited = enrolments.filter((e) => e.status === "invited");

  return (
    <div className="space-y-4">
      {cohort && (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-2 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manage this cohort</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={openEdit}>Edit cohort</Button>
              <Button size="sm" variant="secondary" onClick={() => setPanel("assessors")}>Assessors ({assigned.length})</Button>
              <Button size="sm" variant="secondary" onClick={() => setPanel("links")} disabled={!invited.length}>Invite links ({invited.length} pending)</Button>
              <Button size="sm" onClick={() => setPanel("students")}>+ Add students</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <AssessorCohort key={boardKey} backTo="/education/admin/cohorts" backLabel="Cohorts" studentRoute={(eid) => `/education/admin/students/${eid}`} />

      <Modal open={panel === "edit"} onClose={() => !busy && setPanel(null)} title="Edit cohort" size="lg"
        footer={<><Button variant="secondary" onClick={() => setPanel(null)}>Cancel</Button><Button disabled={busy} onClick={saveEdit}>{busy ? "Saving…" : "Save"}</Button></>}>
        {form && library && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cohort name" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Start date"><input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></Field>
            <Field label="End date"><input type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></Field>
            <Field label="Campus"><input className={inputClass} value={form.campus} onChange={(e) => setForm((f) => ({ ...f, campus: e.target.value }))} /></Field>
            <Field label="Expected students"><input type="number" className={inputClass} value={form.expectedStudents} onChange={(e) => setForm((f) => ({ ...f, expectedStudents: e.target.value }))} /></Field>
            <Field label="Scenario"><select className={inputClass} value={form.scenarioId} onChange={(e) => setForm((f) => ({ ...f, scenarioId: e.target.value }))}>{library.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field>
            <Field label="Status"><select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{["planned", "active", "closed"].map((s) => <option key={s}>{s}</option>)}</select></Field>
          </div>
        )}
      </Modal>

      <Modal open={panel === "assessors"} onClose={() => setPanel(null)} title="Assessors for this cohort" footer={<Button onClick={() => setPanel(null)}>Done</Button>}>
        {assessors.length === 0 ? (
          <p className="text-sm text-slate-500">No assessors in your institution yet — invite one from the Assessors page.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assessors.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div><p className="font-medium text-slate-800">{m.name || m.email}</p><p className="text-xs text-slate-500">{m.email} · {m.status}</p></div>
                <Button size="sm" variant={assigned.includes(m.id) ? "danger" : "success"} onClick={() => toggleAssessor(m)}>{assigned.includes(m.id) ? "Unassign" : "Assign"}</Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={panel === "students"} onClose={() => setPanel(null)} title={`Add students to ${cohort?.name || "cohort"}`} size="xl" footer={<Button onClick={() => { setPanel(null); load(); setBoardKey((k) => k + 1); }}>Done</Button>}>
        {cohort && <AddStudentsPanel cohortId={cohort.id} cohortName={cohort.name} onAdded={() => { load(); }} />}
      </Modal>

      <Modal open={panel === "links"} onClose={() => setPanel(null)} title="Pending invite links" footer={<Button onClick={() => setPanel(null)}>Done</Button>}>
        <Card className="border-0 shadow-none">
          <CardHeader subtitle="Students who haven't accepted yet. Each link works once and only for that email." className="px-0 pt-0" />
          <CardBody className="px-0 pt-2">
            <ul className="divide-y divide-slate-100">
              {invited.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <div><p className="font-medium text-slate-800">{e.name}</p><p className="text-xs text-slate-500">{e.email}</p></div>
                  <Button size="sm" variant="secondary" onClick={() => copyLink(e)}>Copy invite link</Button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </Modal>
    </div>
  );
}
