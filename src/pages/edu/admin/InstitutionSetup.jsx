import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card, { CardBody } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Notification";
import { Field, inputClass, ErrorCard, Loading } from "../../../components/education/EduBits";
import { InstitutionProfileForm, InstitutionBrandingForm } from "../../../components/education/InstitutionForms";
import AddStudentsPanel from "../../../components/education/AddStudentsPanel";
import {
  fetchInstitutionOverview, updateInstitution, fetchLibrary, fetchPrograms, insertProgram, fetchCohorts, insertCohort,
  inviteMember, insertQualification, insertUnit, eduJoinLink, fetchMemberships,
} from "../../../lib/eduApi";
import { useEducation } from "../../../hooks/useEducation";
import { eduBrand } from "../../../data/education";

// ============================================================================
// First-time Institution Admin experience — an 8-screen wizard. Every screen
// says where you are, what to do, and what happens next. Completion is stored
// on the institution (onboarding jsonb) so a refresh resumes where you were.
// ============================================================================

const STEPS = [
  { n: 1, title: "Welcome" },
  { n: 2, title: "Institution profile" },
  { n: 3, title: "Branding" },
  { n: 4, title: "First training program" },
  { n: 5, title: "First cohort" },
  { n: 6, title: "Invite an assessor" },
  { n: 7, title: "Add students" },
  { n: 8, title: "Ready" },
];

