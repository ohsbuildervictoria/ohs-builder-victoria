import { useState } from "react";
import { useForm } from "react-hook-form";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useToolbox } from "../../hooks/useToolbox";
import { useProjects } from "../../hooks/useProjects";
import { useWorkers } from "../../hooks/useWorkers";
import { useToast } from "../../components/ui/Notification";
import { toolboxStats, projectName } from "../../data/mockData";

export default function Toolbox() {
  const { meetings, addMeeting, recordAttendance } = useToolbox();
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const { register, handleSubmit, reset } = useForm();

  const toggleAttendee = (id) =>
    setAttendees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const onCreate = (data) => {
    addMeeting({
      title: data.title,
      project: Number(data.project),
      date: data.date,
      topic: data.topic,
      attendance: attendees.length,
      signatures: 0,
    });
    toast("Toolbox meeting created");
    reset();
    setAttendees([]);
    setCreateOpen(false);
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
        <StatCard label="Total Meetings (30d)" value={toolboxStats.meetings30d} tone="blue" />
        <StatCard label="Avg Attendance" value={`${toolboxStats.avgAttendance}%`} tone="green" />
        <StatCard label="Digital Signatures" value={toolboxStats.signatures} tone="blue" />
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
              {meetings.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium text-slate-800">{m.title}</TD>
                  <TD>{projectName(m.project)}</TD>
                  <TD>{m.date}</TD>
                  <TD className="max-w-xs text-slate-600">{m.topic}</TD>
                  <TD>{m.attendance}</TD>
                  <TD>
                    {m.signatures} / {m.attendance}
                  </TD>
                  <TD>
                    <Badge status={m.status} />
                  </TD>
                  <TD>
                    {m.signatures < m.attendance && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          recordAttendance(m.id, 1);
                          toast("Signature collected");
                        }}
                      >
                        + Sign
                      </Button>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

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
              Attendees ({attendees.length})
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 scrollbar-thin">
              {workers.map((w) => (
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
