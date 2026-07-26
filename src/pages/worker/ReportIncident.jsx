import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useIncidents } from "../../hooks/useIncidents";
import { usePhotos } from "../../hooks/usePhotos";
import { PhotoPicker } from "../../components/shared/RecordPhotos";
import {
  incidentTypes,
  incidentSeverities,
  isNotifiableIncident,
} from "../../data/constants";

// ============================================================================
// Reporting a hazard, near miss or injury — from the tradie's own phone.
//
// The induction tells every stakeholder to "report every hazard, incident and
// near miss straight away, no matter how small", and until now there was no
// way for them to do it: the incident form lived only in the builder's
// workspace. Every record in the register got there because a supervisor keyed
// it in afterwards, which is exactly the delay that loses the detail.
//
// Written for the conditions it will actually be used in — one hand, gloves
// on, at the point the thing happened. Big targets, plain words, nothing
// required that someone standing in the mud wouldn't know. The severity scale
// is the same one the register uses, with its objective test shown next to
// each option, because a tradie asked to grade "Major" with no yardstick will
// guess, and a guess in that column is worse than no answer.
//
// A dead spot doesn't lose the report: useIncidents queues it on the device
// and replays it when the connection returns, and this screen says which of
// the two happened rather than showing a tick either way.
// ============================================================================

const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

export default function ReportIncident() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers } = useWorkers();
  const { incidents, addIncident } = useIncidents();
  const { addPhotos } = usePhotos();
  const worker = getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));

  const [type, setType] = useState(null);
  const [severity, setSeverity] = useState(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [involved, setInvolved] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { queued, notifiable }

  // Only the reports this person made or was involved in — the database
  // decides that, not this list.
  const mine = incidents.filter((i) => i.reportedBy === worker?.name || i.involved === worker?.name);

  const notifiable = isNotifiableIncident(type, severity);
  const canSubmit = !!type && !!severity && description.trim().length > 3 && !busy;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await addIncident({
        type,
        severity,
        description: description.trim(),
        projectId: worker?.project ?? null,
        reportedBy: worker?.name || user?.name || "",
        date: localToday(),
        status: "Open",
        location: location.trim(),
        involved: involved.trim(),
        immediateAction: immediateAction.trim(),
      });
      if (!result?.queued && result?.id && photoFiles.length) {
        await addPhotos("incident", result.id, photoFiles).catch(() => {});
      }
      setDone({ queued: !!result?.queued, notifiable });
    } catch (err) {
      setError(
        err?.message ||
          "Your report couldn't be sent. Nothing has been recorded — try again, and tell your supervisor now if anyone is hurt."
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-green-100 p-6 text-center">
          <p className="text-4xl">{done.queued ? "📡" : "✅"}</p>
          <h1 className="mt-2 text-xl font-bold text-slate-800">
            {done.queued ? "Saved on your phone" : "Report sent"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {done.queued
              ? "You're out of range. This report is saved and will send itself as soon as you have signal — you don't need to do anything."
              : "Your builder can see it now. Thank you for reporting it."}
          </p>
        </div>

        {done.notifiable && (
          <div className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Tell your supervisor right now.</p>
            <p className="mt-1">
              What you&apos;ve described has to be notified to WorkSafe Victoria
              immediately, and the area must be left as it is until an inspector
              says otherwise. Don&apos;t wait for someone to read the report.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <button
            onClick={() => {
              setDone(null);
              setType(null);
              setSeverity(null);
              setDescription("");
              setLocation("");
              setInvolved("");
              setImmediateAction("");
              setPhotoFiles([]);
            }}
            className="w-full rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-700"
          >
            Report something else
          </button>
          <Link
            to="/worker/home"
            className="block w-full rounded-lg bg-blue-900 py-3 text-center text-sm font-semibold text-white"
          >
            Back to my tasks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">Report something</h1>
      <p className="text-sm text-slate-500">
        Near misses count. If it could have hurt someone, report it.
      </p>

      {/* First thing on the screen, because it is the first thing that matters. */}
      <a
        href="tel:000"
        className="mt-3 flex items-center gap-3 rounded-xl bg-red-600 px-4 py-3 text-white"
      >
        <span className="text-2xl" aria-hidden>
          ☎️
        </span>
        <span className="text-sm font-semibold leading-tight">
          Someone badly hurt? Call 000 first.
          <span className="block font-normal text-red-100">
            Make the area safe, then come back and fill this in.
          </span>
        </span>
      </a>

      {/* What kind of thing */}
      <h2 className="mt-5 text-sm font-semibold text-slate-700">
        What sort of thing happened?
      </h2>
      <div className="mt-2 space-y-2">
        {incidentTypes.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`w-full rounded-xl border p-3 text-left ${
              type === t.value
                ? "border-blue-900 bg-blue-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <span className="block text-sm font-semibold text-slate-800">
              {t.value}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">
              {t.purpose}
            </span>
          </button>
        ))}
      </div>

      {/* How bad. The objective test sits next to each option so nobody has to
          guess what "Major" means. */}
      <h2 className="mt-5 text-sm font-semibold text-slate-700">How bad was it?</h2>
      <div className="mt-2 space-y-2">
        {incidentSeverities.map((s) => (
          <button
            key={s.value}
            onClick={() => setSeverity(s.value)}
            className={`w-full rounded-xl border p-3 text-left ${
              severity === s.value
                ? "border-blue-900 bg-blue-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <span className="block text-sm font-semibold text-slate-800">
              {s.value}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">
              {s.meaning}
            </span>
          </button>
        ))}
      </div>

      {notifiable && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs leading-snug text-red-800">
          <span className="font-semibold">This one is notifiable.</span> Tell your
          supervisor now — WorkSafe has to be called immediately and the area
          left alone. Still finish this report; it becomes the written record.
        </div>
      )}

      {/* The story */}
      <label className="mt-5 block text-sm font-semibold text-slate-700">
        What happened?
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="In your own words. What you saw, what you were doing."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
        />
      </label>

      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Whereabouts on site?
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Level 2, north scaffold"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
        />
      </label>

      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Anyone hurt or involved?
        <input
          value={involved}
          onChange={(e) => setInvolved(e.target.value)}
          placeholder="Their name, or leave blank"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
        />
      </label>
      {worker?.name && involved.trim() !== worker.name && (
        <button
          onClick={() => setInvolved(worker.name)}
          className="mt-1 text-xs font-medium text-blue-700 underline"
        >
          It was me
        </button>
      )}

      <label className="mt-3 block text-sm font-semibold text-slate-700">
        What was done straight away?
        <input
          value={immediateAction}
          onChange={(e) => setImmediateAction(e.target.value)}
          placeholder="e.g. Taped off the area, told the supervisor"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
        />
      </label>

      <div className="mt-4">
        <p className="mb-1 text-sm font-semibold text-slate-700">
          Photos <span className="font-normal text-slate-400">(optional)</span>
        </p>
        <PhotoPicker files={photoFiles} onChange={setPhotoFiles} />
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <button
        disabled={!canSubmit}
        onClick={submit}
        className="mt-5 w-full rounded-lg bg-red-600 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send report"}
      </button>
      {!canSubmit && !busy && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Pick what happened, how bad it was, and tell us about it.
        </p>
      )}

      {mine.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700">
            What you&apos;ve reported
          </h2>
          <div className="mt-2 space-y-2">
            {mine.map((i) => (
              <div
                key={i.id}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {i.type}
                  </span>
                  <span className="text-xs text-slate-400">{i.date}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{i.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Your builder marked this {i.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
