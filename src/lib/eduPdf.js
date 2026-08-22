// ============================================================================
// OHS Builder Education — Evidence Portfolio (PDF)
// A consolidated, institution-branded export of one submission: who/what,
// assessment results, task evidence, and extracts of the real records from
// the frozen snapshot. Client-side (jsPDF), lazy-loaded like src/lib/pdf.js.
// ============================================================================
import { brand } from "../data/constants";
import { loadOrgLogo } from "./pdf";
import { eduBrand, resultLabels } from "../data/education";

let jsPDF, autoTable, libsReady;
function loadPdfLibs() {
  libsReady ||= Promise.all([import("jspdf"), import("jspdf-autotable")]).then(([a, b]) => {
    jsPDF = a.jsPDF;
    autoTable = b.autoTable;
  });
  return libsReady;
}

const MARGIN = 40;
const INK = [30, 41, 59];
const SLATE = [100, 116, 139];

const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [30, 58, 138];
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
// jsPDF's built-in Helvetica covers WinAnsi only: replace the few symbols the
// app uses in free text so they never print as garbage.
const s = (v) =>
  (v == null ? "" : String(v))
    .replace(/→/g, "->").replace(/←/g, "<-").replace(/✓|✔/g, "(tick)")
    .replace(/•/g, "-").replace(/…/g, "...").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/×/g, "x").replace(/≤/g, "<=").replace(/≥/g, ">=");
const STATUS_LABEL = {
  submitted: "Submitted", under_review: "Under review", returned_nys: "Returned - Not Yet Satisfactory", completed: "Completed",
};
const statusLabel = (v) => STATUS_LABEL[v] || s(v).replace(/_/g, " ");

function header(doc, { institution, title, subtitle, logo, primary }) {
  const w = doc.internal.pageSize.getWidth();
  let textX = MARGIN;
  if (logo?.dataUrl) {
    const maxH = 34, maxW = 120;
    const scale = Math.min(maxW / logo.w, maxH / logo.h);
    const dw = logo.w * scale, dh = logo.h * scale;
    try {
      doc.addImage(logo.dataUrl, logo.format, MARGIN, 28 + (maxH - dh) / 2, dw, dh, "edulogo");
      textX = MARGIN + dw + 12;
    } catch { /* fall through to text only */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(institution?.name || "Institution", textX, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(`${eduBrand.productName} · ${eduBrand.attribution}`, textX, 54);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primary);
  doc.text(title, w - MARGIN, 42, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(subtitle, w - MARGIN, 55, { align: "right" });
  }
  doc.setDrawColor(...primary);
  doc.setLineWidth(2);
  doc.line(MARGIN, 66, w - MARGIN, 66);
  return 84;
}

function footers(doc, { institution, version }) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, h - 46, w - MARGIN, h - 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    // Three short lines: no string is long enough to collide with another.
    doc.text(`Evidence portfolio · submission V${version} · generated ${fmtDateTime(new Date().toISOString())}`, MARGIN, h - 36);
    doc.text(`Page ${p} of ${total}`, w - MARGIN, h - 36, { align: "right" });
    doc.text(`${s(institution?.name).slice(0, 60)} · ${brand.fullName} · ${brand.domain}`, MARGIN, h - 27);
    doc.setFontSize(6.5);
    const lines = doc.splitTextToSize(eduBrand.disclaimer, w - MARGIN * 2);
    doc.text(lines.slice(0, 2), MARGIN, h - 18);
  }
}

function section(doc, y, title, primary) {
  const h = doc.internal.pageSize.getHeight();
  if (y > h - 130) { doc.addPage(); y = 60; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...primary);
  doc.text(title, MARGIN, y);
  return y + 8;
}

function table(doc, y, head, body, primary, opts = {}) {
  if (!body.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE);
    doc.text(opts.empty || "No records.", MARGIN, y + 12);
    return y + 24;
  }
  autoTable(doc, {
    startY: y + 4,
    head: [head],
    body: body.map((row) => row.map((cell) => (typeof cell === "string" ? s(cell) : cell))),
    margin: { left: MARGIN, right: MARGIN, bottom: 60 },
    styles: { fontSize: 8, cellPadding: 3, textColor: INK, overflow: "linebreak" },
    headStyles: { fillColor: primary, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: opts.columnStyles || {},
  });
  return doc.lastAutoTable.finalY + 16;
}

