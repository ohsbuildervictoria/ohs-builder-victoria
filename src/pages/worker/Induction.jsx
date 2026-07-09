import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useCompliance } from "../../hooks/useCompliance";
import { useProjects } from "../../hooks/useProjects";
import { useAppContext } from "../../context/AppContext";
import ProgressBar from "../../components/ui/ProgressBar";
import FitnessDeclarationGate from "../../components/shared/FitnessDeclarationGate";
import { inductionModules as seedModules, inductionDefaults } from "../../data/constants";

function buildModuleState() {
  const firstOpen = seedModules.findIndex((m) => !m.done);
  return seedModules.map((m, i) => ({
    ...m,
    duration: `${m.mins} min`,
    status: m.done ? "Complete" : i === firstOpen ? "Available" : "Locked",
  }));
}

// Turns a pasted YouTube/Vimeo link into an embeddable player URL (null = not
// embeddable; we fall back to an "open the video" button).
function videoEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function Induction() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers } = useWorkers();
  const { getProject } = useProjects();
  const { org } = useAppContext();
  const worker = getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));
  const project = getProject(worker?.project);
  const { updateCategory } = useCompliance(worker?.id);
  const [modules, setModules] = useState(buildModuleState);

  // The builder's own induction content for this site (blank fields fall back
  // to the standard content — a tradie never gets an empty screen).
  const ind = project?.induction || {};
  const embedUrl = videoEmbedUrl(ind.videoUrl);

  const completedCount = modules.filter((m) => m.status === "Complete").length;
  const firstLockedIndex = modules.findIndex((m) => m.status !== "Complete");

  useEffect(() => {
    if (completedCount === modules.length && worker?.id && worker.induction !== "Verified") {
      updateCategory("induction", "Verified").catch(() => {});
    }
  }, [completedCount, modules.length, worker?.id, worker?.induction, updateCategory]);

  const completeModule = (id, index) => {
    if (index !== firstLockedIndex) return;
    setModules((prev) =>
      prev.map((m, i) => {
        if (m.id === id) return { ...m, status: "Complete" };
        if (i === index + 1 && m.status === "Locked")
          return { ...m, status: "Available" };
        return m;
      })
    );
  };

  // What the open module actually shows: the builder's own content for the
  // site-rules and emergency modules, standard content everywhere else.
  const moduleContent = (m) => {
    if (m.id === 1) {
      return ind.rules?.trim() || inductionDefaults.rules;
    }
    if (m.id === 2) {
      const lines = [];
      if (ind.musterPoint?.trim()) lines.push(`🚩 Muster point: ${ind.musterPoint.trim()}`);
      const contact = [ind.contactName?.trim(), ind.contactPhone?.trim()].filter(Boolean).join(" — ");
      if (contact) lines.push(`📞 Site contact: ${contact}`);
      lines.push(inductionDefaults.emergency);
      return lines.join("\n\n");
    }
    return m.summary;
  };

  return (
    // Nobody sees a single induction module until they've declared, today,
    // that they're fit for work and unimpaired (immutable audit record).
    <FitnessDeclarationGate worker={worker} project={project}>
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">
        {org?.name ? `${org.name} — Site Induction` : "Site Induction"}
      </h1>
      <p className="text-sm text-slate-500">
        {project?.name ? `${project.name} · ` : ""}
        Read every module in order to gain site access.
      </p>

      {/* Builder's induction video */}
      {ind.videoUrl?.trim() && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {embedUrl ? (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                title={`${org?.name || "Site"} induction video`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={ind.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-4"
            >
              <span className="text-2xl">▶️</span>
              <span className="text-sm font-medium text-blue-800 underline">
                Watch the site induction video
              </span>
            </a>
          )}
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            {org?.name ? `${org.name}'s` : "Your builder's"} induction video — watch it before starting the modules.
          </p>
        </div>
      )}

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span className="font-semibold text-slate-700">
            {completedCount} of {modules.length} modules
          </span>
        </div>
        <ProgressBar value={(completedCount / modules.length) * 100} color="bg-green-500" />
      </div>

      <div className="mt-4 space-y-2">
        {modules.map((m, index) => {
          const isComplete = m.status === "Complete";
          const isNext = index === firstLockedIndex;
          const isLocked = !isComplete && !isNext;
          return (
            <div
              key={m.id}
              className={`rounded-xl border bg-white p-4 ${
                isNext ? "border-blue-900" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {m.id}. {m.title}
                  </p>
                  <p className="text-xs text-slate-500">{m.duration}</p>
                  {isNext && (
                    <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
                      {moduleContent(m)}
                    </p>
                  )}
                </div>
                {isComplete ? (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Complete ✅
                  </span>
                ) : isLocked ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    🔒 Locked
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Read now
                  </span>
                )}
              </div>
              <button
                disabled={isComplete || isLocked}
                onClick={() => completeModule(m.id, index)}
                className={`mt-3 w-full rounded-lg py-2 text-sm font-medium ${
                  isComplete
                    ? "bg-slate-100 text-slate-400"
                    : isLocked
                    ? "cursor-not-allowed bg-slate-100 text-slate-300"
                    : "bg-blue-900 text-white hover:bg-blue-800"
                }`}
              >
                {isComplete ? "Completed ✅" : isLocked ? "Locked" : "I've read this — mark complete"}
              </button>
            </div>
          );
        })}
      </div>

      {completedCount === modules.length && (
        <Link
          to="/worker/quiz"
          className="mt-4 block rounded-xl bg-green-500 py-3 text-center text-sm font-semibold text-white"
        >
          Induction complete — Take the Safety Quiz →
        </Link>
      )}
    </div>
    </FitnessDeclarationGate>
  );
}
