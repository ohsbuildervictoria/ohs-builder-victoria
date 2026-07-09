// ============================================================================
// OHS Builder Victoria — client-side PDF export
// Real, print/email-ready documents (branded header, org + project details,
// page numbers, footer). No server, no external requests at runtime.
// ============================================================================
import { brand } from "../data/constants";

// jsPDF + autotable are ~600 kB of code that only a builder exporting a
// document ever runs — never a tradie opening their induction at the site
// gate. They load as their own chunks on first export, not with the app shell.
let jsPDF, autoTable, libsReady;
function loadPdfLibs() {
  libsReady ||= Promise.all([import("jspdf"), import("jspdf-autotable")]).then(
    ([jspdfMod, autoTableMod]) => {
      jsPDF = jspdfMod.jsPDF;
      autoTable = autoTableMod.autoTable;
    }
  );
  return libsReady;
}

const NAVY = [30, 58, 138];
const AMBER = [251, 191, 36];
const SLATE = [100, 116, 139];
const INK = [30, 41, 59];
const MARGIN = 40;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

// Small vector version of the app logo (navy tile, amber shield, navy tick).
function drawLogo(doc, x, y, size = 22) {
  doc.setFillColor(...NAVY);
  doc.roundedRect(x, y, size, size, 4, 4, "F");
  doc.setFillColor(...AMBER);
  const s = size;
  // simple shield: rounded rect inset
  doc.roundedRect(x + s * 0.22, y + s * 0.18, s * 0.56, s * 0.62, 2, 2, "F");
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.4);
  doc.line(x + s * 0.34, y + s * 0.48, x + s * 0.45, y + s * 0.59);
  doc.line(x + s * 0.45, y + s * 0.59, x + s * 0.66, y + s * 0.34);
}

// Branded header on the current page. Returns the y-cursor below it.
function header(doc, { org, title, meta = [] }) {
  const w = doc.internal.pageSize.getWidth();
  drawLogo(doc, MARGIN, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(org?.name || brand.fullName, MARGIN + 30, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(`${brand.fullName} · ${brand.domain}`, MARGIN + 30, 55);

  // Title, right-aligned
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(title, w - MARGIN, 44, { align: "right" });

  // amber rule
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(2);
  doc.line(MARGIN, 66, w - MARGIN, 66);

  // meta lines
  let y = 82;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  for (const line of meta) {
    doc.text(line, MARGIN, y);
    y += 13;
  }
  return y + 6;
}

// Footer with page numbers on every page. Call last.
function footers(doc, { org }) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, h - 34, w - MARGIN, h - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(
      `Generated ${fmtDateTime(new Date().toISOString())} · ${org?.name || brand.fullName}`,
      MARGIN,
      h - 20
    );
    doc.text(`Page ${p} of ${total}`, w - MARGIN, h - 20, { align: "right" });
  }
}

function sectionTitle(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(text, MARGIN, y);
  return y + 16;
}

const table = (doc, opts) =>
  autoTable(doc, {
    startY: opts.startY,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8.5, cellPadding: 4, textColor: INK, lineColor: [226, 232, 240], lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    ...opts,
  });

const lastY = (doc) => doc.lastAutoTable?.finalY ?? 100;
const save = (doc, filename) => doc.save(filename);
const slug = (s) => (s || "document").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

