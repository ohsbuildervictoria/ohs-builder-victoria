import { useEffect, useState } from "react";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { Table, THead, TBody, TR, TD } from "../../../components/ui/Table";
import { useToast } from "../../../components/ui/Notification";
import { Field, inputClass, PageHeader, EmptyState, ErrorCard, Loading } from "../../../components/education/EduBits";
import {
  fetchMemberships, fetchCohorts, fetchCohortAssessors, inviteMember, fetchInviteLink, deactivateMembership, assignAssessor, eduJoinLink,
} from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";
import { eduRoleLabels, fmtDateTime } from "../../../data/education";

// ============================================================================
// Assessors & administrators — invite, assign to cohorts, copy invite links,
// deactivate/reactivate. Assessors only ever see the cohorts assigned here.
// ============================================================================

export default function AdminAssessors() {
  const { education, user } = useEducation();
  const toast = useToast();
  const instId = education?.institutionId;
  const [members, setMembers] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ role: "assessor", name: "", email: "", cohortIds: [] });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [assigning, setAssigning] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [all, c, a] = await Promise.all([fetchMemberships(instId), fetchCohorts(instId), fetchCohortAssessors(instId)]);
      setMembers(all.filter((m) => m.role !== "student")); setCohorts(c); setAssignments(a);
    } catch (e) { setError(e.message); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(() => { if (instId) load(); }, [instId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!members) return <Loading label="Loading people…" />;

  const cohortsFor = (mid) => assignments.filter((a) => a.membershipId === mid).map((a) => cohorts.find((c) => c.id === a.cohortId)).filter(Boolean);

  const invite = async () => {
    if (!form.email.trim()) { toast("Enter an email", "error"); return; }
    setBusy(true);
    try {
      const res = await inviteMember({ institutionId: instId, role: form.role, name: form.name, email: form.email, cohortIds: form.role === "assessor" ? form.cohortIds : [] });
      setCreated({ ...form, link: eduJoinLink(res.inviteToken) });
      setInviteOpen(false);
      setForm({ role: "assessor", name: "", email: "", cohortIds: [] });
      await load();
    } catch (e) { toast(e.message || "Could not invite", "error"); }
    finally { setBusy(false); }
  };
  const copyLink = async (m) => {
    try {
      const r = await fetchInviteLink(m.id);
      if (r.claimed) { toast("Already accepted", "warning"); return; }
      navigator.clipboard?.writeText(eduJoinLink(r.inviteToken));
      toast("Invite link copied");
    } catch (e) { toast(e.message, "error"); }
  };
  const toggleActive = async (m) => {
    const active = m.status === "deactivated";
    if (!active && m.userId === user?.id) { toast("You can't deactivate your own account", "warning"); return; }
    if (!active && !window.confirm(`Deactivate ${m.name || m.email}? They lose access to this institution immediately.`)) return;
    try {
      await deactivateMembership(m.id, active);
      setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: active ? "active" : "deactivated" } : x)));
      toast(active ? "Reactivated" : "Deactivated");
    } catch (e) { toast(e.message, "error"); }
  };
  const toggleCohort = async (m, c) => {
    const on = assignments.some((a) => a.membershipId === m.id && a.cohortId === c.id);
    try {
      await assignAssessor(c.id, m.id, !on);
      setAssignments((as) => (on ? as.filter((a) => !(a.membershipId === m.id && a.cohortId === c.id)) : [...as, { membershipId: m.id, cohortId: c.id }]));
    } catch (e) { toast(e.message, "error"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/education/admin" }, { label: "Assessors" }]}
        title="Assessors & administrators"
        subtitle="Assessors see only the cohorts you assign them. Administrators manage the whole institution."
        action={<Button onClick={() => setInviteOpen(true)}>+ Invite</Button>}
      />
      <Card>
        <CardBody className="pt-2">
          {members.length === 0 ? (
            <EmptyState icon="🧑‍🏫" title="No assessors yet" body="Invite the trainer who will review student evidence." action={<Button onClick={() => setInviteOpen(true)}>Invite an assessor</Button>} />
          ) : (
            <Table>
              <THead columns={["Name", "Role", "Cohorts", "Status", "Last sign-in", ""]} />
              <TBody>
                {members.map((m) => (
                  <TR key={m.id}>
                    <TD><p className="font-medium text-slate-800">{m.name || "—"}</p><p className="text-xs text-slate-500">{m.email}</p></TD>
                    <TD className="text-xs">{eduRoleLabels[m.role]}</TD>
                    <TD className="text-xs">
                      {m.role === "assessor" ? (
                        <>
                          {cohortsFor(m.id).map((c) => c.name).join(", ") || <span className="text-amber-700">none</span>}
                          <button className="ml-2 font-medium text-blue-700 hover:underline" onClick={() => setAssigning(m)}>Change</button>
                        </>
                      ) : "All (admin)"}
                    </TD>
                    <TD><Badge status={m.status === "active" ? "Active" : m.status === "invited" ? "Invited" : "On Hold"}>{m.status}</Badge></TD>
                    <TD className="text-xs">{fmtDateTime(m.lastLogin)}</TD>
                    <TD>
                      <div className="flex gap-2">
                        {m.status === "invited" && <Button size="sm" variant="secondary" onClick={() => copyLink(m)}>Copy invite link</Button>}
                        {m.status !== "invited" && <Button size="sm" variant={m.status === "deactivated" ? "success" : "danger"} onClick={() => toggleActive(m)}>{m.status === "deactivated" ? "Reactivate" : "Deactivate"}</Button>}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal open={inviteOpen} onClose={() => !busy && setInviteOpen(false)} title="Invite"
        footer={<><Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button><Button disabled={busy} onClick={invite}>{busy ? "Inviting…" : "Create invite"}</Button></>}>
        <div className="space-y-4">
          <Field label="Role">
            <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="assessor">Assessor / Trainer</option>
              <option value="institution_admin">Institution Admin</option>
            </select>
          </Field>
          <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email *"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          {form.role === "assessor" && (
            <Field label="Cohort access">
              {cohorts.length ? (
                <div className="flex flex-wrap gap-2">
                  {cohorts.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                      <input type="checkbox" checked={form.cohortIds.includes(c.id)} onChange={() => setForm((f) => ({ ...f, cohortIds: f.cohortIds.includes(c.id) ? f.cohortIds.filter((x) => x !== c.id) : [...f.cohortIds, c.id] }))} /> {c.name}
                    </label>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500">No cohorts yet — assign later.</p>}
            </Field>
          )}
        </div>
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Invitation created" footer={<Button onClick={() => setCreated(null)}>Done</Button>}>
        {created && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>Send <span className="font-semibold">{created.name || created.email}</span> this private link. They open it once to set a password.</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="break-all font-mono text-xs text-slate-700">{created.link}</p></div>
            <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(created.link); toast("Invite link copied"); }}>Copy link</Button>
            <p className="text-xs text-slate-500">The link works once and only for {created.email}.</p>
          </div>
        )}
      </Modal>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title={`Cohorts for ${assigning?.name || assigning?.email || ""}`} footer={<Button onClick={() => setAssigning(null)}>Done</Button>}>
        {assigning && (cohorts.length ? (
          <ul className="divide-y divide-slate-100">
            {cohorts.map((c) => {
              const on = assignments.some((a) => a.membershipId === assigning.id && a.cohortId === c.id);
              return (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-800">{c.name}</span>
                  <Button size="sm" variant={on ? "danger" : "success"} onClick={() => toggleCohort(assigning, c)}>{on ? "Unassign" : "Assign"}</Button>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-slate-500">No cohorts yet.</p>)}
      </Modal>
    </div>
  );
}
