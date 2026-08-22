import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useCompliance } from "../../hooks/useCompliance";
import { useDocuments } from "../../hooks/useDocuments";
import { useProjects } from "../../hooks/useProjects";
import { useAppContext } from "../../context/AppContext";
import { categoryStatus, isCompliant } from "../../lib/compliance";
import { fetchMySites, switchMySite } from "../../lib/api";
import ProgressBar from "../../components/ui/ProgressBar";

// ============================================================================
// My Site — the stakeholder's front page. It answers, in order:
//   Who invited me? Which site? What work? Am I ready? What do I do next?
// Actions first, software modules second. The "ready" state is the same
// canAccessSite() rule the builder's matrix uses, so the two never disagree.
// A person with memberships on several sites sees them under My Sites and can
// switch; every site keeps its own induction, SWMS and documents.
// ============================================================================

// Resolves the signed-in worker (builders previewing fall back to the first record).
function useCurrentWorker() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers } = useWorkers();
  return getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));
}

const CTA = {
  induction: "Start Induction →",
  quiz: "Take the Safety Quiz →",
  swms: "Review & sign SWMS →",
  documents: "Upload documents →",
};

export default function WorkerHome() {
  const worker = useCurrentWorker();
  const { user, isWorker } = useAuth();
  const { getProject } = useProjects();
  const { canAccessSite } = useCompliance(worker?.id);
  const { docsFor } = useDocuments();
  const { org } = useAppContext();
  const project = getProject(worker?.project);
  const docs = worker ? docsFor(worker.id) : {};
  const [sites, setSites] = useState(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isWorker) return;
    let live = true;
    fetchMySites().then((s) => live && setSites(s)).catch(() => live && setSites([]));
    return () => { live = false; };
  }, [isWorker, user?.workerId]);

  const here = sites?.find((s) => s.current) || null;
  const trades = worker?.trades?.length ? worker.trades : [worker?.trade].filter(Boolean);

  const docsDone = ["whiteCard", "insurance", "medical"].every((k) =>
    isCompliant(categoryStatus(worker, k, docs[k]))
  );
  const swmsPending = here?.swmsPending ?? null;
  const tasks = [
    {
      key: "induction",
      label: org?.name ? `${org.name}'s site induction` : "Site induction",
      done: worker?.induction === "Verified",
      to: "/worker/induction",
    },
    { key: "quiz", label: "Safety quiz", done: worker?.quiz === "Verified", to: "/worker/quiz" },
    {
      key: "swms",
      label: worker?.swms === "Verified"
        ? "SWMS signed"
        : swmsPending > 0
          ? `${swmsPending} SWMS awaiting your signature`
          : "Review and sign your SWMS",
      done: worker?.swms === "Verified",
      to: "/worker/swms",
    },
    {
      key: "documents",
      label: "Required documents (White Card, insurance, medical)",
      done: docsDone,
      to: "/worker/registration",
    },
  ];
  const completed = tasks.filter((t) => t.done).length;
  const pct = Math.round((completed / tasks.length) * 100);
  const next = tasks.find((t) => !t.done) || null;
  const firstTime = completed === 0;

  const onSwitch = async (workerId) => {
    setSwitching(true);
    try {
      await switchMySite(workerId);
      // Profile, org, project and every record are keyed by the new site —
      // a full reload is the honest way to swap all of them at once.
      window.location.assign("/worker/home");
    } catch {
      setSwitching(false);
    }
  };

  return (
    <div className="p-4">
      {firstTime ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Welcome to OHS Builder Victoria</p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">
            G&apos;day {worker?.name?.split(" ")[0] || "there"} — you&apos;ve been invited to work on
          </h1>
        </>
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">My Site</p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">G&apos;day, {worker?.name?.split(" ")[0] || "Mate"}! 👋</h1>
        </>
      )}

      {/* Site card — who, where, what work. Never render blanks. */}
      <div className="mt-3 rounded-xl bg-blue-900 p-4 text-white">
        {project ? (
          <>
            <p className="text-lg font-semibold leading-tight">{project.name}</p>
            {project.address && <p className="text-sm text-blue-100">{project.address}</p>}
          </>
        ) : (
          <>
            <p className="text-lg font-semibold">Not assigned to a site yet</p>
            <p className="text-sm text-blue-100">Your builder hasn&apos;t put you on a site yet — you can still get your documents done below.</p>
          </>
        )}
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-blue-200">Builder</dt>
          <dd className="font-medium">{org?.name || "—"}</dd>
          <dt className="text-blue-200">Your work</dt>
          <dd className="flex flex-wrap gap-1">
            {trades.length ? trades.map((t) => (
              <span key={t} className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs font-medium">{t}</span>
            )) : <span className="text-blue-100">Not recorded yet — ask your builder</span>}
          </dd>
          {worker?.employer && (<><dt className="text-blue-200">Employer</dt><dd>{worker.employer}</dd></>)}
        </dl>
      </div>

      {/* Readiness — the same rule the builder's compliance matrix applies. */}
      <div
        role="status"
        className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
          canAccessSite ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
        }`}
      >
        {canAccessSite
          ? "Ready for Site ✓ — every requirement is complete"
          : `Action Required — ${tasks.length - completed} of ${tasks.length} steps left before you start on site`}
      </div>

      {/* Next action — one obvious thing to do. */}
      {next && (
        <Link
          to={next.to}
          className="mt-4 flex items-center justify-between rounded-xl bg-yellow-500 px-4 py-3.5 text-blue-950 shadow"
        >
          <span>
            <span className="block text-[11px] font-bold uppercase tracking-wider">Next step</span>
            <span className="block text-base font-bold">{CTA[next.key]}</span>
          </span>
          <span aria-hidden className="text-xl">›</span>
        </Link>
      )}

      {/* Before you start — the checklist. */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Before you start on site</h2>
          <span className="text-xs font-medium text-slate-500">{completed}/{tasks.length} complete</span>
        </div>
        <ProgressBar value={pct} color="bg-green-500" />
        <ol className="mt-3 space-y-2">
          {tasks.map((t, i) => (
            <li key={t.key}>
              <Link
                to={t.to}
                className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${t.done ? "border-slate-200" : next?.key === t.key ? "border-yellow-400" : "border-slate-200"}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    t.done ? "bg-green-500 text-white" : "border-2 border-slate-300 text-slate-400"
                  }`}
                  aria-hidden
                >
                  {t.done ? "✓" : i + 1}
                </span>
                <span className={`flex-1 text-sm ${t.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {t.label}
                </span>
                <span className="text-xs font-medium text-slate-400">{t.done ? "Completed ✓" : "Open →"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {/* Reporting stays one tap away — the thing we want them doing daily. */}
      <Link to="/worker/report" className="mt-4 flex items-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4">
        <span className="text-2xl" aria-hidden>⚠️</span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-red-800">See something? Report it.</span>
          <span className="block text-xs text-red-700">Hazard, near miss or injury — takes a minute, works without signal.</span>
        </span>
        <span className="text-red-300">→</span>
      </Link>

      {/* My Sites — only when this person is on more than one. */}
      {sites && sites.length > 1 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-700">My Sites</h2>
          <p className="text-xs text-slate-500">Each site has its own induction, SWMS and requirements. You&apos;re looking at the one marked current.</p>
          <ul className="mt-2 space-y-2">
            {sites.map((s) => {
              const ready = ["induction", "quiz", "swms", "whiteCard", "insurance", "medical"].every((k) => s[k] === "Verified");
              const pending = s.swmsPending || 0;
              return (
                <li key={s.workerId} className={`rounded-xl border bg-white p-3 ${s.current ? "border-blue-900" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{s.projectName || "Unassigned site"}</p>
                      <p className="text-xs text-slate-500">{s.builderName}{s.trades?.length ? ` · ${s.trades.join(" · ")}` : ""}</p>
                      <p className={`mt-1 text-xs font-semibold ${ready ? "text-green-700" : "text-amber-700"}`}>
                        {ready ? "Ready for Site ✓" : pending > 0 ? `Action Required — ${pending} SWMS` : "Action Required"}
                      </p>
                    </div>
                    {s.current ? (
                      <span className="rounded-full bg-blue-900 px-2 py-0.5 text-[11px] font-bold text-white">Current</span>
                    ) : (
                      <button
                        type="button"
                        disabled={switching}
                        onClick={() => onSwitch(s.workerId)}
                        className="rounded-lg border border-blue-900 px-3 py-1.5 text-xs font-semibold text-blue-900 disabled:opacity-50"
                      >
                        {switching ? "Switching…" : "Open site"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
