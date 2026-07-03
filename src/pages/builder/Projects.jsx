import { useState } from "react";
import { Link } from "react-router-dom";
import Card, { CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import ProgressBar from "../../components/ui/ProgressBar";
import { useProjects } from "../../hooks/useProjects";
import { formatAUD } from "../../data/constants";

const TABS = ["All", "Active", "Planning", "On Hold", "Closed"];

function complianceTone(value) {
  if (value >= 90) return "text-green-600";
  if (value >= 80) return "text-amber-600";
  return "text-red-600";
}

export default function Projects() {
  const { filterByStatus } = useProjects();
  const [tab, setTab] = useState("All");
  const list = filterByStatus(tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-500">
            {list.length} project{list.length === 1 ? "" : "s"} · Victoria
          </p>
        </div>
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

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-500">{p.contractType}</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatAUD(p.contractValue)}
                  </p>
                </div>
                <Link to={`/builder/projects/${p.id}`}>
                  <Button>View Details</Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {list.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-400">
          No projects with status “{tab}”.
        </p>
      )}
    </div>
  );
}
