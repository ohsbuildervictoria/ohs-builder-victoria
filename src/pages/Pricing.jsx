import { Link } from "react-router-dom";
import Logo from "../components/shared/Logo";
import { brand } from "../data/constants";
import { PLANS, TRIAL, BILLING_LIVE, formatPrice } from "../data/pricing";

// ============================================================================
// Public pricing page.
//
// Billing is not wired: the CTAs start a free trial (a real signup) rather
// than pretending to take money. When Stripe is connected, swap the CTA for a
// checkout link — the tier data itself lives in src/data/pricing.js and is
// shared with the in-app Subscription tab.
// ============================================================================

const FAQ = [
  {
    q: "Do I need a credit card to start?",
    a: `No. The ${TRIAL.days}-day trial is full-featured and needs nothing but an email address.`,
  },
  {
    q: "What counts as a stakeholder?",
    a: "Anyone you add to a site — your own staff, a subbie's crew, suppliers. They get their own sign-in for inductions, SWMS and their tickets.",
  },
  {
    q: "Is my data stored in Australia?",
    a: "Yes. Records are held in Australia-region cloud infrastructure, protected by row-level security so one builder's data is structurally isolated from another's.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes — up or down, at any time. Your records stay exactly as they are.",
  },
  {
    q: "Does this replace my OHS obligations?",
    a: "No. The platform helps you meet and evidence your duties under the OHS Act 2004 (Vic) and OHS Regulations 2017; the legal responsibility stays with you as the builder.",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/">
          <Logo light />
        </Link>
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

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6 text-center sm:pt-12">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
          Simple pricing, <span className="text-yellow-400">built for builders</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
          One subscription covers your whole company — every project, every
          subbie, every record. No per-seat charge for tradies, no lock-in
          contract.
        </p>
        <p className="mx-auto mt-4 inline-block rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-300">
          {TRIAL.days}-day free trial · no credit card
        </p>
      </section>

      {/* Tiers */}
      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-16 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`flex flex-col rounded-2xl border p-6 ${
              plan.popular
                ? "border-yellow-500 bg-slate-800 shadow-xl shadow-yellow-500/5"
                : "border-slate-700 bg-slate-800/50"
            }`}
          >
            {plan.popular && (
              <span className="mb-3 inline-block self-start rounded-full bg-yellow-500 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-950">
                Most popular
              </span>
            )}
            <h2 className="text-xl font-bold text-white">{plan.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{plan.blurb}</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-white">
                {formatPrice(plan)}
              </span>
              <span className="text-sm text-slate-400">
                {plan.price == null ? "" : `+ GST ${plan.cadence}`}
              </span>
            </div>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-300">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="mt-0.5 text-green-400">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {plan.price == null ? (
              <a
                href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent("Enterprise enquiry — OHS Builder Victoria")}`}
                className="mt-6 rounded-xl border border-slate-500 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-700"
              >
                Talk to us
              </a>
            ) : (
              <Link
                to="/signup"
                className={`mt-6 rounded-xl px-5 py-3 text-center text-sm font-bold transition ${
                  plan.popular
                    ? "bg-yellow-500 text-blue-950 hover:bg-yellow-400"
                    : "border border-slate-500 text-white hover:bg-slate-700"
                }`}
              >
                Start free trial
              </Link>
            )}
            {!BILLING_LIVE && plan.price != null && (
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Card details aren't collected during the trial.
              </p>
            )}
          </div>
        ))}
      </section>

      {/* What every plan includes */}
      <section className="border-y border-slate-800 bg-slate-950/40 py-12">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-bold text-white">
            Every plan includes
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["🔒", "Australian data hosting", "Row-level security isolates every builder's records."],
              ["📄", "Unlimited PDF exports", "Branded, audit-ready documents for any record."],
              ["📱", "Works on site", "Phone-first, and keeps working through a dead spot."],
              // Not "unlimited" — every tier carries a stakeholder cap a few
              // hundred pixels below this, and a builder who reads the promise
              // first has a fair grievance when their crew hits the ceiling.
              ["👷", "No per-seat charge", "Your crew counts toward your plan, not your invoice."],
            ].map(([icon, title, text]) => (
              <div key={title}>
                <span className="text-2xl">{icon}</span>
                <h3 className="mt-2 font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="text-center text-2xl font-bold text-white">
          Questions builders ask
        </h2>
        <div className="mt-8 space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <h3 className="font-semibold text-white">{item.q}</h3>
              <p className="mt-1.5 text-sm text-slate-300">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center">
          <Link
            to="/help/faq"
            className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
          >
            More questions? Browse the full FAQ Centre →
          </Link>
        </p>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        <p>
          {brand.fullName} · {brand.domain} ·{" "}
          <a href={`mailto:${brand.supportEmail}`} className="hover:text-slate-300">
            {brand.supportEmail}
          </a>
        </p>
        <p className="mt-2">
          <Link to="/" className="hover:text-slate-300">
            ← Back to home
          </Link>
        </p>
      </footer>
    </div>
  );
}
