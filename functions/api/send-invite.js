import {
  json,
  verifyUser,
  adminSelect,
  sendEmail,
  layout,
  button,
} from "./_lib/email";

// POST /api/send-invite { workerId }
// Emails a tradie their one-time invite link. Caller must be signed-in
// builder staff of the SAME org as the worker; everything in the email is
// composed server-side from the database.
export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY) {
      return json(503, { error: "Email isn't set up yet — copy the link instead." });
    }
    const user = await verifyUser(env, request);
    if (!user?.id) return json(401, { error: "Not signed in." });

    const { workerId } = await request.json().catch(() => ({}));
    if (!workerId) return json(400, { error: "workerId required" });

    const [profile] = await adminSelect(
      env,
      `profiles?select=role,organization_id,name&id=eq.${user.id}`
    );
    const staff = ["builder_admin", "hse_manager", "site_supervisor"];
    if (!profile || !staff.includes(profile.role)) {
      return json(403, { error: "Only builder staff can email invites." });
    }

    const [worker] = await adminSelect(
      env,
      `workers?select=id,name,trade,email,invite_token,account_status,organization_id,project_id&id=eq.${Number(workerId)}`
    );
    if (!worker || worker.organization_id !== profile.organization_id) {
      return json(404, { error: "Worker not found." });
    }
    if (worker.account_status !== "invited" || !worker.invite_token) {
      return json(409, { error: "This person has already set up their account." });
    }
    if (!worker.email) {
      return json(409, { error: "No email on this worker — add one, or copy the link." });
    }

    const [org] = await adminSelect(
      env,
      `organizations?select=name&id=eq.${worker.organization_id}`
    );
    const [project] = worker.project_id
      ? await adminSelect(env, `projects?select=name,address&id=eq.${worker.project_id}`)
      : [null];

    const origin = env.APP_ORIGIN || "https://ohsbuildervictoria.com.au";
    const link = `${origin}/join/${worker.invite_token}`;
    const firstName = (worker.name || "").split(" ")[0] || "there";
    const orgName = org?.name || "Your builder";
    const projectLine = project
      ? `<p style="margin:0 0 12px;">Site: <strong>${project.name}</strong>${project.address ? ` — ${project.address}` : ""}</p>`
      : "";

    const html = layout({
      heading: `${orgName} has added you to their site team`,
      bodyHtml: `
        <p style="margin:0 0 12px;">G'day ${firstName},</p>
        <p style="margin:0 0 12px;"><strong>${orgName}</strong> uses OHS Builder Victoria to run their site safety paperwork — induction, SWMS sign-off and your tickets, all from your phone.</p>
        ${projectLine}
        <p style="margin:0 0 4px;">Set up your sign-in here (takes about a minute):</p>
        ${button(link, "Set up my site sign-in")}
        <p style="margin:14px 0 0;font-size:13px;color:#64748b;">This link is yours only and works once. If you weren't expecting this, check with ${orgName} before clicking — or just ignore this email.</p>`,
      footerNote: `You're receiving this because ${orgName} added you (as their ${worker.trade || "tradesperson"}) to their team on OHS Builder Victoria.`,
    });
    const text = `G'day ${firstName},

${orgName} uses OHS Builder Victoria for site safety paperwork.
${project ? `Site: ${project.name}\n` : ""}
Set up your sign-in (takes about a minute):
${link}

This link is yours only and works once. If you weren't expecting this, check with ${orgName} before opening it.

— OHS Builder Victoria · ohsbuildervictoria.com.au`;

    await sendEmail(env, {
      to: worker.email,
      subject: `${orgName} has added you to ${project?.name || "their site team"} — set up your sign-in`,
      html,
      text,
    });
    return json(200, { sent: true, to: worker.email });
  } catch (err) {
    return json(500, { error: err.message || "Could not send the email." });
  }
}