// ---------------------------------------------------------------------------
// 1. SWMS pack — one project's Safe Work Method Statements + sign-off status
// ---------------------------------------------------------------------------
export async function exportSwmsPack({ org, project, templates, workers, library }) {
  await loadPdfLibs();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const crew = workers.filter((w) => w.project === project.id);
  const trades = [...new Set(crew.map((w) => w.trade).filter(Boolean))];
  // Templates relevant to this project's trades (fall back to all if none matched).
  const relevant = trades.length
    ? templates.filter((t) => trades.includes(t.trade))
    : templates;

  let y = header(doc, {
    org,
    title: "SWMS Pack",
    meta: [
      `Project: ${project.name}${project.address ? ` — ${project.address}` : ""}`,
      `Trades on site: ${trades.length ? trades.join(", ") : "—"}`,
      `Prepared: ${fmtDate(new Date().toISOString())}`,
    ],
  });

  y = sectionTitle(doc, "Sign-off status", y + 4);
  table(doc, {
    startY: y,
    head: [["Trade", "Ref", "Version", "Signed", "Status"]],
    body: relevant.length
      ? relevant.map((t) => [t.trade, t.ref || "—", t.version || "—", `${t.signed}/${t.total}`, t.status])
      : [["No SWMS templates for this project yet", "", "", "", ""]],
  });
  y = lastY(doc) + 24;

  // Per-trade detail (hazards / controls) from the library.
  for (const t of relevant) {
    const lib = (library || []).find((l) => l.trade === t.trade);
    if (y > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      y = header(doc, { org, title: "SWMS Pack", meta: [`Project: ${project.name}`] });
    }
    y = sectionTitle(doc, `${t.trade} — ${t.ref || ""}`, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);
    doc.text(`Version ${t.version} · ${t.signed}/${t.total} signed · ${t.status}`, MARGIN, y + 2);
    if (t.legislation) doc.text(t.legislation, MARGIN, y + 14);
    y += t.legislation ? 26 : 14;
    if (lib?.ppe?.length) {
      doc.setTextColor(...INK);
      doc.text(`PPE: ${lib.ppe.join(", ")}`, MARGIN, y, { maxWidth: doc.internal.pageSize.getWidth() - MARGIN * 2 });
      y += 16;
    }
    if (lib?.hazards?.length) {
      table(doc, {
        startY: y,
        head: [["Task", "Hazard", "Risk", "Controls"]],
        columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 110 }, 2: { cellWidth: 40 }, 3: { cellWidth: "auto" } },
        body: lib.hazards.map((h) => [h.task, h.hazard, h.risk || "—", h.controls]),
      });
      y = lastY(doc) + 22;
    } else {
      doc.setTextColor(...SLATE);
      doc.text("Hazard breakdown available in the trade template.", MARGIN, y);
      y += 22;
    }
  }

  footers(doc, { org });
  save(doc, `SWMS-Pack-${slug(project.name)}.pdf`);
}

// Shared: render one trade's PPE + hazard/control table starting at y.
function tradeDetail(doc, { ppe, hazards, legislation, signoff }, y) {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  if (signoff) { doc.text(signoff, MARGIN, y); y += 12; }
  if (legislation) { doc.text(legislation, MARGIN, y); y += 12; }
  if (ppe?.length) {
    doc.setTextColor(...INK);
    doc.text(`PPE: ${ppe.join(", ")}`, MARGIN, y, { maxWidth: width });
    y += 16;
  }
  if (hazards?.length) {
    table(doc, {
      startY: y,
      head: [["Task", "Hazard", "Risk", "Controls"]],
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 110 }, 2: { cellWidth: 40 }, 3: { cellWidth: "auto" } },
      body: hazards.map((h) => [h.task, h.hazard, h.risk || "—", h.controls]),
    });
    y = lastY(doc) + 16;
  }
  return y;
}

// Single live SWMS template (from the SWMS card).
export async function exportSwmsTemplate({ org, template, library }) {
  await loadPdfLibs();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const lib = (library || []).find((l) => l.trade === template.trade);
  let y = header(doc, {
    org,
    title: "SWMS",
    meta: [
      `Trade: ${template.trade}`,
      `Ref ${template.ref || "—"} · Version ${template.version} · ${template.signed}/${template.total} signed · ${template.status}`,
      `Prepared: ${fmtDate(new Date().toISOString())}`,
    ],
  });
  y = sectionTitle(doc, `${template.trade} — Safe Work Method Statement`, y + 4);
  tradeDetail(doc, { ppe: lib?.ppe, hazards: lib?.hazards, legislation: template.legislation }, y + 4);
  footers(doc, { org });
  save(doc, `SWMS-${slug(template.trade)}.pdf`);
}

// A trade template straight from the reference library (A–Z).
export async function exportSwmsLibrary({ org, entry }) {
  await loadPdfLibs();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = header(doc, {
    org,
    title: "SWMS Template",
    meta: [`Trade: ${entry.trade}`, `Ref: ${entry.id}`, `${entry.hazards?.length || 0} hazards identified`],
  });
  y = sectionTitle(doc, `${entry.trade} — Safe Work Method Statement`, y + 4);
  if (entry.equipment?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);
    doc.text(`Equipment: ${entry.equipment.join(", ")}`, MARGIN, y, { maxWidth: doc.internal.pageSize.getWidth() - MARGIN * 2 });
    y += 16;
  }
  tradeDetail(doc, { ppe: entry.ppe, hazards: entry.hazards }, y + 2);
  footers(doc, { org });
  save(doc, `SWMS-Template-${slug(entry.trade)}.pdf`);
}

