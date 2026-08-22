import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { enrolmentStatus, submissionStatus, toneClasses, tourSteps } from "../../data/education";

// ============================================================================
// Small shared Education pieces: status pills, form field, empty state,
// section header, the beginner tour, and a markdown-lite renderer for the
// scenario instructions (bold + numbered/bulleted lists only).
// ============================================================================

export function StatusPill({ status, kind = "enrolment", className = "" }) {
  const table = kind === "submission" ? submissionStatus : enrolmentStatus;
  const meta = table[status] || { label: status || "—", tone: "slate" };
  return (
    <span
      title={meta.hint}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[meta.tone]} ${className}`}
    >
      {meta.label}
    </span>
  );
}

export function ResultPill({ result }) {
  if (result === "satisfactory") {
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneClasses.green}`}>✓ Satisfactory</span>;
  }
  if (result === "not_yet_satisfactory") {
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneClasses.red}`}>Not Yet Satisfactory</span>;
  }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses.slate}`}>Not assessed</span>;
}

export function Field({ label, hint, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900";

export function PageHeader({ crumbs = [], title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {crumbs.length > 0 && (
          <p className="mb-1 text-xs text-slate-500">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 text-slate-300">/</span>}
                {c.to ? (
                  <Link to={c.to} className="text-blue-700 hover:underline">{c.label}</Link>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            ))}
          </p>
        )}
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, body, action }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <p className="text-3xl" aria-hidden>{icon}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorCard({ message, onRetry }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-semibold text-red-700">Couldn't load this page</p>
      <p className="mt-1 text-xs text-red-600">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>Try again</Button>
      )}
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return <div className="flex h-48 items-center justify-center text-sm text-slate-400">{label}</div>;
}

// Bold (**x**), numbered and bulleted lines, blank-line paragraphs. Enough for
// the scenario text without pulling in a markdown library.
export function RichText({ text, className = "" }) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ol = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    const ul = /^\s*[-•]\s+(.*)$/.exec(line);
    if (ol) {
      if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; }
      list.items.push(ol[2]);
    } else if (ul) {
      if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; }
      list.items.push(ul[1]);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      blocks.push({ type: "p", text: line });
    }
  }
  flush();
  const inline = (s) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  return (
    <div className={`space-y-2 text-sm leading-relaxed text-slate-600 ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === "p") return <p key={i}>{inline(b.text)}</p>;
        const Tag = b.type;
        return (
          <Tag key={i} className={`ml-5 space-y-1 ${b.type === "ol" ? "list-decimal" : "list-disc"}`}>
            {b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}
          </Tag>
        );
      })}
    </div>
  );
}

// The beginner tour — a small step-through modal. Re-openable at any time.
export function TourModal({ open, onClose, onFinish, primary = "#1e3a8a" }) {
  const [i, setI] = useState(0);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- restart the tour each time it opens
  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const step = tourSteps[i];
  const last = i === tourSteps.length - 1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Beginner tour">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              A quick tour · {i + 1} of {tourSteps.length}
            </p>
            <button onClick={onClose} aria-label="Close tour" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">✕</button>
          </div>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${primary}14` }} aria-hidden>
              {step.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              <p className="mt-3 inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                Where: {step.where}
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-1">
            {tourSteps.map((_, k) => (
              <span key={k} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: k <= i ? primary : "#e2e8f0" }} />
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>← Back</Button>
          {last ? (
            <Button onClick={() => { onFinish?.(); onClose?.(); }}>Got it — let's start</Button>
          ) : (
            <Button onClick={() => setI((v) => Math.min(tourSteps.length - 1, v + 1))}>Next →</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress bar coloured by the institution.
export function BrandedProgress({ percent = 0, primary = "#1e3a8a", label }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className="font-semibold text-slate-700">{pct}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: primary }} />
      </div>
    </div>
  );
}
