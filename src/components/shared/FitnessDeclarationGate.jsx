import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAudit } from "../../hooks/useAudit";
import { useToast } from "../ui/Notification";
import { enqueue, isNetworkError } from "../../lib/offlineQueue";
import { localDate } from "../../lib/api";

// ============================================================================
// Daily fitness-for-work gate.
//
// Impaired and unfit workers are a leading cause of serious injury on
// construction sites. Before a tradie can see their Site Induction (and,
// later, other site entry points — this component is deliberately
// self-contained so the QR check-in flow can reuse it), they must actively
// tick two separate declarations: fit for work, and not impaired. Both boxes
// start unticked; the confirm button stays disabled until both are ticked.
//
// Every outcome — confirmed or declined — is written to the immutable
// audit_log through a security-definer RPC that pins the record to the
// caller's own worker. One confirmation per LOCAL calendar day per project;
// a new day, or a different project, asks again.
//
// If they can't honestly confirm, there is no path forward into the gated
// content — only clear, non-punitive guidance and a way back out.
//
// Built for a phone at a site gate at 6am: big tap targets, high contrast,
// plain words, done one-handed in seconds.
//
// Usage: <FitnessDeclarationGate worker={w} project={p} onConfirmed={fn}>
//          ...gated content...
//        </FitnessDeclarationGate>
// ============================================================================