// bundle: the student home or assessor review bundle (institution, student,
// unit, cohort, program, scenario, mappings, submissions, assessors).
// submission: one entry of bundle.submissions. snapshot: its frozen records.
export async function exportEvidencePortfolio({ bundle, submission, snapshot = {}, mode = "save" }) {
  await loadPdfLibs();
  const { institution = {}, student = {}, unit = {}, cohort = {}, program = {}, scenario = {}, mappings = {} } = bundle || {};
  const primary = hexToRgb(institution.primaryColour);
  const logo = await loadOrgLogo({ logoUrl: institution.logoUrl });
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const version = submission?.version ?? "—";
  const snap = snapshot || {};
  const stages = scenario?.stages || [];
  const stageById = Object.fromEntries(stages.map((x) => [x.id, x]));
  const progStages = submission?.progress?.stages || [];
  const results = submission?.results || [];
  const criteria = unit?.criteria || [];

  // ---- Cover -------------------------------------------------------------
  let y = header(doc, { institution, title: "Evidence Portfolio", subtitle: `${unit.code || ""} · ${scenario.title || ""}`, logo, primary });
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK);
  doc.text(s(student.name || "Student"), MARGIN, y + 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...SLATE);
  doc.text(s(student.email), MARGIN, y + 24);
  y += 44;
  const rows = [
    ["Institution", `${s(institution.name)}${institution.rtoNumber ? ` · RTO ${institution.rtoNumber}` : ""}`],
    ["Qualification", `${s(unit.qualification?.code)} ${s(unit.qualification?.title)}`.trim()],
    ["Unit", `${s(unit.code)} ${s(unit.title)}`.trim()],
    ["Program / cohort", `${s(program.name)}${program.intake ? ` · ${program.intake}` : ""} · ${s(cohort.name)}`],
    ["Scenario", `${s(scenario.title)} — ${s(scenario.studentRole)}`],
    ["Submission", `Version ${version} · submitted ${fmtDateTime(submission?.submittedAt)}`],
    ["Assessment status", submission ? `${statusLabel(submission.status)}${submission.decidedAt ? ` · decided ${fmtDateTime(submission.decidedAt)} by ${s(submission.decidedByName)}` : ""}` : "—"],
    ["Assessment mapping", mappings?.source === "institution" ? `Institution-controlled mapping (${institution.name})` : "Indicative default mapping (institution-controlled; review against the current unit text)"],
    ["Generated", fmtDateTime(new Date().toISOString())],
  ];
  y = table(doc, y, ["Item", "Detail"], rows, primary, { columnStyles: { 0: { cellWidth: 120, fontStyle: "bold" } } });
  if (submission?.studentNote) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(`Student note: ${s(submission.studentNote)}`, doc.internal.pageSize.getWidth() - MARGIN * 2);
    doc.text(lines, MARGIN, y); y += lines.length * 11 + 10;
  }

  // ---- Assessment results -----------------------------------------------
  y = section(doc, y, "Assessment results (per criterion)", primary);
  const mapped = (cid) => (mappings?.rows || []).filter((m) => m.criterionId === cid).map((m) => stageById[m.stageId]?.code).filter(Boolean).join(", ");
  const resultRows = criteria.map((c) => {
    const r = results.find((x) => x.criterionId === c.id);
    return [c.code, s(c.text), mapped(c.id) || "—", r ? resultLabels[r.result] : "Not assessed", s(r?.comment), r ? `${s(r.assessedByName)} ${fmtDate(r.assessedAt)}` : ""];
  });
  y = table(doc, y, ["Code", "Criterion", "Evidence (tasks)", "Result", "Assessor comment", "By / date"], resultRows, primary,
    { columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 150 }, 2: { cellWidth: 60 }, 3: { cellWidth: 70 }, 5: { cellWidth: 80 } } });
  if (submission?.outcomeComment) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(`Overall feedback: ${s(submission.outcomeComment)}`, doc.internal.pageSize.getWidth() - MARGIN * 2);
    doc.text(lines, MARGIN, y); y += lines.length * 11 + 10;
  }

  // ---- Tasks / progress ----------------------------------------------------
  y = section(doc, y, "Simulation tasks and evidence status at submission", primary);
  y = table(doc, y, ["#", "Task", "Evidence required", "Status"],
    stages.map((st) => {
      const p = progStages.find((x) => x.stageId === st.id);
      return [st.position, st.title, st.evidenceLabel, p?.complete ? "Evidenced" : "Not evidenced"];
    }), primary, { columnStyles: { 0: { cellWidth: 20 }, 3: { cellWidth: 70 } } });

  // ---- Records from the snapshot -------------------------------------------
  const arr = (k) => (Array.isArray(snap[k]) ? snap[k] : []);
  const projects = arr("projects");
  const projName = (id) => projects.find((p) => p.id === id)?.name || "—";
  const workers = arr("workers");

  y = section(doc, y, "Project information", primary);
  y = table(doc, y, ["Project", "Address", "Status", "PM", "Start", "Induction set up"],
    projects.map((p) => [p.name, p.address, p.status, p.project_manager, p.start_date || "—", p.induction?.rules ? "Yes" : "No"]), primary);

  y = section(doc, y, "Stakeholders and inductions", primary);
  const inductions = arr("induction_completions");
  y = table(doc, y, ["Name", "Trade", "Employer", "Induction", "Quiz", "SWMS", "Induction recorded"],
    workers.map((w) => {
      const ic = inductions.filter((i) => i.worker_id === w.id).sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))[0];
      return [w.name, w.trade, w.employer, w.induction, w.quiz, w.swms, ic ? `${fmtDate(ic.completed_at)}${ic.on_paper ? " (recorded by staff)" : ""}` : "—"];
    }), primary);

  y = section(doc, y, "Risk register", primary);
  const rating = (l, c) => (l && c ? l * c : null);
  y = table(doc, y, ["Hazard", "Cat.", "L×C", "Controls", "Residual", "Status", "Review"],
    arr("project_risks").map((r) => [r.hazard, r.category, `${r.likelihood}×${r.consequence}=${rating(r.likelihood, r.consequence) ?? ""}`, r.controls,
      r.residual_likelihood && r.residual_consequence ? `${r.residual_likelihood}×${r.residual_consequence}=${r.residual_likelihood * r.residual_consequence}` : "—", r.status, r.review_date || "—"]), primary,
    { columnStyles: { 0: { cellWidth: 120 }, 3: { cellWidth: 160 } } });

  y = section(doc, y, "SWMS and sign-offs", primary);
  const sigs = arr("swms_signatures");
  y = table(doc, y, ["Trade", "Ref", "Version", "Signed / required", "Signatures (name · version · date)"],
    arr("swms_templates").map((t) => [t.trade, t.ref, t.version, `${t.signed} / ${t.total}`,
      sigs.filter((g) => g.template_id === t.id).map((g) => `${g.signed_name} · ${g.template_version} · ${fmtDate(g.signed_at)}${g.signed_by_staff ? " (staff)" : ""}`).join("\n") || "—"]), primary,
    { columnStyles: { 4: { cellWidth: 200 } } });
  const revisions = arr("swms_revisions");
  if (revisions.length) {
    y = table(doc, y, ["SWMS", "From", "To", "Reason", "By", "Date"], revisions.map((r) => [s(r.template_id), r.from_version, r.to_version, r.reason, r.revised_by_name, fmtDate(r.revised_at)]), primary);
  }

  y = section(doc, y, "Incidents and corrective actions", primary);
  const actions = arr("corrective_actions");
  y = table(doc, y, ["Date", "Type", "Severity", "Project", "Description", "Status", "Notifiable", "Corrective actions"],
    arr("incidents").map((i) => [i.date, i.type, i.severity, projName(i.project_id), i.description, i.status,
      i.notifiable ? (i.notified_at ? `Yes — WorkSafe notified ${fmtDate(i.notified_at)}` : "Yes — notification NOT recorded") : "No",
      actions.filter((a) => a.incident_id === i.id).map((a) => `${a.description} (${a.assigned_to || "unassigned"}, ${a.status})`).join("\n") || "—"]), primary,
    { columnStyles: { 4: { cellWidth: 130 }, 7: { cellWidth: 130 } } });

  y = section(doc, y, "Toolbox meetings and attendance", primary);
  const tsigs = arr("toolbox_signatures");
  y = table(doc, y, ["Date", "Topic", "Presenter", "Points", "Attendance (name · date)"],
    arr("toolbox_meetings").map((m) => [m.date, m.topic, m.presenter, (m.points || []).join("; "),
      tsigs.filter((g) => g.meeting_id === m.id).map((g) => `${g.signed_name} · ${fmtDate(g.signed_at)}`).join("\n") || "—"]), primary,
    { columnStyles: { 3: { cellWidth: 150 }, 4: { cellWidth: 140 } } });

  y = section(doc, y, "Site diary extracts", primary);
  y = table(doc, y, ["Date", "Project", "Weather", "Crew", "Tags", "Notes"],
    arr("diary_entries").map((e) => [e.date, projName(e.project_id), e.weather, e.labour, (e.tags || []).join(", "), e.notes]), primary,
    { columnStyles: { 5: { cellWidth: 200 } } });

  const photos = arr("record_photos");
  const docsCount = arr("compliance_documents").length + arr("project_documents").length;
  y = section(doc, y, "Other records in the snapshot", primary);
  y = table(doc, y, ["Record type", "Count"], [
    ["Photos attached to incidents / diary", photos.length],
    ["Compliance + project documents", docsCount],
    ["Subcontractor companies", arr("subbie_companies").length],
    ["Policies", arr("policies").length],
    ["Site check-ins", arr("site_checkins").length],
    ["Quiz attempts", arr("quiz_attempts").length],
    ["Audit trail entries", arr("audit_log").length],
  ], primary);

  // ---- Submission history --------------------------------------------------
  y = section(doc, y, "Submission and assessment history", primary);
  table(doc, y, ["Version", "Submitted", "Status", "Decided", "By", "S / NYS"],
    (bundle?.submissions || []).map((x) => [x.version, fmtDateTime(x.submittedAt), statusLabel(x.status), x.decidedAt ? fmtDateTime(x.decidedAt) : "—", s(x.decidedByName),
      `${(x.results || []).filter((r) => r.result === "satisfactory").length} / ${(x.results || []).filter((r) => r.result === "not_yet_satisfactory").length}`]), primary);

  footers(doc, { institution, version });
  const filename = `Evidence-Portfolio-${s(student.name).replace(/[^A-Za-z0-9]+/g, "_")}-${s(unit.code)}-v${version}.pdf`;
  if (mode === "blob") return { blob: doc.output("blob"), filename };
  doc.save(filename);
  return { filename };
}
