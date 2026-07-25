import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../../components/ui/ProgressBar";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useAppContext } from "../../context/AppContext";
import { fetchQuiz, submitQuiz } from "../../lib/api";

// ============================================================================
// Safety quiz.
//
// The questions come from the server and the ANSWERS never leave it. This used
// to be graded in the browser with the correct-answer indices sitting in the
// JS bundle, and the pass was written by an RPC that took the caller's word
// for it — so the "Quiz Verified" on a builder's compliance matrix proved
// nothing. Now the browser collects answers, the database grades them, and
// only the grader can set Verified. Every attempt is kept as evidence.
//
// Answers are marked at the end rather than one at a time: revealing the
// correct option per question handed out the answer key one attempt at a time.
// ============================================================================

export default function Quiz() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers } = useWorkers();
  const { refresh } = useAppContext();
  const worker = getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));

  const [questions, setQuestions] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> option index
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchQuiz()
      .then((qs) => alive && setQuestions(qs))
      .catch((err) => alive && setLoadError(err.message || "Could not load the quiz"));
    return () => {
      alive = false;
    };
  }, []);

  const finish = useCallback(
    async (finalAnswers) => {
      setSubmitting(true);
      try {
        const payload = Object.entries(finalAnswers).map(([id, answer]) => ({
          id: Number(id),
          answer,
        }));
        const graded = await submitQuiz(payload);
        setResult(graded);
        if (graded.passed) refresh();
      } catch (err) {
        setLoadError(err.message || "Could not submit your answers");
      } finally {
        setSubmitting(false);
      }
    },
    [refresh]
  );

  if (loadError) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-amber-50 p-6 text-center">
          <p className="text-3xl">⚠️</p>
          <h1 className="mt-2 text-lg font-bold text-slate-800">
            The quiz isn&apos;t available right now
          </h1>
          <p className="mt-1 text-sm text-slate-600">{loadError}</p>
          <p className="mt-2 text-xs text-slate-500">
            Nothing you&apos;ve done is lost — try again shortly, or tell your
            builder if it keeps happening.
          </p>
        </div>
      </div>
    );
  }

  if (questions === null) {
    return <p className="p-6 text-center text-sm text-slate-400">Loading the quiz…</p>;
  }

  if (questions.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-xl bg-slate-50 p-6 text-center">
          <h1 className="text-lg font-bold text-slate-800">No quiz set up yet</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your builder hasn&apos;t added safety quiz questions. You can get on
            with your induction and documents in the meantime.
          </p>
          <Link to="/worker/home" className="mt-4 inline-block text-sm font-medium text-blue-700">
            ← Back to my tasks
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    const { passed, score, total } = result;
    return (
      <div className="p-4">
        <div className={`rounded-xl p-6 text-center ${passed ? "bg-green-100" : "bg-red-100"}`}>
          <p className="text-4xl">{passed ? "🎉" : "❌"}</p>
          <h1 className="mt-2 text-xl font-bold text-slate-800">
            {passed ? "Quiz Passed ✅" : "Not Quite"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            You answered {score} of {total} correctly.
          </p>
          {passed ? (
            <>
              <p className="mt-2 text-xs text-green-700">
                Recorded against your compliance record.
              </p>
              <Link
                to="/worker/swms"
                className="mt-4 inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Proceed to sign your SWMS →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs text-red-700">
                Every question has to be right. Go back over your induction and
                have another go — attempts are recorded either way.
              </p>
              <button
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                  setSelected(null);
                  setCurrent(0);
                }}
                className="mt-4 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Retry Quiz
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const q = questions[current];
  const isLast = current + 1 >= questions.length;

  const next = () => {
    if (selected == null) return;
    const updated = { ...answers, [q.id]: selected };
    setAnswers(updated);
    if (isLast) {
      finish(updated);
    } else {
      setCurrent((c) => c + 1);
      setSelected(updated[questions[current + 1]?.id] ?? null);
    }
  };

  const back = () => {
    if (current === 0) return;
    const prev = current - 1;
    setCurrent(prev);
    setSelected(answers[questions[prev].id] ?? null);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">Safety Quiz</h1>
      <p className="text-sm text-slate-500">
        Answer every question correctly to pass. Your answers are marked when you finish.
      </p>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>
            Question {current + 1} of {questions.length}
          </span>
        </div>
        <ProgressBar value={((current + 1) / questions.length) * 100} color="bg-blue-900" />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">{q.question}</p>
        <div className="mt-3 space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm ${
                selected === i ? "border-blue-900 bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <span className="font-semibold text-slate-500">
                {String.fromCharCode(65 + i)})
              </span>
              <span className="text-slate-700">{opt}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          {current > 0 && (
            <button
              onClick={back}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"
            >
              ← Back
            </button>
          )}
          <button
            disabled={selected == null || submitting}
            onClick={next}
            className="flex-1 rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Marking…" : isLast ? "Finish & submit" : "Next Question →"}
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        {worker?.name ? `Recorded against ${worker.name}` : "Recorded against your account"}
      </p>
    </div>
  );
}
