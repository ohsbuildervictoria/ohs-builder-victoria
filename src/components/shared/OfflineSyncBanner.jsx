import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../ui/Notification";
import { pendingCount, flushQueue } from "../../lib/offlineQueue";
import {
  insertDiaryEntry,
  insertIncident,
  recordFitnessDeclarationApi,
  updateWorkerComplianceRow,
  updateMyCompliance,
} from "../../lib/api";

// Replays whatever was written in a dead spot (see src/lib/offlineQueue.js).
const FLUSH_HANDLERS = {
  diary_entry: (p) => insertDiaryEntry(p),
  incident: (p) => insertIncident(p),
  fitness_declaration: (p) => recordFitnessDeclarationApi(p),
  compliance_update: (p) =>
    p.mode === "self"
      ? updateMyCompliance(p.category, p.value)
      : updateWorkerComplianceRow(p.workerId, p.category, p.value, p.status),
};

// Mounted in both layouts. Shows how many records are waiting on signal and
// syncs them the moment the connection returns (or on demand).
export default function OfflineSyncBanner() {
  const { refresh } = useAppContext();
  const toast = useToast();
  const [count, setCount] = useState(pendingCount());
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!pendingCount() || syncing) return;
    setSyncing(true);
    try {
      const r = await flushQueue(FLUSH_HANDLERS);
      setCount(r.remaining);
      if (r.done) {
        toast(`Back online — ${r.done} saved record${r.done === 1 ? "" : "s"} sent ✅`);
        refresh();
      }
      if (r.dropped) {
        toast(`${r.dropped} queued record${r.dropped === 1 ? "" : "s"} couldn't be sent and needs re-entering`, "error");
      }
    } finally {
      setSyncing(false);
    }
  }, [refresh, toast, syncing]);

  useEffect(() => {
    const onOnline = () => sync();
    const onQueued = () => setCount(pendingCount());
    window.addEventListener("online", onOnline);
    window.addEventListener("ohsbv-queued", onQueued);
    // Something may be waiting from a previous session.
    const t = navigator.onLine ? setTimeout(sync, 500) : null;
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("ohsbv-queued", onQueued);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!count) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-300 bg-amber-100 px-4 py-2.5 text-center text-sm font-medium text-amber-900 sm:bottom-auto sm:top-0 sm:border-b sm:border-t-0">
      📴 {count} record{count === 1 ? "" : "s"} saved on this device — will send
      when you&apos;re back online.{" "}
      <button
        type="button"
        onClick={sync}
        disabled={syncing}
        className="font-semibold underline"
      >
        {syncing ? "Sending…" : "Try now"}
      </button>
    </div>
  );
}
