import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/shared/Logo";
import { brand } from "../data/constants";
import { eduBrand } from "../data/education";

// ============================================================================
// /education — the public front door for OHS Builder Education.
//
// Three jobs, in order of importance:
//   1. someone who already has access finds their portal in one glance
//      (Institution / Assessor / Student → the ONE existing sign-in, which
//      then routes by role through /go; invited people keep using their
//      secure invitation link);
//   2. a prospective institution understands what the product is, who it is
//      for and how it differs, and can request access (a human provisions —
//      nothing public creates an institution);
//   3. it belongs to OHS Builder Victoria (same type, same navy/amber, same
//      footer identity) while reading clearly as the Education product.
//
// Copy discipline: only capabilities that exist in Phase 1 are described. No
// accreditation, endorsement, partnership or integration claims.
// ============================================================================

const PORTALS = [
  {
    key: "institution",
    icon: "🏫",
    title: "Institution",
    blurb: "Set up and manage your institution's branded construction training environment.",
    points: ["Institution branding", "Programs and units", "Cohorts", "Assessors", "Student enrolment", "Progress and reporting"],
    cta: "Institution Portal →",
    to: "/login?portal=institution",
  },
  {
    key: "assessor",
    icon: "📝",
    title: "Assessor",
    blurb: "Manage your cohorts, review student evidence, provide feedback and complete assessments.",
    points: ["Cohort overview", "Student progress", "Evidence review", "Satisfactory / Not Yet Satisfactory", "Feedback", "Resubmissions"],
    cta: "Assessor Portal →",
    to: "/login?portal=assessor",
  },
  {
    key: "student",
    icon: "🎓",
    title: "Student",
    blurb: "Enter your simulated construction workplace and continue your step-by-step training.",
    points: ["Guided simulation", "Clear next steps", "Real OHS Builder tools", "Scenario events", "Evidence progress", "Submission and feedback"],
    cta: "Student Training →",
    to: "/login?portal=student",
  },
];

const HOW = [
  { n: "1", title: "Institution sets up", text: "Add branding, programs, units, cohorts, assessors and students." },
  { n: "2", title: "Student enters a simulated site", text: "Each student receives their own isolated construction workspace and guided scenario." },
  { n: "3", title: "Student does the work", text: "Students complete real activities using Projects, Inductions, SWMS, Risk Register, Toolbox Meetings, Incidents and Site Diary." },
  { n: "4", title: "Assessor reviews the evidence", text: "Evidence is submitted as a locked snapshot. Assessors review it, provide feedback, mark S/NYS and manage resubmissions." },
];

const SIM_TASKS = [
  "establish the project",
  "identify hazards",
  "implement controls",
  "manage induction",
  "review SWMS",
  "respond to site events",
  "investigate an incident",
  "conduct toolbox consultation",
  "maintain records",
  "submit evidence",
];

const ORG_TYPES = ["University", "TAFE", "Registered Training Organisation", "Construction training provider", "Other"];

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2";
const primaryBtn = `inline-flex w-full items-center justify-center rounded-xl bg-yellow-500 px-7 py-3.5 text-base font-bold text-blue-950 shadow-lg transition hover:bg-yellow-400 sm:w-auto ${focusRing} focus-visible:ring-offset-slate-900`;
const ghostBtn = `inline-flex w-full items-center justify-center rounded-xl border border-slate-600 px-7 py-3.5 text-base font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800 sm:w-auto ${focusRing} focus-visible:ring-offset-slate-900`;

function EduHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-3 px-5 py-5">
      <Link to="/education" className={`flex items-center gap-2.5 rounded-lg ${focusRing} focus-visible:ring-offset-slate-900`} aria-label="OHS Builder Education home">
        <Logo compact light />
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">{brand.productName}</span>
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-yellow-400">Education</span>
        </span>
      </Link>
      <nav aria-label="Education" className="flex items-center gap-1 sm:gap-3">
        <a href="#access" className={`rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white ${focusRing} focus-visible:ring-offset-slate-900`}>
          Access
        </a>
        <Link to="/" className={`rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white ${focusRing} focus-visible:ring-offset-slate-900`}>
          <span className="hidden sm:inline">OHS Builder Victoria →</span>
          <span className="sm:hidden">Victoria →</span>
        </Link>
        <Link to="/login" className={`rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white ${focusRing} focus-visible:ring-offset-slate-900`}>
          Log in
        </Link>
      </nav>
    </header>
  );
}

