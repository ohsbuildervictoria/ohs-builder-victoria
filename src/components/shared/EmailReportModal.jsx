import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/Notification";
import { emailReport } from "../../lib/api";

// ============================================================================
// "Send this report" dialog, shared by the Reports page and Incidents.
//
// The caller passes a `build()` that returns { filename, base64 } — i.e. the
// SAME pdf.js exporter that powers the Download button, run in "attach" mode.
// The emailed document and the downloaded one are therefore byte-identical by
// construction, which is the whole point: a builder should never wonder which
// version their client received.
// ============================================================================

// Closed = unmounted, so every open starts from a clean form (no stale
// recipient from the last report carried into the next one).
export default function EmailReportModal(props) {
  if (!props.open) return null;
  return <EmailReportForm {...props} />;
}

function EmailReportForm({ onClose, kind, title, summary, defaultTo = "", build }) {
  const toast = useToast();
  const [to, setTo] = useState(defaultTo);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const recipients = to
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!recipients.length) return toast("Add at least one email address", "warning");
    setSending(true);
    try {
      const { filename, base64 } = await build();
      const r = await emailReport({ kind, to: recipients, note, filename, base64, summary });
      toast(`${title} emailed to ${r.to.join(", ")}`);
      onClose();
    } catch (err) {
      toast(err.message || "Could not send the report", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Email ${title}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? "Sending…" : "Send report"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Sends <span className="font-medium">{title}</span> as a PDF attachment —
          the same document the Download button produces.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Send to
          </span>
          <input
            type="text"
            autoFocus
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="client@example.com, insurer@example.com"
            className="er-input"
          />
          <span className="mt-1 block text-xs text-slate-400">
            Up to 5 addresses, separated by commas.
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Note (optional)
          </span>
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Monthly pack for the June claim — the two open actions close this week."
            className="er-input"
          />
        </label>
        <p className="text-xs text-slate-400">
          The email is sent from OHS Builder Victoria on your behalf and shows
          your name and company. Replies come back to your organisation.
        </p>
      </div>
      <style>{`
        .er-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .er-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
      `}</style>
    </Modal>
  );
}
