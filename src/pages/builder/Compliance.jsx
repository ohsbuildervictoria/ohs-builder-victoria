import { useState } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import ComplianceMatrix from "../../components/shared/ComplianceMatrix";
import { useWorkers } from "../../hooks/useWorkers";
import { useToast } from "../../components/ui/Notification";
import { complianceCategories } from "../../data/constants";
import { downloadCsv } from "../../utils/export";

const TABS = ["Stakeholders", "Subcontractors", "Suppliers", "Developer", "Other"];
const STATUSES = ["Verified", "Pending", "Missing"];

export default function Compliance() {
  const { workers, updateCompliance, getComplianceStats } = useWorkers();
  const toast = useToast();
  const [tab, setTab] = useState("Stakeholders");
  const [cell, setCell] = useState(null); // { worker, category }
  const complianceSummary = getComplianceStats();

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
            variant="secondary"
            onClick={() => toast("Document upload is coming in the next release", "warning")}
          >
            Upload Documents
          </Button>
          <Button onClick={handleExport}>Export CSV</Button>
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
              No {tab.toLowerCase()} records in the demo dataset.
            </p>
          )}
        </CardBody>
      </Card>

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
    </div>
  );
}
