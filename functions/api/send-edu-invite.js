import {
  json,
  verifyUser,
  adminSelect,
  sendEmail,
  layout,
  button,
  escapeHtml,
  serverError,
} from "./_lib/email";

const ROLE_LABELS = {
  institution_admin: "Institution Administrator",
  assessor: "Assessor / Trainer",
  student: "Student",
};

// POST /api/send-edu-invite { membershipId }
// Emails an OHS Builder Education invitation (institution admin, assessor or
// student) its one-time link. Caller must be a signed-in, ACTIVE institution
// admin of the SAME institution as the invitee. Everything in the email is
// composed server-side from the database — the client only names a record.
export async function onRequestPost({ request, env }) {
  try {
    if (!env.RESEND_API_KEY) {
      return json(503, { error: "Email isn't set up yet — copy the link instead." });
    }
    const user = await verifyUser(env, request);
    if (!user?.id) return json(401, { error: "Not signed in." });

    const { membershipId } = await request.json().catch(() => ({}));
    const mid = Number(membershipId);
    if (!Number.isInteger(mid) || mid <= 0) return json(400, { error: "A valid membershipId is required." });

    const [target] = await adminSelect(
      env,
      `edu_memberships?select=id,institution_id,edu_role,name,email,status,invite_token&id=eq.${mid}`
    );
    if (!target) return json(404, { error: "Invitation not found." });

    // Caller must administer the invitee's institution. Checked against the
    // database, never against anything the client sent.
    const callerRows = await adminSelect(
      env,
      `edu_memberships?select=id&user_id=eq.${user.id}&institution_id=eq.${target.institution_id}&edu_role=eq.institution_admin&status=eq.active`
    );
    if (!callerRows.length) {
      return json(403, { error: "Only an administrator of this institution can email its invitations." });
    }
    if (target.status !== "invited" || !target.invite_token) {
      return json(409, { error: "This person has already set up their account." });
    }

    const [inst] = await adminSelect(
      env,
      `edu_institutions?select=name,support_email&id=eq.${target.institution_id}`
    );
    const instName = inst?.name || "Your institution";
    const roleLabel = ROLE_LABELS[target.edu_role] || target.edu_role;

    // Students: name the cohort, unit and scenario so the email makes sense.
    let cohortLine = "";
    let cohortText = "";
    if (target.edu_role === "student") {
      const [enr] = await adminSelect(
        env,
        `edu_enrolments?select=cohort_id&membership_id=eq.${target.id}&order=id.asc&limit=1`
      );
      if (enr?.cohort_id) {
        const [cohort] = await adminSelect(
          env,
          `edu_cohorts?select=name,program_id,scenario_id&id=eq.${enr.cohort_id}`
        );
        const [program] = cohort?.program_id
          ? await adminSelect(env, `edu_programs?select=unit_id&id=eq.${cohort.program_id}`)
          : [null];
        const [unit] = program?.unit_id
          ? await adminSelect(env, `edu_units?select=code,title&id=eq.${program.unit_id}`)
          : [null];
        const [scenario] = cohort?.scenario_id
          ? await adminSelect(env, `edu_scenarios?select=title&id=eq.${cohort.scenario_id}`)
          : [null];
        const parts = [
          cohort?.name && `Cohort: ${cohort.name}`,
          unit?.code && `Unit: ${unit.code} ${unit.title || ""}`.trim(),
          scenario?.title && `Scenario: ${scenario.title}`,
        ].filter(Boolean);
        if (parts.length) {
          cohortLine = `<p style="margin:0 0 12px;">${parts.map(escapeHtml).join("<br/>")}</p>`;
          cohortText = `${parts.join("\n")}\n`;
        }
      }
    }

    const origin = env.APP_ORIGIN || "https://ohsbuildervictoria.com.au";
    const link = `${origin}/edu/join/${target.invite_token}`;
    const firstName = (target.name || "").split(" ")[0] || "there";

    const heading = target.edu_role === "student"
      ? `${escapeHtml(instName)} has enrolled you in a construction simulation`
      : `${escapeHtml(instName)} has invited you as ${escapeHtml(roleLabel)}`;
    const intro = target.edu_role === "student"
      ? `<strong>${escapeHtml(instName)}</strong> uses OHS Builder Education to give you your own simulated construction site. You'll manage its safety system with the same tools real builders use, and your assessor reviews the records you create.`
      : `<strong>${escapeHtml(instName)}</strong> uses OHS Builder Education — a construction workplace simulation and assessment platform — and has invited you to join as their <strong>${escapeHtml(roleLabel)}</strong>.`;

    const html = layout({
      heading,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 12px;">${intro}</p>
        ${cohortLine}
        <p style="margin:0 0 4px;">Set up your sign-in here (takes about a minute):</p>
        ${button(link, target.edu_role === "student" ? "Start my simulation" : "Accept the invitation")}
        <p style="margin:14px 0 0;font-size:13px;color:#64748b;">This link is yours only, works once, and only for the email address it was sent to. If you weren't expecting this, check with ${escapeHtml(instName)} before clicking — or just ignore this email.</p>`,
      footerNote: `You're receiving this because ${escapeHtml(instName)} invited you (as ${escapeHtml(roleLabel)}) on OHS Builder Education. OHS Builder Education provides the simulation and assessment workflow; competency decisions and credentials are issued by the institution.`,
    });
    const text = `Hi ${firstName},

${instName} has invited you to OHS Builder Education as ${roleLabel}.
${cohortText}
Set up your sign-in (takes about a minute):
${link}

This link is yours only, works once, and only for the email address it was sent to. If you weren't expecting this, check with ${instName} before opening it.

— OHS Builder Victoria · ohsbuildervictoria.com.au`;

    await sendEmail(env, {
      to: target.email,
      subject: target.edu_role === "student"
        ? `${instName} has enrolled you in a construction simulation — set up your sign-in`
        : `${instName} has invited you as ${roleLabel} — set up your sign-in`,
      html,
      text,
    });
    return json(200, { sent: true, to: target.email });
  } catch (err) {
    return serverError(err, "Could not send the email.");
  }
}
