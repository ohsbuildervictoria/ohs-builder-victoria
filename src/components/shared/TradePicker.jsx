import { useState } from "react";
import { swmsLibrary } from "../../data/swmsLibrary";

// ============================================================================
// Work types for one stakeholder on one site. One person can do more than one
// kind of work (carpentry + cladding); each work type maps to its SWMS.
// Chips + a suggestion list drawn from the SWMS library (free text allowed,
// because the library is a starting point, not a closed list).
// ============================================================================
export default function TradePicker({ value = [], onChange, inputId = "trade-picker", autoFocus = false }) {
  const [draft, setDraft] = useState("");
  const add = (raw) => {
    const t = (raw ?? draft).trim();
    if (!t) return;
    if (!value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setDraft("");
  };
  const remove = (t) => onChange(value.filter((v) => v !== t));
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Selected work types">
          {value.map((t) => (
            <li key={t} className="flex items-center gap-1 rounded-full bg-blue-900 px-2.5 py-1 text-xs font-medium text-white">
              {t}
              <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t}`} className="rounded-full px-1 leading-none hover:bg-white/20">×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          list={`${inputId}-options`}
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={value.length ? "Add another work type…" : "e.g. Carpenter – Framer"}
          className="cmp-input flex-1"
          autoComplete="off"
        />
        <button type="button" onClick={() => add()} disabled={!draft.trim()} className="rounded-lg border border-blue-900 px-3 text-sm font-semibold text-blue-900 disabled:opacity-40">
          Add
        </button>
      </div>
      <datalist id={`${inputId}-options`}>
        {swmsLibrary.map((s) => <option key={s.id} value={s.trade} />)}
      </datalist>
    </div>
  );
}
