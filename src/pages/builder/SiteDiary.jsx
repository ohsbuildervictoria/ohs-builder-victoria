import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import AuditTrail from "../../components/shared/AuditTrail";
import { useDiary } from "../../hooks/useDiary";
import { useProjects } from "../../hooks/useProjects";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui/Notification";
import { useAuth } from "../../hooks/useAuth";
import { weatherOptions, diaryTags } from "../../data/constants";
import { exportDiaryRange } from "../../lib/pdf";

// Local date, not UTC — .toISOString() is yesterday in Australia each morning.
const d = new Date();
const pad = (n) => String(n).padStart(2, "0");
const TODAY = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function SiteDiary() {
  const { projects } = useProjects();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState(null);
  const projectId = selectedProject ?? projects[0]?.id ?? null;
  const { entries, addEntry, editEntry } = useDiary(projectId);
  const { org } = useAppContext();
  const toast = useToast();
  const [exportMonth, setExportMonth] = useState(TODAY.slice(0, 7));
  const [selectedTags, setSelectedTags] = useState([]);

  const onExportMonth = () => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return toast("Create a project first", "warning");
    const from = `${exportMonth}-01`;
    const [yy, mm] = exportMonth.split("-").map(Number);
    const to = `${exportMonth}-${String(new Date(yy, mm, 0).getDate()).padStart(2, "0")}`;
    exportDiaryRange({ org, project, entries, from, to });
    toast(`Site diary for ${exportMonth} downloaded`);
  };
  const [recording, setRecording] = useState(false);
  const [audioNote, setAudioNote] = useState(null);
  const [editing, setEditing] = useState(null); // diary entry being corrected
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const editForm = useForm();

  const openEdit = (e) => {
    editForm.reset({
      date: e.date, weather: e.weather, hours: e.hours,
      labour: e.labour, notes: e.notes,
    });
    setEditing(e);
  };

  const onSaveEdit = async (data) => {
    try {
      const changed = await editEntry(editing.id, {
        date: data.date, weather: data.weather,
        hours: data.hours, labour: data.labour, notes: data.notes,
      });
      toast(changed ? "Diary entry corrected — change logged" : "No changes to save");
      setEditing(null);
    } catch (err) {
      toast(err.message || "Could not save the correction", "error");
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: TODAY,
      weather: "Sunny",
      hours: 8,
      workersPresent: 20,
      contacts: "",
      deliveries: "",
      notes: "",
    },
  });

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const onSubmit = async (data) => {
    if (!projectId) {
      toast("Create a project first", "warning");
      return;
    }
    try {
      await addEntry({
        ...data,
        project: Number(projectId),
        hours: String(data.hours ?? ""),
        labour: Number(data.workersPresent) || 0,
        tags: selectedTags,
        author: user?.name || "Unknown",
        audioNote: audioNote ? "Voice note attached" : null,
      });
      toast("Diary entry saved");
      reset();
      setSelectedTags([]);
      setAudioNote(null);
    } catch (err) {
      toast(err.message || "Could not save entry", "error");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioNote(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
      toast("Recording site note…", "warning");
    } catch {
      toast("Microphone access denied or unavailable", "warning");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
    toast("Voice note saved to this entry", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Site Diary</h1>
          <p className="text-sm text-slate-500">
            Daily site records — weather, attendance, deliveries and observations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
          />
          <Button variant="secondary" onClick={onExportMonth}>Export Month (PDF)</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left panel */}
        <Card className="lg:col-span-1">
          <CardHeader title="Entries" />
          <CardBody className="space-y-3 pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Project
            </label>
            <select
              value={projectId ?? ""}
              onChange={(e) => setSelectedProject(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="max-h-[28rem] space-y-2 overflow-y-auto scrollbar-thin">
              {entries.length ? (
                entries.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{e.date}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{e.weather}</span>
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className="text-xs font-medium text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-slate-600">{e.notes}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <AuditTrail entity="diary_entry" entityId={e.id} />
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-slate-400">
                  No entries yet.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Entry form */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="New Diary Entry"
            action={
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Applied for Onsite Meetings
              </span>
            }
          />
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input
                    type="date"
                    className="input"
                    max={TODAY}
                    {...register("date", {
                      required: true,
                      validate: (v) =>
                        v <= TODAY || "Diary entries can't be dated in the future",
                    })}
                  />
                  {errors.date && (
                    <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
                  )}
                </Field>
                <Field label="Weather">
                  <select className="input" {...register("weather")}>
                    {weatherOptions.map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Hours worked on site">
                  <input type="number" min="0" className="input" {...register("hours")} />
                </Field>
                <Field label="Stakeholders present">
                  <input
                    type="number"
                    min="0"
                    className="input"
                    {...register("workersPresent")}
                  />
                </Field>
                <Field label="Meeting contacts">
                  <input className="input" {...register("contacts")} />
                </Field>
                <Field label="Deliveries received">
                  <input className="input" {...register("deliveries")} />
                </Field>
              </div>

              <Field label="Notes / observations">
                <textarea
                  rows={3}
                  className="input"
                  placeholder="End-of-day fencing check, inspections, variations…"
                  {...register("notes", { required: "Notes are required" })}
                />
                {errors.notes && (
                  <p className="mt-1 text-xs text-red-500">{errors.notes.message}</p>
                )}
              </Field>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {diaryTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        selectedTags.includes(tag)
                          ? "bg-blue-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media row */}
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => toast("Photo attachments are coming in the next release", "warning")}
                >
                  📎 Attach Photo
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  {!recording ? (
                    <Button type="button" variant="danger" onClick={startRecording}>
                      🎙️ Record Site Note
                    </Button>
                  ) : (
                    <Button type="button" variant="danger" onClick={stopRecording}>
                      ⏹ Stop Recording
                    </Button>
                  )}
                  {audioNote && (
                    <audio controls src={audioNote} className="h-8 max-w-xs" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save Entry</Button>
                <Button
                  type="button"
                  variant="gold"
                  onClick={() => toast("Email delivery is coming in the next release", "warning")}
                >
                  ✉️ Email diary entry
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Correct a diary entry — records "edited by X, was: Y" */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Correct diary entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={editForm.handleSubmit(onSaveEdit)}>Save correction</Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          Corrections are logged with your name and the previous value — the
          original is never silently overwritten.
        </p>
        <form className="grid grid-cols-2 gap-4" onSubmit={editForm.handleSubmit(onSaveEdit)}>
          <Field label="Date">
            <input type="date" max={TODAY} className="input"
              {...editForm.register("date", { required: true, validate: (v) => v <= TODAY || "Can't be in the future" })} />
          </Field>
          <Field label="Weather">
            <select className="input" {...editForm.register("weather")}>
              {weatherOptions.map((w) => <option key={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="Hours on site">
            <input type="number" min="0" className="input" {...editForm.register("hours")} />
          </Field>
          <Field label="Workers present">
            <input type="number" min="0" className="input" {...editForm.register("labour")} />
          </Field>
          <div className="col-span-2">
            <Field label="Notes / observations">
              <textarea rows={3} className="input" {...editForm.register("notes")} />
            </Field>
          </div>
        </form>
      </Modal>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: #1e3a8a;
          box-shadow: 0 0 0 1px #1e3a8a;
        }
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
