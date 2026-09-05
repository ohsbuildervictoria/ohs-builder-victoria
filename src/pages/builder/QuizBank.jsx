import { useEffect, useState } from "react";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Notification";
import { STANDARD_QUIZ } from "../../data/quizStandard";
import {
  fetchQuizBank,
  insertQuizQuestions,
  updateQuizQuestion,
  deleteQuizQuestion,
} from "../../lib/api";

// ============================================================================
// Safety Quiz — the builder's question bank.
//
// Until now the bank could only be filled by a migration, so an organisation
// created through signup had no quiz at all: the stakeholder portal said
// "No quiz set up yet" and the Quiz column could never turn Verified. This
// tab is the product-level way to create, edit, order and retire questions.
//
// What it does NOT do: it never marks anyone as having passed. The quiz is
// still sat by the stakeholder in their portal and graded by submit_quiz()
// in the database; every attempt is kept. The answer key lives only here and
// in the database — get_quiz() never sends it to a stakeholder's browser.
// ============================================================================

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const emptyDraft = (position) => ({
  id: null,
  position,
  question: "",
  options: ["", "", "", ""],
  answerIndex: 0,
  active: true,
});

export default function QuizBankTab() {
  const toast = useToast();
  const [questions, setQuestions] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState(null); // question being added/edited
  const [removing, setRemoving] = useState(null); // question pending removal
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setQuestions(await fetchQuizBank());
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message || "Could not load the quiz bank");
      setQuestions([]);
    }
  };

  useEffect(() => {
    let live = true;
    fetchQuizBank()
      .then((qs) => live && setQuestions(qs))
      .catch((err) => {
        if (!live) return;
        setLoadError(err.message || "Could not load the quiz bank");
        setQuestions([]);
      });
    return () => {
      live = false;
    };
  }, []);

  const active = (questions || []).filter((q) => q.active);
  const nextPosition = (questions || []).reduce((m, q) => Math.max(m, q.position), 0) + 1;

  const addStandard = async () => {
    setBusy(true);
    try {
      const rows = STANDARD_QUIZ.map((q, i) => ({ ...q, position: nextPosition + i, active: true }));
      await insertQuizQuestions(rows);
      await load();
      toast(`${rows.length} standard questions added — stakeholders can sit the quiz now`);
    } catch (err) {
      toast(err.message || "Could not add the standard questions", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    const question = draft.question.trim();
    const options = draft.options.map((o) => o.trim());
    if (!question) return toast("Write the question first", "warning");
    if (options.length < MIN_OPTIONS || options.some((o) => !o)) {
      return toast(`Every option needs text (${MIN_OPTIONS}–${MAX_OPTIONS} options)`, "warning");
    }
    if (draft.answerIndex < 0 || draft.answerIndex >= options.length) {
      return toast("Pick which option is correct", "warning");
    }
    setBusy(true);
    try {
      const payload = {
        position: Number(draft.position) || 0,
        question,
        options,
        answerIndex: draft.answerIndex,
        active: draft.active,
      };
      if (draft.id) {
        await updateQuizQuestion(draft.id, payload);
        toast("Question updated");
      } else {
        await insertQuizQuestions([payload]);
        toast("Question added");
      }
      setDraft(null);
      await load();
    } catch (err) {
      toast(err.message || "Could not save the question", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (q) => {
    setBusy(true);
    try {
      await updateQuizQuestion(q.id, { active: !q.active });
      await load();
      toast(q.active ? "Question retired — it is no longer asked" : "Question is asked again");
    } catch (err) {
      toast(err.message || "Could not update the question", "error");
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteQuizQuestion(removing.id);
      setRemoving(null);
      await load();
      toast("Question removed");
    } catch (err) {
      toast(err.message || "Could not remove the question", "error");
    } finally {
      setBusy(false);
    }
  };

  const setOption = (i, value) =>
    setDraft((d) => ({ ...d, options: d.options.map((o, j) => (j === i ? value : o)) }));
  const addOption = () =>
    setDraft((d) => (d.options.length >= MAX_OPTIONS ? d : { ...d, options: [...d.options, ""] }));
  const removeOption = (i) =>
    setDraft((d) => {
      if (d.options.length <= MIN_OPTIONS) return d;
      const options = d.options.filter((_, j) => j !== i);
      let answerIndex = d.answerIndex;
      if (answerIndex === i) answerIndex = 0;
      else if (answerIndex > i) answerIndex -= 1;
      return { ...d, options, answerIndex };
    });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-900">Safety Quiz</p>
        <p className="mt-0.5 text-sm text-blue-800">
          Every stakeholder sits this quiz in their portal after the site induction and
          must answer <span className="font-medium">every active question correctly</span> to
          pass. The database grades the attempt and keeps it as evidence — nobody can
          mark the quiz by hand, and the correct answers are never sent to a
          stakeholder&apos;s phone.
        </p>
        <p className="mt-1 text-xs text-blue-700">
          Questions belong to your organisation only. Retiring a question stops it being
          asked without deleting past attempts.
        </p>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Question bank</h2>
              <p className="text-sm text-slate-500">
                {questions === null
                  ? "Loading…"
                  : `${active.length} active question${active.length === 1 ? "" : "s"}${
                      questions.length !== active.length ? ` · ${questions.length - active.length} retired` : ""
                    }`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {questions !== null && questions.length === 0 && (
                <Button variant="secondary" disabled={busy} onClick={addStandard}>
                  Add the standard five questions
                </Button>
              )}
              <Button disabled={busy || questions === null} onClick={() => setDraft(emptyDraft(nextPosition))}>
                + Add question
              </Button>
            </div>
          </div>

          {loadError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
          )}

          {questions !== null && questions.length === 0 && !loadError && (
            <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-center">
              <p className="text-sm font-semibold text-amber-900">No quiz set up yet</p>
              <p className="mt-1 text-sm text-amber-800">
                Stakeholders currently see &ldquo;No quiz set up yet&rdquo; and cannot get their
                Quiz tick. Add the standard five questions to start, then tailor them to your sites.
              </p>
            </div>
          )}

          {questions && questions.length > 0 && (
            <ol className="mt-4 space-y-3">
              {questions.map((q, idx) => (
                <li
                  key={q.id}
                  className={`rounded-xl border p-4 ${q.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-75"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Question {idx + 1} · position {q.position}
                        {!q.active && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">RETIRED</span>}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{q.question}</p>
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt, i) => (
                          <li key={i} className={`flex items-start gap-2 text-sm ${i === q.answerIndex ? "font-semibold text-green-700" : "text-slate-600"}`}>
                            <span className="w-5 shrink-0 text-slate-400">{String.fromCharCode(65 + i)})</span>
                            <span>
                              {opt}
                              {i === q.answerIndex && <span className="ml-2 text-xs font-bold uppercase text-green-600">correct</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDraft({ ...q, options: [...q.options] })}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => toggleActive(q)}>
                        {q.active ? "Retire" : "Reinstate"}
                      </Button>
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => setRemoving(q)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* Add / edit a question */}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit question" : "Add question"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={saveDraft} disabled={busy}>
              {busy ? "Saving…" : draft?.id ? "Save changes" : "Add question"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Question</span>
              <textarea
                rows={2}
                value={draft.question}
                onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                placeholder="e.g. What must you do before entering the excavator's exclusion zone?"
              />
            </label>
            <div>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Options — tick the correct one
              </span>
              <div className="space-y-2">
                {draft.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="quiz-correct"
                      aria-label={`Option ${String.fromCharCode(65 + i)} is correct`}
                      checked={draft.answerIndex === i}
                      onChange={() => setDraft((d) => ({ ...d, answerIndex: i }))}
                    />
                    <span className="w-5 text-sm text-slate-400">{String.fromCharCode(65 + i)})</span>
                    <input
                      value={opt}
                      onChange={(e) => setOption(i, e.target.value)}
                      aria-label={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      disabled={draft.options.length <= MIN_OPTIONS}
                      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-30"
                      aria-label={`Remove option ${String.fromCharCode(65 + i)}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {draft.options.length < MAX_OPTIONS && (
                <button type="button" onClick={addOption} className="mt-2 text-xs font-medium text-blue-700 hover:underline">
                  + Add another option
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Position</span>
                <input
                  type="number"
                  min={0}
                  value={draft.position}
                  onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
                />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                />
                Asked in the quiz (active)
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* Remove confirmation — never a native confirm() */}
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this question?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmRemove} disabled={busy}>
              {busy ? "Removing…" : "Remove question"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          &ldquo;{removing?.question}&rdquo; will no longer be asked. Past attempts are kept as
          evidence. If you only want to stop asking it for now, use <span className="font-medium">Retire</span> instead.
        </p>
      </Modal>
    </div>
  );
}
