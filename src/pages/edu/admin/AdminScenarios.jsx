import { useEffect, useState } from "react";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Tabs from "../../../components/ui/Tabs";
import { PageHeader, ErrorCard, Loading, RichText } from "../../../components/education/EduBits";
import { fetchLibrary } from "../../../lib/eduApi";
import { eduBrand } from "../../../data/education";

// ============================================================================
// Scenario & unit library — read-only browser of what cohorts can run.
// ============================================================================

export default function AdminScenarios() {
  const [library, setLibrary] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Scenarios");
  const [selected, setSelected] = useState(null);

  const load = () => { setError(null); fetchLibrary().then((l) => { setLibrary(l); setSelected(l.scenarios[0]?.id || null); }).catch((e) => setError(e.message)); };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(load, []);

  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!library) return <Loading label="Loading library…" />;

  const scenario = library.scenarios.find((s) => s.id === selected) || library.scenarios[0];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Dashboard", to: "/education/admin" }, { label: "Scenarios" }]}
        title="Scenarios & units"
        subtitle="The simulated projects your cohorts can run, and the units they evidence. Assign a scenario when you create a cohort."
      />
      <Tabs tabs={["Scenarios", "Units"]} active={tab} onChange={setTab} />

      {tab === "Scenarios" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            {library.scenarios.map((s) => (
              <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full rounded-xl border bg-white p-4 text-left ${scenario?.id === s.id ? "border-blue-900 ring-1 ring-blue-900" : "border-slate-200 hover:bg-slate-50"}`}>
                <p className="font-semibold text-slate-800">{s.title}</p>
                <p className="mt-1 text-xs text-slate-500">{s.stages.length} tasks · {s.institutionId ? "Your institution" : "OHS Builder library"}</p>
              </button>
            ))}
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Want your own scenario?</p>
              <p className="mt-1">Custom scenario authoring isn't self-service yet. Contact OHS Builder Victoria support and we'll set it up with you — the engine already supports institution-owned scenarios, stages, events and mappings.</p>
            </div>
          </div>
          {scenario && (
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader title={scenario.title} subtitle={`${scenario.projectBrief?.address || ""} · Student role: ${scenario.studentRole}`} />
                <CardBody className="space-y-3 pt-2">
                  <p className="text-sm text-slate-700">{scenario.summary}</p>
                  <RichText text={scenario.description} />
                  {scenario.projectBrief?.keyFeatures && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Project brief</p>
                      <ul className="ml-5 mt-1 list-disc text-sm text-slate-600">{scenario.projectBrief.keyFeatures.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Tasks" subtitle="What the student does, where, and what evidence completes each task" />
                <CardBody className="pt-2">
                  <ol className="divide-y divide-slate-100">
                    {scenario.stages.map((s) => (
                      <li key={s.id} className="py-2">
                        <p className="text-sm font-semibold text-slate-800">{s.position}. {s.title}</p>
                        <p className="text-xs text-slate-600">{s.objective}</p>
                        <p className="text-[11px] text-slate-400">Tool: {s.featureLabel} · Evidence: {s.evidenceLabel}</p>
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
              {scenario.supportingDocs?.length > 0 && (
                <Card>
                  <CardHeader title="Supporting documents students receive" />
                  <CardBody className="space-y-2 pt-2">
                    {scenario.supportingDocs.map((d, i) => (
                      <details key={i} className="rounded-lg border border-slate-200 p-2 text-sm"><summary className="cursor-pointer font-semibold text-slate-800">📄 {d.title}</summary><p className="mt-1 text-xs text-slate-600">{d.content}</p></details>
                    ))}
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "Units" && (
        <div className="space-y-4">
          {library.units.map((u) => (
            <Card key={u.id}>
              <CardHeader title={`${u.code} — ${u.title}`} subtitle={`${library.qualifications.find((q) => q.id === u.qualificationId)?.code || ""} ${library.qualifications.find((q) => q.id === u.qualificationId)?.title || ""} · ${u.institutionId ? "Your institution" : "OHS Builder library"}`} />
              <CardBody className="pt-2">
                {u.sourceNote && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{u.sourceNote}</p>}
                {u.criteria.length ? (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {u.criteria.map((c) => <li key={c.id} className="py-1.5"><span className="font-semibold text-slate-800">{c.code}</span> <span className="text-slate-700">{c.text}</span></li>)}
                  </ul>
                ) : <p className="text-sm text-slate-400">No criteria entered for this unit yet.</p>}
                <p className="mt-2 text-xs text-slate-500">The criterion → task mapping is shown per cohort (Cohorts → Unit & mapping) and is controlled by your institution.</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">{eduBrand.disclaimer}</p>
    </div>
  );
}
