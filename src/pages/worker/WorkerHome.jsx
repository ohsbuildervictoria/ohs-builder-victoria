import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useCompliance } from "../../hooks/useCompliance";
import { useProjects } from "../../hooks/useProjects";
import ProgressBar from "../../components/ui/ProgressBar";

// Resolves the signed-in worker (builders previewing fall back to the first record).
function useCurrentWorker() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers } = useWorkers();
  return getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));
}

export default function WorkerHome() {
  const worker = useCurrentWorker();
  const { getProject } = useProjects();
  const { canAccessSite } = useCompliance(worker?.id);
  const project = getProject(worker?.project);

  // Task checklist derived from the worker's compliance record.
  const tasks = [
    { label: "Complete Site Induction", done: worker?.induction === "Verified", to: "/worker/induction" },
    { label: "Pass Safety Quiz", done: worker?.quiz === "Verified", to: "/worker/quiz" },
    { label: "Sign SWMS", done: worker?.swms === "Verified", to: "/worker/swms" },
    {
      label: "Upload Documents (White Card, Insurance)",
      done: worker?.whiteCard === "Verified" && worker?.insurance === "Verified",
      to: "/worker/registration",
    },
  ];
  const completed = tasks.filter((t) => t.done).length;
  const pct = Math.round((completed / tasks.length) * 100);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">
        G'day, {worker?.name?.split(" ")[0] || "Mate"}! 👋
      </h1>

      {/* Site card */}
      <div className="mt-3 rounded-xl bg-blue-900 p-4 text-white">
        <p className="text-xs uppercase tracking-wider text-blue-200">Assigned Site</p>
        <p className="mt-0.5 text-lg font-semibold">{project?.name}</p>
        <p className="text-sm text-blue-100">{project?.address}</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-blue-100">
          <span>{worker?.trade}</span>
          <span>·</span>
          <span>{worker?.employer}</span>
        </div>
      </div>

      {/* Access banner */}
      <div
        className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
          canAccessSite
            ? "bg-green-100 text-green-800"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {canAccessSite
          ? "Site Access Granted ✅"
          : "Site Access Pending — Complete tasks below"}
      </div>

      {/* Checklist */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Your Tasks</h2>
          <span className="text-xs font-medium text-slate-500">
            {completed}/{tasks.length} complete
          </span>
        </div>
        <ProgressBar value={pct} color="bg-green-500" />

        <div className="mt-3 space-y-2">
          {tasks.map((t) => (
            <Link
              key={t.label}
              to={t.to}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  t.done ? "bg-green-500 text-white" : "border-2 border-slate-300 text-transparent"
                }`}
              >
                ✓
              </span>
              <span
                className={`flex-1 text-sm ${
                  t.done ? "text-slate-400 line-through" : "text-slate-700"
                }`}
              >
                {t.label}
              </span>
              <span className="text-slate-300">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