export default function InstitutionSetup() {
  const { education } = useEducation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [step, setStep] = useState(() => Math.min(8, Math.max(1, Number(params.get("step")) || 1)));
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [library, setLibrary] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [ctx, setCtx] = useState({ programId: null, cohortId: null, assessorLink: null, studentsAdded: 0 });

  const instId = education?.institutionId;

  const load = async () => {
    setError(null);
    try {
      const [ov, lib, progs, cohs, asses] = await Promise.all([
        fetchInstitutionOverview(instId), fetchLibrary(), fetchPrograms(instId), fetchCohorts(instId), fetchMemberships(instId, "assessor"),
      ]);
      setOverview(ov);
      setLibrary(lib);
      setPrograms(progs);
      setCohorts(cohs);
      setAssessors(asses);
      setCtx((c) => ({
        ...c,
        programId: c.programId || progs[progs.length - 1]?.id || null,
        cohortId: c.cohortId || cohs[cohs.length - 1]?.id || null,
      }));
    } catch (e) {
      setError(e.message);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data on mount is intentional
  useEffect(() => { if (instId) load(); }, [instId]); // eslint-disable-line react-hooks/exhaustive-deps

  const institution = overview?.institution;
  const primary = institution?.primaryColour || education?.primaryColour || "#1e3a8a";

  const go = (n) => {
    setStep(n);
    setParams({ step: String(n) }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const markDone = async (key, extra = {}) => {
    try {
      const onboarding = { ...(institution?.onboarding || {}), [key]: true, ...extra };
      const saved = await updateInstitution(instId, { onboarding });
      setOverview((o) => (o ? { ...o, institution: { ...o.institution, onboarding: saved.onboarding } } : o));
    } catch { /* progress markers are cosmetic */ }
  };

  if (error) return <ErrorCard message={error} onRetry={load} />;
  if (!overview || !library) return <Loading label="Preparing setup…" />;

  const setup = overview.setup || {};
  const selectedProgram = programs.find((p) => p.id === ctx.programId) || programs[programs.length - 1] || null;
  const selectedCohort = cohorts.find((c) => c.id === ctx.cohortId) || cohorts[cohorts.length - 1] || null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Progress */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>Setup · Step {step} of 8</p>
          <h1 className="text-xl font-bold text-slate-800">{STEPS[step - 1].title}</h1>
        </div>
        <Link to="/education/admin" className="text-sm font-medium text-blue-700 hover:underline">Exit to dashboard</Link>
      </div>
      <div className="flex gap-1">
        {STEPS.map((s) => (
          <button key={s.n} title={s.title} onClick={() => go(s.n)} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: s.n <= step ? primary : "#e2e8f0" }} aria-label={`Go to step ${s.n}`} />
        ))}
      </div>

      <Card>
        <CardBody className="space-y-5">
          {step === 1 && (
            <div className="py-4 text-center">
              <p className="text-4xl" aria-hidden>🏗️</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-800">Set up your construction training environment</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
                In about fifteen minutes you'll tell us about {institution.name}, add your logo, create your first program and cohort, invite an assessor and add students. Each student then gets their own simulated construction site to run — using the same tools real Victorian builders use — and your assessor reviews the evidence they produce.
              </p>
              <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm text-slate-600">
                {STEPS.slice(1, 7).map((s) => <li key={s.n}>{s.n - 1}. {s.title}</li>)}
              </ul>
              <p className="mt-4 text-xs text-slate-400">You can skip any step and come back later from the dashboard.</p>
              <Button size="lg" className="mt-5" onClick={() => go(2)}>Start Setup →</Button>
            </div>
          )}

          {step === 2 && (
            <>
              <Intro what="Tell students and assessors who you are." next="Your name appears on every Education screen and evidence pack." />
              <InstitutionProfileForm
                institution={institution}
                submitLabel="Save and continue →"
                onSaved={async (saved) => { setOverview((o) => ({ ...o, institution: { ...o.institution, ...saved } })); await markDone("profile"); go(3); }}
              >
                <Button type="button" variant="ghost" onClick={() => go(3)}>Skip for now</Button>
              </InstitutionProfileForm>
            </>
          )}

          {step === 3 && (
            <>
              <Intro what="Add your logo and colours." next="They flow into the student and assessor environments and onto evidence packs, with OHS Builder Victoria attribution retained." />
              <InstitutionBrandingForm
                institution={institution}
                submitLabel="Save and continue →"
                onSaved={async (saved) => { setOverview((o) => ({ ...o, institution: { ...o.institution, ...saved } })); await markDone("branding"); }}
              >
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => go(2)}>← Back</Button>
                  <Button type="button" variant="secondary" onClick={() => go(4)}>Continue →</Button>
                </div>
              </InstitutionBrandingForm>
            </>
          )}

          {step === 4 && (
            <ProgramStep
              institutionId={instId}
              library={library}
              existing={programs}
              primary={primary}
              onBack={() => go(3)}
              onSkip={() => go(5)}
              onDone={async (p) => {
                setPrograms((ps) => [...ps.filter((x) => x.id !== p.id), p]);
                setCtx((c) => ({ ...c, programId: p.id }));
                await markDone("program");
                go(5);
              }}
              onLibraryChange={setLibrary}
            />
          )}

          {step === 5 && (
            <CohortStep
              institutionId={instId}
              library={library}
              programs={programs}
              program={selectedProgram}
              existing={cohorts}
              primary={primary}
              onBack={() => go(4)}
              onSkip={() => go(6)}
              onDone={async (c) => {
                setCohorts((cs) => [...cs.filter((x) => x.id !== c.id), c]);
                setCtx((x) => ({ ...x, cohortId: c.id }));
                await markDone("cohort");
                go(6);
              }}
            />
          )}

          {step === 6 && (
            <AssessorStep
              institutionId={instId}
              cohort={selectedCohort}
              cohorts={cohorts}
              existing={assessors}
              link={ctx.assessorLink}
              onBack={() => go(5)}
              onSkip={() => go(7)}
              onInvited={async (res) => {
                setCtx((c) => ({ ...c, assessorLink: eduJoinLink(res.inviteToken) }));
                setAssessors((a) => [...a, { id: res.membershipId, name: "", email: res.email, status: "invited" }]);
                await markDone("assessor");
              }}
              onContinue={() => go(7)}
            />
          )}

          {step === 7 && (
            <>
              <Intro what={selectedCohort ? `Enrol students into ${selectedCohort.name}.` : "Create a cohort first (step 5), then enrol students."} next="Each student receives a private invite link. When they open it, their own simulated site is created automatically." />
              {selectedCohort ? (
                <>
                  {cohorts.length > 1 && (
                    <Field label="Cohort">
                      <select className={inputClass} value={ctx.cohortId || ""} onChange={(e) => setCtx((c) => ({ ...c, cohortId: Number(e.target.value) }))}>
                        {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </Field>
                  )}
                  <AddStudentsPanel cohortId={selectedCohort.id} cohortName={selectedCohort.name} onAdded={async (res) => { setCtx((c) => ({ ...c, studentsAdded: c.studentsAdded + res.added })); await markDone("students"); }} />
                </>
              ) : (
                <Button variant="secondary" onClick={() => go(5)}>← Create a cohort</Button>
              )}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => go(6)}>← Back</Button>
                <Button onClick={async () => { await load(); go(8); }}>Continue →</Button>
              </div>
            </>
          )}

          {step === 8 && (
            <ReadyStep setup={{ ...setup, students: setup.students || ctx.studentsAdded > 0 }} primary={primary} onOpen={() => navigate("/education/admin")} onGo={go} />
          )}
        </CardBody>
      </Card>
      <p className="text-center text-xs text-slate-400">{eduBrand.disclaimer}</p>
    </div>
  );
}

