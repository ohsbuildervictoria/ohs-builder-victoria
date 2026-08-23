import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { policyDocUrl } from "../../lib/api";

// ============================================================================
// Site policies — read-only view for stakeholders. The builder publishes the
// OHS Management Plan and site policies from Policies; RLS already lets every
// member of the organisation read the register and open the private PDF via a
// short-lived signed URL. Nothing here can be edited or replaced.
// ============================================================================
export default function WorkerPolicies() {
  const { org, policies } = useAppContext();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [openText, setOpenText] = useState(null);
  const published = (policies || []).filter((p) => (p.status || "Active") !== "Draft");

  const openPdf = async (p) => {
    setError(null);
    setBusyId(p.id);
    try {
      const url = await policyDocUrl(p.filePath);
      if (url) window.open(url, "_blank", "noopener");
      else setError("No file attached to this document yet.");
    } catch (err) {
      setError(err.message || "Could not open the document");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Site policies</p>
      <h1 className="mt-1 text-xl font-bold text-slate-800">{org?.name ? `${org.name}'s site documents` : "Site documents"}</h1>
      <p className="mt-1 text-sm text-slate-500">The OHS Management Plan and policies that apply on this builder&apos;s sites. Read-only — your builder keeps these up to date.</p>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <ul className="mt-4 space-y-2">
        {published.length === 0 && (
          <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No policies have been published for this site yet.</li>
        )}
        {published.map((p) => (
          <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">{p.category}{p.version ? ` · ${p.version}` : ""}{p.updated ? ` · updated ${p.updated}` : ""}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.filePath && (
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => openPdf(p)}
                  className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busyId === p.id ? "Opening…" : `Open PDF${p.fileName ? ` (${p.fileName})` : ""}`}
                </button>
              )}
              {p.content && (
                <button
                  type="button"
                  onClick={() => setOpenText(openText === p.id ? null : p.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {openText === p.id ? "Hide text" : "Read"}
                </button>
              )}
              {!p.filePath && !p.content && <span className="text-xs text-slate-400">No file or text attached yet.</span>}
            </div>
            {openText === p.id && p.content && (
              <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{p.content}</pre>
            )}
          </li>
        ))}
      </ul>
      <Link to="/worker/home" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">← Back to My Site</Link>
    </div>
  );
}
