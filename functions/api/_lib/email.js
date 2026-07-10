// ============================================================================
// Shared helpers for the Pages Functions that send transactional email.
//
// Security model: these endpoints run server-side with the service-role key,
// so NOTHING about an email (recipient, link, wording) is taken from the
// client. The client only names a record id; the server verifies the caller's
// Supabase JWT, checks org membership + role, and composes the email from
// database truth. This is what stops the endpoint being a spam relay.
// ============================================================================

export const FROM = "OHS Builder Victoria <no-reply@ohsbuildervictoria.com.au>";
export const REPLY_TO = "admin@ohsbuildervictoria.com.au";

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Who is calling? Verifies the Supabase JWT and returns the auth user.
export async function verifyUser(env, request) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth },
  });
  if (!r.ok) return null;
  return r.json();
}

// Service-role REST read (bypasses RLS — use only after verifying the caller).
export async function adminSelect(env, path) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`db read failed: ${path} -> ${r.status}`);
  return r.json();
}

export async function sendEmail(env, { to, subject, html, text }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, reply_to: REPLY_TO, to, subject, html, text }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.message || `resend ${r.status}`);
  return body;
}

// Plain, branded, mobile-first wrapper. No tracking pixels, no urgency games —
// a wary tradie should read this as exactly what it is.
export function layout({ heading, bodyHtml, footerNote }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="background:#1e3a8a;border-radius:12px 12px 0 0;padding:16px 20px;">
      <span style="color:#ffffff;font-size:16px;font-weight:700;">OHS Builder</span>
      <span style="color:#fbbf24;font-size:12px;font-weight:700;"> Victoria</span>
    </div>
    <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px 20px;color:#1e293b;font-size:15px;line-height:1.55;">
      <h1 style="margin:0 0 12px;font-size:19px;color:#0f172a;">${heading}</h1>
      ${bodyHtml}
    </div>
    <p style="color:#64748b;font-size:12px;line-height:1.5;padding:14px 6px 0;">
      ${footerNote}<br/>
      Sent by OHS Builder Victoria · <a href="https://ohsbuildervictoria.com.au" style="color:#64748b;">ohsbuildervictoria.com.au</a> ·
      Questions or wrong address? Reply to this email or contact <a href="mailto:admin@ohsbuildervictoria.com.au" style="color:#64748b;">admin@ohsbuildervictoria.com.au</a>.
    </p>
  </div></body></html>`;
}

export function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 22px;border-radius:10px;margin:10px 0;">${label}</a>
  <p style="font-size:12px;color:#64748b;margin:6px 0 0;">Button not working? Copy this link into your browser:<br/><span style="word-break:break-all;">${href}</span></p>`;
}
