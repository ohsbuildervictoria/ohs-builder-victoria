import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/shared/Logo";
import { useAuth } from "../hooks/useAuth";
import { brand } from "../data/constants";

// Public front door at "/" — explains the product, then hands off to the
// workspace (builders) or the stakeholder portal (tradies). While the pilot
// bypass is on, "View live demo" enters David's workspace with no password;
// with the bypass off the same button lands on the real login screen.

const FEATURES = [
  {
    icon: "🏗️",
    title: "Projects & compliance",
    text: "Every project tracked with live compliance, build progress, contract details and stakeholder counts — all in one dashboard.",
  },
  {
    icon: "📋",
    title: "SWMS library, A–Z",
    text: "Safe Work Method Statements for 75+ construction trades, with high-risk work, PPE and legislation references built in.",
  },
  {
    icon: "🚨",
    title: "Incidents & LTIFR",
    text: "Log incidents and near misses, assign corrective actions, and watch your Lost Time Injury Frequency Rate calculate itself.",
  },
  {
    icon: "📔",
    title: "Site diary",
    text: "Daily records of weather, labour, hours on site, deliveries and site notes — the hours feed your safety statistics automatically.",
  },
  {
    icon: "🗣️",
    title: "Toolbox meetings",
    text: "Schedule and record toolbox talks with attendance and sign-off tracking, so every briefing leaves a paper trail.",
  },
  {
    icon: "📱",
    title: "Stakeholder portal",
    text: "Every tradie gets their own mobile sign-in for inductions, the safety quiz and SWMS sign-off — no paperwork chasing.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Set up your project",
    text: "Create the project with its address, contract and start date — takes under a minute.",
  },
  {
    step: "2",
    title: "Add your stakeholders",
    text: "Each subbie and tradie gets a username for the mobile portal to complete their induction, quiz and SWMS.",
  },
  {
    step: "3",
    title: "Stay WorkSafe-ready",
    text: "Compliance, incidents, diary and LTIFR update live — your records are audit-ready every day.",
  },
];

export default function Landing() {
  const { enterDemo } = useAuth();
  const navigate = useNavigate();
  const [demoBusy, setDemoBusy] = useState(false);

  const onDemo = async () => {
    setDemoBusy(true);
    try {
      await enterDemo();
      navigate("/builder/dashboard");
    } catch {
      setDemoBusy(false);
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo light />
        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-blue-950 transition hover:bg-yellow-400"
          >
            Start free trial
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center sm:pt-16">
        <p className="mx-auto mb-4 inline-block rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-300">
          {brand.tagline}
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
          Site safety compliance,{" "}
          <span className="text-yellow-400">built for Victorian builders</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          {brand.fullName} runs your OHS obligations — inductions, SWMS,
          incident reporting, site diary and toolbox talks — in one place, from
          the site office or the ute. Aligned with the OHS Act 2004 (Vic) and
          OHS Regulations 2017.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="w-full rounded-xl bg-yellow-500 px-8 py-3.5 text-base font-bold text-blue-950 shadow-lg transition hover:bg-yellow-400 sm:w-auto"
          >
            Start your free trial →
          </Link>
          <button
            type="button"
            onClick={onDemo}
            disabled={demoBusy}
            className="w-full rounded-xl border border-slate-600 px-8 py-3.5 text-base font-semibold text-slate-200 transition hover:border-slate-400 hover:text-white disabled:opacity-60 sm:w-auto"
          >
            {demoBusy ? "Loading demo…" : "View live demo"}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-slate-400">
          Tradesperson with a sign-in?{" "}
          <Link to="/stakeholder" className="font-medium text-slate-200 hover:text-white">
            Stakeholder portal →
          </Link>
        </p>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16 text-slate-800">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Everything your safety system needs
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            Replace the folder of spreadsheets and the glovebox full of paper
            with one live system your whole site can use.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="text-2xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
            Up and running in an afternoon
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-slate-700/60 bg-slate-800/50 p-6"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500 text-sm font-extrabold text-blue-950">
                  {s.step}
                </span>
                <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/signup"
              className="inline-block rounded-xl bg-yellow-500 px-8 py-3.5 text-base font-bold text-blue-950 shadow-lg transition hover:bg-yellow-400"
            >
              Start your free trial →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:text-left">
          <Logo light />
          <p className="text-xs text-slate-500">
            {brand.fullName} · {brand.domain} ·{" "}
            <a
              className="font-medium text-slate-400 hover:text-white"
              href={`mailto:${brand.supportEmail}`}
            >
              {brand.supportEmail}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
