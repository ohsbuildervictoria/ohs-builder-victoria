// ============================================================================
// OHS Builder Victoria — client-side PDF export
// Real, print/email-ready documents (branded header, org + project details,
// page numbers, footer). No server, no external requests at runtime.
// ============================================================================
import { brand } from "../data/constants";
import { bodyViewToPng, summariseMarks, BODY_VIEWS } from "./bodyMap";

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

// ---------------------------------------------------------------------------
// Client branding
// A builder's own logo goes on their documents — these PDFs are letterhead
// their client, their subbies and WorkSafe all see. Loaded once per export and
// cached; if it can't be fetched (offline, bad URL), the export still runs and
// falls back to the platform mark rather than failing over an image.
// ---------------------------------------------------------------------------
const logoCache = new Map();

export async function loadOrgLogo(org) {
  const url = org?.logoUrl;
  if (!url) return null;
  if (logoCache.has(url)) return logoCache.get(url);
  const promise = (async () => {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      // Downscale before embedding. A 1200 px logo goes into the PDF at ~110 pt
      // wide, and jsPDF stores the bitmap as given — a full-size PNG added
      // 2.7 MB to a three-page summary. Flattened onto white as a JPEG at
      // print resolution it costs ~15 KB, and these documents get emailed.
      const img = await new Promise((resolve) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => resolve(null);
        i.src = dataUrl;
      });
      if (!img?.naturalWidth || !img?.naturalHeight) return null;

      const MAX_W = 400;
      const scale = Math.min(1, MAX_W / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff"; // letterhead is white; flatten any alpha
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), w, h, format: "JPEG" };
      } catch {
        return { dataUrl, w: img.naturalWidth, h: img.naturalHeight, format: undefined };
      }
    } catch {
      return null;
    }
  })();
  logoCache.set(url, promise);
  return promise;
}

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
// `logo` is the org's own logo when they have one (see loadOrgLogo).
function header(doc, { org, title, meta = [], logo = null }) {
  const w = doc.internal.pageSize.getWidth();
  let textX = MARGIN + 30;
  if (logo?.dataUrl) {
    // Fit the client's logo into a 34 pt band, keeping its aspect ratio —
    // a squashed logo on a builder's letterhead is worse than none.
    const maxH = 34;
    const maxW = 110;
    const scale = Math.min(maxW / logo.w, maxH / logo.h);
    const dw = logo.w * scale;
    const dh = logo.h * scale;
    try {
      // The alias (last arg) makes jsPDF store the bitmap once and reference it
      // from every page, instead of re-embedding it per page.
      doc.addImage(logo.dataUrl, logo.format, MARGIN, 30 + (maxH - dh) / 2, dw, dh, "orglogo");
      textX = MARGIN + dw + 12;
    } catch {
      drawLogo(doc, MARGIN, 34);
    }
  } else {
    drawLogo(doc, MARGIN, 34);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(org?.name || brand.fullName, textX, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(`${brand.fullName} · ${brand.domain}`, textX, 55);

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

// Every exporter ends here. mode "save" downloads it (the existing behaviour);
// mode "attach" hands back the bytes so the same document can be emailed
// instead — one generator, two destinations, no chance of the emailed PDF
// drifting from the downloaded one.
function output(doc, filename, mode = "save") {
  if (mode === "attach") {
    return { filename, base64: doc.output("datauristring").split(",")[1] };
  }
  doc.save(filename);
  return { filename };
}
const save = (doc, filename) => output(doc, filename, "save");
// Filenames are read by whoever receives the document, so keep them short
// enough to survive an email client. Org names can be long ("QA MASTER —
// Internal Test (do not delete without asking)"); cap the slug rather than
// generate a name that later has to be truncated.
const slug = (s, max = 40) =>
  (s || "document")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, max)
    .replace(/-$/, "");

// ---------------------------------------------------------------------------
// 1. SWMS pack — one project's Safe Work Method Statements + sign-off status
// ---------------------------------------------------------------------------
export async function exportSwmsPack({ org, project, templates, workers, library }) {
  await loadPdfLibs();
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const crew = workers.filter((w) => w.project === project.id);
  const trades = [...new Set(crew.map((w) => w.trade).filter(Boolean))];
  // Templates relevant to this project's trades (fall back to all if none matched).
  const relevant = trades.length
    ? templates.filter((t) => trades.includes(t.trade))
    : templates;

  let y = header(doc, {
    org,
    logo,
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
      y = header(doc, { org, logo, title: "SWMS Pack", meta: [`Project: ${project.name}`] });
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
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const lib = (library || []).find((l) => l.trade === template.trade);
  let y = header(doc, {
    org,
    logo,
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
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = header(doc, {
    org,
    logo,
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
export async function exportIncidentReport({ org, incident, audits = [], mode = "save" }) {
  await loadPdfLibs();
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = header(doc, {
    org,
    logo,
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

  // Body diagram — the front/back figure exactly as it was marked on the form,
  // plus the written regions so the record still reads correctly if the images
  // can't be rasterised (or if someone reads the text layer only).
  const marks = incident.bodyMap || [];
  if (marks.length) {
    if (y > doc.internal.pageSize.getHeight() - 260) {
      doc.addPage();
      y = header(doc, { org, logo, title: "Incident Report", meta: [`Project: ${incident.project || "—"}`] });
    }
    y = sectionTitle(doc, "Injury / impact location", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const regions = summariseMarks(marks);
    const regionLines = doc.splitTextToSize(regions.join(" · "), width);
    doc.text(regionLines, MARGIN, y + 4);
    y += 4 + regionLines.length * 12 + 8;

    const imgH = 170;
    const imgW = imgH * (100 / 228);
    let drawn = false;
    for (const [i, v] of BODY_VIEWS.entries()) {
      const png = await bodyViewToPng(v.key, marks);
      if (!png) continue;
      try {
        doc.addImage(png, "JPEG", MARGIN + i * (imgW + 24), y, imgW, imgH);
        drawn = true;
      } catch { /* fall through to the written regions above */ }
    }
    y += (drawn ? imgH : 0) + 18;
  }

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
  return output(doc, `Incident-${incident.id}-${slug(incident.project)}.pdf`, mode);
}

// ---------------------------------------------------------------------------
// 3. Site diary — a date range (default: current month) for one project
// ---------------------------------------------------------------------------
export async function exportDiaryRange({ org, project, entries, from, to }) {
  await loadPdfLibs();
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const inRange = entries
    .filter((e) => e.project === project.id && (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const totalHours = inRange.reduce((s, e) => s + (Number(e.hours) || 0) * (Number(e.labour) || 0), 0);

  let y = header(doc, {
    org,
    logo,
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

// ---------------------------------------------------------------------------
// 4. Management reports (Reports page)
// These were plain-text downloads. They are now the same branded documents as
// everything else, because they are what a builder actually forwards to a
// client, an insurer or WorkSafe — and they can be emailed straight from the
// app (mode "attach").
// ---------------------------------------------------------------------------

export async function exportMonthlySummary({ org, projects = [], workers = [], incidents = [], meetings = [], overall = 0, mode = "save" }) {
  await loadPdfLibs();
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const now = new Date();
  const period = now.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const thisMonth = (d) => (d || "") >= monthStart;

  const openIncidents = incidents.filter((i) => i.status !== "Closed");
  const monthIncidents = incidents.filter((i) => thisMonth(i.date));
  const lostTime = incidents.filter((i) => i.lostTime).length;

  let y = header(doc, {
    org,
    logo,
    title: "Monthly OHS Summary",
    meta: [`Period: ${period}`, `Prepared: ${fmtDate(now.toISOString())}`],
  });

  y = sectionTitle(doc, "At a glance", y + 4);
  table(doc, {
    startY: y,
    theme: "grid",
    head: [],
    body: [
      ["Organisation compliance", overall == null ? "— (no stakeholders on the books)" : `${overall}%`],
      ["Active projects", String(projects.filter((p) => p.status === "Active").length)],
      ["Projects total", String(projects.length)],
      ["Stakeholders on site", String(workers.length)],
      ["Stakeholders fully compliant", String(workers.filter((w) => w.status === "Active").length)],
      ["Incidents this month", String(monthIncidents.length)],
      ["Incidents still open", String(openIncidents.length)],
      ["Lost-time injuries (all time)", String(lostTime)],
      ["Toolbox meetings this month", String(meetings.filter((m) => thisMonth(m.date)).length)],
    ],
    columnStyles: { 0: { cellWidth: 200, fontStyle: "bold", fillColor: [248, 250, 252] }, 1: { cellWidth: "auto" } },
  });
  y = lastY(doc) + 22;

  y = sectionTitle(doc, "Compliance by project", y);
  table(doc, {
    startY: y,
    head: [["Project", "Status", "Crew", "Compliance", "Incidents"]],
    body: projects.length
      ? projects.map((p) => [p.name, p.status, String(p.workers ?? 0), p.compliance == null ? "— no crew" : `${p.compliance}%`, String(p.incidents ?? 0)])
      : [["No projects yet", "", "", "", ""]],
  });
  y = lastY(doc) + 22;

  if (y > doc.internal.pageSize.getHeight() - 160) {
    doc.addPage();
    y = header(doc, { org, logo, title: "Monthly OHS Summary", meta: [`Period: ${period}`] });
  }
  y = sectionTitle(doc, "Open incidents", y);
  table(doc, {
    startY: y,
    head: [["Date", "Type", "Project", "Severity", "Status"]],
    body: openIncidents.length
      ? openIncidents.map((i) => [fmtDate(i.date), i.type, i.project || "—", i.severity, i.status])
      : [["—", "None open", "", "", ""]],
  });

  footers(doc, { org });
  return output(doc, `Monthly-OHS-Summary-${slug(org?.name || brand.fullName)}-${monthStart.slice(0, 7)}.pdf`, mode);
}

export async function exportIncidentRegister({ org, incidents = [], mode = "save" }) {
  await loadPdfLibs();
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const notifiable = incidents.filter((i) => i.notifiable);

  let y = header(doc, {
    org,
    logo,
    title: "WorkSafe Incident Register",
    meta: [
      `${incidents.length} incident${incidents.length === 1 ? "" : "s"} on record · ${notifiable.length} notifiable`,
      `Prepared: ${fmtDate(new Date().toISOString())}`,
      "Notifiable incidents must be reported to WorkSafe Victoria on 13 23 60 immediately.",
    ],
  });

  y = sectionTitle(doc, "Register", y + 4);
  table(doc, {
    startY: y,
    head: [["Date", "Type", "Project", "Location", "Injured / involved", "Severity", "Lost time", "Notifiable", "Status"]],
    columnStyles: {
      0: { cellWidth: 60 }, 1: { cellWidth: 78 }, 2: { cellWidth: 92 },
      3: { cellWidth: 90 }, 4: { cellWidth: 92 }, 5: { cellWidth: 52 },
      6: { cellWidth: 46 }, 7: { cellWidth: 52 }, 8: { cellWidth: "auto" },
    },
    body: incidents.length
      ? incidents.map((i) => [
          fmtDate(i.date), i.type, i.project || "—", i.location || "—",
          i.involved || "—", i.severity, i.lostTime ? "Yes" : "No",
          i.notifiable ? "YES" : "No", i.status,
        ])
      : [["—", "No incidents recorded", "", "", "", "", "", "", ""]],
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7 && data.cell.raw === "YES") {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  footers(doc, { org });
  return output(doc, `WorkSafe-Incident-Register-${slug(org?.name || brand.fullName)}.pdf`, mode);
}

export async function exportSwmsSignoff({ org, templates = [], workers = [], mode = "save" }) {
  await loadPdfLibs();
  const logo = await loadOrgLogo(org);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const signed = workers.filter((w) => w.swms === "Verified").length;

  let y = header(doc, {
    org,
    logo,
    title: "SWMS Sign-off Report",
    meta: [
      `${signed} of ${workers.length} stakeholders have signed their SWMS`,
      `Prepared: ${fmtDate(new Date().toISOString())}`,
    ],
  });

  y = sectionTitle(doc, "By trade template", y + 4);
  table(doc, {
    startY: y,
    head: [["Trade", "Ref", "Version", "Signed", "Status", "Locked"]],
    body: templates.length
      ? templates.map((t) => [t.trade, t.ref || "—", t.version || "—", `${t.signed}/${t.total}`, t.status, t.locked ? "Yes" : "No"])
      : [["No SWMS templates yet", "", "", "", "", ""]],
  });
  y = lastY(doc) + 22;

  if (y > doc.internal.pageSize.getHeight() - 160) {
    doc.addPage();
    y = header(doc, { org, logo, title: "SWMS Sign-off Report", meta: [] });
  }
  y = sectionTitle(doc, "By stakeholder", y);
  table(doc, {
    startY: y,
    head: [["Stakeholder", "Trade", "Employer", "SWMS", "Overall status"]],
    body: workers.length
      ? workers.map((w) => [w.name, w.trade || "—", w.employer || "—", w.swms, w.status])
      : [["No stakeholders yet", "", "", "", ""]],
  });

  footers(doc, { org });
  return output(doc, `SWMS-Signoff-${slug(org?.name || brand.fullName)}.pdf`, mode);
}
