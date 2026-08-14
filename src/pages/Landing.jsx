import { Link } from "react-router-dom";
import Logo from "../components/shared/Logo";
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo light />
        <nav className="flex items-center gap-3">
          <Link
            to="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Pricing
          </Link>
          <Link
            to="/help"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Help
          </Link>
          {/* No trial CTA up here — the hero owns that ask. The header is for
              orientation; selling to someone who hasn't scrolled yet is how
              nav ends up looking like a billboard. */}
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Log in
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
        </div>
        <p className="mt-4 text-center text-sm text-slate-400">
          Tradesperson with a sign-in?{" "}
          <Link to="/stakeholder" className="font-medium text-slate-200 hover:text-white">
            Stakeholder portal →
          </Link>
        </p>
      </section>

      {/* ------------------------------------------------------------------
          Pilot builder — Arlington Homes.

          Everything stated here is drawn from Arlington's own public material
          (arlingtonhomes.com.au): 30+ years, family-owned Melbourne boutique
          builder, registration CDB-U 50292, and the kind of work they do.
          NO SUBURB — David confirmed 25 Jul 2026 that the Essendon address on
          their website is out of date; keep this to "Melbourne" unless he
          gives a current one.
          No award claims (their own site makes none) and NO testimonial — a
          quote goes in only when David has written and approved one. Their
          name and logo appear here with their permission as our pilot
          partner; it is not an endorsement of the product and shouldn't be
          worded as one.
         ------------------------------------------------------------------ */}
      <section className="border-y border-slate-800 bg-slate-950/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">
            Our pilot builder
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center text-2xl font-bold text-white sm:text-3xl">
            Built with a Melbourne builder, on live sites
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-300">
            OHS Builder Victoria isn&apos;t designed in an office and handed to
            builders. It&apos;s being built alongside{" "}
            <span className="font-semibold text-white">Arlington Homes</span> —
            their sites, their subbies, their paperwork — so every screen has
            had to earn its place on a real job.
          </p>

          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/50">
            <div className="grid gap-8 p-7 sm:p-9 md:grid-cols-[minmax(0,260px)_1fr]">
              <div>
                <div className="rounded-xl bg-white p-5">
                  <img
                    src="/arlington-homes.png"
                    alt="Arlington Homes"
                    className="w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">
                  Registered building practitioner
                  <br />
                  <span className="font-mono text-slate-300">CDB-U 50292</span>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  Arlington Homes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  A family-owned boutique builder with more than 30 years
                  behind them, Arlington build architecturally crafted homes
                  across Melbourne — custom homes, townhouses, dual occupancy
                  and multi-unit developments, from Federation through to
                  contemporary. They take on a handful of homes at a time, so
                  the person you deal with is the person building your home.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Managing Director{" "}
                  <span className="font-medium text-white">David Caruana</span>{" "}
                  has been developing and building since his first unit
                  development in the 1990s. Arlington&apos;s own standard —
                  operating &ldquo;with full regard for the safety and health
                  of our contractors, customers and the environment&rdquo; — is
                  the bar this platform was written against.
                </p>

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-700/60 pt-5 sm:grid-cols-4">
                  {[
                    ["30+", "years building"],
                    ["Melbourne", "custom homes & units"],
                    ["Boutique", "owner-led delivery"],
                    ["Live", "pilot since 2026"],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <dt className="text-base font-bold text-yellow-400">{value}</dt>
                      <dd className="mt-0.5 text-xs leading-snug text-slate-400">{label}</dd>
                    </div>
                  ))}
                </dl>

                <a
                  href="https://www.arlingtonhomes.com.au"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-5 inline-block text-sm font-medium text-yellow-400 hover:text-yellow-300"
                >
                  arlingtonhomes.com.au →
                </a>
              </div>
            </div>
          </div>
        </div>
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

      {/* Footer — links row up top, then a quiet legal/credit bar so no single
          line carries three unrelated jobs at once. */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <Logo light />
            <p className="text-xs text-slate-400">
              <Link to="/help" className="font-medium hover:text-white">
                Help &amp; Documentation
              </Link>{" "}
              ·{" "}
              <Link to="/help/faq" className="font-medium hover:text-white">
                FAQ
              </Link>{" "}
              ·{" "}
              <a className="font-medium hover:text-white" href={`mailto:${brand.supportEmail}`}>
                {brand.supportEmail}
              </a>
            </p>
          </div>
          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-slate-800/60 pt-4 text-center sm:flex-row sm:text-left">
            <p className="text-[11px] text-slate-500">{brand.copyright}</p>
            <p className="text-[11px] text-slate-500">
              Designed &amp; architected by{" "}
              <a
                className="font-semibold text-slate-300 hover:text-white"
                href="https://nexxtnestgroup.com.au/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Nexxt Nest Group
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
