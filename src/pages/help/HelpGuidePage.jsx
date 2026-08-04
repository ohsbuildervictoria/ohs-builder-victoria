import { Link, Navigate, useParams } from "react-router-dom";
import HelpShell from "../../components/help/HelpShell";
import HelpArticleBody from "../../components/help/HelpArticleBody";
import { guideByRole } from "../../data/help";

// ============================================================================
// One role's guide — /help/:role lists its articles; /help/:role/:slug shows
// one article with the full article list alongside for quick switching.
// ============================================================================

export default function HelpGuidePage() {
  const { role, slug } = useParams();
  const guide = guideByRole(role);

  if (!guide) return <Navigate to="/help" replace />;

  const article = slug ? guide.articles.find((a) => a.slug === slug) : null;
  if (slug && !article) return <Navigate to={`/help/${guide.role}`} replace />;

  return (
    <HelpShell>
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-4 sm:pt-8">
        <p className="text-sm text-slate-400">
          <Link to="/help" className="hover:text-white">
            Help Centre
          </Link>{" "}
          / <span className="text-slate-200">{guide.title}</span>
          {article && <span> / {article.title}</span>}
        </p>

        {!article ? (
          <>
            <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
              {guide.icon} {guide.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300">{guide.blurb}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guide.articles.map((a) => (
                <Link
                  key={a.slug}
                  to={`/help/${guide.role}/${a.slug}`}
                  className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-5 transition hover:border-yellow-500/60 hover:bg-slate-800"
                >
                  <span className="text-2xl" aria-hidden>
                    {a.icon}
                  </span>
                  <h2 className="mt-2 font-semibold text-white">{a.title}</h2>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-400">
                    {a.summary}
                  </p>
                  <p className="mt-3 text-xs font-bold text-yellow-400">Read the guide →</p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
            {/* Article switcher */}
            <nav className="lg:border-r lg:border-slate-800 lg:pr-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {guide.title}
              </p>
              <ul className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
                {guide.articles.map((a) => (
                  <li key={a.slug} className="shrink-0">
                    <Link
                      to={`/help/${guide.role}/${a.slug}`}
                      className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition lg:whitespace-normal ${
                        a.slug === article.slug
                          ? "bg-yellow-500 text-blue-950"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {a.icon} {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Article */}
            <article className="max-w-3xl">
              <h1 className="text-3xl font-extrabold text-white">
                {article.icon} {article.title}
              </h1>
              <p className="mt-2 text-base text-slate-300">{article.summary}</p>
              <HelpArticleBody article={article} dark />
            </article>
          </div>
        )}
      </section>
    </HelpShell>
  );
}