function StudentGuidanceMock() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm" role="img" aria-label="Example of the guided student task view: Step 3 of 10, Identify site hazards, with a button that opens the Risk Register.">
      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900">Step 3 of 10 — Identify site hazards</p>
      <p className="mt-2 border-l-2 border-slate-200 pl-3 text-sm italic text-slate-600">Review your simulated site and identify the hazards present.</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">What you need to do</p>
      <p className="mt-1 text-sm text-slate-700">Add the required hazards and controls to your Risk Register.</p>
      <span className="mt-4 inline-block rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white">Open Risk Register →</span>
      <p className="mt-3 text-[11px] text-slate-400">Example of the guided task view students see.</p>
    </div>
  );
}

function BrandingMock() {
  return (
    <div className="mx-auto w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm" role="img" aria-label="Example of an institution-branded student screen showing an institution logo, name, qualification and cohort.">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-[10px] font-semibold uppercase text-slate-400">Logo</div>
      <p className="mt-3 text-base font-bold text-slate-800">Your Institution</p>
      <p className="text-xs text-slate-500">Building &amp; Construction</p>
      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">CPC40120</p>
        <p>Semester 1</p>
      </div>
      <p className="mt-4 rounded-lg bg-blue-900 px-3 py-2 text-sm font-semibold text-white">Student Training</p>
      <p className="mt-3 text-[10px] text-slate-400">{eduBrand.attribution}</p>
    </div>
  );
}

