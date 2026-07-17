import {
  json,
  verifyUser,
  adminSelect,
  sendEmail,
  layout,
  button,
} from "./_lib/email";

const ROLE_LABELS = {
  builder_admin: "Builder Admin",
  hse_manager: "HSE Manager",
  site_supervisor: "Site Supervisor",
  worker: "Stakeholder / Tradie",
};

// POST /api/send-staff-invite { inviteId }
// Emails invited staff their one-time invite link. Caller must be a signed-in
// Builder Admin of the SAME org as the invite (staff invites grant roles, so
// this is admin-only — matching the invites table's write policy). Everything
// in the email is composed server-side from the database.
export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY) {
      return json(503, { error: "Email isn't set up yet — copy the link instead." });
    }
    const user = await verifyUser(env, request);
    if (!user?.id) return json(401, { error: "Not signed in." });

    const { inviteId } = await request.json().catch(() => ({}));
    if (!inviteId) return json(400, { error: "inviteId required" });

    const [profile] = await adminSelect(
      env,
      `profiles?select=role,organization_id,name&id=eq.${user.id}`
    );
    if (!profile || profile.role !== "builder_admin") {
      return json(403, { error: "Only a Builder Admin can email staff invites." });
    }

    const [invite] = await adminSelect(
      env,
      `invites?select=id,name,email,role,status,invite_token,organization_id&id=eq.${Number(inviteId)}`
    );
    if (!invite || invite.organization_id !== profile.organization_id) {
      return json(404, { error: "Invite not found." });
    }
    if (invite.status !== "invited" || !invite.invite_token) {
      return json(409, { error: "This person has already set up their account." });
    }

    const [org] = await adminSelect(
      env,
      `organizations?select=name&id=eq.${invite.organization_id}`
    );

    const origin = env.APP_ORIGIN || "https://ohsbuildervictoria.com.au";
    const link = `${origin}/join-staff/${invite.invite_token}`;
    const firstName = (invite.name || "").split(" ")[0] || "there";
    const orgName = org?.name || "Your builder";
    const roleLabel = ROLE_LABELS[invite.role] || invite.role;

    const html = layout({
      heading: `${orgName} has invited you to their team`,
      bodyHtml: `
        <p style="margin:0 0 12px;">G'day ${firstName},</p>
        <p style="margin:0 0 12px;"><strong>${orgName}</strong> uses OHS Builder Victoria to run their site safety paperwork, and has invited you to join as their <strong>${roleLabel}</strong>.</p>
        <p style="margin:0 0 4px;">Set up your sign-in here (takes about a minute):</p>
        ${button(link, "Set up my account")}
        <p style="margin:14px 0 0;font-size:13px;color:#64748b;">This link is yours only, works once, and only for the email address it was sent to. If you weren't expecting this, check with ${orgName} before clicking — or just ignore this email.</p>`,
      footerNote: `You're receiving this because ${orgName} invited you (as their ${roleLabel}) to their team on OHS Builder Victoria.`,
    });
    const text = `G'day ${firstName},

${orgName} uses OHS Builder Victoria for site safety paperwork, and has invited you to join as their ${roleLabel}.

Set up your sign-in (takes about a minute):
${link}

This link is yours only, works once, and only for the email address it was sent to. If you weren't expecting this, check with ${orgName} before opening it.

— OHS Builder Victoria · ohsbuildervictoria.com.au`;

    await sendEmail(env, {
      to: invite.email,
      subject: `${orgName} has invited you to their team — set up your sign-in`,
      html,
      text,
    });
    return json(200, { sent: true, to: invite.email });
  } catch (err) {
    return json(500, { error: err.message || "Could not send the email." });
  }
}
