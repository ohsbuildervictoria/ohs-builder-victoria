import { useState, useRef, useEffect } from "react";
import {
  VIEWBOX,
  BODY_VIEWS,
  BODY_SHAPES,
  BACK_DETAIL,
  regionAt,
  describeMark,
} from "../../lib/bodyMap";

// ============================================================================
// Front/back body diagram for incident reporting.
//
// <BodyMap value onChange />  — tap the figure to mark where the injury or
//                               impact happened; tap a mark to remove it.
// <BodyMap value readOnly />  — the same figure on the incident record.
//
// Both views are shown side by side rather than behind a toggle: on a phone at
// the site gate, one tap should record the mark, not two. Geometry and region
// naming live in src/lib/bodyMap.js so the PDF draws the identical figure.
// ============================================================================

function Figure({ view, shapes, detail }) {
  return (
    <>
      {shapes.map((sh, i) =>
        sh.type === "ellipse" ? (
          <ellipse
            key={i}
            cx={sh.cx}
            cy={sh.cy}
            rx={sh.rx}
            ry={sh.ry}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="1.5"
          />
        ) : (
          <rect
            key={i}
            x={sh.x}
            y={sh.y}
            width={sh.w}
            height={sh.h}
            rx={sh.rx}
            fill="#f1f5f9"
            stroke="#64748b"
            strokeWidth="1.5"
          />
        )
      )}
      {view === "back" &&
        detail.map((l, i) => (
          <line
            key={`d${i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="#64748b"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        ))}
    </>
  );
}

function BodyView({ view, label, marks, onAdd, readOnly }) {
  const mine = marks
    .map((m, idx) => ({ ...m, idx }))
    .filter((m) => m.view === view);

  const handleClick = (e) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onAdd({
      view,
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      region: regionAt(view, x, y),
    });
  };

  return (
    <div className="flex-1">
      <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <svg
        viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
        onClick={handleClick}
        role={readOnly ? "img" : "button"}
        aria-label={
          readOnly
            ? `${label} view — ${mine.length} marked point${mine.length === 1 ? "" : "s"}`
            : `${label} view — tap to mark where it happened`
        }
        className={`w-full rounded-lg border bg-white ${
          readOnly
            ? "border-slate-200"
            : "cursor-crosshair border-slate-300 hover:border-blue-900"
        }`}
        style={{ maxHeight: readOnly ? 200 : 260 }}
      >
        <Figure view={view} shapes={BODY_SHAPES} detail={BACK_DETAIL} />
        {/* Marks are drawn but not interactive: a 6 px dot is a hopeless tap
            target on a phone, and a tap that sometimes adds and sometimes
            removes is worse than one that always adds. Removal is the ✕ on
            the numbered list below, which is a real button. */}
        {mine.map((m) => (
          <g key={m.idx} style={{ pointerEvents: "none" }}>
            <title>{describeMark(m)}</title>
            <circle
              cx={m.x * VIEWBOX.w}
              cy={m.y * VIEWBOX.h}
              r="6"
              fill="#ef4444"
              fillOpacity="0.9"
              stroke="#7f1d1d"
              strokeWidth="1.2"
            />
            <text
              x={m.x * VIEWBOX.w}
              y={m.y * VIEWBOX.h + 2.6}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill="#ffffff"
            >
              {m.idx + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// The marks live HERE and are pushed up through onChange after each change.
//
// `value` seeds the list on mount only. To clear the diagram for a new report,
// or load a different incident's marks, give the element a different `key` so
// it remounts — see the callers in Incidents.jsx.
export default function BodyMap({ value = [], onChange, readOnly = false, compact = false }) {
  const [marks, setMarks] = useState(value || []);
  const list = readOnly ? value || [] : marks;

  // Functional updaters: two taps in quick succession must both land, not
  // compute from the same starting list and overwrite each other.
  const add = (mark) => setMarks((prev) => [...prev, mark]);
  const remove = (idx) => setMarks((prev) => prev.filter((_, i) => i !== idx));

  // Tell the parent after each committed change. Held in a ref so a changing
  // onChange identity can't re-fire it.
  const notify = useRef(onChange);
  useEffect(() => {
    notify.current = onChange;
  });
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!readOnly) notify.current?.(marks);
  }, [marks, readOnly]);

  if (readOnly && !list.length) return null;

  return (
    <div>
      {!readOnly && (
        <p className="mb-2 text-xs text-slate-500">
          Tap the diagram to mark where the injury or impact happened — add as
          many points as you need, and remove one with the ✕ beside it below.
          Left and right are the injured person&apos;s own left and right.
        </p>
      )}
      <div className={`flex gap-3 ${compact ? "max-w-xs" : "max-w-md"}`}>
        {BODY_VIEWS.map((v) => (
          <BodyView
            key={v.key}
            view={v.key}
            label={v.label}
            marks={list}
            onAdd={add}
            readOnly={readOnly}
          />
        ))}
      </div>

      {list.length > 0 ? (
        <ol className="mt-2 space-y-0.5 text-xs text-slate-600">
          {list.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {i + 1}
              </span>
              {describeMark(m)}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Remove mark ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        !readOnly && (
          <p className="mt-2 text-xs text-slate-400">
            No body location marked yet — leave blank if nobody was hurt.
          </p>
        )
      )}
    </div>
  );
}