// ---------------------------------------------------------------------------
// 2. Incident report — a single incident, with corrective actions + audit trail
// ---------------------------------------------------------------------------
export async function exportIncidentReport({ org, incident, audits = [] }) {
  await loadPdfLibs();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = header(doc, {
    org,
    title: "Incident Report",
    meta: [
      `Project: ${incident.project || "—"}`,
      `Reported by ${incident.reportedBy || "—"} · ${fmtDate(incident.date)}`,
    ],
  });

  y = sectionTitle(doc, "Incident details", y + 4);
  table(doc, {
    startY: y,
    theme: "grid",
    body: [
      ["Type", incident.type || "—"],
      ["Severity", incident.severity || "—"],
      ["Status", incident.status || "—"],
      ["Date", fmtDate(incident.date)],
      ["Location", incident.location || "—"],
      ["Injured / involved", incident.involved || "—"],
      ["Witnesses", incident.witnesses || "—"],
      ["Lost-time injury", incident.lostTime ? "Yes" : "No"],
      ["WorkSafe notifiable", incident.notifiable ? "YES — notify WorkSafe Victoria (13 23 60)" : "No"],
    ],
    columnStyles: { 0: { cellWidth: 130, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: "auto" } },
    headStyles: { fillColor: NAVY },
    head: [],
  });
  y = lastY(doc) + 20;

  y = sectionTitle(doc, "Description", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  const descLines = doc.splitTextToSize(incident.description || "—", width);
  doc.text(descLines, MARGIN, y + 6);
  y += 6 + descLines.length * 12 + 14;

  if (incident.immediateAction) {
    y = sectionTitle(doc, "Immediate action taken", y);
    const al = doc.splitTextToSize(incident.immediateAction, width);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(al, MARGIN, y + 6);
    y += 6 + al.length * 12 + 14;
  }

  y = sectionTitle(doc, "Corrective actions", y);
  table(doc, {
    startY: y,
    head: [["Action", "Assigned to", "Due", "Status"]],
    body: incident.correctiveActions?.length
      ? incident.correctiveActions.map((a) => [a.description, a.assignedTo || "—", fmtDate(a.due), a.status])
      : [["None recorded", "", "", ""]],
  });
  y = lastY(doc) + 20;

  // Correction / status history from the immutable audit log.
  const trail = audits
    .filter((a) => a.entity === "incident" && a.entityId === incident.id)
    .sort((x, z) => new Date(x.createdAt) - new Date(z.createdAt));
  y = sectionTitle(doc, "Correction history", y);
  if (trail.length) {
    const rows = [];
    for (const a of trail) {
      for (const [field, { from, to }] of Object.entries(a.changes || {})) {
        rows.push([fmtDateTime(a.createdAt), a.changedBy, field, `${from || "(blank)"} → ${to || "(blank)"}`]);
      }
    }
    table(doc, {
      startY: y,
      head: [["When", "By", "Field", "Change"]],
      body: rows,
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text("No corrections — original record unchanged.", MARGIN, y + 6);
  }

  footers(doc, { org });
  save(doc, `Incident-${incident.id}-${slug(incident.project)}.pdf`);
}

// ---------------------------------------------------------------------------
// 3. Site diary — a date range (default: current month) for one project
// ---------------------------------------------------------------------------
export async function exportDiaryRange({ org, project, entries, from, to }) {
  await loadPdfLibs();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const inRange = entries
    .filter((e) => e.project === project.id && (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalHours = inRange.reduce((s, e) => s + (Number(e.hours) || 0) * (Number(e.labour) || 0), 0);

  let y = header(doc, {
    org,
    title: "Site Diary",
    meta: [
      `Project: ${project.name}${project.address ? ` — ${project.address}` : ""}`,
      `Period: ${fmtDate(from)} – ${fmtDate(to)}`,
      `${inRange.length} entr${inRange.length === 1 ? "y" : "ies"} · ${Math.round(totalHours).toLocaleString()} man-hours`,
    ],
  });

  y = sectionTitle(doc, "Daily records", y + 4);
  table(doc, {
    startY: y,
    head: [["Date", "Weather", "Hrs", "Crew", "Notes"]],
    columnStyles: {
      0: { cellWidth: 60 }, 1: { cellWidth: 70 }, 2: { cellWidth: 30 },
      3: { cellWidth: 34 }, 4: { cellWidth: "auto" },
    },
    body: inRange.length
      ? inRange.map((e) => [
          fmtDate(e.date),
          e.weather || "—",
          String(e.hours ?? "—"),
          String(e.labour ?? "—"),
          [e.notes, e.deliveries?.length ? `Deliveries: ${e.deliveries.join(", ")}` : "", e.tags?.length ? `Tags: ${e.tags.join(", ")}` : ""].filter(Boolean).join("\n"),
        ])
      : [["—", "—", "—", "—", "No diary entries in this period."]],
  });

  footers(doc, { org });
  save(doc, `Site-Diary-${slug(project.name)}-${(from || "").slice(0, 7)}.pdf`);
}
