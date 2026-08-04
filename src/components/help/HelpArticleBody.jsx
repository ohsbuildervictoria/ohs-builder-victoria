import { DocScreenshot, DocVideo } from "./DocMedia";

// ============================================================================
// Renders one guide article — the same data drives the full Help Centre page
// (dark, marketing shell) and the in-app Help drawer (light, workspace shell),
// so the two can never drift apart. `dark` switches the palette only.
// ============================================================================

function SectionHeading({ children, dark }) {
  return (
    <h3
      className={`mt-6 text-xs font-bold uppercase tracking-wider ${
        dark ? "text-yellow-400" : "text-blue-900"
      }`}
    >
      {children}
    </h3>
  );
}

function Prose({ children, dark }) {
  return (
    <p className={`mt-1.5 text-sm leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>
      {children}
    </p>
  );
}

function BulletList({ items, dark, marker = "•" }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-1.5 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed">
          <span className={dark ? "text-yellow-400" : "text-blue-900"} aria-hidden>
            {marker}
          </span>
          <span className={dark ? "text-slate-300" : "text-slate-600"}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items, dark }) {
  if (!items?.length) return null;
  return (
    <ol className="mt-1.5 space-y-2">
      {items.map((item, i) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-[11px] font-extrabold text-blue-950">
            {i + 1}
          </span>
          <span className={dark ? "text-slate-300" : "text-slate-600"}>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function HelpArticleBody({ article, dark = false, compact = false }) {
  if (!article) return null;

  return (
    <div>
      <SectionHeading dark={dark}>Purpose</SectionHeading>
      <Prose dark={dark}>{article.purpose}</Prose>

      <SectionHeading dark={dark}>Who should use it</SectionHeading>
      <Prose dark={dark}>{article.who}</Prose>

      {!compact && <DocVideo video={article.video} dark={dark} />}

      <SectionHeading dark={dark}>How to use it</SectionHeading>
      <NumberedList items={article.how} dark={dark} />

      <DocScreenshot shot={article.screenshot} dark={dark} />

      <SectionHeading dark={dark}>What records are created</SectionHeading>
      <BulletList items={article.records} dark={dark} marker="📄" />

      <SectionHeading dark={dark}>What you get out of it</SectionHeading>
      <Prose dark={dark}>{article.value}</Prose>

      {!compact && (
        <>
          <SectionHeading dark={dark}>Best practice</SectionHeading>
          <BulletList items={article.bestPractice} dark={dark} marker="✓" />

          <SectionHeading dark={dark}>Common mistakes</SectionHeading>
          <BulletList items={article.mistakes} dark={dark} marker="✗" />
        </>
      )}

      {article.faqs?.length > 0 && (
        <>
          <SectionHeading dark={dark}>FAQs</SectionHeading>
          <div className="mt-1.5 space-y-3">
            {article.faqs.map((f) => (
              <div
                key={f.q}
                className={`rounded-xl border p-3.5 ${
                  dark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-800"}`}>
                  {f.q}
                </p>
                <p className={`mt-1 text-sm leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
