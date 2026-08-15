// ============================================================================
// Builder Guide — one article per workspace page.
//
// Every claim in here is written against the live behaviour of the page it
// documents (button labels, statuses, calculations). If a page changes, its
// article changes in the same PR — stale documentation is worse than none.
//
// Screenshots: public/docs/screenshots/<slug>.png · Videos:
// public/docs/videos/<slug>.mp4 — see docs/SCREEN_RECORDING_GUIDE.md for the
// capture storyboards. Until an asset exists the slot renders its callouts /
// storyboard instead.
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

export const builderGuide = {
  role: "builder",
  title: "Builder Guide",
  icon: "🏗️",
  blurb:
    "Every page of the builder workspace — what it's for, how to run it day to day, and what evidence it leaves behind for an audit or a WorkSafe visit.",
  articles: [
    {
      slug: "dashboard",
      title: "Dashboard",
      icon: "📊",
      routes: ["/builder/dashboard"],
      summary:
        "Your whole safety system on one screen — compliance, incidents, sign-offs and LTIFR, live.",
      purpose:
        "The Dashboard is the organisation-wide OHS overview. It rolls every project, stakeholder and record into live numbers so you can see in ten seconds whether the company is audit-ready today — without opening a single register.",
      who: "Everyone with workspace access — Builder Admins, HSE Managers and Site Supervisors. It's the natural first screen of the morning.",
      how: [
        "Read the top KPI row first: Active Projects, Stakeholders on Site, Achieved Compliance, Pending Inductions and Open Incidents.",
        "Scan the second row for work that needs doing: Pending SWMS Sign-offs, WorkSafe Notifications (marked Urgent), Near Misses (30d), Open Corrective Actions and LTIFR.",
        "Use the Compliance by Project chart to spot the site dragging the average down, and Incidents by Type to see what keeps going wrong.",
        "Click any project name in the Builders Project Compliance table to jump straight into that project's detail page.",
        "Check Recent Activity — the five latest incidents, diary entries and toolbox meetings across all sites.",
        "Need your safety policies? Open 📜 Policies in the sidebar — the Policy Register lives there.",
      ],
      records: [
        "None — the Dashboard is read-only. Every number on it is calculated live from records created on other pages.",
      ],
      value:
        "One honest screen instead of ringing three supervisors. Because every figure is computed from underlying records (not typed in), the Dashboard is also your early-warning system: a red compliance number or an Urgent WorkSafe tile is a problem you can fix before an inspector finds it.",
      bestPractice: [
        "Open it every morning — pending inductions and expiring documents are cheapest to fix the day they appear.",
        "Treat LTIFR as a trend, not a trophy. It only calculates once your site diaries carry hours, so keep diaries current.",
        "Chase the Open Corrective Actions tile to zero each week — it's the first thing an auditor asks about after an incident.",
      ],
      mistakes: [
        "Ignoring 'Pending SWMS Sign-offs' after a SWMS revision — signatures on the old version stop counting until people re-sign.",
        "Reading '—' as a good LTIFR. It means no site-diary hours have been recorded yet, so there's nothing to divide by.",
        "Only looking at the org-wide compliance number and missing one badly non-compliant site hidden by nine good ones.",
      ],
      faqs: [
        {
          q: "How is LTIFR calculated?",
          a: "Lost-time injuries × 1,000,000 ÷ hours worked. Hours worked come from your site diaries: each entry's hours on site × stakeholders present. An incident counts as a lost-time injury when the 'could not return to their next scheduled shift' box is ticked on it.",
        },
        {
          q: "Why does Achieved Compliance show a dash?",
          a: "There are no stakeholders on any project yet, so there's nothing to measure. Add your crew on the Compliance page and the number appears.",
        },
        {
          q: "Can I change the numbers on the Dashboard?",
          a: "No — deliberately. They're computed from the underlying records, so the only way to improve a number is to fix the records behind it. That's what makes them worth showing an auditor.",
        },
      ],
      screenshot: shot("builder-dashboard", "The Dashboard with both KPI rows, charts and the project compliance table", [
        "Top KPI row — projects, stakeholders, compliance %, pending inductions, open incidents.",
        "Second row — SWMS sign-offs, WorkSafe (Urgent), near misses, corrective actions and LTIFR.",
        "Project names in the table are links — click through to the site.",
      ]),
      video: video("builder-dashboard", "Dashboard in 60 seconds", "≈60s", [
        "Your whole safety system, live, on one screen.",
        "Read the two KPI rows, then click a project name to drill in.",
        "Nothing is created here — every figure is computed from real records.",
        "Spot the site or register that needs attention before an inspector does.",
      ]),
    },

    {
      slug: "projects",
      title: "Projects",
      icon: "🏗️",
      routes: ["/builder/projects"],
      summary:
        "The project register — create sites, track build progress and compliance, and print each site's sign-in QR poster.",
      purpose:
        "Projects is where every site lives: its contract details, status, build progress, crew count, compliance percentage and incident count. Everything else in the platform — inductions, SWMS, diaries, incidents — hangs off a project created here.",
      who: "Builder Admins create and edit projects. HSE Managers and Site Supervisors see project information through the pages they work in.",
      how: [
        "Click + New Project and fill in the essentials: project name (required), site address, contract type, contract value, project manager, start date, status and build progress.",
        "Use the status pills — All · Active · Planning · On Hold · Completed · Archived — to filter the register. 'All' hides archived sites.",
        "Click Sign-in QR on a project card to open the site sign-in poster: Download QR as a PNG or Print poster for the site gate.",
        "Click View Details to open the full project page — Overview, Induction, Stakeholders, Compliance, Risk Register, Incidents, Documents and Diary tabs.",
        "On the project's Induction tab, write your site rules, paste an optional induction video link (YouTube/Vimeo), and set the emergency muster point and site contact — this becomes the induction every stakeholder on that site completes.",
        "On the Documents tab, upload working drawings, permits, certificates and contracts against the right category. Files are stored privately and viewed through signed links.",
        "When a job finishes, Archive it. Archived projects keep every record and can be Restored at any time.",
      ],
      records: [
        "A project record — name, address, contract type and value, PM, dates, status and build progress.",
        "Project documents — one row per uploaded file, categorised (Working Drawings, Permits & Approvals, Certificates, Contracts, Compliance Records, Site Photos & Surveys, General).",
        "The project's own induction content — site rules, video link, muster point and site contact.",
      ],
      value:
        "A single register that answers 'what are we building, who's on it, and is it compliant?' — plus the QR poster that turns morning sign-ins into attendance data, which in turn feeds your site diary and your LTIFR hours automatically.",
      bestPractice: [
        "Print the Sign-in QR poster and put it at the gate on day one — each morning's scans show up in the site diary as a one-click attendance figure.",
        "Write the project induction before the first tradie is invited, so their induction shows your rules, your muster point and your site contact.",
        "Archive completed jobs rather than deleting anything — the records stay findable for the years you're required to keep them.",
      ],
      mistakes: [
        "Leaving build progress at 0% forever — it's your own dashboard signal, keep it roughly honest.",
        "Creating a second project for the same site instead of editing the first — records end up split across two registers.",
        "Forgetting the site address: weather auto-fill in the Site Diary and the Google Maps link both use it.",
      ],
      faqs: [
        {
          q: "How do I archive a project?",
          a: "On the Projects page, click Archive on the project card. Nothing is deleted — the project and every record under it move to the Archived filter.",
        },
        {
          q: "Can I reopen an archived project?",
          a: "Yes. Filter to Archived and click Restore. It returns with all its records exactly as they were.",
        },
        {
          q: "Who can create or edit projects?",
          a: "Only Builder Admins. Supervisors and HSE Managers work within projects but can't create, edit or archive them.",
        },
        {
          q: "What does the QR poster actually do?",
          a: "It encodes a one-per-site check-in link. A tradie scans it each morning and taps 'I'm on site today' — that creates a dated check-in record which the Site Diary offers you as the day's attendance count.",
        },
      ],
      screenshot: shot("builder-projects", "The project register with status pills and a project card", [
        "+ New Project — top right.",
        "Status pills filter the register; 'All' hides Archived.",
        "Sign-in QR on each card — download or print the gate poster.",
        "View Details opens the project's eight tabs.",
      ]),
      video: video("builder-projects", "Projects in 75 seconds", "≈75s", [
        "Every site in one register, with compliance and incidents beside it.",
        "Create a project, print its QR poster, open its detail tabs.",
        "Creates the project record everything else hangs off.",
        "Morning QR scans become attendance — and your LTIFR hours.",
      ]),
    },

    {
      slug: "risk-register",
      title: "Project Risk Register",
      icon: "🛡️",
      routes: ["/builder/projects"],
      summary:
        "A project-level register of every identified hazard — assessed on a 5×5 matrix, with controls, owners and an audit-ready PDF.",
      purpose:
        "WorkSafe-standard OHS practice expects a risk register at project level, not just task-level risk inside each SWMS. The Risk Register tab gives every project one: each row is a hazard with a likelihood × consequence assessment, the controls you've put in place, who owns those controls, and where the risk sits after them.",
      who: "Builder Admins and HSE Managers can build and edit any project's register; Site Supervisors can manage the register on their assigned sites. Tradies on the project can read it, not change it.",
      how: [
        "Open the project (Projects → View Details) and click the Risk Register tab — it sits between Compliance and Incidents.",
        "Start with 📚 Add from SWMS library: it finds the SWMS trades already assigned to this site and imports their hazards — description, controls and a starting assessment — in one click. Hazards you've already imported are skipped, so it's safe to run again after new trades join.",
        "Click + Add Risk for anything site-specific the library can't know: describe the hazard, pick a category (Falls, Electrical, Manual Handling, Plant & Equipment, Hazardous Substances, Environment, Public Safety, General).",
        "Rate it by clicking the 5×5 matrix — likelihood (Rare → Almost certain) across, consequence (Insignificant → Severe) up. The colour you land on IS the rating: Low (green), Medium (yellow), High (orange), Extreme (red). You never type a rating; it's always calculated.",
        "Write the current controls, then click the second matrix to record the residual risk — where the risk sits once those controls are working. An Extreme fall risk with edge protection in place might honestly be Low residual.",
        "Assign a control owner from the project's stakeholders, set the status (Open → Controlled → Closed) and a review date so the entry doesn't quietly go stale.",
        "Export Risk Register (PDF) produces the full register on your letterhead — colour-coded ratings included — ready for an auditor, a client or a WorkSafe visit.",
      ],
      records: [
        "One register row per hazard — description, category, initial 5×5 assessment, controls, residual assessment, owner, status, review date.",
        "SWMS-seeded rows keep their source reference (e.g. SWMS-FRAMER-01), so you can show where an entry came from.",
      ],
      value:
        "This is the document an auditor asks for by name. Because ratings are computed from the matrix — never typed — the register can't quietly claim a 'Low' that the numbers don't support, and because open High/Extreme risks surface on the Dashboard and the project card, a risk you haven't controlled stays visible until you deal with it.",
      bestPractice: [
        "Seed from the SWMS library the day the project is created, then walk the site and add what's specific to it — access, neighbours, overhead services.",
        "Record residual risk honestly. If the residual is still High or Extreme, the controls aren't finished — that's the point of the column.",
        "Set review dates and honour them; a register reviewed monthly is evidence, a register from six months ago is a liability.",
        "Close risks when the work phase ends (Closed keeps the record; nothing is deleted).",
      ],
      mistakes: [
        "Marking a risk Controlled without recording a residual assessment — 'controlled to what level?' is the first question an auditor asks.",
        "Treating the register as a one-off document instead of a living one — add new hazards as the build moves through phases.",
        "Leaving every seeded entry at its starting assessment. The library's numbers are a starting point; your site conditions decide the real rating.",
      ],
      faqs: [
        {
          q: "How is the rating worked out?",
          a: "Likelihood (1–5) × consequence (1–5). A score of 20 or more is Extreme, 10–19 is High, 5–9 is Medium, 4 or less is Low — the standard 5×5 banding. The matrix shows the colour before you click, so there are no surprises.",
        },
        {
          q: "What's the difference between initial and residual risk?",
          a: "Initial is the risk as found, before controls. Residual is where it sits with your current controls working. Dashboards and the project card count a risk as High/Extreme based on its residual rating once you've recorded one — so recording honest residuals is how the register reflects the work you've done.",
        },
        {
          q: "Can tradies see the register?",
          a: "Tradies on the project can read it (the database enforces read-only for them); only builder-side roles can add or change entries. There's no separate register screen in the tradie portal yet — they read it through the builder workspace if shown, and their task-level risk still lives in the SWMS they sign.",
        },
        {
          q: "Does seeding twice duplicate everything?",
          a: "No. The importer checks what's already on the register from each SWMS and only offers hazards that aren't there yet.",
        },
      ],
      screenshot: shot("builder-risk-register", "The Risk Register tab with rating badges, residual column and the seed button", [
        "📚 Add from SWMS library — one click builds a real register from the site's trades.",
        "Rating and Residual badges are calculated from the 5×5 matrix, never typed.",
        "Open High/Extreme count also appears on the project card and Dashboard.",
      ]),
      video: video("builder-risk-register", "Risk Register in 90 seconds", "≈90s", [
        "Seed the register from the SWMS trades already on site.",
        "Click the 5×5 matrix — the colour is the rating.",
        "Record controls, then the honest residual risk.",
        "Export the branded PDF for the auditor.",
      ]),
    },

    {
      slug: "stakeholders",
      title: "Stakeholders & Compliance",
      icon: "✅",
      routes: ["/builder/compliance"],
      summary:
        "Add your crew, send invite links, and run the six-category compliance matrix that decides who can be on site.",
      purpose:
        "The Compliance page is the register of every person on your sites and the evidence behind them. Each stakeholder is tracked across six categories — Induction, Quiz, White Card, Insurance, Medical and SWMS — and the matrix tells you, cell by cell, who is cleared for site and who is blocked.",
      who: "Builder Admins and HSE Managers. This is the page the office runs; tradies see their own slice of it in the stakeholder portal.",
      how: [
        "Click + Add Stakeholder. Enter their full name and trade (required), who they work for, their assigned project and — ideally — their email.",
        "The platform creates their record and a one-time invite link (/join/…). With an email entered, the invite is emailed automatically; otherwise use Copy link and text it to them.",
        "Watch the matrix as they complete their side: Induction, Quiz and SWMS flip to Verified as they finish them on their phone.",
        "Click any White Card, Insurance or Medical cell to upload evidence yourself — the file plus its expiry date. Cells show Missing, Expired, Expiring (within 30 days) or Verified.",
        "Use the Subcontractors tab to add companies and their certificates (Public Liability, WorkCover). A company's insurance covers its whole crew — updating it once updates everyone.",
        "Need to resend an invite? Click ✉️ Email invite in their row. No email on file? ➕ Add email, then Save & send invite.",
        "Click Export CSV for a spreadsheet of the whole matrix, dated today.",
      ],
      records: [
        "A worker record per stakeholder — name, trade, company, project.",
        "A one-time invite token per stakeholder (the /join/ link).",
        "Compliance documents — each uploaded file with its expiry date. Superseded certificates are kept under 'Previously held', not overwritten.",
        "Subcontractor company records and their insurance certificates.",
      ],
      value:
        "The matrix is your site-access gate and your audit trail in one. 'Were they licensed on the day of the incident?' is answerable years later because old certificates are kept, and the red banner names exactly who cannot access site and why — before it becomes a finding.",
      bestPractice: [
        "Always enter an email when adding a stakeholder — the invite sends itself and resends are one click.",
        "Load subcontractor companies first, then their workers: crew members inherit the company's insurance automatically.",
        "Act on Expiring (amber) cells the week they appear — 30 days' warning is there so nobody gets turned away at the gate.",
      ],
      mistakes: [
        "Sharing one invite link between two tradies — each link works once and only for the person it was created for.",
        "Uploading insurance against each individual worker when they share a company — put it on the company and it covers the crew.",
        "Marking someone Verified without a document where evidence is expected — the matrix is only worth what's behind the ticks.",
      ],
      faqs: [
        {
          q: "How do I invite a stakeholder?",
          a: "Compliance → + Add Stakeholder. With an email entered the one-time /join/ link is emailed automatically; otherwise copy it from the confirmation modal and send it yourself.",
        },
        {
          q: "How do I resend an invitation?",
          a: "Click ✉️ Email invite in their matrix row. If they have no email on file, click ➕ Add email, enter it and choose Save & send invite — the existing link stays valid.",
        },
        {
          q: "How do I know who hasn't signed or completed something?",
          a: "Read their matrix row: anything not Verified is outstanding. The red banner above the matrix lists everyone whose site access is blocked by a missing or expired item.",
        },
        {
          q: "What blocks site access?",
          a: "A Missing or Expired item in any category. Expiring (within 30 days) and Pending items show as Action Required but don't block access yet.",
        },
        {
          q: "Can stakeholders see other projects or other people's records?",
          a: "No. A stakeholder sees only their own record, their own documents and their own trade's SWMS. Isolation is enforced in the database, not just hidden in the app.",
        },
      ],
      screenshot: shot("builder-compliance", "The compliance matrix with the six categories and an open evidence cell", [
        "+ Add Stakeholder — starts the invite flow.",
        "Six category columns — Induction, Quiz, White Card, Insurance, Medical, SWMS.",
        "Click any cell to upload or view evidence; statuses are colour-coded.",
        "✉️ Email invite resends; Export CSV downloads the whole matrix.",
      ]),
      video: video("builder-stakeholders", "Stakeholders & invites in 90 seconds", "≈90s", [
        "One register of everyone on site, with the evidence behind them.",
        "Add a stakeholder, send the invite, watch the matrix fill in.",
        "Creates their worker record, invite link and compliance documents.",
        "The red banner tells you who's blocked before an inspector asks.",
      ]),
    },

    {
      slug: "swms",
      title: "SWMS",
      icon: "📋",
      routes: ["/builder/swms"],
      summary:
        "Version-controlled Safe Work Method Statements per trade — assign, revise, and track exactly who has signed what.",
      purpose:
        "SWMS Management keeps one master, version-controlled Safe Work Method Statement per trade, drawn from a library of 75+ templates aligned to the OHS Regulations 2017 (Vic). Stakeholders read and sign the assigned version on their phone; they can never edit it.",
      who: "Builder Admins and HSE Managers. Supervisors don't manage SWMS; tradies sign them in the stakeholder portal.",
      how: [
        "Browse the SWMS Library (searchable, A–Z) to see the template for any trade — each covers tasks, hazards, risk ratings, controls, PPE and legislation references.",
        "Adding a stakeholder with a new trade automatically gives you that trade's template. Use Lock for Sign-off when you're happy with its content.",
        "Track progress on each template card: 'Signed on v1.0 — 3/5' tells you three of five required signatures are in.",
        "Open the Signature register to see every signer with a timestamp, tagged 'Signed in app' or 'Recorded on paper', plus revision history and earlier versions.",
        "When conditions change, click Revise: enter the new version (v1.0 → v1.1 is suggested) and what changed, and why — that note is what an inspector reads. Everyone who signed the old version is asked to sign again; old signatures are kept but stop counting.",
        "Collected a wet signature on paper? Use + Record sign-off to log it against the right person — it's stamped as recorded by staff.",
        "Use the project picker and Download SWMS Pack (PDF) for a complete, printable pack of every relevant template for one site.",
      ],
      records: [
        "SWMS templates with a status and version per trade.",
        "SWMS signatures — immutable once made; nobody, including you, can edit one.",
        "SWMS revisions — from/to version, the reason, who revised it and when, and which signatures were superseded.",
      ],
      value:
        "Version control is the whole point: when a control changes, you can prove who was working under which version on which day, and the platform automatically chases the re-signs. That's the difference between a SWMS folder and a defensible system.",
      bestPractice: [
        "Write a real reason in 'What changed, and why' on every revision — one honest sentence beats a paragraph of boilerplate.",
        "Check the amber 'signed an earlier version' count after each revision and chase those signatures at the next toolbox meeting.",
        "Use Record sign-off the same day a paper signature is collected, so the register never lags the site.",
      ],
      mistakes: [
        "Editing the template's content without revising the version — if the controls changed, the version must change so signatures reset.",
        "Assuming a signature on v1.0 still counts after v1.1 — it doesn't, and the donut will tell you so.",
        "Letting a tradie sign a different trade's SWMS 'to be covered' — it wouldn't cover them, and the portal refuses to offer it.",
      ],
      faqs: [
        {
          q: "How do I assign a SWMS?",
          a: "You don't assign documents person-by-person. Each stakeholder's trade determines their SWMS — the current version of their trade's template appears in their portal to read and sign.",
        },
        {
          q: "How do I know who hasn't signed?",
          a: "Each template card shows 'signed/required' for the current version, and the Signature register lists exactly who signed which version and when. The Dashboard's Pending SWMS Sign-offs tile totals the gap across all trades.",
        },
        {
          q: "What happens to signatures when I revise a SWMS?",
          a: "They're kept against the old version — nothing is deleted — but they stop counting toward the current version. Everyone affected is asked to sign the new version.",
        },
        {
          q: "Can I print a SWMS?",
          a: "Yes — Download PDF on any template or library entry, or Download SWMS Pack (PDF) for a whole project's set in one document.",
        },
      ],
      screenshot: shot("builder-swms", "SWMS management with template cards, sign-off donut and the library", [
        "Sign-off donut — total signed vs required across all trades.",
        "Template cards show 'Signed on v1.0 — n/total' and any earlier-version count.",
        "Revise starts the version bump and re-sign flow.",
        "Download SWMS Pack (PDF) exports a project's full set.",
      ]),
      video: video("builder-swms", "SWMS revision & re-sign in 90 seconds", "≈90s", [
        "One version-controlled SWMS per trade — read-only for the crew.",
        "Revise it: new version, honest reason, and re-signs are requested.",
        "Creates an immutable signature register and a revision history.",
        "Prove who worked under which controls, on any past day.",
      ]),
    },

    {
      slug: "site-diary",
      title: "Site Diary",
      icon: "📓",
      routes: ["/builder/diary"],
      summary:
        "The daily site record — weather, attendance, hours, deliveries and notes. Its hours drive your LTIFR.",
      purpose:
        "The Site Diary is the contemporaneous daily record of each site: weather, wind, hours worked, who was present, deliveries, meetings and site notes. Beyond its evidentiary value, the diary quietly powers your statistics — hours × stakeholders present is the denominator of your LTIFR.",
      who: "Site Supervisors on their assigned sites, plus Builder Admins and HSE Managers across all sites. One entry per site per working day.",
      how: [
        "Pick the project, then fill in the New Diary Entry form: date, weather, wind, hours on site and stakeholders present.",
        "Weather auto-fills from the project's address (Open-Meteo) — edit it if it was different on site.",
        "If the crew scanned the gate QR that morning, click the '✓ N signed in via QR today — use this' shortcut to take the count.",
        "Tag the day — Concrete Pour, Inspection, Wet Weather, Crane, Delivery and so on — so months are scannable later.",
        "Add photos, or hold 🎙️ Record Site Note to dictate instead of type. Notes are required; the rest takes seconds.",
        "Click Save Entry. Working in a dead spot? The entry queues on your device and sends itself when signal returns (photos need signal).",
        "Need to fix yesterday? Open the entry, click Edit, save the correction — the original value and who changed it are kept in the entry's edit history.",
        "Use the month picker and Export Month (PDF) for a complete printable diary.",
      ],
      records: [
        "One diary entry per day — weather, wind, hours, headcount, contacts, deliveries, notes, tags, author and photos.",
        "An audit-log record for every correction — who changed it, what it was, what it is now.",
      ],
      value:
        "When a dispute or claim lands months later, the diary is the document that answers 'what actually happened on site that day?'. And because hours feed LTIFR automatically, keeping the diary honest keeps your headline safety statistic honest too.",
      bestPractice: [
        "Write it at knock-off, not from memory on Friday — contemporaneous records carry far more weight.",
        "Use the QR sign-in count for attendance rather than a guess; it's evidence, not an estimate.",
        "Photograph anything you'd struggle to describe — slab pours, storm damage, deliveries left in the wrong spot.",
      ],
      mistakes: [
        "Skipping quiet days. 'No work — rain' is a valuable record; a gap is just a gap.",
        "Guessing hours and headcount — you'd be quietly corrupting your own LTIFR.",
        "Trying to date an entry in the future — the diary refuses; it records what happened, not what's planned.",
      ],
      faqs: [
        {
          q: "Can I edit yesterday's site diary?",
          a: "Yes. Open the entry and click Edit, then Save correction. The change is recorded in the entry's edit history — original value, new value, and who made the change — so the record stays trustworthy.",
        },
        {
          q: "How do diary hours affect LTIFR?",
          a: "Each entry contributes hours on site × stakeholders present to the hours-worked denominator. No diary hours means LTIFR shows '—' because there is nothing to divide by.",
        },
        {
          q: "Does the diary work offline?",
          a: "Yes for text — entries queue on your device and send themselves when you're back in signal. Photos need a connection.",
        },
        {
          q: "Can I print or export the diary?",
          a: "Yes — pick the month and click Export Month (PDF) for a complete, branded PDF of every entry.",
        },
      ],
      screenshot: shot("builder-diary", "The Site Diary with the entries list and the New Diary Entry form", [
        "Project selector and month picker — Export Month (PDF) lives beside them.",
        "Weather auto-fills from the site address; edit if it was different.",
        "'✓ N signed in via QR today — use this' takes the morning's scan count.",
        "Edit on a past entry opens the audited correction flow.",
      ]),
      video: video("builder-site-diary", "Site Diary in 60 seconds", "≈60s", [
        "The daily record of weather, crew, hours and what happened.",
        "Auto-fill weather, take the QR head-count, tag the day, save.",
        "Creates dated, audited diary entries with photos.",
        "Contemporaneous evidence — and the hours behind your LTIFR.",
      ]),
    },

    {
      slug: "incidents",
      title: "Incidents & Corrective Actions",
      icon: "⚠️",
      routes: ["/builder/incidents"],
      summary:
        "Log incidents and near misses, mark injuries on the body map, run WorkSafe notifications, and close out corrective actions.",
      purpose:
        "The Incidents page is where anything that went wrong — or nearly did — becomes a proper record: typed, graded, investigated, actioned and closed. It also enforces the one legal step you cannot skip: notifiable incidents can't be closed until the WorkSafe notification is recorded.",
      who: "Builder Admins and HSE Managers across all sites; Site Supervisors on their assigned sites. Tradies report from their own phones — those reports land here too.",
      how: [
        "Click + Create New Incident. Choose the type (Near Miss, Injury / Illness, Property Damage, Environmental, Security, Dangerous Occurrence, Notifiable Incident) and severity (Insignificant → Catastrophic) — each shows its plain-English test, and both must be chosen deliberately.",
        "For injuries, tap the body map (front and back figure) to mark where the person was hurt; add photos of the scene.",
        "Tick 'lost-time injury' if the person couldn't return to their next scheduled shift — that's what feeds LTIFR.",
        "If the incident is notifiable (by type, or severity Major/Catastrophic), the red banner appears: call WorkSafe on 13 23 60 immediately and leave the area undisturbed. Then click 'Record the call' and log how you notified them and the WorkSafe reference number.",
        "Assign follow-ups with + Corrective Action — description, who it's assigned to (Site Supervisor / HSE Manager / Builder Admin) and a due date. Track each one Open → In Progress → Done on the incident card.",
        "Walk the incident through its lifecycle with the status dropdown: Open → Investigating → Corrective Actions Assigned → Corrective Actions Complete → Closed.",
        "Use Download PDF or ✉️ Send PDF for the full incident report; use the Near Miss Register button for the proactive-reporting view.",
      ],
      records: [
        "An incident record — type, severity, narrative, people involved, date (never future-dated), status.",
        "Body-map marks and photos attached to the incident.",
        "A WorkSafe notification record — method, reference number, site-preserved confirmation.",
        "Corrective actions with assignee, due date and their own status.",
        "An audit-log entry for every correction to the record.",
      ],
      value:
        "A complete, defensible chain from event to closure. The database physically refuses to close a notifiable incident without its WorkSafe record — so the step with legal consequences is the one the system makes impossible to forget.",
      bestPractice: [
        "Log it the same day, from site if possible — photos and fresh detail are worth more than polish.",
        "Give every corrective action a real owner and a real date; 'everyone' owns nothing.",
        "Treat near misses as free lessons — a healthy near-miss count is a leading indicator, not a bad look.",
      ],
      mistakes: [
        "Downgrading severity to avoid the notifiable banner — the classification test is objective, and mis-grading is far worse in hindsight.",
        "Closing corrective actions in bulk without evidence they happened.",
        "Cleaning up the scene of a notifiable incident before WorkSafe says you can — the site must be preserved.",
      ],
      faqs: [
        {
          q: "Can I edit an incident after saving it?",
          a: "Yes — open it and click Edit, then Save correction. Every correction is audited: the previous value and who changed it are kept on the record.",
        },
        {
          q: "What makes an incident notifiable?",
          a: "Type Notifiable Incident or Dangerous Occurrence, or severity Major or Catastrophic. The platform flags it, tells you to call WorkSafe on 13 23 60, and blocks closure until the notification is recorded.",
        },
        {
          q: "How do I use the body map?",
          a: "On an injury incident, tap the front or back figure where the injury occurred — each tap drops a numbered mark. Marks are stored on the record and appear on the PDF.",
        },
        {
          q: "Where do corrective actions live?",
          a: "On the incident they belong to, under the Corrective Actions heading — each with its own Open / In Progress / Done status. The Dashboard totals the open ones org-wide.",
        },
        {
          q: "Can I email an incident report?",
          a: "Yes — ✉️ Send PDF emails the byte-identical document you'd get from Download PDF, to up to 5 recipients with an optional note.",
        },
      ],
      screenshot: shot("builder-incidents", "The incident register with an open incident showing the body map and corrective actions", [
        "+ Create New Incident — type and severity must both be chosen.",
        "Body map — tap to mark injury locations; they print on the PDF.",
        "Red WorkSafe banner with 'Record the call' — closure is blocked until it's done.",
        "+ Corrective Action assigns follow-ups with owner and due date.",
      ]),
      video: video("builder-incidents", "Incidents & corrective actions in 90 seconds", "≈90s", [
        "From event to closure — typed, graded, actioned, evidenced.",
        "Log the incident, mark the body map, record the WorkSafe call, assign actions.",
        "Creates the incident, its photos, the WorkSafe record and corrective actions.",
        "A closure trail you can hand an inspector without flinching.",
      ]),
    },

    {
      slug: "toolbox",
      title: "Toolbox Meetings",
      icon: "🧰",
      routes: ["/builder/toolbox"],
      summary:
        "Pre-start briefings with a digital sign-off roll — proof of who was consulted, not just a headcount.",
      purpose:
        "Toolbox Meetings records your pre-start safety briefings and — critically — who signed to say they were there. Consultation is a duty under the OHS Act; this page is how you evidence it.",
      who: "Site Supervisors run them on their sites; Builder Admins and HSE Managers can schedule and view across all sites.",
      how: [
        "Click + Create New Meeting: title, project, date and time, topic/agenda and presenter.",
        "Only crew assigned to that project appear on its roll — a signature from someone who wasn't there proves nothing.",
        "Hold the meeting, then open Attendance and tap Sign against each person as they sign off. Each signature is timestamped and flagged as recorded by staff.",
        "Watch the row flip to Completed once signatures cover the attendee list.",
        "Keep an eye on the stat cards: Total Meetings (30d), Avg Sign-off Rate and Digital Signatures.",
      ],
      records: [
        "A meeting record — title, project, date/time, topic, presenter and attendee list.",
        "A timestamped signature per attendee, flagged as staff-recorded.",
      ],
      value:
        "The difference between 'we talk about safety every morning' and being able to prove that on the 14th of March, these eleven people were briefed on working near the crane — with signatures. That's what consultation evidence looks like.",
      bestPractice: [
        "One topic done properly beats five skimmed — brief on what's actually happening on site that day.",
        "Collect signatures at the meeting, not at smoko afterwards.",
        "Tie the topic to reality: after an incident or a SWMS revision, that's your next toolbox topic.",
      ],
      mistakes: [
        "Recording the meeting but skipping the signatures — the footer 'N of M on this site have signed' exists because a headcount alone proves nothing.",
        "Scheduling meetings against the wrong project, which puts the wrong crew on the roll.",
      ],
      faqs: [
        {
          q: "Why is my meeting still 'Scheduled'?",
          a: "It flips to Completed when signatures cover the attendee list. Open Attendance and collect the missing sign-offs.",
        },
        {
          q: "Can a tradie sign from their own phone?",
          a: "Toolbox sign-offs are collected by staff on the Attendance roll during the meeting — each is timestamped and flagged as recorded by staff.",
        },
        {
          q: "What's the Avg Sign-off Rate?",
          a: "Across meetings that had attendees: signatures ÷ attendees, averaged. It's your consultation health-check at a glance.",
        },
      ],
      screenshot: shot("builder-toolbox", "The meetings table with the attendance sign-off modal open", [
        "+ Create New Meeting — title, project, date, topic, presenter.",
        "Attendance opens the sign-off roll for that project's crew.",
        "Sign records a timestamped signature per person.",
        "Status shows Completed once signatures cover attendees.",
      ]),
      video: video("builder-toolbox", "Toolbox meetings in 60 seconds", "≈60s", [
        "Pre-start briefings that leave a paper trail.",
        "Create the meeting, brief the crew, collect signatures on the roll.",
        "Creates the meeting record and timestamped signatures.",
        "Provable consultation — a duty under the OHS Act, evidenced.",
      ]),
    },

    {
      slug: "reports",
      title: "Reports",
      icon: "📈",
      routes: ["/builder/reports"],
      summary:
        "Compliance analytics per project, plus three auto-generated PDF reports you can download or email in one click.",
      purpose:
        "Reports turns your live records into the documents other people need: a per-project compliance breakdown for you, and three auto-generated PDFs — Monthly OHS Summary, WorkSafe Incident Register and SWMS Sign-off Report — for directors, clients and auditors.",
      who: "Builder Admins and HSE Managers.",
      how: [
        "Read the Compliance by Project table — one column per category plus an Overall figure, with the same shared calculation the Dashboard uses.",
        "Check the Org-wide Compliance donut for the single headline number.",
        "Pick a report card and click Download PDF — it builds from live data on the spot.",
        "Or click ✉️ Send: enter up to 5 recipient addresses and an optional note. The emailed PDF is byte-identical to the downloaded one, and the recipient defaults to your billing contact.",
      ],
      records: [
        "No new domain records — reports are generated from existing data. Sends go through the platform's server, not your personal email.",
      ],
      value:
        "The monthly report to the director, the incident register for the audit and the SWMS status for the client meeting — each one click, always current, always branded with your logo and ABN. No more assembling spreadsheets the night before.",
      bestPractice: [
        "Email the Monthly OHS Summary to the same recipients on the same day each month — a predictable reporting rhythm reads well in an audit.",
        "Run the SWMS Sign-off Report after any revision round to confirm the re-signs landed.",
      ],
      mistakes: [
        "Exporting to a spreadsheet and editing the numbers — the report's whole value is that it matches the system.",
        "Only generating reports when someone asks; by then the trend information is gone.",
      ],
      faqs: [
        {
          q: "How do I export reports?",
          a: "Reports → choose the report card → Download PDF. Site-diary months and individual incidents export from their own pages.",
        },
        {
          q: "Can I email reports directly?",
          a: "Yes — ✉️ Send on any report card, up to 5 recipients plus an optional note. The email carries the identical PDF.",
        },
        {
          q: "How do I generate a compliance report for an audit?",
          a: "The Monthly OHS Summary covers org-wide compliance, incidents and toolbox activity; pair it with the WorkSafe Incident Register for the incident history. Both are on this page.",
        },
        {
          q: "Whose logo appears on the PDFs?",
          a: "Yours. Upload it once under Policies → Organisation → Branding and every exported document carries your logo, name and ABN.",
        },
      ],
      screenshot: shot("builder-reports", "Reports page with the compliance table, donut and three report cards", [
        "Compliance by Project — one column per category, Overall at the end.",
        "Org-wide donut — the same number the Dashboard shows.",
        "Download PDF / ✉️ Send on each of the three report cards.",
      ]),
      video: video("builder-reports", "Reports in 45 seconds", "≈45s", [
        "Your records, turned into the documents people ask for.",
        "Pick a report, download it — or email it to five people with a note.",
        "Generates branded, audit-ready PDFs from live data.",
        "Monthly reporting drops from an evening to a click.",
      ]),
    },

    {
      slug: "policies",
      title: "Policies",
      icon: "📜",
      routes: ["/builder/policies"],
      summary:
        "Your organisation's document register — store your OHS plans, policies and procedures, start from a template, and publish deliberately.",
      purpose:
        "Policies is your organisation's document register for storing and distributing OHS plans, policies and procedures to relevant site stakeholders. It's where your OHS Management Plan and site policies live with a version, a category and a status — alongside your notification preferences, organisation details, subscription and the platform's own terms.",
      who: "Builder Admins and HSE Managers maintain the register. Published documents are readable by every signed-in member of your organisation.",
      how: [
        "Policy Register → + Add Policy registers a document you already have: give it a name, a version (v1.0 by default) and a category.",
        "Or start from Templates: Use Template copies an editable starting document — such as the Victorian Health & Safety Coordination Plan / OHS Management Plan — into your register as a DRAFT.",
        "A draft is clearly marked DRAFT / TEMPLATE — NOT YET ADOPTED. Click Edit Draft to replace the bracketed prompts with your own project's details.",
        "When the document reflects how your site is actually run, click Publish & adopt — only then does it become an Active document in your register.",
        "When a document changes later, use New Version — the register keeps the version and last-updated date so 'which policy applied last March?' stays answerable.",
        "Categories (OHS Mgmt Plan, Fire Emergency, Site Access & Induction and so on) keep the register organised — they're common groupings, not an exhaustive list of legal requirements.",
      ],
      records: [
        "A register row per document — name, version, category, status (Draft or Active) and last-updated date.",
        "For template-based documents, the document text itself, editable until you're happy with it.",
      ],
      value:
        "One register that answers 'what safety documents do we run this company on, and which version is current?' — instead of a folder of PDFs on someone's laptop. Drafts can't be mistaken for adopted policy, and version history means an old question gets an honest answer.",
      bestPractice: [
        "Version documents with New Version rather than editing in place — the history is the point.",
        "Review a template line by line before publishing; it's a starting structure, not your finished plan.",
        "Keep category names meaningful so an auditor can navigate your register without a guide.",
      ],
      mistakes: [
        "Publishing a template unchanged — a coordination plan full of bracketed prompts protects nobody and reads exactly like what it is.",
        "Treating the register as write-once — a register frozen since setup reads as exactly that.",
      ],
      faqs: [
        {
          q: "Are the templates legally compliant documents?",
          a: "No — and nothing here claims to be. A template is a starting point for organising OHS documentation. It is not legal advice and does not by itself satisfy legal obligations. The builder/principal contractor remains responsible for preparing, reviewing and maintaining documentation appropriate to the project, workplace, hazards, contractors and work performed. Refer to current Victorian legislation and WorkSafe Victoria guidance and obtain competent advice where required.",
        },
        {
          q: "Who can see the documents I publish?",
          a: "Every signed-in member of your organisation can read the register — enforced in the database. Only Builder Admins and HSE Managers can add, edit or publish documents.",
        },
        {
          q: "What's the difference between a Draft and an Active document?",
          a: "A Draft is a working copy — clearly marked DRAFT / TEMPLATE — NOT YET ADOPTED — that you're still customising. Publish & adopt is the deliberate step that makes it an Active document. The platform never adopts anything on your behalf.",
        },
        {
          q: "Can I upload a PDF of my policy?",
          a: "The register tracks each document's name, version, category and status; template-based documents also carry their editable text. File attachments for project paperwork live on each project's Documents tab.",
        },
      ],
      screenshot: shot("builder-policies", "The Policy Register with a draft document and the Templates tab", [
        "+ Add Policy registers an existing document; Templates starts a draft.",
        "Drafts are marked DRAFT / TEMPLATE — NOT YET ADOPTED until published.",
        "Publish & adopt is the deliberate step that makes a document Active.",
        "Document Categories keep the register organised.",
      ]),
      video: video("builder-policies", "Policies in 60 seconds", "≈60s", [
        "Your OHS documents in one register — versioned, categorised, honest.",
        "Use a template, customise the draft, review it, publish it deliberately.",
        "Creates register rows with version history and a clear Draft/Active status.",
        "A register you can hand an auditor without explaining a folder structure.",
      ]),
    },
  ],
};
