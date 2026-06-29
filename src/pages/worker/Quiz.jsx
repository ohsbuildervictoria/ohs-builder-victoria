import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProgressBar from "../../components/ui/ProgressBar";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { quizQuestions } from "../../data/mockData";

export default function Quiz() {
  const { user } = useAuth();
  const { getWorker, updateCompliance } = useWorkers();
  const worker = getWorker(user?.workerId ?? 1);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = quizQuestions[current];
  const passed = finished && correctCount === quizQuestions.length;

  useEffect(() => {
    if (passed && worker?.id) {
      updateCompliance(worker.id, "quiz", "Verified");
    }
  }, [passed, worker?.id, updateCompliance]);

  const submit = () => {
    if (selected == null) return;
    setRevealed(true);
    if (selected === q.answer) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (current + 1 < quizQuestions.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  };

  const retry = () => {
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="p-4">
        <div
          className={`rounded-xl p-6 text-center ${
            passed ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <p className="text-4xl">{passed ? "🎉" : "❌"}</p>
          <h1 className="mt-2 text-xl font-bold text-slate-800">
            {passed ? "Quiz Passed ✅" : "Not Quite"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            You answered {correctCount} of {quizQuestions.length} correctly.
          </p>
          {passed ? (
            <>
              <p className="mt-2 text-xs text-green-700">
                Compliance updated — builder view will show Quiz Verified.
              </p>
              <Link
                to="/worker/swms"
                className="mt-4 inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Proceed to sign your SWMS →
              </Link>
            </>
          ) : (
            <button
              onClick={retry}
              className="mt-4 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Retry Quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">Safety Quiz</h1>
      <p className="text-sm text-slate-500">Answer all questions correctly to pass.</p>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>
            Question {current + 1} of {quizQuestions.length}
          </span>
        </div>
        <ProgressBar value={((current + 1) / quizQuestions.length) * 100} color="bg-blue-900" />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800">{q.q}</p>
        <div className="mt-3 space-y-2">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === q.answer;
            let style = "border-slate-200 bg-white";
            if (revealed) {
              if (isCorrect) style = "border-green-500 bg-green-50";
              else if (isSelected) style = "border-red-500 bg-red-50";
            } else if (isSelected) {
              style = "border-blue-900 bg-blue-50";
            }
            return (
              <button
                key={i}
                disabled={revealed}
                onClick={() => setSelected(i)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm ${style}`}
              >
                <span className="font-semibold text-slate-500">
                  {String.fromCharCode(65 + i)})
                </span>
                <span className="text-slate-700">{opt}</span>
                {revealed && isCorrect && <span className="ml-auto">✅</span>}
                {revealed && isSelected && !isCorrect && (
                  <span className="ml-auto">❌</span>
                )}
              </button>
            );
          })}
        </div>

        {revealed && (
          <p
            className={`mt-3 text-sm font-medium ${
              selected === q.answer ? "text-green-700" : "text-red-700"
            }`}
          >
            {selected === q.answer
              ? "Correct!"
              : "Incorrect — review the highlighted answer."}
          </p>
        )}

        {!revealed ? (
          <button
            disabled={selected == null}
            onClick={submit}
            className="mt-4 w-full rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={next}
            className="mt-4 w-full rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white"
          >
            {current + 1 < quizQuestions.length ? "Next Question →" : "See Results"}
          </button>
        )}
      </div>
    </div>
  );
}