export default function FitnessDeclarationGate({ worker, project, onConfirmed, children }) {
  const { isWorker } = useAuth();
  const { recordFitness, fitnessConfirmedToday } = useAudit();
  const toast = useToast();
  const navigate = useNavigate();

  // Builder staff previewing the stakeholder view see the gate (so they know
  // what their tradies get) but nothing is recorded — a preview must never
  // create a compliance record for a real worker.
  const isPreview = !isWorker;

  const [declined, setDeclined] = useState(false);
  const [previewPassed, setPreviewPassed] = useState(false);
  const [offlinePassed, setOfflinePassed] = useState(false); // queued, will sync
  const [fit, setFit] = useState(false);
  const [unimpaired, setUnimpaired] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirmedToday = worker ? fitnessConfirmedToday(worker) : false;
  const gateOpen = confirmedToday || offlinePassed || (isPreview && previewPassed);

  const bothTicked = fit && unimpaired;

  const containerRef = useRef(null);
  const firstFieldRef = useRef(null);

  // Move focus into the gate when it appears; keep Tab cycling inside it
  // (the app shell's nav is still in the DOM behind this full-screen layer).
  useEffect(() => {
    if (!worker || gateOpen) return;
    firstFieldRef.current?.focus();
  }, [worker, gateOpen, declined]);

  const trapTab = useCallback((e) => {
    if (e.key !== "Tab" || !containerRef.current) return;
    const focusables = containerRef.current.querySelectorAll(
      'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const onConfirm = async () => {
    if (!bothTicked || busy) return;
    if (isPreview) {
      setPreviewPassed(true);
      return;
    }
    setBusy(true);
    try {
      await recordFitness(worker, "confirmed"); // audits update flips confirmedToday
      onConfirmed?.();
    } catch (err) {
      // Dead spot at the gate: the declaration is queued on the device and
      // syncs automatically — the tradie declared, so they may proceed.
      if (isNetworkError(err)) {
        enqueue("fitness_declaration", {
          outcome: "confirmed",
          day: localDate(),
          workerId: null,
        });
        toast("No signal — declaration saved on your phone, will send automatically", "warning");
        setOfflinePassed(true);
        onConfirmed?.();
      } else {
        toast(err.message || "Could not record your declaration — try again", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!isPreview) await recordFitness(worker, "declined");
    } catch (err) {
      // Never trap someone on an error — the safety message still shows; a
      // network failure queues the record so the decline still gets recorded.
      if (isNetworkError(err)) {
        enqueue("fitness_declaration", {
          outcome: "declined",
          day: localDate(),
          workerId: null,
        });
      }
    } finally {
      setBusy(false);
      setDeclined(true);
    }
  };

  // Nothing to gate without a worker record (e.g. builder with no workers yet).
  if (!worker || gateOpen) return children ?? null;

  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const contact = project?.induction || {};
  const contactLine = [contact.contactName, contact.contactPhone].filter(Boolean).join(" — ");

  // ---- Declined: clear, non-punitive stop. No path forward. -----------------
  if (declined) {
    return (
      <div
        ref={containerRef}
        onKeyDown={trapTab}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fitness-stop-title"
        className="fixed inset-0 z-50 flex flex-col justify-center bg-amber-50 p-5"
      >
        <div className="mx-auto w-full max-w-md text-center">
          <span className="text-5xl" aria-hidden="true">🛑</span>
          <h1 id="fitness-stop-title" className="mt-3 text-2xl font-bold text-slate-900">
            Don&apos;t start work today
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-700">
            Thanks for being honest — that&apos;s the right call. Don&apos;t go
            on site. Talk to your supervisor before you do anything else.
          </p>
          {contact.contactPhone && (
            <a
              href={`tel:${contact.contactPhone.replace(/\s+/g, "")}`}
              className="mt-5 block w-full rounded-2xl bg-blue-900 px-4 py-4 text-base font-semibold text-white"
            >
              📞 Call {contactLine}
            </a>
          )}
          {!isPreview && (
            <p className="mt-4 text-sm text-slate-500">
              This has been recorded, so your builder knows you did the right thing.
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate("/worker/home")}
            className="mt-5 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-base font-semibold text-slate-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ---- The declaration itself ------------------------------------------------
  return (
    <div
      ref={containerRef}
      onKeyDown={trapTab}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fitness-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 p-5"
    >
      <div className="mx-auto w-full max-w-md pb-8">
        {isPreview && (
          <p className="mb-4 rounded-xl bg-blue-100 px-4 py-3 text-sm text-blue-900">
            Preview — your tradies complete this each day before their
            induction. Nothing is recorded from a preview.
          </p>
        )}

        <h1 id="fitness-title" className="mt-2 text-2xl font-bold text-slate-900">
          Before you start — are you right to work today?
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {today}
          {project?.name ? ` · ${project.name}` : ""}
        </p>

        <div className="mt-5 space-y-3">
          <label
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-colors ${
              fit ? "border-green-600 bg-green-50" : "border-slate-300 bg-white"
            }`}
          >
            <input
              ref={firstFieldRef}
              type="checkbox"
              checked={fit}
              onChange={(e) => setFit(e.target.checked)}
              aria-label="I am physically fit to do my work today"
              className="mt-0.5 h-7 w-7 shrink-0 accent-green-600"
            />
            <span className="text-base leading-snug text-slate-800">
              I&apos;m physically fit to do my work today — no injury, illness
              or medical condition that could put me or anyone else at risk.
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-colors ${
              unimpaired ? "border-green-600 bg-green-50" : "border-slate-300 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={unimpaired}
              onChange={(e) => setUnimpaired(e.target.checked)}
              aria-label="I am not affected by alcohol, drugs or any other substance"
              className="mt-0.5 h-7 w-7 shrink-0 accent-green-600"
            />
            <span className="text-base leading-snug text-slate-800">
              I&apos;m not affected by alcohol or drugs — including
              prescription or over-the-counter medicine — or anything else that
              could make me unsafe to work.
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!bothTicked || busy}
          className={`mt-5 w-full rounded-2xl px-4 py-4 text-base font-semibold transition-colors ${
            bothTicked && !busy
              ? "bg-green-600 text-white"
              : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
        >
          {busy ? "Saving…" : "Confirm & start ✓"}
        </button>
        {!bothTicked && (
          <p className="mt-2 text-center text-sm text-slate-500">
            Tick both boxes to continue.
          </p>
        )}

        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="mt-4 w-full rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-4 text-base font-semibold text-amber-900"
        >
          I can&apos;t tick one of these today
        </button>
        <p className="mt-2 text-center text-sm text-slate-500">
          Be honest — this protects you and your crew.
        </p>
      </div>
    </div>
  );
}