function Intro({ what, next }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
      <p><span className="font-semibold text-slate-800">What to do:</span> {what}</p>
      <p className="mt-0.5"><span className="font-semibold text-slate-800">What happens next:</span> {next}</p>
    </div>
  );
}

function ProgramStep({ institutionId, library, existing, primary, onBack, onSkip, onDone, onLibraryChange }) {
  const toast = useToast();
  const defaultQual = library.qualifications.find((q) => q.code === "CPC40120") || library.qualifications[0];
  const defaultUnit = library.units.find((u) => u.code === "CPCCBC4002") || library.units[0];
  const [form, setForm] = useState({
    qualificationId: defaultQual?.id || "other", unitId: defaultUnit?.id || "other",
    otherQualCode: "", otherQualTitle: "", otherUnitCode: "", otherUnitTitle: "",
    name: defaultUnit ? `${defaultUnit.code} — ${defaultUnit.title}` : "", intake: "", campus: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const units = library.units.filter((u) => form.qualificationId === "other" || !u.qualificationId || String(u.qualificationId) === String(form.qualificationId));

  const save = async () => {
    if (!form.name.trim()) { toast("Give the program a name", "error"); return; }
    setBusy(true);
    try {
      let qualificationId = form.qualificationId === "other" ? null : Number(form.qualificationId);
      let unitId = form.unitId === "other" ? null : Number(form.unitId);
      if (form.qualificationId === "other") {
        if (!form.otherQualCode.trim() || !form.otherQualTitle.trim()) throw new Error("Enter the qualification code and title.");
        const q = await insertQualification({ institutionId, code: form.otherQualCode, title: form.otherQualTitle });
        qualificationId = q.id;
        onLibraryChange?.({ ...library, qualifications: [...library.qualifications, q] });
      }
      if (form.unitId === "other") {
        if (!form.otherUnitCode.trim() || !form.otherUnitTitle.trim()) throw new Error("Enter the unit code and title.");
        const u = await insertUnit({ institutionId, qualificationId, code: form.otherUnitCode, title: form.otherUnitTitle });
        unitId = u.id;
        onLibraryChange?.({ ...library, units: [...library.units, u] });
      }
      const p = await insertProgram({ institutionId, name: form.name, qualificationId, unitId, intake: form.intake, campus: form.campus });
      toast("Program created");
      onDone(p);
    } catch (err) {
      toast(err.message || "Could not create program", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Intro what="Choose the qualification and unit this training delivers, and name the program." next="Cohorts (groups of students) sit under a program. You can add more programs, qualifications and units later." />
      {existing.length > 0 && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">You already have {existing.length} program{existing.length === 1 ? "" : "s"} ({existing.map((p) => p.name).join(", ")}). Add another below, or continue.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Qualification" className="sm:col-span-2">
          <select className={inputClass} value={form.qualificationId} onChange={set("qualificationId")}>
            {library.qualifications.map((q) => <option key={q.id} value={q.id}>{q.code} — {q.title}</option>)}
            <option value="other">Other (enter below)</option>
          </select>
        </Field>
        {form.qualificationId === "other" && (
          <>
            <Field label="Qualification code"><input className={inputClass} placeholder="e.g. CPC30220" value={form.otherQualCode} onChange={set("otherQualCode")} /></Field>
            <Field label="Qualification title"><input className={inputClass} value={form.otherQualTitle} onChange={set("otherQualTitle")} /></Field>
          </>
        )}
        <Field label="Unit of competency" className="sm:col-span-2" hint="The shipped unit text is an indicative summary — confirm it against the current release on training.gov.au.">
          <select className={inputClass} value={form.unitId} onChange={(e) => { const v = e.target.value; const u = library.units.find((x) => String(x.id) === v); setForm((f) => ({ ...f, unitId: v, name: u ? `${u.code} — ${u.title}` : f.name })); }}>
            {units.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.title}</option>)}
            <option value="other">Other (enter below)</option>
          </select>
        </Field>
        {form.unitId === "other" && (
          <>
            <Field label="Unit code"><input className={inputClass} placeholder="e.g. CPCCWHS2001" value={form.otherUnitCode} onChange={set("otherUnitCode")} /></Field>
            <Field label="Unit title"><input className={inputClass} value={form.otherUnitTitle} onChange={set("otherUnitTitle")} /></Field>
          </>
        )}
        <Field label="Program name *" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={set("name")} /></Field>
        <Field label="Semester / intake"><input className={inputClass} placeholder="e.g. Semester 1 2027" value={form.intake} onChange={set("intake")} /></Field>
        <Field label="Campus"><input className={inputClass} value={form.campus} onChange={set("campus")} /></Field>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onSkip}>{existing.length ? "Continue →" : "Skip for now"}</Button>
          <Button disabled={busy} onClick={save} style={{ backgroundColor: primary }}>{busy ? "Creating…" : "Create program →"}</Button>
        </div>
      </div>
    </>
  );
}

function CohortStep({ institutionId, library, programs, program, existing, primary, onBack, onSkip, onDone }) {
  const toast = useToast();
  const defaultScenario = library.scenarios.find((s) => s.code === "RIVERSIDE") || library.scenarios[0];
  const [form, setForm] = useState({ programId: program?.id || "", name: "", startDate: "", endDate: "", campus: program?.campus || "", expectedStudents: "", scenarioId: defaultScenario?.id || "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const scenario = library.scenarios.find((s) => String(s.id) === String(form.scenarioId));

  if (!programs.length) {
    return (
      <>
        <Intro what="Create a program first." next="Then you'll create a cohort under it." />
        <div className="flex justify-between"><Button variant="ghost" onClick={onBack}>← Create a program</Button><Button variant="secondary" onClick={onSkip}>Skip</Button></div>
      </>
    );
  }

  const save = async () => {
    if (!form.name.trim()) { toast("Give the cohort a name", "error"); return; }
    if (!form.programId) { toast("Choose a program", "error"); return; }
    setBusy(true);
    try {
      const c = await insertCohort({ institutionId, programId: Number(form.programId), name: form.name, startDate: form.startDate, endDate: form.endDate, campus: form.campus, expectedStudents: form.expectedStudents, scenarioId: form.scenarioId ? Number(form.scenarioId) : null, status: "active" });
      toast("Cohort created");
      onDone(c);
    } catch (err) {
      toast(err.message || "Could not create cohort", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Intro what="Create the group of students who will do this unit together, and pick the scenario they'll run." next="You'll invite an assessor and add students to this cohort." />
      {existing.length > 0 && <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">You already have {existing.length} cohort{existing.length === 1 ? "" : "s"}. Add another, or continue.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Program" className="sm:col-span-2">
          <select className={inputClass} value={form.programId} onChange={set("programId")}>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}{p.intake ? ` · ${p.intake}` : ""}</option>)}
          </select>
        </Field>
        <Field label="Cohort name *" className="sm:col-span-2"><input className={inputClass} placeholder="e.g. Semester 1 — Group A" value={form.name} onChange={set("name")} /></Field>
        <Field label="Start date"><input type="date" className={inputClass} value={form.startDate} onChange={set("startDate")} /></Field>
        <Field label="End date"><input type="date" className={inputClass} value={form.endDate} onChange={set("endDate")} /></Field>
        <Field label="Campus"><input className={inputClass} value={form.campus} onChange={set("campus")} /></Field>
        <Field label="Expected number of students"><input type="number" min="0" className={inputClass} value={form.expectedStudents} onChange={set("expectedStudents")} /></Field>
        <Field label="Scenario (the simulated project)" className="sm:col-span-2">
          <select className={inputClass} value={form.scenarioId} onChange={set("scenarioId")}>
            {library.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
      </div>
      {scenario && (
        <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">{scenario.title}</p>
          <p className="mt-1">{scenario.summary}</p>
          <p className="mt-1 text-xs text-slate-500">{scenario.stages.length} tasks · student role: {scenario.studentRole}</p>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onSkip}>{existing.length ? "Continue →" : "Skip for now"}</Button>
          <Button disabled={busy} onClick={save} style={{ backgroundColor: primary }}>{busy ? "Creating…" : "Create cohort →"}</Button>
        </div>
      </div>
    </>
  );
}

function AssessorStep({ institutionId, cohort, cohorts, existing, link, onBack, onSkip, onInvited, onContinue }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", cohortIds: cohort ? [cohort.id] : [] });
  const [busy, setBusy] = useState(false);
  const toggle = (id) => setForm((f) => ({ ...f, cohortIds: f.cohortIds.includes(id) ? f.cohortIds.filter((x) => x !== id) : [...f.cohortIds, id] }));

  const invite = async () => {
    if (!form.email.trim()) { toast("Enter the assessor's email", "error"); return; }
    setBusy(true);
    try {
      const res = await inviteMember({ institutionId, role: "assessor", name: form.name, email: form.email, cohortIds: form.cohortIds });
      toast("Assessor invited");
      onInvited(res);
    } catch (err) {
      toast(err.message || "Could not invite", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Intro what="Invite the trainer/assessor who will review this cohort's evidence." next="They get a private link, set a password, and see only the cohorts you give them — never your institution settings." />
      {existing.length > 0 && <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">{existing.length} assessor{existing.length === 1 ? "" : "s"} already invited/active. Invite another, or continue.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name"><input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Email *"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Cohort access" className="sm:col-span-2">
          {cohorts.length ? (
            <div className="flex flex-wrap gap-3">
              {cohorts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={form.cohortIds.includes(c.id)} onChange={() => toggle(c.id)} /> {c.name}
                </label>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500">No cohorts yet — you can assign cohorts later from Assessors.</p>}
        </Field>
      </div>
      {link && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">Invite link (works once, for that email only)</p>
          <p className="mt-1 break-all font-mono text-xs text-slate-700">{link}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => { navigator.clipboard?.writeText(link); toast("Invite link copied"); }}>Copy link</Button>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={link || existing.length ? onContinue : onSkip}>{link || existing.length ? "Continue →" : "Skip for now"}</Button>
          <Button disabled={busy} onClick={invite}>{busy ? "Inviting…" : "Send invite"}</Button>
        </div>
      </div>
    </>
  );
}

function ReadyStep({ setup, primary, onOpen, onGo }) {
  const items = [
    ["profile", "Institution", 2], ["branding", "Branding", 3], ["program", "Program", 4],
    ["cohort", "Cohort", 5], ["assessor", "Assessor", 6], ["students", "Students", 7],
  ];
  const allDone = items.every(([k]) => setup[k]);
  return (
    <div className="py-4 text-center">
      <p className="text-4xl" aria-hidden>{allDone ? "🎉" : "👍"}</p>
      <h2 className="mt-3 text-2xl font-bold text-slate-800">{allDone ? "You're ready" : "Almost there"}</h2>
      <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left">
        {items.map(([k, label, n]) => (
          <li key={k} className="flex items-center justify-between text-sm">
            <span className={setup[k] ? "text-slate-800" : "text-slate-500"}>{setup[k] ? "✓" : "○"} {label}</span>
            {!setup[k] && <button onClick={() => onGo(n)} className="text-xs font-medium text-blue-700 hover:underline">Do this</button>}
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
        From the dashboard you can watch each cohort's progress, see who is awaiting assessment, and add more programs, cohorts, assessors and students at any time.
      </p>
      <Button size="lg" className="mt-5" style={{ backgroundColor: primary }} onClick={onOpen}>Open Education Dashboard →</Button>
    </div>
  );
}
