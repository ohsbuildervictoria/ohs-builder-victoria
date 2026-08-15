import { useMemo, useState } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useRisks } from "../../hooks/useRisks";
import { useToast } from "../../components/ui/Notification";
import { useAppContext } from "../../context/AppContext";
import { exportRiskRegister } from "../../lib/pdf";
import { findSwms } from "../../data/swmsLibrary";
import {
  RISK_CATEGORIES,
  RISK_STATUSES,
  LIKELIHOOD_LABELS,
  CONSEQUENCE_LABELS,
  riskRating,
  effectiveRating,
  isOpenHighRisk,
  RATING_STYLES,
  guessCategory,
  seedScores,
} from "../../lib/risk";

// ---------------------------------------------------------------------------
// Project Risk Register — the project-level companion to task-level SWMS risk.
// One row per identified hazard: 5x5 assessment, controls, residual 5x5,
// owner, status, review date. Ratings are always derived, never typed.
// ---------------------------------------------------------------------------

function RatingBadge({ likelihood, consequence }) {
  const rating = riskRating(likelihood, consequence);
  if (!rating) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${RATING_STYLES[rating].badge}`}>
      {rating} ({likelihood}×{consequence})
    </span>
  );
}

// The 5x5 grid itself. Rows are consequence 5→1 (severe on top, the way the
// matrix is printed in every OHS manual); columns are likelihood 1→5.
function MatrixPicker({ likelihood, consequence, onPick, compact = false }) {
  const cell = compact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div className="inline-block">
      <div className="flex">
        <div
          className="flex items-center justify-center pr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Consequence
        </div>
        <div>
          {[5, 4, 3, 2, 1].map((c) => (
            <div key={c} className="flex items-center gap-0.5">
              <span className="w-4 text-right text-[10px] text-slate-400">{c}</span>
              {[1, 2, 3, 4, 5].map((l) => {
                const rating = riskRating(l, c);
                const active = l === Number(likelihood) && c === Number(consequence);
                return (
                  <button
                    key={l}
                    type="button"
                    title={`${LIKELIHOOD_LABELS[l - 1]} × ${CONSEQUENCE_LABELS[c - 1]} = ${rating}`}
                    onClick={() => onPick(l, c)}
                    className={`${cell} m-0.5 rounded ${RATING_STYLES[rating].cell} font-bold text-white/90 transition
                      ${active ? "ring-2 ring-blue-900 ring-offset-1 scale-110" : "opacity-70 hover:opacity-100"}`}
                  >
                    {active ? "✓" : ""}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="mt-0.5 flex items-center gap-0.5 pl-4">
            {[1, 2, 3, 4, 5].map((l) => (
              <span key={l} className={`${compact ? "w-8" : "w-10"} text-center text-[10px] text-slate-400`}>{l}</span>
            ))}
          </div>
          <p className="pl-4 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Likelihood
          </p>
        </div>
      </div>
    </div>
  );
}

const emptyForm = {
  hazard: "",
  category: "General",
  likelihood: 3,
  consequence: 3,
  controls: "",
  residualLikelihood: null,
  residualConsequence: null,
  ownerWorkerId: null,
  status: "Open",
  reviewDate: "",
};

export default function RiskRegister({ project, workers }) {
  const { risks, addRisks, updateRisk, removeRisk } = useRisks(project.id);
  const { org } = useAppContext();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | "new" | risk object
  const [form, setForm] = useState(emptyForm);
  const [seedOpen, setSeedOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const crew = useMemo(() => workers || [], [workers]);
  const openHigh = risks.filter(isOpenHighRisk).length;
  const counts = useMemo(() => {
    const c = { Low: 0, Medium: 0, High: 0, Extreme: 0 };
    for (const r of risks) {
      const rating = effectiveRating(r);
      if (rating && r.status !== "Closed") c[rating] += 1;
    }
    return c;
  }, [risks]);

  // SWMS-library seeding: one candidate list per trade already on this project.
  const seedCandidates = useMemo(() => {
    const trades = [...new Set(crew.map((w) => w.trade).filter(Boolean))];
    const seen = new Set();
    const groups = [];
    for (const trade of trades) {
      const entry = findSwms(trade);
      if (!entry || seen.has(entry.id)) continue;
      seen.add(entry.id);
      const already = new Set(
        risks.filter((r) => r.sourceRef === entry.id).map((r) => r.hazard)
      );
      const hazards = entry.hazards
        .map((h) => ({
          hazard: `${h.task} — ${h.hazard}`,
          category: guessCategory(`${h.task} ${h.hazard}`),
          controls: h.controls,
          ...seedScores(h.risk),
          source: "swms_library",
          sourceRef: entry.id,
          status: "Open",
        }))
        .filter((h) => !already.has(h.hazard));
      if (hazards.length) groups.push({ entry, trade, hazards });
    }
    return groups;
  }, [crew, risks]);
  const [selectedRefs, setSelectedRefs] = useState(null); // null = all selected

  const openNew = () => {
    setForm(emptyForm);
    setEditing("new");
  };
  const openEdit = (r) => {
    setForm({
      hazard: r.hazard,
      category: r.category,
      likelihood: r.likelihood,
      consequence: r.consequence,
      controls: r.controls,
      residualLikelihood: r.residualLikelihood,
      residualConsequence: r.residualConsequence,
      ownerWorkerId: r.ownerWorkerId,
      status: r.status,
      reviewDate: r.reviewDate || "",
    });
    setEditing(r);
  };

  const saveForm = async () => {
    if (!form.hazard.trim()) {
      toast("Describe the hazard first.", "warning");
      return;
    }
    setBusy(true);
    try {
      if (editing === "new") {
        await addRisks(project.id, [{ ...form, source: "manual" }]);
        toast("Risk added to the register.");
      } else {
        await updateRisk(editing.id, form);
        toast("Register entry updated.");
      }
      setEditing(null);
    } catch (err) {
      toast(err.message || "Could not save the risk.", "error");
    } finally {
      setBusy(false);
    }
  };

  const runSeed = async () => {
    const groups = seedCandidates.filter(
      (g) => !selectedRefs || selectedRefs.has(g.entry.id)
    );
    const rows = groups.flatMap((g) => g.hazards);
    if (!rows.length) {
      toast("Nothing new to add — those hazards are already on the register.", "warning");
      return;
    }
    setBusy(true);
    try {
      await addRisks(project.id, rows);
      toast(`Added ${rows.length} hazards from the SWMS library.`);
      setSeedOpen(false);
      setSelectedRefs(null);
    } catch (err) {
      toast(err.message || "Could not seed the register.", "error");
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    try {
      await exportRiskRegister({ org, project, risks, workers: crew });
    } catch (err) {
      toast(err.message || "Export failed.", "error");
    }
  };

  const ownerName = (id) => crew.find((w) => w.id === id)?.name || "—";

  return (
    <Card>
      <CardHeader
        title={`Risk Register (${risks.length})`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSeedOpen(true)}>
              📚 Add from SWMS library
            </Button>
            <Button size="sm" variant="secondary" onClick={doExport}>
              Export Risk Register (PDF)
            </Button>
            <Button size="sm" onClick={openNew}>
              + Add Risk
            </Button>
          </div>
        }
      />
      <CardBody className="pt-2">
        {/* Standing of the register at a glance, colour-matched to the matrix. */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          {["Extreme", "High", "Medium", "Low"].map((k) => (
            <span key={k} className={`rounded-full px-2.5 py-1 font-semibold ${RATING_STYLES[k].badge}`}>
              {k}: {counts[k]}
            </span>
          ))}
          <span className="ml-auto text-slate-500">
            {openHigh > 0
              ? `⚠️ ${openHigh} open High/Extreme risk${openHigh === 1 ? "" : "s"}`
              : risks.length
                ? "No open High/Extreme risks"
                : ""}
          </span>
        </div>

        {risks.length ? (
          <Table>
            <THead
              columns={["Hazard / Risk", "Category", "Rating", "Controls", "Residual", "Owner", "Status", "Review", ""]}
            />
            <TBody>
              {risks.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[260px]">
                    <p className="text-slate-800">{r.hazard}</p>
                    {r.source === "swms_library" && (
                      <p className="text-[10px] text-slate-400">from {r.sourceRef}</p>
                    )}
                  </TD>
                  <TD>{r.category}</TD>
                  <TD><RatingBadge likelihood={r.likelihood} consequence={r.consequence} /></TD>
                  <TD className="max-w-[260px] text-slate-600">{r.controls || "—"}</TD>
                  <TD>
                    {r.residualLikelihood && r.residualConsequence ? (
                      <RatingBadge likelihood={r.residualLikelihood} consequence={r.residualConsequence} />
                    ) : (
                      <span className="text-xs text-slate-400">Not assessed</span>
                    )}
                  </TD>
                  <TD>{ownerName(r.ownerWorkerId)}</TD>
                  <TD>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        r.status === "Open"
                          ? "bg-red-50 text-red-700"
                          : r.status === "Controlled"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-green-50 text-green-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </TD>
                  <TD className="text-xs">{r.reviewDate || "—"}</TD>
                  <TD>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          try {
                            await removeRisk(r.id);
                            toast("Register entry removed.");
                          } catch (err) {
                            toast(err.message || "Could not remove it.", "error");
                          }
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ) : (
          <div className="py-10 text-center">
            <p className="text-3xl">🛡️</p>
            <p className="mt-2 text-sm font-medium text-slate-600">No risks on the register yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Start from the SWMS trades already on this site — one click seeds a real register.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" onClick={() => setSeedOpen(true)}>📚 Add from SWMS library</Button>
              <Button size="sm" variant="secondary" onClick={openNew}>+ Add manually</Button>
            </div>
          </div>
        )}
      </CardBody>

      {/* Add / edit one risk */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add Risk" : "Edit Risk"}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveForm} disabled={busy}>
              {busy ? "Saving…" : editing === "new" ? "Add to register" : "Save changes"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hazard / risk description
            <textarea
              value={form.hazard}
              onChange={(e) => setForm((f) => ({ ...f, hazard: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-blue-900 focus:outline-none"
              placeholder="e.g. Unprotected slab edge on level 1 — falls more than 2 m"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Category
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-blue-900 focus:outline-none"
            >
              {RISK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Control owner
            <select
              value={form.ownerWorkerId || ""}
              onChange={(e) => setForm((f) => ({ ...f, ownerWorkerId: e.target.value ? Number(e.target.value) : null }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-blue-900 focus:outline-none"
            >
              <option value="">— Unassigned —</option>
              {crew.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.trade || "—"})</option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Initial risk</p>
            <p className="mb-1 text-[11px] text-slate-400">Before controls — click the matrix</p>
            <MatrixPicker
              likelihood={form.likelihood}
              consequence={form.consequence}
              onPick={(l, c) => setForm((f) => ({ ...f, likelihood: l, consequence: c }))}
            />
            <div className="mt-1"><RatingBadge likelihood={form.likelihood} consequence={form.consequence} /></div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Residual risk</p>
            <p className="mb-1 text-[11px] text-slate-400">After the controls below are in place</p>
            <MatrixPicker
              likelihood={form.residualLikelihood}
              consequence={form.residualConsequence}
              onPick={(l, c) => setForm((f) => ({ ...f, residualLikelihood: l, residualConsequence: c }))}
            />
            <div className="mt-1">
              {form.residualLikelihood ? (
                <RatingBadge likelihood={form.residualLikelihood} consequence={form.residualConsequence} />
              ) : (
                <span className="text-xs text-slate-400">Not assessed yet</span>
              )}
            </div>
          </div>

          <label className="sm:col-span-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current controls
            <textarea
              value={form.controls}
              onChange={(e) => setForm((f) => ({ ...f, controls: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-blue-900 focus:outline-none"
              placeholder="e.g. Edge protection installed and inspected weekly; harness required within 2 m of edge"
            />
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Status
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-blue-900 focus:outline-none"
            >
              {RISK_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Review date
            <input
              type="date"
              value={form.reviewDate || ""}
              onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal focus:border-blue-900 focus:outline-none"
            />
          </label>
        </div>
      </Modal>

      {/* Seed from the SWMS library */}
      <Modal
        open={seedOpen}
        onClose={() => setSeedOpen(false)}
        title="Add from SWMS library"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSeedOpen(false)}>Cancel</Button>
            <Button onClick={runSeed} disabled={busy || !seedCandidates.length}>
              {busy ? "Adding…" : "Add selected hazards"}
            </Button>
          </>
        }
      >
        {seedCandidates.length ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              These SWMS trades are already on <strong>{project.name}</strong>. Tick the ones to
              import — each hazard arrives with its controls and a starting 5×5 assessment you can refine.
            </p>
            {seedCandidates.map(({ entry, trade, hazards }) => {
              const checked = !selectedRefs || selectedRefs.has(entry.id);
              return (
                <label
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedRefs((prev) => {
                        const next = new Set(prev ?? seedCandidates.map((g) => g.entry.id));
                        if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id);
                        return next;
                      });
                    }}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="text-sm font-medium text-slate-800">{entry.trade}</span>
                    <span className="ml-2 text-xs text-slate-400">{entry.id} · matched from “{trade}”</span>
                    <span className="block text-xs text-slate-500">
                      {hazards.length} hazard{hazards.length === 1 ? "" : "s"} not yet on the register
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-sm text-slate-500">
            {crew.length
              ? "Every hazard from this project's SWMS trades is already on the register."
              : "Add stakeholders with trades to this project first — their SWMS hazards can then seed the register."}
          </p>
        )}
      </Modal>
    </Card>
  );
}
