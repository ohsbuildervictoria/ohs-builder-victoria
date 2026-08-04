import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HelpShell from "../../components/help/HelpShell";
import { FAQ_CATEGORIES } from "../../data/help/faq";

// ============================================================================
// FAQ Centre — /help/faq
//
// The practical questions builders and tradies actually ask, grouped by
// category with a live text filter. The short "Questions builders ask" strip
// on the Pricing page links here for everything else.
// ============================================================================

export default function HelpFaqPage() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items:
        activeCat !== "all" && cat.key !== activeCat
          ? []
          : q.length < 2
            ? cat.items
            : cat.items.filter(
                (i) =>
                  i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)
              ),
    })).filter((cat) => cat.items.length > 0);
  }, [query, activeCat]);

  const total = FAQ_CATEGORIES.reduce((n, c) => n + c.items.length, 0);

  return (
    <HelpShell>
      <section className="mx-auto max-w-4xl px-5 pb-14 pt-4 sm:pt-8">
        <p className="text-sm text-slate-400">
          <Link to="/help" className="hover:text-white">
            Help Centre
          </Link>{" "}
          / <span className="text-slate-200">FAQ</span>
        </p>
        <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Frequently asked <span className="text-yellow-400">questions</span>
        </h1>
        <p className="mt-3 text-base text-slate-300">
          {total} answers across {FAQ_CATEGORIES.length} categories — from your
          first project to LTIFR. Can&apos;t find it? Email{" "}
          <a
            href="mailto:admin@ohsbuildervictoria.com.au"
            className="font-medium text-yellow-400 hover:text-yellow-300"
          >
            admin@ohsbuildervictoria.com.au
          </a>
          .
        </p>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter questions — try “resend”, “export”, “LTIFR”…"
          className="mt-6 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-yellow-500"
          aria-label="Filter FAQ"
        />

        {/* Category pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              activeCat === "all"
                ? "bg-yellow-500 text-blue-950"
                : "border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key === activeCat ? "all" : cat.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                activeCat === cat.key
                  ? "bg-yellow-500 text-blue-950"
                  : "border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
              }`}
            >
              {cat.icon} {cat.title}
            </button>
          ))}
        </div>

        {/* Q&A */}
        {visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400">
            Nothing matched “{query}”. Try a shorter word, or clear the filter.
          </p>
        ) : (
          visible.map((cat) => (
            <div key={cat.key} className="mt-10">
              <h2 className="text-lg font-bold text-white">
                {cat.icon} {cat.title}
              </h2>
              <div className="mt-4 space-y-3">
                {cat.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-slate-700 bg-slate-800/50 p-5 open:bg-slate-800"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-white marker:hidden">
                      <span className="mr-2 inline-block text-yellow-400 transition group-open:rotate-90">
                        ›
                      </span>
                      {item.q}
                    </summary>
                    <p className="mt-2 pl-5 text-sm leading-relaxed text-slate-300">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </HelpShell>
  );
}
