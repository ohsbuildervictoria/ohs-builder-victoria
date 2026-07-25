// ============================================================================
// OHS Builder Victoria — body diagram geometry (SINGLE SOURCE OF TRUTH)
//
// One definition of the figure, used by three consumers that must never
// disagree: the clickable form control (BodyMap.jsx), the read-only view on
// the incident record, and the PNG baked into the exported PDF.
//
// Marks are stored on the incident as:
//   [{ view: "front"|"back", x: 0–1, y: 0–1, region: "Left forearm" }, …]
// x/y are fractions of the diagram box, so a mark lands in the same anatomical
// place whether it is drawn at 180 px on a phone or 150 pt in a PDF.
// ============================================================================

export const VIEWBOX = { w: 100, h: 220 };

export const BODY_VIEWS = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
];

// The figure, drawn once. Head, neck, torso, arms hanging at the sides, legs.
// Deliberately a plain outline — this is an incident form, not an anatomy
// chart, and it has to read at a glance on a phone in the sun.
export const BODY_SHAPES = [
  { type: "ellipse", cx: 50, cy: 15, rx: 10, ry: 12 },      // head
  { type: "rect", x: 45.5, y: 25, w: 9, h: 8, rx: 3 },      // neck
  { type: "rect", x: 32, y: 31, w: 36, h: 73, rx: 9 },      // torso
  { type: "rect", x: 18, y: 36, w: 12, h: 76, rx: 6 },      // right arm (viewer left)
  { type: "rect", x: 70, y: 36, w: 12, h: 76, rx: 6 },      // left arm
  { type: "ellipse", cx: 24, cy: 118, rx: 6, ry: 7 },       // right hand
  { type: "ellipse", cx: 76, cy: 118, rx: 6, ry: 7 },       // left hand
  { type: "rect", x: 35, y: 98, w: 13, h: 98, rx: 6 },      // right leg
  { type: "rect", x: 52, y: 98, w: 13, h: 98, rx: 6 },      // left leg
  { type: "rect", x: 33, y: 194, w: 15, h: 12, rx: 5 },     // right foot
  { type: "rect", x: 52, y: 194, w: 15, h: 12, rx: 5 },     // left foot
];

// Back-view-only detail so the two diagrams are visually distinguishable at a
// glance — a spine line and the shoulder blades.
export const BACK_DETAIL = [
  { type: "line", x1: 50, y1: 36, x2: 50, y2: 100 },
  { type: "line", x1: 39, y1: 44, x2: 44, y2: 56 },
  { type: "line", x1: 61, y1: 44, x2: 56, y2: 56 },
];

// ---------------------------------------------------------------------------
// Region naming
//
// A dot on a picture is not a record. Every mark also resolves to a written
// body region, so the incident reads correctly in the PDF, in a WorkSafe
// notification and in any future export that has no picture at all.
//
// Left/right are always the INJURED PERSON'S left and right, which is the
// convention every medical and incident form uses. On the front view the
// person faces you, so their right is on your left; on the back view it flips.
// ---------------------------------------------------------------------------
function side(view, x) {
  const personsLeft = view === "front" ? x > 0.5 : x < 0.5;
  return personsLeft ? "Left" : "Right";
}

export function regionAt(view, x, y) {
  const s = side(view, x);
  const central = x >= 0.32 && x <= 0.68;
  const front = view === "front";

  // Head and neck
  if (y < 0.125) {
    if (y < 0.055) return front ? "Head (top)" : "Head (back)";
    return front ? "Face" : "Head (back)";
  }
  if (y < 0.152) return front ? "Neck (front)" : "Neck (back)";

  // Arms — anything outside the torso column
  if (!central) {
    if (y < 0.21) return `${s} shoulder`;
    if (y < 0.30) return `${s} upper arm`;
    if (y < 0.36) return `${s} elbow`;
    if (y < 0.49) return `${s} forearm`;
    if (y < 0.58) return `${s} wrist / hand`;
    return `${s} arm`;
  }

  // Torso
  if (y < 0.29) return front ? "Chest" : "Upper back";
  if (y < 0.39) return front ? "Abdomen" : "Lower back";
  if (y < 0.46) return front ? "Groin / hip" : "Buttocks";

  // Legs
  if (y < 0.62) return `${s} thigh`;
  if (y < 0.69) return front ? `${s} knee` : `${s} knee (back)`;
  if (y < 0.87) return front ? `${s} shin` : `${s} calf`;
  return `${s} ankle / foot`;
}

// Human-readable one-liner for the record: "Front — Left forearm".
export function describeMark(mark) {
  const view = mark.view === "back" ? "Back" : "Front";
  return `${view} — ${mark.region || regionAt(mark.view, mark.x, mark.y)}`;
}

// Every marked region, de-duplicated, in the order they were added. This is
// what a reader actually wants ("left forearm and left wrist"), not a list of
// coordinates.
export function summariseMarks(marks = []) {
  const seen = new Set();
  const out = [];
  for (const m of marks) {
    const label = describeMark(m);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

// ---------------------------------------------------------------------------
// SVG string builder — the same figure, for consumers that can't render JSX
// (the PDF export renders this string to a canvas).
// ---------------------------------------------------------------------------
function shapeToSvg(sh, fill, stroke) {
  if (sh.type === "ellipse") {
    return `<ellipse cx="${sh.cx}" cy="${sh.cy}" rx="${sh.rx}" ry="${sh.ry}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  }
  if (sh.type === "line") {
    return `<line x1="${sh.x1}" y1="${sh.y1}" x2="${sh.x2}" y2="${sh.y2}" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  return `<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}" rx="${sh.rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

export function bodySvgString(view, marks = [], { label = true } = {}) {
  const fill = "#f1f5f9";
  const stroke = "#64748b";
  const shapes = BODY_SHAPES.map((s) => shapeToSvg(s, fill, stroke)).join("");
  const detail = view === "back" ? BACK_DETAIL.map((s) => shapeToSvg(s, "none", stroke)).join("") : "";
  const mine = marks.filter((m) => m.view === view);
  const dots = mine
    .map((m, i) => {
      const cx = m.x * VIEWBOX.w;
      const cy = m.y * VIEWBOX.h;
      return `<circle cx="${cx}" cy="${cy}" r="6" fill="#ef4444" fill-opacity="0.9" stroke="#7f1d1d" stroke-width="1.2"/>
        <text x="${cx}" y="${cy + 2.6}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="7" font-weight="bold" fill="#ffffff">${i + 1}</text>`;
    })
    .join("");
  const caption = label
    ? `<text x="50" y="218" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="9" fill="#475569">${view === "back" ? "Back" : "Front"}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h + 8}" width="${VIEWBOX.w * 3}" height="${(VIEWBOX.h + 8) * 3}"><rect width="100%" height="100%" fill="#ffffff"/>${shapes}${detail}${dots}${caption}</svg>`;
}

// Renders one view to a JPEG data URL (used by the PDF export). JPEG, not PNG:
// the figure is a flat drawing on white, and a PNG of it added ~1 MB to every
// incident report — enough to matter when a builder emails a few of them.
// Returns null if the browser can't rasterise it; the PDF then falls back to
// the written region list, so an export never fails over a picture.
export function bodyViewToPng(view, marks = [], scale = 2) {
  return new Promise((resolve) => {
    try {
      const svg = bodySvgString(view, marks);
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = VIEWBOX.w * scale;
          canvas.height = (VIEWBOX.h + 8) * scale;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
