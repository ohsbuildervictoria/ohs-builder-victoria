import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HelpShell from "../../components/help/HelpShell";
import { GUIDES, searchHelp } from "../../data/help";

// ============================================================================
// Help & Documentation Centre front door — /help
//
// Three role-based guides (builder, stakeholder, administrator), a search box
// across every article and FAQ, and the FAQ Centre. The in-app Help drawers
// deep-link into the same articles.
// ============================================================================

export default function HelpCentre() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchHelp(query), [query]);

  return (
    <HelpShell>
      {/* Hero + search */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6 text-center sm:pt-12">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
          How can we <span className="text-yellow-400">help?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
          Every screen, every workflow, every record — explained the way it
          works on site. Pick your guide below or search the lot.
        </p>
        <div className="mx-auto mt-6 max-w-xl">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides and FAQs — try “SWMS”, “induction”, “invite”…"
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none focus:border-yellow-500"
            aria-label="Search help"
          />
          {query.trim().length > 1 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-left">
              {results.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-400">
                  Nothing matched “{query}”. Try a shorter word, or browse the
                  guides below.
                </p>
              ) : (
                results.map((r) => (
                  <Link
                    key={`${r.type}-${r.href}-${r.title}`}
                    to={r.href}
                    className="block border-b border-slate-700/60 px-4 py-3 last:border-0 hover:bg-slate-700/50"
                  >
                    <p className="text-sm font-semibold text-white">
                      {r.icon} {r.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{r.snippet}</p>
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-yellow-500">
                      {r.badge}
                    </p>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* Role guides */}
      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-12 md:grid-cols-3">
        {GUIDES.map((g) => (
          <Link
            key={g.role}
            to={`/help/${g.role}`}
            className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 transition hover:border-yellow-500/60 hover:bg-slate-800"
          >
            <span className="text-3xl" aria-hidden>
              {g.icon}
            </span>
            <h2 className="mt-3 text-xl font-bold text-white">{g.title}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-400">{g.blurb}</p>
            <p className="mt-4 text-sm font-bold text-yellow-400">
              {g.articles.length} guides →
            </p>
          </Link>
        ))}
      </section>

      {/* FAQ centre */}
      <section className="border-y border-slate-800 bg-slate-950/40 py-12">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="text-2xl font-bold text-white">Frequently asked questions</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            The practical questions builders actually ask — invitations,
            records, exports, billing, LTIFR and the rest — answered straight.
          </p>
          <Link
            to="/help/faq"
            className="mt-6 inline-block rounded-xl bg-yellow-500 px-8 py-3.5 text-base font-bold text-blue-950 shadow-lg transition hover:bg-yellow-400"
          >
            Browse the FAQ Centre →
          </Link>
        </div>
      </section>

      {/* In-app help pointer */}
      <section className="mx-auto max-w-3xl px-5 py-12 text-center">
        <h2 className="text-xl font-bold text-white">Help without leaving the page</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Inside the workspace and the stakeholder portal, the{" "}
          <span className="font-semibold text-slate-200">❓ Help</span> button opens
          the guide for the screen you&apos;re on — purpose, steps, a short
          silent walkthrough and its FAQs — right there in a side panel.
        </p>
      </section>
    </HelpShell>
  );
}
