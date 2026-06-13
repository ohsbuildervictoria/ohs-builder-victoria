import { useState } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../../components/ui/ProgressBar";
import { inductionModules } from "../../data/mockData";

export default function Induction() {
  // Modules unlock sequentially; first incomplete module is "in progress".
  const [modules, setModules] = useState(inductionModules);

  const completedCount = modules.filter((m) => m.status === "Complete").length;
  const firstLockedIndex = modules.findIndex((m) => m.status !== "Complete");

  const startModule = (id, index) => {
    // Only the next unlocked module can be started.
    if (index !== firstLockedIndex) return;
    setModules((prev) =>
      prev.map((m, i) => {
        if (m.id === id) return { ...m, status: "Complete" };
        // Unlock the following module.
        if (i === index + 1 && m.status === "Locked")
          return { ...m, status: "Available" };
        return m;
      })
    );
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">Site Induction</h1>
      <p className="text-sm text-slate-500">
        Complete all modules in order to gain site access.
      </p>

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
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {m.id}. {m.title}
                  </p>
                  <p className="text-xs text-slate-500">{m.duration}</p>
                </div>
                {isComplete ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Complete ✅
                  </span>
                ) : isLocked ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    🔒 Locked
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Available
                  </span>
                )}
              </div>
              <button
                disabled={isComplete || isLocked}
                onClick={() => startModule(m.id, index)}
                className={`mt-3 w-full rounded-lg py-2 text-sm font-medium ${
                  isComplete
                    ? "bg-slate-100 text-slate-400"
                    : isLocked
                    ? "cursor-not-allowed bg-slate-100 text-slate-300"
                    : "bg-blue-900 text-white hover:bg-blue-800"
                }`}
              >
                {isComplete ? "Completed ✅" : isLocked ? "Locked" : "Start Module"}
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
  );
}
