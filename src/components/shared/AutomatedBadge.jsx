import { AUTOMATED_LABEL, isAutomatedAccount } from "../../lib/accountKind";

// Renders nothing for a human; a small explicit marker for the SiteIQ persona.
export default function AutomatedBadge({ name, role, className = "" }) {
  if (!isAutomatedAccount({ name, role })) return null;
  return (
    <span
      title="This account is operated by SiteIQ (automated). Its writes happen only after a signed human approval."
      className={`inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-800 ring-1 ring-violet-600/20 ${className}`}
    >
      <span aria-hidden>⚙</span> {AUTOMATED_LABEL}
    </span>
  );
}
