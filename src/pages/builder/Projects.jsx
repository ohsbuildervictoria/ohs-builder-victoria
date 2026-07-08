import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import Card, { CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import QrPosterModal from "../../components/shared/QrPosterModal";
import { useAppContext } from "../../context/AppContext";
import { useProjects } from "../../hooks/useProjects";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ui/Notification";
import { formatAUD } from "../../data/constants";

const TABS = ["All", "Active", "Planning", "On Hold", "Completed", "Archived"];
const CONTRACT_TYPES = ["Lump Sum", "Cost Plus", "Design & Construct", "Construction Management"];
const STATUSES = ["Planning", "Active", "On Hold", "Completed"];

function complianceTone(value) {
  if (value >= 90) return "text-green-600";
  if (value >= 80) return "text-amber-600";
  return "text-red-600";
}

export default function Projects() {
  const { projects, addProject, updateProject } = useProjects();
  const { org } = useAppContext();
  const { hasRole } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("All");
  const [editing, setEditing] = useState(null); // null=closed, "new"=create, project=edit
  const [qrProject, setQrProject] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const canManage = hasRole("builder_admin");

  const list =
    tab === "All"
      ? projects.filter((p) => p.status !== "Archived")
      : projects.filter((p) => p.status === tab);

  const openNew = () => {
    reset({
      name: "", address: "", contractType: "Lump Sum", contractValue: "",
      projectManager: "", startDate: "", status: "Planning", buildPercent: 0,
    });
    setEditing("new");
  };

  const openEdit = (p) => {
    reset({
      name: p.name,
      address: p.address,
      contractType: p.contractType,
      contractValue: p.contractValue,
      projectManager: p.projectManager,
      startDate: p.startDate || "",
      status: p.status === "Archived" ? "Planning" : p.status,
      buildPercent: p.buildPercent ?? 0,
    });
    setEditing(p);
  };

  const onSave = async (data) => {
    const payload = {
      name: data.name.trim(),
      address: data.address,
      contractType: data.contractType,
      contractValue: Number(data.contractValue) || 0,
      projectManager: data.projectManager,
      startDate: data.startDate || null,
      status: data.status,
      buildPercent: Math.min(100, Math.max(0, Number(data.buildPercent) || 0)),
    };
    try {
      if (editing === "new") {
        await addProject(payload);
        toast("Project created");
      } else {
        await updateProject(editing.id, payload);
        toast("Project updated");
      }
      setEditing(null);
    } catch (err) {
      toast(err.message || "Could not save project", "error");
    }
  };

  const onArchive = async (p) => {
    try {
      await updateProject(p.id, { status: "Archived" });
      toast(`${p.name} archived`);
    } catch (err) {
      toast(err.message || "Could not archive project", "error");
    }
  };

  const onRestore = async (p) => {
    try {
      await updateProject(p.id, { status: "Planning" });
      toast(`${p.name} restored to Planning`);
    } catch (err) {
      toast(err.message || "Could not restore project", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-500">
            {list.length} project{list.length === 1 ? "" : "s"} · Victoria
          </p>
        </div>
        {canManage && <Button onClick={openNew}>+ New Project</Button>}
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} variant="pills" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {list.map((p) => (
          <Card key={p.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{p.name}</h3>
                  <p className="text-sm text-slate-500">{p.address}</p>
                  {(p.projectManager || p.startDate) && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {p.projectManager && <>PM: {p.projectManager}</>}
                      {p.projectManager && p.startDate && " · "}
                      {p.startDate && <>Starts {p.startDate}</>}
                    </p>
                  )}
                </div>
                <Badge status={p.status} />
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Build progress</span>
                  <span className="font-semibold text-slate-700">{p.buildPercent}%</span>
                </div>
                <ProgressBar value={p.buildPercent} color="bg-blue-900" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 py-2">
                  <p className="text-xs text-slate-500">Stakeholders</p>
                  <p className="text-lg font-bold text-slate-800">{p.workers}</p>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <p className="text-xs text-slate-500">Compliance</p>
                  <p className={`text-lg font-bold ${complianceTone(p.compliance)}`}>
                    {p.compliance}%
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <p className="text-xs text-slate-500">Incidents</p>
                  <p
                    className={`text-lg font-bold ${
                      p.incidents > 0 ? "text-red-600" : "text-slate-800"
                    }`}
                  >
                    {p.incidents}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-500">{p.contractType}</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatAUD(p.contractValue)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canManage && p.status !== "Archived" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => onArchive(p)}>
                        Archive
                      </Button>
                    </>
                  )}
                  {canManage && p.status === "Archived" && (
                    <Button size="sm" variant="secondary" onClick={() => onRestore(p)}>
                      Restore
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setQrProject(p)}>
                    Sign-in QR
                  </Button>
                  <Link to={`/builder/projects/${p.id}`}>
                    <Button size="sm">View Details</Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {list.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-14 text-center">
          <p className="text-sm text-slate-500">
            {tab === "All"
              ? "No projects yet."
              : `No projects with status “${tab}”.`}
          </p>
          {canManage && tab === "All" && (
            <Button className="mt-4" onClick={openNew}>
              + Create your first project
            </Button>
          )}
        </div>
      )}

      <QrPosterModal project={qrProject} org={org} onClose={() => setQrProject(null)} />

      {/* Create / edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New Project" : "Edit Project"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSave)}>
              {editing === "new" ? "Create Project" : "Save Changes"}
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(onSave)}>
          <div className="col-span-2">
            <Field label="Project name *">
              <input className="prj-input" {...register("name", { required: "Project name is required" })} />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Site address">
              <input className="prj-input" {...register("address")} />
            </Field>
          </div>
          <Field label="Contract type">
            <select className="prj-input" {...register("contractType")}>
              {CONTRACT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Contract value (AUD)">
            <input
              type="number"
              min="0"
              step="1000"
              className="prj-input"
              {...register("contractValue")}
            />
          </Field>
          <Field label="Project manager">
            <input className="prj-input" {...register("projectManager")} />
          </Field>
          <Field label="Start date">
            <input type="date" className="prj-input" {...register("startDate")} />
          </Field>
          <Field label="Status">
            <select className="prj-input" {...register("status")}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Build progress (%)">
            <input
              type="number"
              min="0"
              max="100"
              className="prj-input"
              {...register("buildPercent")}
            />
          </Field>
        </form>
      </Modal>

      <style>{`
        .prj-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .prj-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
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
