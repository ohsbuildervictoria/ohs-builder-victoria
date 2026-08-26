import { json, verifyUser, adminSelect, adminInsert, signStorageUrl, sendEmail, layout, button, escapeHtml, serverError } from "./_lib/email";

// POST /api/send-policy-email { projectId, policyIds }
//
// Emails the organisation's current policies / management plans to the people
// on ONE project: every stakeholder on that site's roster who has an email
// address, plus the contact of every subcontractor company with crew on that
// site. Same security model as the other senders: the caller must be a
// builder admin or HSE manager of the project's organisation; the recipient
// list and every link are composed HERE from the database — the client only
// names record ids. Nothing goes outside the organisation, and recipients
// never see each other's addresses (they are all BCC'd; the "To" is the
// sender, who gets a copy as their receipt).
//
// Sending is DISTRIBUTION only. It does not mark acknowledgement, reading or
// acceptance anywhere — those remain deliberate, evidence-backed actions.
// Every send is recorded in security_audit (POLICY_EMAIL_SENT / _FAILED).
export async function onRequestPost({ request, env }) {
  try {
    const user = await verifyUser(env, request);
    if (!user?.id) return json(401, { error: "Not signed in." });
    const { projectId, policyIds } = await request.json().catch(() => ({}));
    const pid = Number(projectId);
    const ids = Array.isArray(policyIds) ? policyIds.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
    if (!Number.isInteger(pid) || pid <= 0) return json(400, { error: "A valid projectId is required." });
    if (!ids.length) return json(400, { error: "Choose at least one policy to send." });

    // Caller must be an Active builder admin / HSE manager of the org.
    const [caller] = await adminSelect(env, `profiles?select=organization_id,role,status,name&id=eq.${encodeURIComponent(user.id)}`);
    if (!caller || (caller.status || "Active") !== "Active" || !["builder_admin", "hse_manager"].includes(caller.role)) {
      return json(403, { error: "Only the builder or an HSE manager can send policy emails." });
    }
    const [project] = await adminSelect(env, `projects?select=id,name,address,organization_id&id=eq.${pid}`);
    if (!project || project.organization_id !== caller.organization_id) {
      return json(403, { error: "That project is not in your organisation." });
    }
    const [org] = await adminSelect(env, `organizations?select=name&id=eq.${project.organization_id}`);

    // The selected policies, org-scoped server-side.
    const policies = await adminSelect(
      env,
      `policies?select=id,name,version,category,status,file_path,file_name&organization_id=eq.${project.organization_id}&id=in.(${ids.join(",")})`
    );
    if (!policies.length) return json(404, { error: "None of those policies exist in your register." });

    // Recipients, from database truth only:
    //  - stakeholders on THIS project's roster with an email address
    //  - the contact of each subcontractor company with crew on THIS project
    const crew = await adminSelect(
      env,
      `workers?select=id,name,email,company_id,account_status&organization_id=eq.${project.organization_id}&project_id=eq.${pid}`
    );
    const stakeholderEmails = crew.map((w) => (w.email || "").trim().toLowerCase()).filter(Boolean);
    const companyIds = Array.from(new Set(crew.map((w) => w.company_id).filter(Boolean)));
    const companies = companyIds.length
      ? await adminSelect(env, `subbie_companies?select=id,name,contact_email&organization_id=eq.${project.organization_id}&id=in.(${companyIds.join(",")})`)
      : [];
    const companyEmails = companies.map((c) => (c.contact_email || "").trim().toLowerCase()).filter(Boolean);
    const bcc = Array.from(new Set([...stakeholderEmails, ...companyEmails]));
    if (!bcc.length) {
      return json(200, { sent: false, skipped: "Nobody on this site's roster has an email address yet.", recipients: 0 });
    }
    if (!env.RESEND_API_KEY) return json(503, { error: "Email isn't set up on the server." });

    // One signed, expiring link per attached PDF — never a permanent URL.
    const items = [];
    for (const p of policies) {
      let url = null;
      if (p.file_path) {
        url = await signStorageUrl(env, "policy-docs", p.file_path.replace(/^policy-docs\//, ""));
      }
      items.push({ name: p.name, version: p.version, category: p.category, url });
    }

    const senderEmail = (user.email || "").trim().toLowerCase();
    const portal = `${env.APP_ORIGIN || "https://ohsbuildervictoria.com.au"}/worker/policies`;
    const subject = `Site policies for ${project.name} — ${org?.name || "your builder"}`;
    const list = items
      .map((i) => `<li style="margin:0 0 8px;">
          <strong>${escapeHtml(i.name)}</strong> <span style="color:#64748b;">(${escapeHtml(i.version || "current")} · ${escapeHtml(i.category || "Policy")})</span>
          ${i.url ? `<br/><a href="${i.url}" style="color:#1d4ed8;">Open the PDF</a> <span style="color:#94a3b8;font-size:12px;">(link expires in 7 days)</span>` : ""}
        </li>`)
      .join("");
    const html = layout({
      heading: `Site policies — ${escapeHtml(project.name)}`,
      bodyHtml: `
        <p style="margin:0 0 10px;">${escapeHtml(org?.name || "Your builder")} has shared the current workplace policies and management plans for
        <strong>${escapeHtml(project.name)}</strong>${project.address ? ` (${escapeHtml(project.address)})` : ""}. Please read them before your next visit to site.</p>
        <ul style="margin:0 0 14px;padding-left:18px;">${list}</ul>
        ${button(portal, "View current site policies in OHS Builder")}
        <p style="margin:10px 0 0;font-size:13px;color:#64748b;">If a link has expired, the latest documents are always available under My Site → Site policies after you sign in.</p>`,
      footerNote: `Sent by ${escapeHtml(caller.name || "your builder")} (${escapeHtml(org?.name || "")}) to the ${escapeHtml(project.name)} site team. Reading this email does not record a policy acknowledgement.`,
    });
    const text = `${org?.name || "Your builder"} has shared the current site policies for ${project.name}.\n\n${items
      .map((i) => `- ${i.name} (${i.version || "current"})${i.url ? `\n  ${i.url}` : ""}`)
      .join("\n")}\n\nView them any time: ${portal}`;

    const audit = {
      organization_id: project.organization_id,
      actor_id: user.id,
      actor_role: caller.role,
      actor_name: caller.name || null,
      table_name: "policies",
      row_id: String(pid),
      details: {
        projectId: pid,
        projectName: project.name,
        policyIds: policies.map((p) => p.id),
        policyNames: policies.map((p) => p.name),
        stakeholders: stakeholderEmails.length,
        subcontractors: companyEmails.length,
        recipients: bcc.length,
      },
    };
    try {
      // BCC keeps recipients invisible to each other; the sender is the "To"
      // and so receives their own copy as the send receipt.
      await sendEmail(env, { to: senderEmail ? [senderEmail] : ["admin@ohsbuildervictoria.com.au"], bcc, subject, html, text });
    } catch (err) {
      await adminInsert(env, "security_audit", { ...audit, action: "POLICY_EMAIL_FAILED", details: { ...audit.details, error: String(err?.message || err).slice(0, 300) } }).catch(() => {});
      return json(502, { error: "The email could not be sent — try again.", recipients: bcc.length });
    }
    await adminInsert(env, "security_audit", { ...audit, action: "POLICY_EMAIL_SENT" }).catch(() => {});
    return json(200, {
      sent: true,
      recipients: bcc.length,
      stakeholders: stakeholderEmails.length,
      subcontractors: companyEmails.length,
      policies: policies.map((p) => p.name),
    });
  } catch (err) {
    return serverError(err, "Couldn't send the policy email just now — try again.");
  }
}
