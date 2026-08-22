import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { Table, THead, TBody, TR, TD } from "../../../components/ui/Table";
import { useToast } from "../../../components/ui/Notification";
import { Field, inputClass, PageHeader, EmptyState, ErrorCard, Loading } from "../../../components/education/EduBits";
import { fetchPrograms, fetchLibrary, insertProgram, updateProgram, fetchCohorts } from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";

// ============================================================================
// Programs — a qualification + unit delivered to cohorts.
// ============================================================================

const empty = { name: "", qualificationId: "", unitId: "", intake: "", campus: "", department: "" };

export default function AdminPrograms() {
  const { education } = useEducation();
  const toast = useToast();
  const [programs, setPrograms] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [library, setLibrary] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | program
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const instId = education?.institutionId;

  const load = async () => {
    setError(null);
    try {
      const [p, l, c] = await Promise.all([fetchPrograms(instId), fetchLibrary(), fetchCohorts(instId)]);
      setPrograms(p); setLibrary(l); setCohorts(c);
    } catch (e) { setError(e.message); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(() => { if (instId) load(); }, [instId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!programs || !library) return <Loading label="Loading programs…" />;

  const qual = (id) => library.qualifications.find((q) => q.id === id);
  const unit = (id) => library.units.find((u) => u.id === id);
  const list = programs.filter((p) => showArchived || p.status === "active");

  const open = (p) => {
    setForm(p === "new"
      ? { ...empty, qualificationId: library.qualifications[0]?.id || "", unitId: library.units[0]?.id || "" }
      : { name: p.name, qualificationId: p.qualificationId || "", unitId: p.unitId || "", intake: p.intake, campus: p.campus, department: p.department });
    setEditing(p);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { toast("Give the program a name", "error"); return; }
    setBusy(true);
    try {
      const payload = { ...form, qualificationId: form.qualificationId ? Number(form.qualificationId) : null, unitId: form.unitId ? Number(form.unitId) : null };
      if (editing === "new") {
        const created = await insertProgram({ institutionId: instId, ...payload });
        setPrograms((ps) => [...ps, created]);
        toast("Program created");
      } else {
        const updated = await updateProgram(editing.id, payload);
        setPrograms((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
        toast("Program updated");
      }
      setEditing(null);
    } catch (e) { toast(e.message || "Could not save", "error"); }
    finally { setBusy(false); }
  };

  const archive = async (p, status) => {
    try {
      const updated = await updateProgram(p.id, { status });
      setPrograms((ps) => ps.map((x) => (x.id === updated.id ? updated : x)));
      toast(status === "archived" ? "Program archived" : "Program restored");
    } catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/education/admin" }, { label: "Programs" }]}
        title="Programs"
        subtitle="A program is a qualification + unit you deliver. Cohorts of students sit under a program."
        action={<Button onClick={() => open("new")}>+ New program</Button>}
      />
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived</label>
      <Card>
        <CardBody className="pt-2">
          {list.length === 0 ? (
            <EmptyState icon="📚" title="No programs yet" body="Create your first program — the setup wizard walks you through it." action={<Link to="/education/admin/setup?step=4"><Button>Create a program</Button></Link>} />
          ) : (
            <Table>
              <THead columns={["Program", "Qualification", "Unit", "Intake · campus", "Cohorts", "Status", ""]} />
              <TBody>
                {list.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium text-slate-800">{p.name}</TD>
                    <TD className="text-xs">{qual(p.qualificationId) ? `${qual(p.qualificationId).code} ${qual(p.qualificationId).title}` : "—"}</TD>
                    <TD className="text-xs">{unit(p.unitId) ? `${unit(p.unitId).code} ${unit(p.unitId).title}` : "—"}</TD>
                    <TD className="text-xs">{[p.intake, p.campus].filter(Boolean).join(" · ") || "—"}</TD>
                    <TD>{cohorts.filter((c) => c.programId === p.id).length}</TD>
                    <TD><Badge status={p.status === "active" ? "Active" : "Closed"}>{p.status}</Badge></TD>
                    <TD>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => open(p)}>Edit</Button>
                        {p.status === "active"
                          ? <Button size="sm" variant="secondary" onClick={() => archive(p, "archived")}>Archive</Button>
                          : <Button size="sm" variant="secondary" onClick={() => archive(p, "active")}>Restore</Button>}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={!!editing} onClose={() => !busy && setEditing(null)} title={editing === "new" ? "New program" : "Edit program"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button></>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Program name *" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={set("name")} /></Field>
          <Field label="Qualification">
            <select className={inputClass} value={form.qualificationId} onChange={set("qualificationId")}>
              <option value="">—</option>
              {library.qualifications.map((q) => <option key={q.id} value={q.id}>{q.code} — {q.title}</option>)}
            </select>
          </Field>
          <Field label="Unit of competency">
            <select className={inputClass} value={form.unitId} onChange={set("unitId")}>
              <option value="">—</option>
              {library.units.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.title}</option>)}
            </select>
          </Field>
          <Field label="Semester / intake"><input className={inputClass} value={form.intake} onChange={set("intake")} /></Field>
          <Field label="Campus"><input className={inputClass} value={form.campus} onChange={set("campus")} /></Field>
          <Field label="Department" className="sm:col-span-2"><input className={inputClass} value={form.department} onChange={set("department")} /></Field>
          <p className="text-xs text-slate-500 sm:col-span-2">Need a qualification or unit that isn't listed? The setup wizard (step 4) can add your own.</p>
        </div>
      </Modal>
    </div>
  );
}
