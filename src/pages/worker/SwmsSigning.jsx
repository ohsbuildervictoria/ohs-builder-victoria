import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useSWMS } from "../../hooks/useSWMS";
import { useAppContext } from "../../context/AppContext";
import { fetchWorkerSignatures } from "../../lib/api";
import Badge from "../../components/ui/Badge";
import { findSwms } from "../../data/swmsLibrary";

// ============================================================================
// My SWMS — every Safe Work Method Statement that applies to this person on
// this site: one per work type they are assigned (a SWMS that covers two of
// their work types is listed and signed once). Each is signed separately,
// against its current version; the SWMS tick on the site appears only when
// all of them are signed (server rule, 024).
// ============================================================================

export default function SwmsSigning() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers } = useWorkers();
  const worker = getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));
  const { templates, signSWMS } = useSWMS();
  const { refresh } = useAppContext();

  const trades = worker?.trades?.length ? worker.trades : [worker?.trade].filter(Boolean);
  // A SWMS is trade-specific by law. Only the templates for THIS person's work
  // types are offered — never a fallback to whatever is first in the list.
  const applicable = useMemo(
    () => templates.filter((t) => trades.includes(t.trade)),
    [templates, trades]
  );

  const [signatures, setSignatures] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const reloadSignatures = async () => {
    if (!worker?.id) return;
    try { setSignatures(await fetchWorkerSignatures(worker.id)); } catch { setSignatures([]); }
  };
  useEffect(() => {
    if (!worker?.id) return undefined;
    let live = true;
    fetchWorkerSignatures(worker.id)
      .then((s) => { if (live) setSignatures(s); })
      .catch(() => { if (live) setSignatures([]); });
    return () => { live = false; };
  }, [worker?.id]);

  const isSigned = (t) => !!signatures?.some((s) => s.templateId === t.id && s.version === (t.version || ""));
  const unsigned = applicable.filter((t) => !isSigned(t));
  const template = applicable.find((t) => t.id === selectedId) || unsigned[0] || applicable[0] || null;

  const tradeSwms = findSwms(template?.trade);
  const tradeHazards = tradeSwms?.hazards || [];
  const tradePpe = tradeSwms?.ppe || [];
  const tradeEquipment = tradeSwms?.equipment || [];

  // The reading gate (scrolled to the end + agreed) is keyed by the document
  // being shown, so switching documents starts the gate again without an
  // effect.
  const [gate, setGate] = useState({ id: null, scrolled: false, agreed: false });
  const scrolledToEnd = gate.id === template?.id && gate.scrolled;
  const agreed = gate.id === template?.id && gate.agreed;
  const setScrolledToEnd = (v) => setGate((g) => ({ id: template?.id, scrolled: v, agreed: g.id === template?.id ? g.agreed : false }));
  const setAgreed = (v) => setGate((g) => ({ id: template?.id, scrolled: g.id === template?.id ? g.scrolled : false, agreed: v }));
  const [typedName, setTypedName] = useState("");
  const [justSigned, setJustSigned] = useState(null); // template that was just signed
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState(null);
  const scrollRef = useRef(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setScrolledToEnd(true);
  };

  const alreadySigned = template ? isSigned(template) : false;
  const canSign = !!template?.id && !alreadySigned && scrolledToEnd && agreed && typedName.trim().length > 1;
  const today = new Date().toLocaleDateString("en-AU");

  if (!applicable.length) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-amber-50 p-6 text-center">
          <p className="text-3xl">📋</p>
          <h1 className="mt-2 text-lg font-bold text-slate-800">No SWMS for your work yet</h1>
          <p className="mt-1 text-sm text-slate-600">
            {trades.length
              ? `Your builder hasn't published a Safe Work Method Statement for ${trades.join(" / ")} work.`
              : "Your work type isn't recorded against your profile yet, so we can't show you the right SWMS."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ask your builder to add it before you start high-risk work. Signing another trade&apos;s SWMS would not cover you.
          </p>
        </div>
      </div>
    );
  }

  const signedCount = applicable.length - unsigned.length;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">My SWMS</h1>
      <p className="text-sm text-slate-500">
        {applicable.length === 1
          ? "One Safe Work Method Statement applies to your work on this site."
          : `${applicable.length} Safe Work Method Statements apply to your work on this site — sign each one.`}
        {signatures && <> <span className="font-medium text-slate-700">{signedCount} of {applicable.length} signed.</span></>}
      </p>

      {/* Required list — grouped by work type; a SWMS shared by two work types appears once. */}
      <div className="mt-3 rounded-xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">My required SWMS</p>
        <ul className="divide-y divide-slate-100">
          {applicable.map((t) => {
            const done = isSigned(t);
            const active = template?.id === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedId(t.id); setJustSigned(null); setSignError(null); }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${active ? "bg-blue-50" : ""}`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-green-500 text-white" : "border-2 border-slate-300 text-transparent"}`} aria-hidden>✓</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{t.trade}</span>
                    <span className="block text-xs text-slate-500">{t.ref} · {t.version}{done ? " · signed" : t.locked ? " · locked by builder" : " · awaiting your signature"}</span>
                  </span>
                  <span className="text-xs font-medium text-blue-700">{active ? "Viewing" : done ? "View" : "Sign →"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {justSigned && (
        <div className="mt-3 rounded-xl bg-green-100 p-4 text-center">
          <p className="text-3xl">✅</p>
          <h2 className="mt-1 text-lg font-bold text-slate-800">SWMS Signed</h2>
          <p className="mt-1 text-sm text-slate-600">{justSigned.trade} SWMS {justSigned.version} signed by {typedName} on {today}.</p>
          {unsigned.length > 0 ? (
            <button type="button" onClick={() => { setSelectedId(unsigned[0].id); setJustSigned(null); }} className="mt-3 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white">
              Next SWMS: {unsigned[0].trade} →
            </button>
          ) : (
            <p className="mt-2 text-sm font-semibold text-green-800">All your SWMS are signed — head back to My Site.</p>
          )}
        </div>
      )}

      {template && !justSigned && (
        <>
          <div className="mt-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{template.trade} SWMS</h2>
              <p className="text-sm text-slate-500">{template.ref} · {template.version}</p>
            </div>
            <Badge status={alreadySigned ? "Verified" : "Pending"}>{alreadySigned ? "Signed" : "Read-only"}</Badge>
          </div>

          <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
            This SWMS is standardised and version-controlled. You cannot edit it — you may only read and sign it.
          </p>

          {(tradePpe.length > 0 || tradeEquipment.length > 0) && (
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              {tradePpe.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Required PPE</p>
                  <p className="mt-1 text-xs text-slate-700">{tradePpe.join(" · ")}</p>
                </div>
              )}
              {tradeEquipment.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Plant &amp; Equipment</p>
                  <p className="mt-1 text-xs text-slate-700">{tradeEquipment.join(" · ")}</p>
                </div>
              )}
            </div>
          )}

          <div ref={scrollRef} onScroll={onScroll} className="mt-3 h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 scrollbar-thin">
            <p className="text-sm font-semibold text-slate-700">Hazards &amp; Risk Controls — {tradeSwms ? tradeSwms.trade : template.trade}</p>
            {tradeHazards.length > 0 ? tradeHazards.map((h, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{h.task}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800">{h.hazard}</p>
                  </div>
                  <Badge status={h.risk}>{h.risk}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-slate-600"><span className="font-medium">Controls:</span> {h.controls}</p>
              </div>
            )) : (
              <p className="text-sm italic text-slate-400">No trade-specific hazards loaded.</p>
            )}
            <p className="pt-2 text-center text-xs text-slate-400">— End of SWMS — you may now sign below —</p>
          </div>

          {alreadySigned ? (
            <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">You signed this version on the register. Nothing more to do for this SWMS.</p>
          ) : (
            <>
              {!scrolledToEnd && <p className="mt-2 text-center text-xs text-amber-600">⬇ Scroll to the bottom to enable signing</p>}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={agreed} disabled={!scrolledToEnd} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                  I have read and understood this SWMS
                </label>
                <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">Type your full name to sign</label>
                <input
                  value={typedName}
                  disabled={!scrolledToEnd}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={worker?.name}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none disabled:bg-slate-50"
                />
                <p className="mt-1 text-xs text-slate-400">Date: {today}</p>
                {signError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{signError}</p>}
                <button
                  disabled={!canSign || signing}
                  onClick={async () => {
                    // A signature is either recorded in the database or it isn't —
                    // never show the green screen unless the server took it.
                    setSignError(null);
                    setSigning(true);
                    try {
                      await signSWMS(template.id, { signedName: typedName.trim(), workerId: worker?.id });
                      await reloadSignatures();
                      await refresh(); // the SWMS tick on My Site follows the register
                      setJustSigned(template);
                    } catch (err) {
                      const message = err?.message || "";
                      if (/already signed/i.test(message)) {
                        await reloadSignatures();
                        setJustSigned(template);
                      } else {
                        setSignError(`${message || "Your signature could not be recorded."} Nothing has been signed — try again, and tell your builder if it keeps happening.`);
                      }
                    } finally {
                      setSigning(false);
                    }
                  }}
                  className="mt-4 w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {signing ? "Recording your signature…" : `Sign ${template.trade} SWMS`}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
