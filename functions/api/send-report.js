import {
  json,
  verifyUser,
  adminSelect,
  sendEmail,
  layout,
  escapeHtml,
  serverError,
} from "./_lib/email";

// POST /api/send-report
//   { kind, to: [email], note?, filename, pdfBase64, summary? }
//
// Emails a report or incident PDF that the app generated in the browser.
//
// Security model — this endpoint necessarily differs from send-invite, where
// the recipient comes from the database. A builder emailing their own monthly
// summary to their client, insurer or WorkSafe genuinely needs to name the
// recipient, so we cannot compose it entirely from database truth. What stops
// it becoming an open spam relay instead:
//   * the caller must hold a valid Supabase JWT AND be builder staff;
//   * at most RECIPIENT_LIMIT recipients per send, all format-checked;
//   * the subject line and the whole email body are composed HERE, from a
//     fixed set of report kinds plus the org name read from the database —
//     the client cannot supply arbitrary email copy;
//   * the builder's free-text note is length-capped and HTML-escaped;
//   * the attachment must be a PDF under ATTACHMENT_LIMIT.
// Every send is stamped with the sender's name and organisation in the footer,
// so a recipient can always see who actually sent it.

const RECIPIENT_LIMIT = 5;
const ATTACHMENT_LIMIT = 8 * 1024 * 1024; // decoded bytes
const NOTE_LIMIT = 1500;

// The only documents this endpoint will send. Anything else is rejected.
const KINDS = {
  monthly_summary: {
    label: "Monthly OHS Summary",
    blurb: "the organisation-wide compliance, incident and toolbox summary for this month",
  },
  incident_register: {
    label: "WorkSafe Incident Register",
    blurb: "the full register of recorded incidents, including any notifiable to WorkSafe Victoria",
  },
  swms_signoff: {
    label: "SWMS Sign-off Report",
    blurb: "the Safe Work Method Statement sign-off status by trade and by stakeholder",
  },
  incident_report: {
    label: "Incident Report",
    blurb: "a single incident report, including corrective actions and correction history",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Rough decoded size of a base64 payload without allocating it.
const base64Bytes = (b64) => Math.floor((b64.length * 3) / 4);

// Trims a long attachment name from the END, keeping the extension.
// Chopping the front instead turned "Monthly-OHS-Summary-…" into
// "hly-OHS-Summary-…" in a real send — the recipient sees this name, so it has
// to stay readable from its first character.
const MAX_FILENAME = 80;
function sanitiseFilename(name) {
  const clean = String(name || "").replace(/[^A-Za-z0-9._-]+/g, "-");
  if (clean.length <= MAX_FILENAME) return clean;
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? clean.slice(dot) : "";
  return clean.slice(0, MAX_FILENAME - ext.length) + ext;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY) {
      return json(503, { error: "Email isn't set up yet — download the PDF and send it yourself." });
    }
    const user = await verifyUser(env, request);
    if (!user?.id) return json(401, { error: "Not signed in." });

    const body = await request.json().catch(() => ({}));
    const { kind, to, note, filename, pdfBase64, summary } = body || {};

    const spec = KINDS[kind];
    if (!spec) return json(400, { error: "Unknown report type." });

    const recipients = (Array.isArray(to) ? to : [to])
      .map((e) => String(e || "").trim())
      .filter(Boolean);
    if (!recipients.length) return json(400, { error: "Add at least one recipient." });
    if (recipients.length > RECIPIENT_LIMIT) {
      return json(400, { error: `Send to at most ${RECIPIENT_LIMIT} addresses at a time.` });
    }
    const bad = recipients.find((e) => !EMAIL_RE.test(e));
    if (bad) return json(400, { error: `That doesn't look like an email address: ${bad}` });

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return json(400, { error: "No document attached." });
    }
    if (base64Bytes(pdfBase64) > ATTACHMENT_LIMIT) {
      return json(413, { error: "That report is too large to email — download it instead." });
    }
    const safeName = sanitiseFilename(filename);
    if (!/\.pdf$/i.test(safeName)) return json(400, { error: "Only PDF reports can be emailed." });

    const [profile] = await adminSelect(
      env,
      `profiles?select=role,organization_id,name,email&id=eq.${user.id}`
    );
    const staff = ["builder_admin", "hse_manager", "site_supervisor"];
    if (!profile || !staff.includes(profile.role)) {
      return json(403, { error: "Only builder staff can email reports." });
    }

    const [org] = await adminSelect(
      env,
      `organizations?select=name&id=eq.${profile.organization_id}`
    );
    const orgName = org?.name || "Your builder";
    const senderName = profile.name || profile.email || "a member of the team";

    const noteHtml = note
      ? `<div style="margin:0 0 16px;padding:12px 14px;background:#f8fafc;border-left:3px solid #1e3a8a;">
           <p style="margin:0;white-space:pre-wrap;">${escapeHtml(String(note).slice(0, NOTE_LIMIT))}</p>
         </div>`
      : "";
    const summaryHtml = summary
      ? `<p style="margin:0 0 12px;color:#475569;font-size:14px;">${escapeHtml(String(summary).slice(0, 300))}</p>`
      : "";

    const html = layout({
      heading: `${spec.label} — ${escapeHtml(orgName)}`,
      bodyHtml: `
        <p style="margin:0 0 12px;">${escapeHtml(senderName)} at <strong>${escapeHtml(orgName)}</strong> has sent you ${spec.blurb}.</p>
        ${noteHtml}
        ${summaryHtml}
        <p style="margin:0 0 4px;">The full report is attached as a PDF: <strong>${escapeHtml(safeName)}</strong></p>`,
      footerNote: `Sent by ${escapeHtml(senderName)} at ${escapeHtml(orgName)} from their OHS Builder Victoria workspace.`,
    });

    const text = `${spec.label} — ${orgName}

${senderName} at ${orgName} has sent you ${spec.blurb}.
${note ? `\n${String(note).slice(0, NOTE_LIMIT)}\n` : ""}${summary ? `\n${String(summary).slice(0, 300)}\n` : ""}
The full report is attached as a PDF: ${safeName}

— OHS Builder Victoria · ohsbuildervictoria.com.au`;

    await sendEmail(env, {
      to: recipients,
      subject: `${spec.label} — ${orgName}`,
      html,
      text,
      attachments: [{ filename: safeName, content: pdfBase64 }],
    });

    return json(200, { sent: true, to: recipients, filename: safeName });
  } catch (err) {
    return serverError(err, "Could not send the report.");
  }
}
