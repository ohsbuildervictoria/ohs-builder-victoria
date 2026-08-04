import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import HelpArticleBody from "../help/HelpArticleBody";
import { findArticleByPath, relatedArticlesByPath } from "../../data/help";

// ============================================================================
// Contextual ❓ Help — the button plus the slide-over panel.
//
// Renders the guide article for whatever page the user is on (matched by
// route), so nobody has to leave the screen to learn it: purpose, steps,
// screenshot, the short silent walkthrough and the page's FAQs, with a link
// to the full Help Centre. The same article data drives /help.
// ============================================================================

export default function HelpDrawer({ compact = false }) {
  // The drawer is "open for" one pathname; navigating away changes the
  // pathname and the drawer closes by derivation — stale help is worse than
  // none, and no effect is needed to keep the two in sync.
  const [openFor, setOpenFor] = useState(null);
  const location = useLocation();
  const match = findArticleByPath(location.pathname);
  const open = openFor === location.pathname;
  const setOpen = (v) => setOpenFor(v ? location.pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpenFor(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!match) return null;
  const { guide, article } = match;
  const related = relatedArticlesByPath(location.pathname, article.slug);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Help for ${article.title}`}
        title={`How ${article.title} works`}
        className={
          compact
            ? "flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white hover:bg-white/25"
            : "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        }
      >
        <span aria-hidden>❓</span>
        {!compact && <span className="hidden sm:inline">Help</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Page help">
          {/* Scrim */}
          <button
            aria-label="Close help"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/50"
          />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {guide.title} · Help
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                  {article.icon} {article.title}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-thin">
              <HelpArticleBody article={article} />

              {related.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Also on this page
                  </p>
                  <ul className="mt-2 space-y-1">
                    {related.map(({ guide: g, article: a }) => (
                      <li key={a.slug}>
                        <Link
                          to={`/help/${g.role}/${a.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-blue-700 hover:underline"
                        >
                          {a.icon} {a.title} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
              <Link
                to={`/help/${guide.role}/${article.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-blue-900 hover:underline"
              >
                Open the full guide in the Help Centre →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
