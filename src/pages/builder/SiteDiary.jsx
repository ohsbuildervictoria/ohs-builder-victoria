import { useState } from "react";
import { useForm } from "react-hook-form";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useDiary } from "../../hooks/useDiary";
import { useProjects } from "../../hooks/useProjects";
import { useToast } from "../../components/ui/Notification";
import { weatherOptions, diaryTags } from "../../data/mockData";

const TODAY = "2026-06-10";

export default function SiteDiary() {
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 1);
  const { entries, addEntry } = useDiary(projectId);
  const toast = useToast();
  const [selectedTags, setSelectedTags] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: TODAY,
      weather: "Fine",
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

  const onSubmit = (data) => {
    addEntry({
      ...data,
      project: Number(projectId),
      hours: Number(data.hours),
      workersPresent: Number(data.workersPresent),
      tags: selectedTags,
      author: "You",
    });
    toast("Diary entry saved");
    reset();
    setSelectedTags([]);
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
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
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
                  onClick={() => toast("Photo attach simulated")}
                >
                  📎 Attach Photo
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() =>
                      toast("Recording feature applied for — coming soon", "warning")
                    }
                  >
                    🎙️ Record Site Note
                  </Button>
                  <span className="text-xs text-slate-400">
                    Recording feature applied for — coming soon
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save Entry</Button>
                <Button
                  type="button"
                  variant="gold"
                  onClick={() => toast("Diary entry emailed (simulated)")}
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
  