import { useState } from "react";
import Card, { CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ProgressBar from "../../components/ui/ProgressBar";
import StatCard from "../../components/ui/StatCard";
import ComplianceDonut from "../../components/charts/ComplianceDonut";
import { useSWMS } from "../../hooks/useSWMS";
import { useToast } from "../../components/ui/Notification";
import { swmsLibrary } from "../../data/swmsLibrary";

export default function SWMS() {
  const { templates, signSWMS, lockTemplate, signOffStats } = useSWMS();
  const toast = useToast();
  const [librarySearch, setLibrarySearch] = useState("");
  const [expandedRef, setExpandedRef] = useState(null);

  const filteredLibrary = swmsLibrary.filter((s) =>
    s.trade.toLowerCase().includes(librarySearch.toLowerCase()) ||
    s.id.toLowerCase().includes(librarySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SWMS Management</h1>
        <p className="text-sm text-slate-500">
          Standardised, version-controlled Safe Work Method Statements — one
          master template per trade. Stakeholders sign the assigned version; they
          cannot edit it.
        </p>
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
                  onClick={() => toast(`Viewing ${t.trade} SWMS ${t.version}`)}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toast(`Editing ${t.trade} SWMS template`)}
                >
                  Edit
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
                  onClick={() => toast("PDF export is coming soon", "warning")}
                >
                  Download PDF (soon)
                </Button>
                {t.signed < t.total && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={async () => {
                      try {
                        await signSWMS(t.id);
                        toast(`Signature recorded for ${t.trade}`);
                      } catch (err) {
                        toast(err.message || "Could not record signature", "error");
                      }
                    }}
                  >
                    + Sign
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
              {swmsLibrary.length} WorkSafe Victoria trade templates — David Caruana's complete library
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
                    onClick={() => toast("PDF export is coming soon", "warning")}
                  >
                    Download PDF (soon)
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
