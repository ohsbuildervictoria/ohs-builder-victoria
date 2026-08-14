import { useState, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useCompliance } from "../../hooks/useCompliance";
import { useSWMS } from "../../hooks/useSWMS";
import Badge from "../../components/ui/Badge";
import { findSwms } from "../../data/swmsLibrary";

export default function SwmsSigning() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers } = useWorkers();
  const worker = getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));
  const { updateCategory } = useCompliance(worker?.id);
  const { templates, signSWMS } = useSWMS();

  // A SWMS is trade-specific by law. Falling back to whichever document
  // happens to be first in the list would have someone sign a Plumber's SWMS
  // for carpentry work and believe they were covered — worse than signing
  // nothing. If there is no match, say so.
  const template = templates.find((t) => t.trade === worker?.trade) || null;

  // Get real hazards from the SWMS library for this worker's trade
  const tradeSwms = findSwms(worker?.trade);
  const tradeHazards = tradeSwms?.hazards || [];
  const tradePpe = tradeSwms?.ppe || [];
  const tradeEquipment = tradeSwms?.equipment || [];

  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState(null);
  const scrollRef = useRef(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledToEnd(true);
    }
  };

  const canSign =
    !!template?.id && scrolledToEnd && agreed && typedName.trim().length > 1;
  const today = new Date().toLocaleDateString("en-AU");

  if (!template) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-amber-50 p-6 text-center">
          <p className="text-3xl">📋</p>
          <h1 className="mt-2 text-lg font-bold text-slate-800">
            No SWMS for your trade yet
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {worker?.trade
              ? `Your builder hasn't published a Safe Work Method Statement for ${worker.trade} work.`
              : "Your trade isn't recorded against your profile yet, so we can't show you the right SWMS."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ask your builder to add it before you start high-risk work. Signing
            another trade's SWMS would not cover you.
          </p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-green-100 p-6 text-center">
          <p className="text-4xl">✅</p>
          <h1 className="mt-2 text-xl font-bold text-slate-800">SWMS Signed</h1>
          <p className="mt-1 text-sm text-slate-600">
            {template?.trade} SWMS {template?.version} signed by {typedName} on{" "}
            {today}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sign Your SWMS</h1>
          <p className="text-sm text-slate-500">
            {template?.trade} · {template?.version}
          </p>
        </div>
        <Badge status="Pending">Read-only</Badge>
      </div>

      <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
        This SWMS is standardised and version-controlled. You cannot edit it — you
        may only read and sign it.
      </p>

      {/* PPE & Equipment summary */}
      {(tradePpe.length > 0 || tradeEquipment.length > 0) && (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
          {tradePpe.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Required PPE
              </p>
              <p className="mt-1 text-xs text-slate-700">{tradePpe.join(" · ")}</p>
            </div>
          )}
          {tradeEquipment.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Plant &amp; Equipment
              </p>
              <p className="mt-1 text-xs text-slate-700">{tradeEquipment.join(" · ")}</p>
            </div>
          )}
        </div>
      )}

      {/* Scrollable hazard list */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="mt-3 h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 scrollbar-thin"
      >
        <p className="text-sm font-semibold text-slate-700">
          Hazards &amp; Risk Controls — {tradeSwms ? tradeSwms.trade : worker?.trade}
        </p>
        {tradeHazards.length > 0 ? tradeHazards.map((h, idx) => (
          <div key={idx} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {h.task}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{h.hazard}</p>
              </div>
              <Badge status={h.risk}>{h.risk}</Badge>
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              <span className="font-medium">Controls:</span> {h.controls}
            </p>
          </div>
        )) : (
          <p className="text-sm text-slate-400 italic">No trade-specific hazards loaded.</p>
        )}
        <p className="pt-2 text-center text-xs text-slate-400">
          — End of SWMS — you may now sign below —
        </p>
      </div>

      {!scrolledToEnd && (
        <p className="mt-2 text-center text-xs text-amber-600">
          ⬇ Scroll to the bottom to enable signing
        </p>
      )}

      {/* Signature */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={agreed}
            disabled={!scrolledToEnd}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          I have read and understood this SWMS
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Type your full name to sign
        </label>
        <input
          value={typedName}
          disabled={!scrolledToEnd}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={worker?.name}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none disabled:bg-slate-50"
        />
        <p className="mt-1 text-xs text-slate-400">Date: {today}</p>

        {signError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {signError}
          </p>
        )}

        <button
          disabled={!canSign || signing}
          onClick={async () => {
            // A signature is either recorded in the database or it isn't.
            // This used to show the green "SWMS Signed" screen even when the
            // call failed — someone could walk onto site believing they had
            // signed a legal document the server never received.
            setSignError(null);
            setSigning(true);
            try {
              // Always attempt the signature: the counter reaching `total`
              // means the crew is signed up, not that this person is.
              await signSWMS(template.id, {
                signedName: typedName.trim(),
                workerId: worker?.id,
              });
              // Since migration 011 the server flips the SWMS tick as part of
              // sign_swms_v2 and REJECTS a direct status write — so a rejection
              // here must never read as "your signature failed". The signature
              // above is the source of truth; this call only back-fills the
              // tick on databases that predate 011.
              if (worker?.id && worker.swms !== "Verified") {
                await updateCategory("swms", "Verified").catch(() => {});
              }
              setSigned(true);
            } catch (err) {
              const message = err?.message || "";
              if (/already signed/i.test(message)) {
                // Already on the register for this version — that is a pass,
                // not a failure.
                setSigned(true);
              } else {
                setSignError(
                  `${message || "Your signature could not be recorded."} Nothing has been signed — try again, and tell your builder if it keeps happening.`
                );
              }
            } finally {
              setSigning(false);
            }
          }}
          className="mt-4 w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signing ? "Recording your signature…" : "Sign SWMS"}
        </button>
      </div>
    </div>
  );
}
