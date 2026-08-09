// ============================================================================
// Administrator Guide — company setup, users, permissions, branding, settings,
// billing. Written for the Builder Admin, who is the only role that can do
// most of what's in here.
// ============================================================================

const shot = (slug, alt, callouts) => ({
  src: `/docs/screenshots/${slug}.png`,
  alt,
  callouts,
});

const video = (slug, title, duration, beats) => ({
  src: `/docs/videos/${slug}.mp4`,
  title,
  duration,
  beats,
});

export const adminGuide = {
  role: "admin",
  title: "Administrator Guide",
  icon: "🛡️",
  blurb:
    "For the Builder Admin — setting the company up, inviting staff, understanding who can do what, branding your documents, and managing your subscription.",
  articles: [
    {
      slug: "company-setup",
      title: "Company setup",
      icon: "🏢",
      routes: ["/signup"],
      summary:
        "From signup to a working workspace: organisation details, your first project, your first crew.",
      purpose:
        "Signing up creates your own private workspace — your organisation, with you as its Builder Admin. Company setup is about making the workspace yours: correct legal details, your first project, and the crew invited onto it.",
      who: "The Builder Admin — usually the person who signed up.",
      how: [
        "Sign up at /signup with your name, company name, work email and a password — that creates the organisation and your admin account.",
        "Go to Policies → Organisation → Organisation Details → Edit and set the legal essentials: organisation name, ABN, state and billing contact. These print on every exported PDF and letterhead.",
        "Upload your logo under Branding on the same tab (PNG, JPG, WebP or SVG, up to 2 MB) — it appears on your PDFs, your workspace header, and your tradies' portal.",
        "Create your first project (Projects → + New Project) and write its induction on the project's Induction tab.",
        "Add your crew on the Compliance page — each gets a one-time invite link for the mobile portal.",
        "Invite your office team from the Admin Portal — HSE Managers and Site Supervisors get their own staff invites.",
      ],
      records: [
        "Your organisation — completely isolated from every other builder's data at the database level.",
        "Your admin account, organisation details and logo.",
      ],
      value:
        "An afternoon of setup and the system runs itself: inductions happen on tradies' phones, evidence lands on the matrix, and every PDF that leaves the building carries your name, ABN and logo.",
      bestPractice: [
        "Set organisation details and the logo before exporting anything — retrospective letterheads look exactly like what they are.",
        "Write the project induction before inviting the first tradie, so nobody inducts against placeholder content.",
      ],
      mistakes: [
        "Inviting field staff through the Admin Portal — that's for office roles. Tradies are added on Compliance → + Add Stakeholder.",
        "Sharing one admin login around the office instead of inviting each person with their own role.",
      ],
      faqs: [
        {
          q: "What happens after the free trial?",
          a: "The 30-day trial runs full Professional features with no card collected. Near the end, pick a plan on the Pricing page or the Subscription tab — your records stay exactly as they are whichever tier you choose.",
        },
        {
          q: "Is our data separated from other builders?",
          a: "Yes — records live in Australian-region infrastructure with row-level security, so one builder's data is structurally isolated from another's.",
        },
      ],
      screenshot: shot("admin-company-setup", "Organisation details and branding on the Policies page", [
        "Organisation Details → Edit — name, ABN, state, billing contact.",
        "Branding → Upload logo — appears on PDFs and both portals.",
      ]),
      video: video("admin-company-setup", "Company setup in 75 seconds", "≈75s", [
        "Make the workspace yours before the first record goes out.",
        "Set org details, upload the logo, create a project, invite crew.",
        "Creates your organisation, its details and its branding.",
        "Every PDF from day one carries your letterhead.",
      ]),
    },

    {
      slug: "users",
      title: "Users & staff invites",
      icon: "👥",
      routes: ["/builder/admin"],
      summary:
        "Invite office staff with the right role, resend invites, and deactivate accounts when people move on.",
      purpose:
        "The Admin Portal manages platform users — your office and site staff. Each person gets their own account with a role that controls exactly what they can see and do.",
      who: "Builder Admin only. The page is hidden from every other role.",
      how: [
        "Click + Invite Staff Member and enter their name, email, role (Builder Admin, HSE Manager or Site Supervisor) and project assignment.",
        "The one-time invite link (/join-staff/…) is emailed automatically; Copy link if you'd rather send it yourself. It works once, and only for that email address.",
        "Track the Platform Users table — Name, Email, Role, Status (Active / Invited / On Hold) and Last Login.",
        "Resend a pending invite with ✉️ Email invite on its row.",
        "When someone leaves, click Deactivate — they're signed out of every device and lose access to the company's records immediately. Activate reverses it if they come back.",
      ],
      records: [
        "Staff invitations (name, email, role, project assignment).",
        "Account status changes — deactivations take effect immediately, everywhere.",
      ],
      value:
        "Everyone gets their own login with exactly the access their job needs — so 'who did what' is always answerable, and departures are handled in one click instead of a password-changing scramble.",
      bestPractice: [
        "Give people the smallest role that does their job — a supervisor rarely needs HSE Manager access.",
        "Deactivate accounts the day someone finishes up, not at the end of the month.",
      ],
      mistakes: [
        "Trying to invite a tradie here. Workers are added on the Compliance page — the Admin Portal will point you there.",
        "Leaving ex-staff Active because 'they might come back' — deactivate now, reactivate later if they do.",
      ],
      faqs: [
        {
          q: "How do I reset someone's password?",
          a: "Have them use the reset option at the login screen with their account email. If they're locked out entirely, deactivate and re-invite, or email admin@ohsbuildervictoria.com.au for help.",
        },
        {
          q: "The invite email didn't arrive.",
          a: "Check the address on the row, then ✉️ Email invite to resend — or Copy link and text it to them. The link is bound to that email either way.",
        },
        {
          q: "What does Deactivate actually do?",
          a: "Signs them out of every device and removes access to the company's records immediately. Their history stays — nothing they created is deleted.",
        },
      ],
      screenshot: shot("admin-users", "The Admin Portal with the Platform Users table and invite modal", [
        "+ Invite Staff Member — name, email, role, project.",
        "Status column — Active, Invited or On Hold.",
        "✉️ Email invite / Copy link on pending rows; Deactivate on active ones.",
      ]),
      video: video("admin-users", "Users & invites in 60 seconds", "≈60s", [
        "Every staff member, their role and their status in one table.",
        "Invite with a role, resend if needed, deactivate on departure.",
        "Creates one-time staff invites bound to an email address.",
        "Access always matches the payroll — instantly.",
      ]),
    },

    {
      slug: "permissions",
      title: "Roles & permissions",
      icon: "🔐",
      routes: ["/builder/admin#permissions"],
      summary:
        "Four roles, one matrix, enforced by the database — what each person can create, read, update and delete.",
      purpose:
        "Access control runs on four roles — Builder Admin, HSE Manager, Site Supervisor and Stakeholder/Tradie. The Role Permission Matrix on the Admin Portal shows exactly what each role can do across 20 kinds of records, and the database enforces it — the menus just agree with it.",
      who: "Builder Admins assign roles; everyone else simply experiences them.",
      how: [
        "Open the Admin Portal and scroll to the Role Permission Matrix — C·reate, R·ead, U·pdate, D·elete per role per resource; '—' means no access.",
        "Assign roles when inviting: Builder Admin (everything, including billing, users and org settings), HSE Manager (safety operations across all sites, no admin/billing), Site Supervisor (diary, incidents and toolbox on their assigned sites).",
        "Stakeholders/tradies never see the builder workspace at all — they get the mobile portal, scoped to their own records.",
        "To change someone's access, change their role — permissions are never edited per person.",
      ],
      records: [
        "None — the matrix is a read-only statement of what the database enforces.",
      ],
      value:
        "Nobody can see or do more than their role allows — even by URL-hacking or a modified app, because enforcement lives in the database. And your security posture is documented on one screen you can show an auditor.",
      bestPractice: [
        "Review who holds Builder Admin quarterly — it's the role that can do everything, including deactivating you.",
        "Use Site Supervisor for site staff: it scopes them to their assigned sites automatically.",
      ],
      mistakes: [
        "Making everyone an admin 'to keep it simple' — you lose the answer to 'who could have changed this?'.",
        "Expecting a supervisor to manage SWMS or Compliance — those pages are Builder Admin and HSE Manager territory by design.",
      ],
      faqs: [
        {
          q: "Can I customise what a role can do?",
          a: "No — the four roles are fixed and database-enforced, which is what makes the matrix trustworthy as audit evidence. Pick the role that fits the job.",
        },
        {
          q: "Why can't my HSE Manager create projects?",
          a: "Project creation and editing is Builder Admin only. HSE Managers run safety operations across every site but don't alter the project register.",
        },
        {
          q: "Can a stakeholder ever see the builder workspace?",
          a: "No. A worker account that tries is redirected to the mobile portal — and the database wouldn't answer its queries anyway.",
        },
      ],
      screenshot: shot("admin-permissions", "The Role Permission Matrix on the Admin Portal", [
        "Four role columns; twenty resource rows.",
        "C R U D letters per cell — '—' means no access at all.",
        "'Enforced by the database' — the matrix reports it, it doesn't configure it.",
      ]),
      video: video("admin-permissions", "Permissions in 45 seconds", "≈45s", [
        "Four roles, enforced where it counts — the database.",
        "Read the matrix; assign roles when you invite.",
        "No records — this is the rulebook everything else obeys.",
        "Provable least-privilege access on one screen.",
      ]),
    },

    {
      slug: "projects-admin",
      title: "Projects, archiving & documents",
      icon: "🗄️",
      routes: ["/builder/projects#admin"],
      summary:
        "The admin side of projects — creating, editing, archiving, restoring, and the project document store.",
      purpose:
        "Only Builder Admins create, edit, archive and restore projects. This article covers that lifecycle plus the per-project document store — the private, categorised file home for drawings, permits and contracts.",
      who: "Builder Admin.",
      how: [
        "Create with + New Project; edit any detail later with Edit on the card.",
        "Keep status honest — Planning, Active, On Hold, Completed — the filters and dashboard read from it.",
        "When a job wraps up, Archive it. Every record beneath it is retained; the project just leaves the day-to-day views.",
        "Restore an archived project any time — it comes back exactly as it was.",
        "Store files on the project's Documents tab under the right category: Working Drawings, Permits & Approvals, Certificates, Contracts, Compliance Records, Site Photos & Surveys, General. Files are private, viewed via signed links.",
      ],
      records: [
        "Project lifecycle changes (status, archive/restore).",
        "Project document rows — one per uploaded file, categorised.",
      ],
      value:
        "Completed jobs stay out of your way without ever being deleted — which is exactly what record-retention duties want — and every project's paperwork lives with the project, findable years later.",
      bestPractice: [
        "Archive at practical completion, after the last diary entry and incident closure.",
        "Upload permits and certificates as you receive them — the audit finds them with the project, not in someone's inbox.",
      ],
      mistakes: [
        "Deleting nothing is possible by design — but renaming a project to reuse it for a new job splits history across two sites' worth of records. Create a new project instead.",
      ],
      faqs: [
        {
          q: "Does archiving affect my plan's project limit?",
          a: "Limits count active projects. Archiving a finished job frees a slot on your tier.",
        },
        {
          q: "Who can see project documents?",
          a: "Admins and supervisors can manage them (supervisors on their assigned sites); HSE Managers can view. Tradies don't see the project document store — they have their own documents.",
        },
      ],
      screenshot: shot("admin-projects", "A project's Documents tab with categories and the archive control", [
        "Archive / Restore on the project card — nothing is deleted.",
        "Documents tab — 'Upload as' category picker, then drag and drop.",
        "View / Download uses private signed links.",
      ]),
      video: video("admin-projects", "Project lifecycle in 60 seconds", "≈60s", [
        "Create, run, complete, archive — never delete.",
        "Keep status honest; file documents under their category.",
        "Creates the lifecycle trail and the project's file store.",
        "Finished jobs stay findable for as long as retention requires.",
      ]),
    },

    {
      slug: "branding",
      title: "Branding",
      icon: "🎨",
      routes: ["/builder/policies#branding"],
      summary:
        "Your logo on every PDF, the workspace header and your tradies' portal — uploaded once.",
      purpose:
        "Branding puts your identity on everything the platform produces: exported PDFs and letterheads, your workspace header, and the stakeholder portal your tradies see every day.",
      who: "Builder Admin only — other roles see the result, not the controls.",
      how: [
        "Go to Policies → Organisation → Branding.",
        "Click Upload logo — PNG, JPG, WebP or SVG, up to 2 MB.",
        "Check it in the workspace header and on a sample PDF export.",
        "Replace logo or Remove any time.",
      ],
      records: ["The organisation's logo file."],
      value:
        "Reports to clients, incident registers to WorkSafe, SWMS packs to auditors — all leave the building on your letterhead. And your subbies see your brand, not ours, every time they open their portal.",
      bestPractice: [
        "Use a logo designed for light backgrounds — PDFs print on white paper.",
        "Export one test PDF after uploading to check contrast and size.",
      ],
      mistakes: [
        "Uploading a white-on-transparent 'reversed' logo — it vanishes on paper. Ask your designer for the dark-text version.",
      ],
      faqs: [
        {
          q: "Where exactly does the logo appear?",
          a: "On every exported PDF and letterhead, in your workspace header, and in the header of your stakeholders' mobile portal.",
        },
        {
          q: "Why can't my HSE Manager change the logo?",
          a: "Branding is Builder Admin only — it's your company's identity on legal documents.",
        },
      ],
      screenshot: shot("admin-branding", "The Branding card with the logo uploaded", [
        "Policies → Organisation → Branding.",
        "Upload logo / Replace logo / Remove — up to 2 MB.",
        "Preview it in your header immediately after upload.",
      ]),
      video: video("admin-branding", "Branding in 30 seconds", "≈30s", [
        "Your name on your documents.",
        "Upload once under Policies → Organisation.",
        "Stores the logo used across PDFs and both portals.",
        "Everything you export looks like it came from you — because it did.",
      ]),
    },

    {
      slug: "settings",
      title: "Settings, policies & notifications",
      icon: "⚙️",
      routes: ["/builder/policies"],
      summary:
        "The Policy Register your crew sees, your notification preferences, and the platform's own policies.",
      purpose:
        "The Policies page is the organisation's control room: the document register for your OHS plans, policies and procedures — readable by every signed-in member of your organisation — plus notification preferences for the office, organisation details, and the platform's own terms and policies.",
      who: "Builder Admins and HSE Managers (organisation details and branding stay admin-only).",
      how: [
        "On Policy Register, click + Add Policy — name, version, category. Issue a New Version when a policy is updated; Remove retires one. The Templates tab offers editable starting documents that land as clearly-marked drafts until you publish them.",
        "Document Categories cover common groupings — OHS Management Plan, hazard identification and risk, first aid and investigation, fire emergency, WorkSafe reporting and site access/induction. They're organisational, not an exhaustive list of legal requirements.",
        "On Notifications, set the alerts your office receives: incident alerts, compliance lapses, pending SWMS sign-offs, toolbox reminders. WorkSafe notifications are locked on — required for compliance.",
        "On Platform, read the platform's own Privacy Policy, Terms & Conditions, Refund Policy and Security Policy.",
      ],
      records: [
        "Policy register entries with name, version and category.",
        "Your organisation's notification preferences.",
      ],
      value:
        "One current, versioned document register for the whole organisation, and alerts tuned so the right person hears about problems the day they happen.",
      bestPractice: [
        "Version policies with New Version rather than editing in place — 'which policy applied last March?' should always be answerable.",
        "Leave incident alerts on for whoever holds the phone when things go wrong.",
      ],
      mistakes: [
        "Registering policies but never versioning them again — a register frozen since setup reads as exactly that.",
        "Trying to switch off WorkSafe notifications — the platform refuses, deliberately.",
      ],
      faqs: [
        {
          q: "Why can't I disable WorkSafe notifications?",
          a: "They're locked on — required for compliance. Notifiable incidents carry legal deadlines; that switch not existing is a feature.",
        },
        {
          q: "Where do my tradies see these policies?",
          a: "Published register entries are readable by every signed-in member of your organisation — access is enforced in the database. Site rules and induction content are communicated through each project's induction, which every stakeholder completes before starting.",
        },
      ],
      screenshot: shot("admin-settings", "The Policies page tabs with the Policy Register active", [
        "Six tabs — Policy Register, Templates, Notifications, Organisation, Subscription, Platform.",
        "+ Add Policy and per-row New Version / Remove.",
        "Notifications — WorkSafe alerts locked on.",
      ]),
      video: video("admin-settings", "Settings in 60 seconds", "≈60s", [
        "Policies, alerts and org details in one place.",
        "Register policies with versions; tune notifications.",
        "Creates the versioned policy register your workspace shows.",
        "The right person hears about problems the day they happen.",
      ]),
    },

    {
      slug: "billing",
      title: "Billing & subscription",
      icon: "💳",
      routes: ["/builder/policies#subscription"],
      summary:
        "Your plan, your usage against its limits, and how changing tiers works.",
      purpose:
        "The Subscription tab (Policies → Subscription) shows the plan you're on, what it costs, and your live usage — active projects and stakeholders — against the plan's limits.",
      who: "Builder Admin only.",
      how: [
        "Read Your Subscription: current plan, price + GST, billing contact and customer-since date.",
        "Watch the Usage this period bars — Active projects and Stakeholders against your tier's caps (Starter: 2 projects / 50 stakeholders; Professional: 10 / 250; Enterprise: unlimited). Bars turn red when you're over.",
        "Compare tiers in the Plans card — to change, use Switch to {plan}, which currently goes through support rather than self-service.",
        "The trial runs 30 days with full Professional features and no card collected.",
      ],
      records: [
        "None yet — billing isn't switched on, so no payment details exist in the platform.",
      ],
      value:
        "You can see a limit coming weeks away — archive a finished project or step up a tier on your own schedule, not in a lockout. And your plan is priced per company, never per tradie.",
      bestPractice: [
        "Archive completed projects — only active ones count against your cap.",
        "If the stakeholder bar runs hot while projects sit low, that's the signal you're a Professional-tier operation.",
      ],
      mistakes: [
        "Deleting stakeholders to duck under a cap — you'd be deleting your own compliance evidence. Talk to support instead; nobody gets locked out of their records.",
      ],
      faqs: [
        {
          q: "What happens after the free trial?",
          a: "You pick a plan — the trial is full Professional for 30 days with no card. Your records are untouched whichever tier you land on.",
        },
        {
          q: "Do my tradies cost extra?",
          a: "No — there is no per-seat charge. Stakeholders count toward your plan's allowance (50 on Starter, 250 on Professional, unlimited on Enterprise), not your invoice.",
        },
        {
          q: "How do I change plans?",
          a: "Subscription tab → Switch to {plan}. While billing is being finalised, plan changes go through support — email admin@ohsbuildervictoria.com.au and it's sorted same-day.",
        },
        {
          q: "What if I go over a limit?",
          a: "The usage bar turns red and it's time to archive a finished project or move up a tier. Your data is never held hostage over a cap.",
        },
      ],
      screenshot: shot("admin-billing", "The Subscription tab with usage bars and the plans card", [
        "Your Subscription — plan, price + GST, billing contact.",
        "Usage this period — projects and stakeholders vs your caps.",
        "Plans card — Switch to {plan} starts a tier change.",
      ]),
      video: video("admin-billing", "Subscription in 45 seconds", "≈45s", [
        "What you're on, what it costs, how much headroom you have.",
        "Read the usage bars; switch tiers when they run hot.",
        "No card during trial — no payment records held.",
        "See limits coming weeks away, never hit a wall.",
      ]),
    },
  ],
};
