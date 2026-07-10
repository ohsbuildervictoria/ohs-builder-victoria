import { json, adminSelect, sendEmail, layout, button } from "./_lib/email";

// POST /api/cron-nudges  (header: x-cron-secret)
// Daily compliance digest, one email per organisation to its builder admins:
// personal documents (White Card / Insurance / Medical) and company insurance
// certificates that are expired or expiring within 14 days, plus unclaimed
// tradie invites older than 3 days. Sends nothing when there's nothing to say.
// Triggered by pg_cron in Supabase each morning (Melbourne time).
const WINDOW_DAYS = 14;

export async function onRequestPost({ request, env }) {
  try {
    if (!env.CRON_SECRET || request.headers.get("x-cron-secret") !== env.CRON_SECRET) {
      return json(401, { error: "unauthorised" });
    }
    if (!env.RESEND_API_KEY) return json(503, { error: "email not configured" });

    const soon = new Date(Date.now() + WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
    const staleInvite = new Date(Date.now() - 3 * 86400000).toISOString();

    const [docs, companyDocs, workers, companies, orgs, admins] = await Promise.all([
      adminSelect(env, `compliance_documents?select=worker_id,category,expiry_date,organization_id&expiry_date=lte.${soon}`),
      adminSelect(env, `company_documents?select=company_id,category,expiry_date,organization_id&expiry_date=lte.${soon}`),
      adminSelect(env, `workers?select=id,name,email,account_status,created_at,organization_id`),
      adminSelect(env, `subbie_companies?select=id,name,organization_id`),
      adminSelect(env, `organizations?select=id,name,is_internal`),
      adminSelect(env, `profiles?select=email,name,role,organization_id&role=eq.builder_admin`),
    ]);

    const workerById = Object.fromEntries(workers.map((w) => [w.id, w]));
    const companyById = Object.fromEntries(companies.map((c) => [c.id, c]));
    const label = { white_card: "White Card", insurance: "Insurance", medical: "Medical", induction: "Induction", swms: "SWMS", public_liability: "Public Liability insurance", workcover: "WorkCover insurance" };
    const today = new Date().toISOString().slice(0, 10);

    // Build one item list per org.
    const perOrg = {};
    const add = (orgId, line) => ((perOrg[orgId] ||= []).push(line));
    for (const d of docs) {
      const w = workerById[d.worker_id];
      if (!w) continue;
      const state = d.expiry_date < today ? "EXPIRED" : `expires ${d.expiry_date}`;
      add(d.organization_id, `${w.name} — ${label[d.category] || d.category} ${state}`);
    }
    for (const d of companyDocs) {
      const c = companyById[d.company_id];
      if (!c) continue;
      const state = d.expiry_date < today ? "EXPIRED" : `expires ${d.expiry_date}`;
      add(d.organization_id, `${c.name} — ${label[d.category] || d.category} ${state}`);
    }
    for (const w of workers) {
      if (w.account_status === "invited" && w.created_at < staleInvite) {
        add(w.organization_id, `${w.name} — hasn't set up their sign-in yet (invited ${w.created_at.slice(0, 10)})`);
      }
    }

    const origin = env.APP_ORIGIN || "https://ohsbuildervictoria.com.au";
    let sent = 0;
    for (const org of orgs) {
      if (org.is_internal) continue; // never nag the QA org
      const items = perOrg[org.id];
      const to = admins.filter((a) => a.organization_id === org.id && a.email).map((a) => a.email);
      if (!items?.length || !to.length) continue;
      const listHtml = items.map((i) => `<li style="margin:0 0 6px;">${i}</li>`).join("");
      await sendEmail(env, {
        to,
        subject: `${org.name}: ${items.length} compliance item${items.length === 1 ? "" : "s"} need${items.length === 1 ? "s" : ""} attention`,
        html: layout({
          heading: "Your daily compliance check",
          bodyHtml: `<p style="margin:0 0 12px;">These items on <strong>${org.name}</strong>'s records are expired, expiring soon, or waiting on someone:</p>
            <ul style="margin:0 0 14px;padding-left:20px;">${listHtml}</ul>
            ${button(`${origin}/builder/compliance`, "Open compliance records")}`,
          footerNote: `You're receiving this daily check because you're a builder admin for ${org.name} on OHS Builder Victoria. Nothing to action means no email.`,
        }),
        text: `Your daily compliance check for ${org.name}:\n\n${items.map((i) => `• ${i}`).join("\n")}\n\nOpen: ${origin}/builder/compliance`,
      });
      sent++;
    }
    return json(200, { sent });
  } catch (err) {
    return json(500, { error: err.message || "digest failed" });
  }
}
