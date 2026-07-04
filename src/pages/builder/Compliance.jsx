import { useState } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import ComplianceMatrix from "../../components/shared/ComplianceMatrix";
import { useWorkers } from "../../hooks/useWorkers";
import { useProjects } from "../../hooks/useProjects";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui/Notification";
import { useForm } from "react-hook-form";
import { complianceCategories } from "../../data/constants";
import { downloadCsv } from "../../utils/export";
import { swmsLibrary } from "../../data/swmsLibrary";

const TABS = ["Stakeholders", "Subcontractors", "Suppliers", "Developer", "Other"];
const STATUSES = ["Verified", "Pending", "Missing"];

// Suggest a simple pilot username from the person's first name.
const suggestHandle = (name, taken) => {
  const base = (name || "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  if (!base) return "";
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}${n}`)) n += 1;
  return `${base}${n}`;
};

export default function Compliance() {
  const { workers, updateCompliance, addWorker, getComplianceStats } = useWorkers();
  const { projects } = useProjects();
  const { refresh } = useAppContext();
  const toast = useToast();
  const [tab, setTab] = useState("Stakeholders");
  const [cell, setCell] = useState(null); // { worker, category }
  const [addOpen, setAddOpen] = useState(false);
  const [newLogin, setNewLogin] = useState(null); // credentials to show after create
  const addForm = useForm();
  const complianceSummary = getComplianceStats();

  const onAddStakeholder = async (data) => {
    try {
      const created = await addWorker({
        name: data.name,
        trade: data.trade,
        employer: data.employer,
        project: data.project ? Number(data.project) : null,
        loginHandle: data.loginHandle,
      });
      setAddOpen(false);
      addForm.reset();
      setNewLogin({ name: created.name, handle: created.loginHandle });
      refresh(); // pick up the SWMS template created/bumped for their trade
    } catch (err) {
      toast(err.message || "Could not add stakeholder", "error");
    }
  };

  // Workers with any Missing item — surfaced as a banner.
  const blocked = workers.filter((w) =>
    complianceCategories.some((c) => w[c.key] === "Missing")
  );

  const handleExport = () => {
    const headers = [
      "Name",
      "Trade",
      ...complianceCategories.map((c) => c.label),
      "Status",
    ];
    const rows = workers.map((w) => [
      w.name,
      w.trade,
      ...complianceCategories.map((c) => w[c.key]),
      w.status,
    ]);
    downloadCsv(`compliance-records-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast("Compliance CSV downloaded", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compliance Records</h1>
          <p className="text-sm text-slate-500">
            Stakeholder × 6-category compliance matrix
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              addForm.reset({
                name: "", trade: "", employer: "", project: "", loginHandle: "",
              });
              setAddOpen(true);
            }}
          >
            + Add Stakeholder
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast("Document upload is coming in the next release", "warning")}
          >
            Upload Documents
          </Button>
          <Button variant="secondary" onClick={handleExport}>Export CSV</Button>
        </div>
      </div>

      {/* Summary bars */}
      <Card>
        <CardHeader title="Compliance Summary" />
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {complianceCategories.map((c) => (
            <div key={c.key}>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{c.label}</span>
                <span className="font-semibold text-slate-700">
                  {complianceSummary[c.key]}%
                </span>
              </div>
              <ProgressBar value={complianceSummary[c.key]} threshold />
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Critical rule banner */}
      {blocked.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">⛔ Site access blocked:</span>{" "}
          {blocked.length} stakeholder{blocked.length === 1 ? "" : "s"} (
          {blocked.map((w) => w.name).join(", ")}) have a Missing compliance item
          and cannot access site until resolved.
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} variant="pills" />

      <Card>
        <CardBody>
          {tab === "Stakeholders" ? (
            <ComplianceMatrix
              workers={workers}
              onCellClick={(worker, category) => setCell({ worker, category })}
            />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">
              No {tab.toLowerCase()} records yet.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Add stakeholder modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Stakeholder"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addForm.handleSubmit(onAddStakeholder)}>
              Add Stakeholder
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={addForm.handleSubmit(onAddStakeholder)}>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Full name *
            </span>
            <input
              className="cmp-input"
              {...addForm.register("name", {
                required: true,
                onChange: (e) => {
                  const taken = workers.map((w) => w.loginHandle).filter(Boolean);
                  addForm.setValue("loginHandle", suggestHandle(e.target.value, taken));
                },
              })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trade *
            </span>
            <input
              className="cmp-input"
              list="trade-options"
              placeholder="e.g. Carpenter – Framer"
              {...addForm.register("trade", { required: true })}
            />
            <datalist id="trade-options">
              {swmsLibrary.map((s) => (
                <option key={s.id} value={s.trade} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Employer
            </span>
            <input className="cmp-input" {...addForm.register("employer")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned project
            </span>
            <select className="cmp-input" {...addForm.register("project")}>
              <option value="">— Unassigned —</option>
              {projects
                .filter((p) => p.status !== "Archived")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sign-in username *
            </span>
            <input
              className="cmp-input"
              autoCapitalize="none"
              {...addForm.register("loginHandle", { required: true })}
            />
            <span className="mt-1 block text-xs text-slate-400">
              They sign in at /stakeholder with this username and the pilot
              password 123.
            </span>
          </label>
        </form>
      </Modal>

      {/* New login details */}
      <Modal
        open={!!newLogin}
        onClose={() => setNewLogin(null)}
        title="Stakeholder added"
        footer={<Button onClick={() => setNewLogin(null)}>Done</Button>}
      >
        {newLogin && (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <span className="font-semibold">{newLogin.name}</span> can now sign
              in to the site portal:
            </p>
            <div className="rounded-lg bg-slate-50 p-4 font-mono text-sm">
              <p>Web address: {window.location.origin}/stakeholder</p>
              <p>Username: {newLogin.handle}</p>
              <p>Password: 123</p>
            </div>
            <p className="text-xs text-slate-500">
              Pilot sign-in only — proper individual accounts arrive after the
              pilot.
            </p>
          </div>
        )}
      </Modal>

      {/* Update compliance modal */}
      <Modal
        open={!!cell}
        onClose={() => setCell(null)}
        title="Update Compliance Item"
        footer={
          <Button variant="secondary" onClick={() => setCell(null)}>
            Close
          </Button>
        }
      >
        {cell && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-800">{cell.worker.name}</p>
              <p className="text-slate-500">
                {complianceCategories.find((c) => c.key === cell.category)?.label}{" "}
                · current:{" "}
                <Badge status={cell.worker[cell.category]} />
              </p>
            </div>
            <p className="text-xs text-slate-500">Set status:</p>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={s === "Verified" ? "success" : s === "Missing" ? "danger" : "secondary"}
                  onClick={async () => {
                    try {
                      await updateCompliance(cell.worker.id, cell.category, s);
                      toast(`${cell.worker.name} · ${cell.category} → ${s}`);
                    } catch (err) {
                      toast(err.message || "Update failed", "error");
                    }
                    setCell(null);
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .cmp-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .cmp-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
      `}</style>
    </div>
  );
}
