// ============================================================================
// FAQ Centre — the self-service knowledge base at /help/faq.
//
// Every answer is written against current product behaviour (button labels,
// statuses, calculations). When a workflow changes, its answers change in the
// same PR. Keep answers to 2–4 sentences: this is triage, the guides are the
// depth.
// ============================================================================

export const FAQ_CATEGORIES = [
  {
    key: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    items: [
      {
        q: "Do I need a credit card to start?",
        a: "No. The 30-day trial is full-featured (Professional tier) and needs nothing but an email address. Card details aren't collected during the trial.",
      },
      {
        q: "What happens after the free trial?",
        a: "You choose a plan — Starter, Professional or Enterprise. Your records stay exactly as they are whichever tier you pick; nothing is deleted or locked when the trial ends.",
      },
      {
        q: "How long does setup take?",
        a: "An afternoon, honestly. Set your organisation details and logo, create a project, write its induction, and invite your crew — the platform runs itself from there.",
      },
      {
        q: "What should I set up first?",
        a: "Organisation details and logo (Policies → Organisation), then your first project with its site induction, then your stakeholders on the Compliance page. That order means the first tradie inducted sees your rules and the first PDF exported carries your letterhead.",
      },
      {
        q: "Does this replace my OHS obligations?",
        a: "No. The platform helps you meet and evidence your duties under the OHS Act 2004 (Vic) and OHS Regulations 2017 — the legal responsibility stays with you as the builder.",
      },
      {
        q: "Can I use it on my phone?",
        a: "Yes. The builder workspace works on phone and tablet, and the stakeholder portal is designed phone-first — your tradies will likely never see it on anything else.",
      },
    ],
  },
  {
    key: "projects",
    title: "Projects",
    icon: "🏗️",
    items: [
      {
        q: "How do I create a project?",
        a: "Projects → + New Project. Only the name is required to start, but add the site address too — the diary's weather auto-fill and the Google Maps link both use it.",
      },
      {
        q: "How do I archive a project?",
        a: "Click Archive on the project's card. Nothing is deleted — the project and all its records move to the Archived filter, and it stops counting toward your plan's active-project limit.",
      },
      {
        q: "Can I reopen an archived project?",
        a: "Yes — filter to Archived and click Restore. It comes back with every record intact.",
      },
      {
        q: "Who can create or edit projects?",
        a: "Builder Admins only. HSE Managers and Site Supervisors work within projects but can't create, edit or archive them.",
      },
      {
        q: "What's the Sign-in QR poster for?",
        a: "Print it and put it at the site gate. Each tradie scans it once each morning and taps 'I'm on site today' — the count feeds your site diary attendance and your LTIFR hours.",
      },
      {
        q: "Where do I put drawings, permits and contracts?",
        a: "On the project's Documents tab, under the matching category (Working Drawings, Permits & Approvals, Certificates, Contracts, and so on). Files are private and viewed through signed links.",
      },
      {
        q: "How do I set up the site induction for a project?",
        a: "Open the project → Induction tab. Write your site rules, paste an optional YouTube/Vimeo induction video link, and set the muster point and site contact — every stakeholder on that project inducts against that content.",
      },
    ],
  },
  {
    key: "stakeholders",
    title: "Stakeholders",
    icon: "👷",
    items: [
      {
        q: "How do I invite a stakeholder?",
        a: "Compliance → + Add Stakeholder. Enter their name and trade (and ideally their email) — a one-time invite link is created and emailed automatically. No email? Copy the link from the confirmation and text it to them.",
      },
      {
        q: "How do I resend an invitation?",
        a: "Click ✉️ Email invite on their row in the compliance matrix. If they have no email on file, click ➕ Add email, then Save & send invite — the original link stays valid.",
      },
      {
        q: "What counts as a stakeholder?",
        a: "Anyone you add to a site — your own staff, a subbie's crew, suppliers. They get their own sign-in for inductions, SWMS and their documents. There's no per-seat charge; they count toward your plan's allowance (50 on Starter, 250 on Professional, unlimited on Enterprise).",
      },
      {
        q: "Can one stakeholder work across several projects?",
        a: "A stakeholder is assigned to a project, and their induction, quiz and SWMS evidence follows their record. If someone moves sites, update their assigned project on the Compliance page.",
      },
      {
        q: "Can stakeholders see other projects or other people's records?",
        a: "No. Each stakeholder sees only their own record, their own documents and their own trade's SWMS — enforced in the database, not just hidden in the app.",
      },
      {
        q: "Why is a stakeholder's insurance cell read-only?",
        a: "They belong to a subcontractor company, so the company's Public Liability certificate covers the whole crew. Manage it once on the Subcontractors tab and everyone linked to the company updates together.",
      },
      {
        q: "What blocks someone's site access?",
        a: "Any Missing or Expired item across the six categories (Induction, Quiz, White Card, Insurance, Medical, SWMS). The red banner above the matrix names exactly who's blocked and why.",
      },
    ],
  },
  {
    key: "inductions",
    title: "Inductions",
    icon: "🎓",
    items: [
      {
        q: "What does the stakeholder induction include?",
        a: "A daily fitness-for-work declaration, your optional induction video, then six sequential modules — site rules, hazards and emergency procedures, PPE, high-risk work, reporting, and a knowledge check. Modules unlock in order and each is marked complete by the stakeholder.",
      },
      {
        q: "Can I use my own induction content?",
        a: "Yes — each project's Induction tab holds your site rules, video link, muster point and site contact. Anything you leave blank falls back to solid standard content.",
      },
      {
        q: "Does the induction issue a certificate?",
        a: "No printed certificate — completion flips the stakeholder's Induction tick to Verified on your compliance matrix, which is the evidence that matters and the one an auditor asks for.",
      },
      {
        q: "What's the daily fitness declaration?",
        a: "Before starting, each stakeholder confirms once per day that they're physically fit and not impaired by alcohol, drugs or medication. Both outcomes are recorded — including 'I can't tick one of these today', which stops them and shows the site contact to call.",
      },
      {
        q: "How do I see who hasn't completed their induction?",
        a: "The Dashboard's Pending Inductions tile gives the count; the compliance matrix's Induction column names them row by row.",
      },
    ],
  },
  {
    key: "safety-quiz",
    title: "Safety Quiz",
    icon: "📝",
    items: [
      {
        q: "What's the quiz pass mark?",
        a: "100% — every question must be right. It's graded server-side when submitted (the answer key never reaches the phone), and stakeholders can retry as often as needed.",
      },
      {
        q: "Are failed attempts recorded?",
        a: "Yes — every attempt is stored, passed or failed. That's genuine evidence of competency verification, not just a pass certificate.",
      },
      {
        q: "Can a stakeholder skip the quiz?",
        a: "No — the Quiz tick only flips to Verified through an actual passed attempt, and it's one of the four items that gate site access.",
      },
    ],
  },
  {
    key: "swms",
    title: "SWMS",
    icon: "📋",
    items: [
      {
        q: "How do I assign SWMS?",
        a: "By trade, automatically. Each stakeholder's trade determines their SWMS — the current version of that trade's template appears in their portal to read and sign. Adding someone with a new trade adds that trade's template from the 75+ library.",
      },
      {
        q: "How do I know who hasn't signed?",
        a: "Each template card shows signed/required for the current version, the Signature register lists every signer and version, and the Dashboard's Pending SWMS Sign-offs tile totals the gap.",
      },
      {
        q: "What happens when I revise a SWMS?",
        a: "You set a new version and record what changed and why — that note is what an inspector reads. Everyone who signed the old version is asked to sign again; their old signatures are kept against the old version but stop counting.",
      },
      {
        q: "Can a stakeholder edit a SWMS?",
        a: "No — SWMS are standardised and version-controlled; stakeholders can only read and sign. Signatures themselves are immutable once made, for everyone, including you.",
      },
      {
        q: "Someone signed on paper — how do I record it?",
        a: "SWMS → + Record sign-off. Pick who signed and the name as signed; it's stamped as recorded by staff and tagged 'Recorded on paper' in the register.",
      },
      {
        q: "Can I print or export SWMS?",
        a: "Yes — Download PDF on any template or library entry, or Download SWMS Pack (PDF) for a whole project's set in one document.",
      },
    ],
  },
  {
    key: "site-diary",
    title: "Site Diary",
    icon: "📓",
    items: [
      {
        q: "Can I edit yesterday's site diary?",
        a: "Yes — open the entry, click Edit, then Save correction. The edit history keeps the original value, the new value and who changed it, so the record stays defensible.",
      },
      {
        q: "Why do diary hours matter so much?",
        a: "Hours on site × stakeholders present is the denominator of your LTIFR. No diary hours, no LTIFR — the Dashboard shows '—' until diaries carry hours.",
      },
      {
        q: "Does the weather really fill itself in?",
        a: "Yes — from the project's site address via Open-Meteo. Edit it if conditions on site were different; you're recording what happened, not what the forecast said.",
      },
      {
        q: "Can I dictate instead of type?",
        a: "Yes — 🎙️ Record Site Note dictates your notes. There are also one-tap tags (Concrete Pour, Inspection, Wet Weather, Crane…) so months stay scannable.",
      },
      {
        q: "Does the diary work offline?",
        a: "Text entries queue on your device and send themselves when signal returns. Photos need a connection.",
      },
      {
        q: "Can I export the diary?",
        a: "Yes — pick the month and click Export Month (PDF) for a complete branded PDF of every entry.",
      },
    ],
  },
  {
    key: "incidents",
    title: "Incidents",
    icon: "⚠️",
    items: [
      {
        q: "Can I edit an incident?",
        a: "Yes — Edit on the incident, then Save correction. Every correction is audited with the previous value and who changed it.",
      },
      {
        q: "What makes an incident notifiable to WorkSafe?",
        a: "Type Notifiable Incident or Dangerous Occurrence, or severity Major or Catastrophic. The platform flags it in red, tells you to call 13 23 60 immediately and preserve the site — and refuses to close the incident until the notification is recorded with its reference number.",
      },
      {
        q: "How do I use the body map?",
        a: "On an injury incident, tap the front or back figure where the person was hurt — each tap drops a mark. Marks are stored on the record and appear on the exported PDF.",
      },
      {
        q: "How is LTIFR calculated?",
        a: "Lost-time injuries × 1,000,000 ÷ hours worked. An incident counts as an LTI when the 'could not return to their next scheduled shift' box is ticked; hours come from your site diaries. Under ~10 is a healthy benchmark.",
      },
      {
        q: "Can my tradies report incidents themselves?",
        a: "Yes — the Report screen in their portal. Their reports land on your incident register immediately, marked as reported by them, with photos. It even works offline and sends itself when they're back in signal.",
      },
      {
        q: "What's the difference between a near miss and an incident?",
        a: "A near miss is something that could have caused harm but didn't — it's logged with the same form (type: Near Miss) and tracked in the Near Miss Register. A healthy near-miss count is a leading indicator, not a bad look.",
      },
    ],
  },
  {
    key: "corrective-actions",
    title: "Corrective Actions",
    icon: "🔧",
    items: [
      {
        q: "How do I assign a corrective action?",
        a: "On the incident, click + Corrective Action — description, who it's assigned to (Site Supervisor, HSE Manager or Builder Admin) and a due date.",
      },
      {
        q: "How are corrective actions tracked?",
        a: "Each has its own status — Open, In Progress, Done — on the incident card, independent of the incident's lifecycle. The Dashboard's Open Corrective Actions tile totals them org-wide.",
      },
      {
        q: "Can I close an incident with actions still open?",
        a: "The incident lifecycle includes 'Corrective Actions Assigned' and 'Corrective Actions Complete' for exactly this reason — walk it through in order and close it when the actions are genuinely done. Auditors read closed-with-open-actions as box-ticking.",
      },
    ],
  },
  {
    key: "toolbox",
    title: "Toolbox Meetings",
    icon: "🧰",
    items: [
      {
        q: "How do I record a toolbox meeting?",
        a: "Toolbox Meetings → + Create New Meeting (title, project, date, topic, presenter), then open Attendance during the meeting and tap Sign against each person. Each signature is timestamped.",
      },
      {
        q: "Why does only some of my crew appear on the roll?",
        a: "Only crew assigned to that meeting's project appear — a signature from someone who wasn't on the site proves nothing about consultation.",
      },
      {
        q: "When does a meeting show as Completed?",
        a: "When signatures cover the attendee list. Until then it stays Scheduled, and the footer shows 'N of M on this site have signed'.",
      },
    ],
  },
  {
    key: "reports",
    title: "Reports",
    icon: "📈",
    items: [
      {
        q: "How do I export reports?",
        a: "Reports → pick a card → Download PDF. Three are auto-generated from live data: Monthly OHS Summary, WorkSafe Incident Register and SWMS Sign-off Report.",
      },
      {
        q: "Can I email reports?",
        a: "Yes — ✉️ Send on any report card, to up to 5 recipients with an optional note. The emailed PDF is byte-identical to the downloaded one. Individual incidents and diary months email the same way from their own pages.",
      },
      {
        q: "How do I generate a compliance report for an audit?",
        a: "The Monthly OHS Summary covers org-wide compliance, incidents and toolbox activity; pair it with the WorkSafe Incident Register. Both download or email in one click from the Reports page.",
      },
      {
        q: "Can I print records?",
        a: "Every record type exports to a branded PDF — incidents, diary months, SWMS templates and packs, and the three summary reports — and anything that exports can be printed.",
      },
      {
        q: "How is the compliance percentage calculated?",
        a: "Valid evidence cells ÷ (stakeholders × 6 categories), where valid means Verified or Expiring. The Dashboard, Reports page and emailed PDFs all use the same shared calculation, so the numbers always agree.",
      },
    ],
  },
  {
    key: "company-settings",
    title: "Company Settings",
    icon: "⚙️",
    items: [
      {
        q: "How do I change my company details?",
        a: "Policies → Organisation → Organisation Details → Edit (Builder Admin only). Name, ABN, state and billing contact print on every exported PDF.",
      },
      {
        q: "How do I upload my logo?",
        a: "Policies → Organisation → Branding → Upload logo — PNG, JPG, WebP or SVG up to 2 MB. It appears on PDFs, your workspace header and your tradies' portal. Use a version that reads on white paper.",
      },
      {
        q: "How do I manage my policy register?",
        a: "Policies → Policy Register → + Add Policy, with New Version when a policy updates. Or start from the Templates tab — a template lands as a clearly-marked draft you customise and publish deliberately.",
      },
      {
        q: "Why can't I turn off WorkSafe notifications?",
        a: "They're locked on — required for compliance. Notifiable incidents carry legal deadlines, so that switch deliberately doesn't exist.",
      },
      {
        q: "How do I reset a password?",
        a: "Users reset their own from the login screen with their account email. For a stuck staff account, a Builder Admin can deactivate and re-invite; otherwise email admin@ohsbuildervictoria.com.au.",
      },
    ],
  },
  {
    key: "billing",
    title: "Billing & Plans",
    icon: "💳",
    items: [
      {
        q: "What are the plan limits?",
        a: "Starter: 2 active projects, 50 stakeholders. Professional: 10 active projects, 250 stakeholders. Enterprise: unlimited. Archived projects don't count, and there's never a per-seat charge for tradies.",
      },
      {
        q: "Can I change plans later?",
        a: "Yes — up or down, any time, and your records stay exactly as they are. Use Switch to {plan} on the Subscription tab; while billing is being finalised, changes go through support and are sorted same-day.",
      },
      {
        q: "Where do I see my usage against my plan?",
        a: "Policies → Subscription → Usage this period — live bars for active projects and stakeholders against your tier's caps. They turn red if you're over.",
      },
      {
        q: "What happens if I hit a limit?",
        a: "You'll see it coming on the usage bars. Archive a finished project to free a slot, or step up a tier. Your data is never locked over a cap.",
      },
    ],
  },
  {
    key: "mobile",
    title: "Mobile & Offline",
    icon: "📱",
    items: [
      {
        q: "Do my tradies need to install an app?",
        a: "No — the stakeholder portal runs in the phone's browser from their invite link. Nothing to install, nothing to update.",
      },
      {
        q: "What works offline?",
        a: "Site diary entries, incident reports and the daily fitness declaration queue on the device and send themselves when signal returns — a banner shows anything waiting to sync. Photos need a connection.",
      },
      {
        q: "How do I upload photos?",
        a: "Photo pickers sit on incidents (builder and tradie forms), diary entries, compliance evidence and project documents — tap, choose camera or gallery, done. Photos appear on the record and its PDF.",
      },
      {
        q: "How does the morning QR sign-in work for a tradie?",
        a: "Scan the gate poster with the phone camera, check the site name, tap 'I'm on site today'. Ten seconds, once a day — it feeds the diary's attendance count.",
      },
    ],
  },
  {
    key: "security",
    title: "Security & Data",
    icon: "🔒",
    items: [
      {
        q: "Is my data stored in Australia?",
        a: "Yes — Australian-region cloud infrastructure, with row-level security so one builder's records are structurally isolated from another's.",
      },
      {
        q: "Who can see what?",
        a: "Four fixed roles — Builder Admin, HSE Manager, Site Supervisor, Stakeholder — enforced by the database itself, not the app. The Admin Portal's Role Permission Matrix shows the full grid across 20 record types.",
      },
      {
        q: "Can records be silently altered?",
        a: "No. SWMS signatures are immutable for everyone; diary and incident corrections keep the original value and who changed it; superseded certificates are retained. The system is built so history can be added to, not rewritten.",
      },
      {
        q: "What happens to a staff member's access when they leave?",
        a: "Deactivate them in the Admin Portal — signed out of every device and cut off from company records immediately. Everything they created stays.",
      },
      {
        q: "Is the safety quiz cheat-proof?",
        a: "The quiz is graded in the database and the answer key never reaches the browser — a pass means the questions were actually answered correctly.",
      },
    ],
  },
];

export const FAQ_TOTAL = FAQ_CATEGORIES.reduce((n, c) => n + c.items.length, 0);
