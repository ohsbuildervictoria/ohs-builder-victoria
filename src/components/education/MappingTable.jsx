// Criterion → task mapping, always labelled as institution-controlled.
export default function MappingTable({ unit, scenario, mappings, institutionName, compact = false }) {
  const stages = scenario?.stages || [];
  const stageById = Object.fromEntries(stages.map((s) => [s.id, s]));
  const rows = mappings?.rows || [];
  const criteria = unit?.criteria || [];
  const forCriterion = (cid) => rows.filter((m) => m.criterionId === cid).map((m) => stageById[m.stageId]).filter(Boolean);
  const rowsWithEl = criteria.map((c, i) => ({ c, showEl: !!c.element && c.element !== criteria[i - 1]?.element }));
  return (
    <div>
      <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <span className="font-semibold">Indicative mapping, controlled by {institutionName || "the institution"}.</span>{" "}
        {mappings?.source === "institution"
          ? "This institution has set its own mapping."
          : "This is the default shipped with the scenario — review it against the current unit text and your training and assessment strategy. OHS Builder does not accredit, certify or make competency decisions."}
      </p>
      {unit?.sourceNote && !compact && <p className="mb-2 text-xs text-slate-500">{unit.sourceNote}</p>}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Criterion</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Requirement</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Evidenced by task(s)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rowsWithEl.map(({ c, showEl }) => {
              const linked = forCriterion(c.id);
              return (
                <tr key={c.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-800">
                    {showEl && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.element}</p>}
                    {c.code}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {c.text}
                    {!compact && c.evidenceHint && <p className="mt-0.5 text-xs text-slate-400">Evidence: {c.evidenceHint}</p>}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {linked.length ? linked.map((s) => (
                      <span key={s.id} className="mr-1 mb-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">{s.position}. {s.title}</span>
                    )) : <span className="text-xs text-slate-400">Not mapped</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
