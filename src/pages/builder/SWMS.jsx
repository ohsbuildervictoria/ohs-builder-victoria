import { useState } from "react";
import Card, { CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProgressBar from "../../components/ui/ProgressBar";
import StatCard from "../../components/ui/StatCard";
import ComplianceDonut from "../../components/charts/ComplianceDonut";
import { useSWMS } from "../../hooks/useSWMS";
import { useProjects } from "../../hooks/useProjects";
import { useWorkers } from "../../hooks/useWorkers";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui/Notification";
import Modal from "../../components/ui/Modal";
import { swmsLibrary } from "../../data/swmsLibrary";
import { exportSwmsPack, exportSwmsTemplate, exportSwmsLibrary } from "../../lib/pdf";

export default function SWMS() {
  const { templates, signSWMS, lockTemplate, signOffStats } = useSWMS();
  const { projects } = useProjects();
  const { workers } = useWorkers();
  const { org } = useAppContext();
  const [signing, setSigning] = useState(null); // template being signed off
  const [signWorker, setSignWorker] = useState("");
  const [signName, setSignName] = useState("");
  const toast = useToast();
  const [librarySearch, setLibrarySearch] = useState("");
  const [expandedRef, setExpandedRef] = useState(null);
  const [packProject, setPackProject] = useState("");

  const downloadPack = () => {
    const project = projects.find((p) => p.id === Number(packProject)) || projects[0];
    if (!project) return toast("Create a project first", "warning");
    exportSwmsPack({ org, project, templates, workers, library: swmsLibrary });
    toast(`SWMS pack for ${project.name} downloaded`);
  };

  const filteredLibrary = swmsLibrary.filter((s) =>
    s.trade.toLowerCase().includes(librarySearch.toLowerCase()) ||
    s.id.toLowerCase().includes(librarySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SWMS Management</h1>
          <p className="text-sm text-slate-500">
            Standardised, version-controlled Safe Work Method Statements — one
            master template per trade. Stakeholders sign the assigned version; they
            cannot edit it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={packProject}
            onChange={(e) => setPackProject(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
          >
            <option value="">Project for pack…</option>
            {projects.filter((p) => p.status !== "Archived").map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button onClick={downloadPack}>Download SWMS Pack (PDF)</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard label="Total Templates" value={signOffStats.totalTemplates} tone="blue" />
        <StatCard
          label="Total Signed"
          value={`${signOffStats.totalSigned} / ${signOffStats.totalRequired}`}
          tone="green"
        />
        <Card>
          <CardBody className="flex items-center justify-center">
            <div className="w-40">
              <ComplianceDonut
                percent={signOffStats.percent}
                label="Sign-off"
                height={150}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Trade cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{t.trade}</h3>
                  <p className="text-xs text-slate-500">Version {t.version}</p>
                </div>
                <Badge status={t.status} />
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Signed</span>
                  <span className="font-semibold text-slate-700">
                    {t.signed} / {t.total}
                  </span>
                </div>
                <ProgressBar
                  value={t.total ? (t.signed / t.total) * 100 : 0}
                  color={t.signed >= t.total ? "bg-green-500" : "bg-amber-500"}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await exportSwmsTemplate({ org, template: t, library: swmsLibrary });
                      toast(`${t.trade} SWMS downloaded`);
                    } catch (err) {
                      toast(err.message || "Could not open the SWMS", "error");
                    }
                  }}
                >
                  View / Download
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    lockTemplate(t.id);
                    toast(`${t.trade} SWMS locked for sign-off`);
                  }}
                >
                  Lock for Sign-off
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    exportSwmsTemplate({ org, template: t, library: swmsLibrary });
                    toast(`${t.trade} SWMS downloaded`);
                  }}
                >
                  Download PDF
                </Button>
                {t.signed < t.total && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => setSigning(t)}
                  >
                    + Record sign-off
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {/* SWMS Library — complete A–Z trade library */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">SWMS Library</h2>
            <p className="text-xs text-slate-500">
              {swmsLibrary.length} trade templates aligned to the OHS Regulations 2017 (Vic)
            </p>
          </div>
          <input
            type="text"
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            placeholder="Search trades..."
            className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-900 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredLibrary.map((s) => (
            <Card key={s.id} className="overflow-hidden">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-slate-400">{s.id}</p>
                    <h3 className="text-sm font-semibold text-slate-800 leading-tight">{s.trade}</h3>
                  </div>
                  <span className="ml-2 shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {s.hazards.length} hazards
                  </span>
                </div>

                <div className="mt-2 flex gap-3 text-xs text-slate-500">
                  <span>🦺 {s.ppe.length} PPE items</span>
                  <span>🔧 {s.equipment.length} equipment</span>
                </div>

                {expandedRef === s.id && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {s.ppe.length > 0 && (
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">PPE: </span>{s.ppe.join(", ")}
                      </p>
                    )}
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {s.hazards.map((h, i) => (
                        <div key={i} className="rounded border border-slate-100 bg-slate-50 p-2">
                          <p className="text-xs font-medium text-slate-700">{h.task}</p>
                          <p className="text-xs text-slate-500 mt-0.5">⚠ {h.hazard}</p>
                          <p className="text-xs text-slate-600 mt-0.5">✓ {h.controls}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setExpandedRef(expandedRef === s.id ? null : s.id)}
                  >
                    {expandedRef === s.id ? "Hide" : "View"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      exportSwmsLibrary({ org, entry: s });
                      toast(`${s.trade} SWMS template downloaded`);
                    }}
                  >
                    Download PDF
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* A signature with no signer is not a signature. This used to increment
          a counter with no dialog at all, so the register could not say who
          signed, which version, or when — and a builder could "sign" for a
          tradie with the record unable to tell the difference. Staff-recorded
          sign-offs are stamped as such. */}
      <Modal
        open={!!signing}
        onClose={() => setSigning(null)}
        title={signing ? `Record SWMS sign-off — ${signing.trade}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSigning(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const worker = workers.find((w) => String(w.id) === String(signWorker));
                const name = (signName || worker?.name || "").trim();
                if (!name) return toast("Enter the name of the person who signed", "warning");
                try {
                  await signSWMS(signing.id, { signedName: name, workerId: worker?.id ?? null });
                  toast(`${signing.trade} ${signing.version} signed by ${name}`);
                  setSigning(null);
                  setSignWorker("");
                  setSignName("");
                } catch (err) {
                  toast(err.message || "Could not record signature", "error");
                }
              }}
            >
              Record sign-off
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Recording a sign-off here is for a SWMS signed on paper or in front
            of you. It is stored against <strong>{signing?.version}</strong> and
            marked as recorded by staff — a tradie signing in their own portal
            is recorded as their own signature.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Who signed
            </span>
            <select
              className="swms-input"
              value={signWorker}
              onChange={(e) => {
                setSignWorker(e.target.value);
                const w = workers.find((x) => String(x.id) === e.target.value);
                setSignName(w?.name || "");
              }}
            >
              <option value="">— Select a stakeholder —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}{w.trade ? ` (${w.trade})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Name as signed
            </span>
            <input
              className="swms-input"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              placeholder="Full name on the signed document"
            />
          </label>
        </div>
        <style>{`
          .swms-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
          .swms-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
        `}</style>
      </Modal>
    </div>
  );
}
