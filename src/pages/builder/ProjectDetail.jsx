import { useState } from "react";
import { useForm } from "react-hook-form";
import { useParams, Link } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import ProgressBar from "../../components/ui/ProgressBar";
import ComplianceMatrix from "../../components/shared/ComplianceMatrix";
import QrPosterModal from "../../components/shared/QrPosterModal";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useProjects } from "../../hooks/useProjects";
import { useWorkers } from "../../hooks/useWorkers";
import { useIncidents } from "../../hooks/useIncidents";
import { useDiary } from "../../hooks/useDiary";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui/Notification";
import { formatAUD, complianceCategories } from "../../data/constants";

const TABS = ["Overview", "Induction", "Stakeholders", "Compliance", "Incidents", "Documents", "Diary"];

export default function ProjectDetail() {
  const { id } = useParams();
  const { getProject } = useProjects();
  const { workers, getComplianceStats } = useWorkers(id);
  const { incidents } = useIncidents(id);
  const { entries } = useDiary(id);
  const { policies, org } = useAppContext();
  const toast = useToast();
  const [tab, setTab] = useState("Overview");
  const [qrOpen, setQrOpen] = useState(false);

  const project = getProject(id);

  if (!project) {
    return (
      <div className="space-y-4">
        <p className="text-slate-500">Project not found.</p>
        <Link to="/builder/projects">
          <Button variant="secondary">← Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const stats = getComplianceStats();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/builder/projects"
            className="text-sm text-blue-700 hover:underline"
          >
            ← Projects
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{project.name}</h1>
          <p className="text-sm text-slate-500">{project.address}</p>
        </div>
        <Badge status={project.status} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Project Information"
              action={
                <Button size="sm" variant="secondary" onClick={() => setQrOpen(true)}>
                  📱 Sign-in QR
                </Button>
              }
            />
            <CardBody className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Contract Type" value={project.contractType} />
              <Info label="Contract Value" value={formatAUD(project.contractValue)} />
              <Info label="Project Manager" value={project.projectManager || "—"} />
              <Info label="Start Date" value={project.startDate || "—"} />
              <Info label="Stakeholders on Site" value={project.workers} />
              <Info label="Active Incidents" value={project.incidents} />
              <div className="col-span-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Build Progress
                </p>
                <ProgressBar value={project.buildPercent} color="bg-blue-900" showLabel />
              </div>
              <div className="col-span-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Compliance
                </p>
                <ProgressBar value={project.compliance} threshold showLabel />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Site Location" />
            <CardBody>
              <div className="flex h-48 flex-col items-center justify-center rounded-lg bg-slate-100 text-center">
                <span className="text-3xl">📍</span>
                <p className="mt-2 px-4 text-sm font-medium text-slate-700">
                  {project.address}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 text-xs font-medium text-blue-700 hover:underline"
                >
                  Open in Google Maps →
                </a>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "Induction" && <InductionSettings project={project} />}

      {tab === "Stakeholders" && (
        <Card>
          <CardHeader title={`Stakeholders on Site (${workers.length})`} />
          <CardBody className="pt-2">
            {workers.length ? (
              <Table>
                <THead columns={["Stakeholder", "Trade", "Employer", "Status"]} />
                <TBody>
                  {workers.map((w) => (
                    <TR key={w.id}>
                      <TD className="font-medium text-slate-800">{w.name}</TD>
                      <TD>{w.trade}</TD>
                      <TD>{w.employer}</TD>
                      <TD>
                        <Badge status={w.status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No stakeholders currently assigned.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "Compliance" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="6-Category Breakdown" />
            <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {complianceCategories.map((c) => (
                <div key={c.key}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{c.label}</span>
                    <span className="font-semibold text-slate-700">
                      {stats[c.key]}%
                    </span>
                  </div>
                  <ProgressBar value={stats[c.key]} threshold />
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              {workers.length ? (
                <ComplianceMatrix workers={workers} />
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">
                  No stakeholders to display.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "Incidents" && (
        <Card>
          <CardHeader title={`Incidents (${incidents.length})`} />
          <CardBody className="pt-2">
            {incidents.length ? (
              <Table>
                <THead columns={["Type", "Description", "Reported By", "Date", "Status"]} />
                <TBody>
                  {incidents.map((i) => (
                    <TR key={i.id}>
                      <TD>
                        <Badge status={i.severity}>{i.type}</Badge>
                      </TD>
                      <TD className="max-w-xs text-slate-700">{i.description}</TD>
                      <TD>{i.reportedBy}</TD>
                      <TD>{i.date}</TD>
                      <TD>
                        <Badge status={i.status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No incidents recorded for this project.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      {tab === "Documents" && (
        <Card>
          <CardHeader title="Project Documents" />
          <CardBody>
            <div
              onClick={() =>
                toast("Document upload is coming in the next release", "warning")
              }
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-12 text-center hover:border-blue-900 hover:bg-slate-50"
            >
              <span className="text-3xl">📤</span>
              <p className="mt-2 text-sm font-medium text-slate-700">
                Drag & drop or click to upload
              </p>
              <p className="text-xs text-slate-400">
                File storage arrives in the next release
              </p>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Organisation Policies (apply to all projects)
              </p>
              <div className="space-y-2">
                {policies.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm"
                  >
                    <span className="text-slate-700">
                      📄 {p.name} · {p.version}
                    </span>
                    <Badge status="Active">{p.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === "Diary" && (
        <Card>
          <CardHeader
            title="Site Diary"
            action={
              <Link to="/builder/diary">
                <Button variant="secondary" size="sm">
                  Open Diary
                </Button>
              </Link>
            }
          />
          <CardBody className="space-y-3 pt-2">
            {entries.length ? (
              entries.map((e) => (
                <div key={e.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{e.date}</p>
                    <span className="text-xs text-slate-500">
                      {e.weather} · {e.labour} stakeholders
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{e.notes}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">
                No diary entries for this project.
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <QrPosterModal
        project={qrOpen ? project : null}
        org={org}
        onClose={() => setQrOpen(false)}
      />
    </div>
  );
}

// Per-project induction content editor — what this project's tradies read
// when they open "Site Induction" on their phone. Anything left blank falls
// back to the standard OHS Builder content, so tradies never see a gap.
function InductionSettings({ project }) {
  const { updateProject } = useProjects();
  const toast = useToast();
  const ind = project.induction || {};
  const { register, handleSubmit, formState } = useForm({
    values: {
      rules: ind.rules || "",
      videoUrl: ind.videoUrl || "",
      musterPoint: ind.musterPoint || "",
      contactName: ind.contactName || "",
      contactPhone: ind.contactPhone || "",
    },
  });

  const onSave = async (data) => {
    try {
      await updateProject(project.id, {
        induction: {
          rules: data.rules.trim(),
          videoUrl: data.videoUrl.trim(),
          musterPoint: data.musterPoint.trim(),
          contactName: data.contactName.trim(),
          contactPhone: data.contactPhone.trim(),
        },
      });
      toast("Induction saved — your tradies see it straight away");
    } catch (err) {
      toast(err.message || "Could not save induction", "error");
    }
  };

  const hasCustom = !!(ind.rules || ind.videoUrl || ind.musterPoint || ind.contactName);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Your Site Induction"
          subtitle="This is exactly what tradies on this project read when they complete their induction."
        />
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit(onSave)}>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your site rules
              </span>
              <textarea
                rows={9}
                className="ind-input"
                placeholder={"e.g.\n• Site hours are 7am–4pm, no weekend work without approval.\n• Park on Smith St only — the crossover must stay clear.\n• All deliveries through the rear gate.\n• Hearing protection mandatory inside the shed."}
                {...register("rules")}
              />
              <span className="mt-1 block text-xs text-slate-400">
                Plain language works best — this is read on a phone at the gate.
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Induction video link (optional)
              </span>
              <input
                type="url"
                className="ind-input"
                placeholder="https://youtube.com/watch?v=…"
                {...register("videoUrl")}
              />
              <span className="mt-1 block text-xs text-slate-400">
                Paste a YouTube or Vimeo link — it plays right inside the tradie's induction.
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Emergency muster point
              </span>
              <input
                className="ind-input"
                placeholder="e.g. Front nature strip, next to the site sign"
                {...register("musterPoint")}
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Site contact
                </span>
                <input className="ind-input" placeholder="e.g. Dave (Site Supervisor)" {...register("contactName")} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contact phone
                </span>
                <input type="tel" className="ind-input" placeholder="04xx xxx xxx" {...register("contactPhone")} />
              </label>
            </div>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Saving…" : "Save induction"}
            </Button>
          </form>
          <style>{`
            .ind-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
            .ind-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
          `}</style>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="How it works" />
        <CardBody className="space-y-3 text-sm text-slate-600">
          <p>
            {hasCustom
              ? "✅ This project is using your own induction content."
              : "This project is currently showing the standard OHS Builder induction."}
          </p>
          <p>
            Whatever you write here appears under your company name in the
            tradie's <span className="font-medium">Site Induction</span>, before
            the standard safety modules (PPE, high-risk work, incident reporting).
          </p>
          <p>
            Anything you leave blank falls back to sensible standard content —
            your tradies never see an empty screen.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}
