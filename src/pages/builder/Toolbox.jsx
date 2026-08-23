import { useState } from "react";
import { useForm } from "react-hook-form";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useToolbox, meetingHeld } from "../../hooks/useToolbox";
import { useProjects } from "../../hooks/useProjects";
import { useWorkers } from "../../hooks/useWorkers";
import { useToast } from "../../components/ui/Notification";
import { useAuth } from "../../hooks/useAuth";

// Evaluated once per page load — stable across re-renders.
const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;

export default function Toolbox() {
  const { meetings, addMeeting, signFor, loadAttendance, getStats, completeMeeting, meetingState } = useToolbox();
  const { projects, getProject } = useProjects();
  const { workers } = useWorkers();
  const { user } = useAuth();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [attendees, setAttendees] = useState([]);
  // The meeting whose attendance register is open, and the names already on it.
  const [rollFor, setRollFor] = useState(null);
  const [roll, setRoll] = useState([]);
  const [rollBusy, setRollBusy] = useState(false);
  const [completeNote, setCompleteNote] = useState("");

  const openRoll = async (meeting) => {
    setRollFor(meeting);
    setRoll([]);
    setRoll(await loadAttendance(meeting.id));
  };

  const signAttendee = async (worker) => {
    setRollBusy(true);
    try {
      const { roll: fresh, result } = await signFor(rollFor.id, worker.id, worker.name);
      setRoll(fresh);
      toast(result?.completed ? `${worker.name} recorded — everyone on the roster has signed, meeting completed` : `${worker.name} recorded as attending`);
    } catch (err) {
      toast(err.message || "Could not record attendance", "error");
    } finally {
      setRollBusy(false);
    }
  };

  const onComplete = async () => {
    setRollBusy(true);
    try {
      await completeMeeting(rollFor.id, completeNote);
      toast("Meeting completed");
      setCompleteNote("");
      setRollFor(null);
    } catch (err) {
      toast(err.message || "Could not complete the meeting", "error");
    } finally {
      setRollBusy(false);
    }
  };
  const { register, handleSubmit, reset, watch } = useForm();
  const createProject = Number(watch("project")) || projects[0]?.id || null;

  const stats = getStats();
  const meetings30d = meetings.filter(
    (m) => new Date(m.date).getTime() >= THIRTY_DAYS_AGO
  ).length;

  // Only the crew on that site can meaningfully attend that site's pre-start.
  const crewFor = (meeting) =>
    meeting ? workers.filter((w) => w.project === meeting.project) : [];

  const toggleAttendee = (id) =>
    setAttendees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const onCreate = async (data) => {
    try {
      await addMeeting({
        topic: data.title,
        points: data.topic ? [data.topic] : [],
        project: Number(data.project),
        date: (data.date || "").slice(0, 10),
        presenter: user?.name || "",
        attendees: attendees.length,
        total: attendees.length,
        signatures: 0,
      });
      toast("Toolbox meeting created");
      reset();
      setAttendees([]);
      setCreateOpen(false);
    } catch (err) {
      toast(err.message || "Could not create meeting", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Toolbox Meetings</h1>
          <p className="text-sm text-slate-500">
            Pre-start safety briefings with digital sign-off
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Create New Meeting</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Meetings (30d)" value={meetings30d} tone="blue" />
        <StatCard label="Avg Sign-off Rate" value={`${stats.avgAttendance}%`} tone="green" />
        <StatCard label="Digital Signatures" value={stats.signatures} tone="blue" />
      </div>

      <Card>
        <CardHeader title="Meetings" />
        <CardBody className="pt-2">
          <Table>
            <THead
              columns={[
                "Meeting",
                "Project",
                "Date",
                "Topic",
                "Attendance",
                "Signatures",
                "Status",
                "",
              ]}
            />
            <TBody>
              {meetings.length === 0 && (
                <TR>
                  <TD className="py-6 text-center text-sm text-slate-400">
                    No toolbox meetings recorded yet — schedule one above and the
                    attendance and sign-off record builds itself.
                  </TD>
                </TR>
              )}
              {meetings.map((m) => {
                const roster = crewFor(m).length;
                const st = meetingState(m, roster);
                return (
                <TR key={m.id}>
                  <TD className="font-medium text-slate-800">{m.topic}</TD>
                  <TD>{getProject(m.project)?.name || "—"}</TD>
                  <TD>{m.date}</TD>
                  <TD className="max-w-xs text-slate-600">
                    {m.points?.join("; ") || m.topic}
                  </TD>
                  <TD>
                    {/* Expected = the live site roster (the people the register lists);
                        the number ticked when scheduling is shown as "invited". */}
                    <span className="font-medium text-slate-800">{st.expected}</span>
                    <span className="block text-[11px] text-slate-400">on site roster{m.attendees ? ` · ${m.attendees} invited` : ""}</span>
                  </TD>
                  <TD>
                    {m.signatures} / {st.expected}
                    {st.expected > 0 && m.signatures > st.expected && (
                      <span className="block text-[11px] text-slate-400">includes people since moved off this site</span>
                    )}
                  </TD>
                  <TD>
                    <Badge status={st.label} />
                    {st.detail && <span className="block text-[11px] text-slate-400">{st.detail}</span>}
                  </TD>
                  <TD>
                    <Button size="sm" variant="secondary" onClick={() => openRoll(m)}>
                      {st.label === "Completed" ? "Register" : "Attendance"}
                    </Button>
                  </TD>
                </TR>
                );
              })}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      {/* Attendance register — who was actually at the talk, by name. */}
      <Modal
        open={!!rollFor}
        onClose={() => setRollFor(null)}
        title={rollFor ? `Attendance — ${rollFor.topic}` : "Attendance"}
      >
        <p className="text-sm text-slate-600">
          Tick each person off as they sign. This is the record that proves who
          was consulted about {rollFor?.points?.[0] || "this topic"} — a headcount
          on its own proves nothing.
        </p>
        <div className="mt-4 max-h-80 space-y-1 overflow-y-auto scrollbar-thin">
          {crewFor(rollFor).length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              No crew recorded on this site yet.
            </p>
          )}
          {crewFor(rollFor).map((w) => {
            const signed = roll.find((r) => r.workerId === w.id);
            return (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{w.name}</p>
                  <p className="text-xs text-slate-500">
                    {signed
                      ? `Signed ${new Date(signed.signedAt).toLocaleString("en-AU")}${
                          signed.byStaff ? " · recorded by staff" : ""
                        }`
                      : w.trade || "—"}
                  </p>
                </div>
                {signed ? (
                  <span className="text-sm font-semibold text-green-600">✓</span>
                ) : (
                  <Button
                    size="sm"
                    variant="success"
                    disabled={rollBusy}
                    onClick={() => signAttendee(w)}
                  >
                    Sign
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {roll.length} of {crewFor(rollFor).length} on this site have signed.
        </p>
        {/* Lifecycle: completes itself when the whole roster has signed after the
            meeting time; otherwise the person running it closes it out here,
            saying why anyone on the roster is missing (absences are real). */}
        {rollFor && rollFor.status !== "Completed" && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            {!meetingHeld(rollFor.date) ? (
              <p className="text-xs text-slate-500">Scheduled for {rollFor.date} — it can be completed once it has been held.</p>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Complete this meeting</p>
                <p className="mt-1 text-xs text-slate-500">
                  {roll.length >= crewFor(rollFor).length && roll.length > 0
                    ? "Everyone on the roster has signed — it will complete automatically; or complete it now."
                    : `${roll.length} of ${crewFor(rollFor).length} signed. Note why the others were not at the talk (sick, other site, not yet started) before completing.`}
                </p>
                <textarea
                  rows={2}
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="e.g. Bradley and Ryan on leave; Marco starts next week"
                  className="tb-input mt-2"
                />
                <Button size="sm" className="mt-2" disabled={rollBusy || roll.length === 0} onClick={onComplete}>
                  {rollBusy ? "Saving…" : "Mark meeting complete"}
                </Button>
              </>
            )}
          </div>
        )}
        {rollFor?.status === "Completed" && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
            Completed {rollFor.completedAt ? new Date(rollFor.completedAt).toLocaleString("en-AU") : ""}{rollFor.completedByName ? ` · ${rollFor.completedByName}` : ""}{rollFor.completionNote && rollFor.completionNote !== "auto" && rollFor.completionNote !== "backfill" ? ` — ${rollFor.completionNote}` : ""}
          </p>
        )}
      </Modal>

      {/* Create meeting modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Meeting"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onCreate)}>Create</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onCreate)}>
          <Field label="Title">
            <input className="tb-input" {...register("title", { required: true })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Project">
              <select className="tb-input" {...register("project", { required: true })}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date / time">
              <input type="datetime-local" className="tb-input" {...register("date", { required: true })} />
            </Field>
          </div>
          <Field label="Topic / agenda">
            <textarea rows={2} className="tb-input" {...register("topic", { required: true })} />
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Invited ({attendees.length}) — people on this site
            </p>
            <p className="mb-1.5 text-[11px] text-slate-400">
              Expected attendance is the site roster on the day; this list is just who you want there.
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 scrollbar-thin">
              {workers.filter((w) => !createProject || w.project === createProject).length === 0 && (
                <p className="px-2 py-1 text-xs text-slate-400">No stakeholders on this site yet — add them under Stakeholder Compliance.</p>
              )}
              {workers.filter((w) => !createProject || w.project === createProject).map((w) => (
                <label
                  key={w.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={attendees.includes(w.id)}
                    onChange={() => toggleAttendee(w.id)}
                  />
                  <span className="text-slate-700">{w.name}</span>
                  <span className="text-xs text-slate-400">{w.trade}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <style>{`
        .tb-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .tb-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
