import { json, verifyUser, adminSelect, adminPatch, sendEmail, layout, button, escapeHtml, serverError } from "./_lib/email";

// POST /api/notify-incident { incidentId }
//
// Emails the site team about an incident that was just reported (or retries
// after a failure). Security model, same as the other senders: the caller must
// be a signed-in, Active member of the incident's organisation; the recipient
// list, subject and body are composed HERE from the database — the client only
// names a record id. Recipients are the people actually responsible for that
// site: every Builder Admin and HSE Manager of the organisation, plus the Site
// Supervisor(s) assigned to the incident's project. Nothing goes to anyone
// outside the organisation.
//
// Notifiable incidents (Dangerous Occurrence / Notifiable Incident, or flagged
// notifiable): this email is an INTERNAL alert only. It does not and must not
// stand in for the statutory WorkSafe Victoria notification — the app requires
// an immediate phone call (13 23 60) to be made and recorded before such an
// incident can be closed (migration 011). The email says so and links to it.
const WORKSAFE_PHONE = "13 23 60";
const STAFF_ROLES = ["builder_admin", "hse_manager", "site_supervisor"];

export async function onRequestPost({ request, env }) {
  try {
    const user = await verifyUser(env, request);
    if (!user?.id) return json(401, { error: "Not signed in." });
    const { incidentId } = await request.json().catch(() => ({}));
    const id = Number(incidentId);
    if (!Number.isInteger(id) || id <= 0) return json(400, { error: "A valid incidentId is required." });

    const [inc] = await adminSelect(
      env,
      `incidents?select=id,organization_id,project_id,type,severity,status,description,location,involved,immediate_action,date,reported_by,notifiable,lost_time,staff_notified_at&id=eq.${id}`
    );
    if (!inc) return json(404, { error: "Incident not found." });

    // Caller must belong to the incident's organisation (Active).
    const [caller] = await adminSelect(env, `profiles?select=organization_id,role,status&id=eq.${encodeURIComponent(user.id)}`);
    if (!caller || caller.organization_id !== inc.organization_id || (caller.status || "Active") !== "Active") {
      return json(403, { error: "Only members of this organisation can notify its team." });
    }

    // Organisation toggle (Policies → Notifications → Incident alerts) lives on
    // organizations.notifications. Default on.
    const [org] = await adminSelect(env, `organizations?select=name,notifications&id=eq.${inc.organization_id}`);
    const toggles = (org && org.notifications) || {};
    if (toggles.incident === false) {
      return json(200, { sent: false, skipped: "Incident alerts are switched off in Notifications settings.", to: [] });
    }
    const [project] = inc.project_id ? await adminSelect(env, `projects?select=name,address&id=eq.${inc.project_id}`) : [null];

    // Recipients: every Active builder admin / HSE manager in the org, plus the
    // supervisors assigned to this project.
    const staff = await adminSelect(
      env,
      `profiles?select=id,email,name,role,project_ids&organization_id=eq.${inc.organization_id}&status=eq.Active&role=in.(${STAFF_ROLES.join(",")})`
    );
    const to = Array.from(new Set(
      staff
        .filter((p) => p.email && (p.role !== "site_supervisor" || (Array.isArray(p.project_ids) && inc.project_id != null && p.project_ids.includes(inc.project_id))))
        .map((p) => p.email.trim().toLowerCase())
    ));
    if (!to.length) {
      await adminPatch(env, `incidents?id=eq.${id}`, { staff_notify_error: "No active builder, HSE manager or assigned supervisor to notify.", staff_notify_to: [] });
      return json(200, { sent: false, skipped: "No active site-team account to notify.", to: [] });
    }
    if (!env.RESEND_API_KEY) {
      await adminPatch(env, `incidents?id=eq.${id}`, { staff_notify_error: "Email is not configured on the server." });
      return json(503, { error: "Email isn't set up on the server — tell the team directly." });
    }

    const notifiable = !!inc.notifiable || /notifiable incident|dangerous occurrence/i.test(inc.type || "");
    const projectName = project?.name || "Unassigned site";
    const subject = `${notifiable ? "🚨 NOTIFIABLE — " : ""}${inc.type} at ${projectName} (${inc.severity}) — OHS Builder`;
    const link = `${env.APP_ORIGIN || "https://ohsbuildervictoria.com.au"}/builder/incidents`;
    const rows = [
      ["Type", inc.type], ["Severity", inc.severity], ["Status", inc.status], ["Project", projectName + (project?.address ? ` — ${project.address}` : "")],
      ["Date", inc.date], ["Location", inc.location || "—"], ["Reported by", inc.reported_by || "—"],
      ["Involved", inc.involved || "—"], ["Immediate action", inc.immediate_action || "—"], ["Lost time", inc.lost_time ? "Yes" : "No"],
    ];
    const table = rows.map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#64748b;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:4px 0;">${escapeHtml(v)}</td></tr>`).join("");
    const worksafeHtml = notifiable
      ? `<div style="margin:0 0 14px;padding:12px 14px;background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;color:#991b1b;">
           <strong>This is a notifiable incident.</strong> If it has not been done yet, a responsible person must call <strong>WorkSafe Victoria on ${WORKSAFE_PHONE}</strong> immediately and keep the site undisturbed, then record the call in OHS Builder (Incidents → Record the call). This email is an internal alert only — it is not the WorkSafe notification.
         </div>`
      : "";
    const html = layout({
      heading: `${inc.type} reported — ${escapeHtml(projectName)}`,
      bodyHtml: `${worksafeHtml}
        <p style="margin:0 0 10px;white-space:pre-wrap;">${escapeHtml(inc.description || "")}</p>
        <table style="border-collapse:collapse;font-size:14px;margin:0 0 14px;">${table}</table>
        ${button(link, "Open the incident in OHS Builder")}`,
      footerNote: `Sent to the ${escapeHtml(org?.name || "site")} site team because Incident alerts are on (Settings → Notifications).`,
    });
    const text = `${inc.type} reported — ${projectName}\n${notifiable ? `NOTIFIABLE: call WorkSafe Victoria on ${WORKSAFE_PHONE} immediately if not already done, keep the site undisturbed, and record the call in OHS Builder. This email is an internal alert only.\n` : ""}\n${inc.description || ""}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${link}`;

    try {
      await sendEmail(env, { to, subject, html, text });
    } catch (err) {
      await adminPatch(env, `incidents?id=eq.${id}`, { staff_notify_error: String(err?.message || err).slice(0, 300), staff_notify_to: to });
      return json(502, { error: "The email could not be sent — use Notify team to retry.", to });
    }
    const notifiedAt = new Date().toISOString();
    await adminPatch(env, `incidents?id=eq.${id}`, { staff_notified_at: notifiedAt, staff_notify_to: to, staff_notify_error: null });
    return json(200, { sent: true, to, notifiedAt });
  } catch (err) {
    return serverError(err, "Couldn't notify the site team just now — use Notify team to retry.");
  }
}
