import { json, sendEmail, layout, escapeHtml, serverError } from "./_lib/email";

// POST /api/education-enquiry
//   { institution, contact, email, phone?, orgType, size?, message, website?, openedAt? }
//
// "Request Institution Access" from the public /education page. This is the
// ONLY unauthenticated email endpoint, so it is deliberately narrow:
//   * the recipient is fixed (the support inbox) — nothing is ever sent to an
//     address the client supplies, so it cannot be used as a relay;
//   * no auto-reply to the enquirer (that would mail client-supplied text to a
//     client-supplied address);
//   * the subject and body are composed here; every field is length-capped and
//     HTML-escaped; organisation type must be one of a fixed list;
//   * same-origin check (Origin/Referer must be this site), a honeypot field,
//     a minimum fill time, a JSON size cap, and a best-effort per-IP limit
//     (Cache API, per edge location — enough to stop a naive loop; a
//     determined flood is handled at the Cloudflare layer, not here);
//   * nothing is written to the database and nothing is provisioned — a human
//     reads the email and creates the institution from /platform.
const LIMITS = { institution: 160, contact: 120, email: 200, phone: 40, size: 80, message: 2000 };
const ORG_TYPES = ["University", "TAFE", "Registered Training Organisation", "Construction training provider", "Other"];
const BODY_CAP = 8 * 1024;
const MIN_FILL_MS = 3000;
const PER_IP_PER_HOUR = 5;
const TO = "admin@ohsbuildervictoria.com.au";

function sameOrigin(request, env) {
  const self = new URL(request.url).origin;
  const allowed = new Set([self, env.APP_ORIGIN].filter(Boolean));
  const origin = request.headers.get("Origin");
  if (origin) return allowed.has(origin);
  const referer = request.headers.get("Referer");
  if (!referer) return false;
  try { return allowed.has(new URL(referer).origin); } catch { return false; }
}

function clean(v, max) {
  // Strip control characters (keep tab/newline so the message keeps its shape).
  return String(v ?? "").replace(/[^\P{Cc}\t\n\r]/gu, "").trim().slice(0, max);
}

// Best-effort limiter: a counter cached per IP for an hour. Cache API is
// per-colo and not transactional, so this is a speed bump, not a guarantee.
async function overLimit(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = new Request(`https://rate-limit.internal/education-enquiry/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  let count = 0;
  try {
    const hit = await cache.match(key);
    if (hit) count = Number(await hit.text()) || 0;
  } catch { /* cache unavailable — fail open */ }
  if (count >= PER_IP_PER_HOUR) return true;
  try {
    await cache.put(key, new Response(String(count + 1), { headers: { "Cache-Control": "max-age=3600" } }));
  } catch { /* ignore */ }
  return false;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!sameOrigin(request, env)) return json(403, { error: "This form can only be submitted from ohsbuildervictoria.com.au." });
    const len = Number(request.headers.get("Content-Length") || 0);
    if (len > BODY_CAP) return json(413, { error: "That message is too long." });
    const raw = await request.text();
    if (raw.length > BODY_CAP) return json(413, { error: "That message is too long." });
    let body;
    try { body = JSON.parse(raw); } catch { return json(400, { error: "Bad request." }); }

    // Honeypot + minimum fill time: bots fill every field and submit instantly.
    if (clean(body.website, 10)) return json(200, { ok: true });
    const openedAt = Number(body.openedAt) || 0;
    if (openedAt && Date.now() - openedAt < MIN_FILL_MS) return json(200, { ok: true });

    const f = {
      institution: clean(body.institution, LIMITS.institution),
      contact: clean(body.contact, LIMITS.contact),
      email: clean(body.email, LIMITS.email),
      phone: clean(body.phone, LIMITS.phone),
      orgType: clean(body.orgType, 60),
      size: clean(body.size, LIMITS.size),
      message: clean(body.message, LIMITS.message),
    };
    if (!f.institution || !f.contact || !f.email || !f.message) return json(400, { error: "Institution, contact name, work email and message are required." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return json(400, { error: "Enter a valid work email address." });
    if (!ORG_TYPES.includes(f.orgType)) return json(400, { error: "Choose an organisation type." });

    if (await overLimit(request)) return json(429, { error: `Too many requests from this connection. Please email ${TO} instead.` });
    if (!env.RESEND_API_KEY) return json(503, { error: `Email isn't available right now — please email ${TO} directly.` });

    const rows = [
      ["Institution", f.institution],
      ["Contact", f.contact],
      ["Work email", f.email],
      ["Phone", f.phone || "—"],
      ["Organisation type", f.orgType],
      ["Approx. students / cohort size", f.size || "—"],
    ];
    const table = rows
      .map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`)
      .join("");
    const html = layout({
      heading: "Education — institution access request",
      bodyHtml: `<table style="border-collapse:collapse;font-size:14px;margin:0 0 14px;">${table}</table>
        <p style="margin:0 0 6px;font-weight:700;">Message</p>
        <p style="white-space:pre-wrap;margin:0;padding:12px;background:#f8fafc;border-radius:8px;">${escapeHtml(f.message)}</p>
        <p style="margin:14px 0 0;font-size:12px;color:#64748b;">Submitted from the public /education page. Nothing has been provisioned — create the institution from /platform once you've spoken to them. Reply to this email to reach the enquirer.</p>`,
      footerNote: "Internal notification — sent to the OHS Builder support inbox only.",
    });
    const text = `Education — institution access request\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nMessage:\n${f.message}\n\nSubmitted from the public /education page. Nothing has been provisioned.`;
    await sendEmail(env, {
      to: [TO],
      subject: `Education access request — ${f.institution}`,
      html,
      text,
      replyTo: f.email,
    });
    return json(200, { ok: true });
  } catch (err) {
    return serverError(err, `We couldn't send that just now — please email ${TO} directly.`);
  }
}

export function onRequestGet() {
  return json(405, { error: "POST only." });
}