function RequestAccessForm() {
  const [form, setForm] = useState({ institution: "", contact: "", email: "", phone: "", orgType: "", size: "", message: "", website: "" });
  const [state, setState] = useState({ status: "idle", error: null });
  const openedAt = useRef(0);
  useEffect(() => { openedAt.current = Date.now(); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inputClass = `w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900`;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (state.status === "sending") return;
    setState({ status: "sending", error: null });
    try {
      const r = await fetch("/api/education-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, openedAt: openedAt.current }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || "We couldn't send that just now.");
      setState({ status: "sent", error: null });
    } catch (err) {
      setState({ status: "error", error: err.message || "We couldn't send that just now." });
    }
  };

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center" role="status">
        <p className="text-2xl" aria-hidden>✅</p>
        <h3 className="mt-2 text-lg font-bold text-green-900">Request received</h3>
        <p className="mt-1 text-sm text-green-800">Thanks — we&apos;ll reply to {form.email} to arrange a walkthrough and set up your institution. Nothing is created automatically; a person will be in touch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate={false}>
      <div className="sm:col-span-2">
        <label htmlFor="rq-institution" className="mb-1 block text-sm font-medium text-slate-700">Institution name <span aria-hidden className="text-red-600">*</span></label>
        <input id="rq-institution" required maxLength={160} autoComplete="organization" className={inputClass} value={form.institution} onChange={set("institution")} />
      </div>
      <div>
        <label htmlFor="rq-contact" className="mb-1 block text-sm font-medium text-slate-700">Contact name <span aria-hidden className="text-red-600">*</span></label>
        <input id="rq-contact" required maxLength={120} autoComplete="name" className={inputClass} value={form.contact} onChange={set("contact")} />
      </div>
      <div>
        <label htmlFor="rq-email" className="mb-1 block text-sm font-medium text-slate-700">Work email <span aria-hidden className="text-red-600">*</span></label>
        <input id="rq-email" type="email" required maxLength={200} autoComplete="email" className={inputClass} value={form.email} onChange={set("email")} />
      </div>
      <div>
        <label htmlFor="rq-phone" className="mb-1 block text-sm font-medium text-slate-700">Phone <span className="font-normal text-slate-400">(optional)</span></label>
        <input id="rq-phone" type="tel" maxLength={40} autoComplete="tel" className={inputClass} value={form.phone} onChange={set("phone")} />
      </div>
      <div>
        <label htmlFor="rq-type" className="mb-1 block text-sm font-medium text-slate-700">Organisation type <span aria-hidden className="text-red-600">*</span></label>
        <select id="rq-type" required className={inputClass} value={form.orgType} onChange={set("orgType")}>
          <option value="">Choose…</option>
          {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rq-size" className="mb-1 block text-sm font-medium text-slate-700">Approximate students / cohort size <span className="font-normal text-slate-400">(optional)</span></label>
        <input id="rq-size" maxLength={80} placeholder="e.g. 2 cohorts of 25 per semester" className={inputClass} value={form.size} onChange={set("size")} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rq-message" className="mb-1 block text-sm font-medium text-slate-700">Message <span aria-hidden className="text-red-600">*</span></label>
        <textarea id="rq-message" required rows={4} maxLength={2000} placeholder="Which qualification or unit you teach, when you'd like to start, and anything you'd like to see." className={inputClass} value={form.message} onChange={set("message")} />
      </div>
      {/* Honeypot — invisible to people, irresistible to bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="rq-website">Website</label>
        <input id="rq-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>
      {state.status === "error" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2" role="alert">
          {state.error} You can also email <a className="font-semibold underline" href={`mailto:${brand.supportEmail}?subject=OHS%20Builder%20Education%20access%20request`}>{brand.supportEmail}</a>.
        </p>
      )}
      <div className="flex flex-col items-start gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">We use these details only to reply to your request. Nothing is provisioned automatically.</p>
        <button type="submit" disabled={state.status === "sending"} className={`inline-flex w-full items-center justify-center rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-blue-800 disabled:opacity-60 sm:w-auto ${focusRing}`}>
          {state.status === "sending" ? "Sending…" : "Request Institution Access"}
        </button>
      </div>
    </form>
  );
}

export default function EducationLanding() {
  useEffect(() => {
    const prev = document.title;
    document.title = "OHS Builder Education — Construction training, simulation & assessment";
    return () => { document.title = prev; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <a href="#access" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-yellow-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-blue-950">
        Skip to portal access
      </a>
      <EduHeader />

      {/* Hero */}
      <section aria-labelledby="hero-title" className="mx-auto max-w-6xl px-5 pb-14 pt-8 text-center sm:pt-14">
        <p className="mx-auto mb-4 inline-block rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-300">
          {eduBrand.productName}
        </p>
        <h1 id="hero-title" className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
          Train future builders in a <span className="text-yellow-400">real construction safety environment.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          Give every student their own simulated construction site. Guide them step-by-step through real WHS activities, capture evidence from their work, and give assessors one place to review progress, provide feedback and assess submissions.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#request-access" className={primaryBtn}>Request Institution Access</a>
          <a href="#access" className={ghostBtn}>Already have access? ↓</a>
        </div>
        <p className="mt-5 text-sm text-slate-400">For universities · TAFEs · RTOs · construction training providers</p>
      </section>

      {/* Access — the most important functional block on the page */}
      <section id="access" aria-labelledby="access-title" className="scroll-mt-6 bg-slate-50 py-14 text-slate-800">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="access-title" className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Already have access?</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">Choose your portal. You sign in with the email your institution set you up with, and you&apos;ll land in the right place.</p>
          <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
            {PORTALS.map((p) => (
              <div key={p.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900/5 text-2xl" aria-hidden>{p.icon}</span>
                  <h3 className="text-xl font-bold text-slate-900">{p.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{p.blurb}</p>
                <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-slate-600">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-1.5"><span aria-hidden className="mt-0.5 text-green-600">✓</span><span>{pt}</span></li>
                  ))}
                </ul>
                <Link to={p.to} className={`mt-6 inline-flex w-full items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-blue-800 ${focusRing}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-7 max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white px-5 py-4 text-center text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Have an invitation? Open the secure invitation link sent by your institution.</p>
            <p className="mt-1 text-xs text-slate-500">Invitation links work once and only for the email they were sent to. Once you&apos;ve set your password, use the portal buttons above.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="how-title" className="text-center text-2xl font-bold text-white sm:text-3xl">How OHS Builder Education works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map((s) => (
              <li key={s.n} className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500 text-sm font-extrabold text-blue-950" aria-hidden>{s.n}</span>
                <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Three experiences */}
      <section aria-labelledby="exp-title" className="bg-slate-50 py-16 text-slate-800">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="exp-title" className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">One platform. Three simple experiences.</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Institution</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">Set up once. See everything.</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">The institution controls its own training environment — name, logo and colours, programs and units, cohorts, assessors and students — and sees every cohort&apos;s progress, who is awaiting assessment and who needs action, from one dashboard.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Assessor</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">See who needs your attention.</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Assessors see each student&apos;s progress, open the evidence behind it — the actual project, risk register, inductions, SWMS, incidents, toolbox and diary records — give feedback against the unit&apos;s criteria, mark Satisfactory or Not Yet Satisfactory and manage resubmissions.</p>
            </div>
            <div className="rounded-2xl border border-blue-900/20 bg-blue-900/[0.03] p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Student</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">Always know what to do next.</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">The student experience is deliberately guided for first-time users: a welcome, a short tour, then one clear task at a time that opens the real tool on their own site.</p>
              <div className="mt-4"><StudentGuidanceMock /></div>
              <p className="mt-4 text-sm font-semibold text-slate-900">No previous OHS Builder experience required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simulation differentiator */}
      <section aria-labelledby="sim-title" className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">Not just course content</p>
              <h2 id="sim-title" className="mt-3 text-2xl font-bold text-white sm:text-3xl">Students don&apos;t just read about site safety. They manage it.</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">Each cohort runs a scenario — a simulated construction project with a brief, site documents and events that arrive as the work progresses. The student acts as the person responsible for managing WHS on that project, inside the same OHS Builder tools Victorian builders use on live sites. Every record they make is evidence; a task is only ticked when the record actually exists.</p>
              <p className="mt-4 text-base leading-relaxed text-slate-300">Phase 1 ships with one scenario, <span className="font-semibold text-white">Riverside Apartments</span> — a six-storey residential build beside a creek and established homes — mapped indicatively to CPCCBC4002 <span className="text-slate-400">(Manage work health and safety in the building and construction workplace)</span>. Institutions review and adjust the mapping to their own unit text.</p>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">Riverside Apartments</p>
              <p className="mt-1 text-sm text-slate-300">During the simulation a student may need to:</p>
              <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-200 sm:grid-cols-2">
                {SIM_TASKS.map((t) => (
                  <li key={t} className="flex items-start gap-2"><span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Standalone / integrate + branding */}
      <section aria-labelledby="fit-title" className="bg-slate-50 py-16 text-slate-800">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 id="fit-title" className="text-2xl font-bold text-slate-900 sm:text-3xl">Works standalone. Designed to integrate.</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">OHS Builder Education can operate as the practical training environment while an institution continues using its existing LMS for course administration and learning content. Students and assessors sign in here; the institution keeps its own systems for everything else.</p>
              <p className="mt-3 text-base leading-relaxed text-slate-600">The platform architecture is designed for future LMS integration as institutional requirements are confirmed. No LMS integration is live today — tell us what your institution needs when you request access.</p>

              <h2 className="mt-10 text-2xl font-bold text-slate-900 sm:text-3xl">Your institution&apos;s environment, with your name on it.</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">Institutions configure their display name, logo and colours. Those carry into the student and assessor screens, invitation pages and evidence packs — with <span className="font-medium text-slate-800">{eduBrand.attribution}</span> retained. Branding is applied within ohsbuildervictoria.com.au; custom domains are not part of Phase 1.</p>
            </div>
            <div className="flex items-center justify-center">
              <BrandingMock />
            </div>
          </div>
        </div>
      </section>

      {/* Request access */}
      <section id="request-access" aria-labelledby="rq-title" className="scroll-mt-6 py-16">
        <div className="mx-auto max-w-3xl px-5">
          <h2 id="rq-title" className="text-center text-2xl font-bold text-white sm:text-3xl">Request Institution Access</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base text-slate-300">Tell us about your institution and what you teach. We&apos;ll reply to arrange a walkthrough and set up your institution, its first program and cohort with you.</p>
          <div className="mt-8 rounded-2xl bg-white p-6 text-slate-800 shadow-xl sm:p-8">
            <RequestAccessForm />
          </div>
          <p className="mt-4 text-center text-sm text-slate-400">
            Prefer email? <a className="font-medium text-slate-200 hover:text-white" href={`mailto:${brand.supportEmail}?subject=OHS%20Builder%20Education%20access%20request`}>{brand.supportEmail}</a>
          </p>
        </div>
      </section>

      {/* Assessment / compliance statement — clear, not loud */}
      <section aria-label="Assessment responsibility" className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-3xl px-5">
          <p className="text-center text-sm leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-300">OHS Builder Education provides a simulated workplace, evidence and assessment-workflow environment.</span>{" "}
            Competency decisions and nationally recognised credentials remain the responsibility of the relevant RTO.
          </p>
        </div>
      </section>

      {/* Footer — same identity as the rest of the site */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <Link to="/" className={`rounded-lg ${focusRing} focus-visible:ring-offset-slate-900`} aria-label="OHS Builder Victoria home"><Logo light /></Link>
            <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-300">
              <Link to="/" className="hover:text-white">OHS Builder Victoria</Link>
              <Link to="/help" className="hover:text-white">Help</Link>
              <Link to="/help/faq" className="hover:text-white">FAQ</Link>
              <Link to="/pricing" className="hover:text-white">Pricing</Link>
              <a href="#access" className="hover:text-white">Education access</a>
              <a href={`mailto:${brand.supportEmail}`} className="hover:text-white">{brand.supportEmail}</a>
            </nav>
          </div>
          <div className="mt-6 grid items-center gap-3 border-t border-slate-800/60 pt-5 text-center sm:grid-cols-[1.5fr_1fr]">
            <p className="text-[11px] text-slate-500 sm:text-left">{brand.copyright}</p>
            <p className="text-xs text-slate-500 sm:text-right">
              Designed &amp; architected by{" "}
              <a className="font-semibold text-slate-300 hover:text-white" href="https://nexxtnestgroup.com.au/" target="_blank" rel="noopener noreferrer">Nexxt Nest Group</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
