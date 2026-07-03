import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useDiary } from "../../hooks/useDiary";
import { useProjects } from "../../hooks/useProjects";
import { useToast } from "../../components/ui/Notification";
import { useAuth } from "../../hooks/useAuth";
import { weatherOptions, diaryTags } from "../../data/constants";

const TODAY = new Date().toISOString().slice(0, 10);

export default function SiteDiary() {
  const { projects } = useProjects();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState(null);
  const projectId = selectedProject ?? projects[0]?.id ?? null;
  const { entries, addEntry } = useDiary(projectId);
  const toast = useToast();
  const [selectedTags, setSelectedTags] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioNote, setAudioNote] = useState(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Site Diary</h1>
        <p className="text-sm text-slate-500">
          Daily site records — weather, attendance, deliveries and observations
        </p>
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
                      <span className="text-xs text-slate-500">{e.weather}</span>
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
                    {...register("date", { required: true })}
                  />
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
