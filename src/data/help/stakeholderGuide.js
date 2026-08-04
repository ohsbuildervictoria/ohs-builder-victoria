// ============================================================================
// Stakeholder Guide — for tradies and subbies using the mobile portal.
//
// Written for a phone screen and a smoko break: short sentences, no jargon,
// every article matches exactly what the worker portal does today.
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

export const stakeholderGuide = {
  role: "stakeholder",
  title: "Stakeholder Guide",
  icon: "👷",
  blurb:
    "For tradies and subbies on site. Everything runs from your phone — signing in, your induction, the safety quiz, your SWMS, your documents and reporting anything dodgy.",
  articles: [
    {
      slug: "login",
      title: "Log in & get started",
      icon: "🔑",
      routes: ["/stakeholder", "/join"],
      summary: "Open your invite link once, set a password, and you're in.",
      purpose:
        "Your builder sends you a one-time invite link. It sets up your own account so your induction, quiz, SWMS signature and tickets are recorded against you — not a shared login.",
      who: "Every tradie, subbie and supplier a builder adds to a site.",
      how: [
        "Open the invite link your builder texted or emailed you (it looks like ohsbuildervictoria.com.au/join/…).",
        "Check the card — it names your builder, your trade and your project.",
        "Enter your email and create a password (at least 8 characters), then tap Set up & continue.",
        "That's it — you land on My Site. Next time, sign in at the Stakeholder portal with that email and password.",
      ],
      records: [
        "Your own account, linked to the record your builder created for you.",
      ],
      value:
        "One login for everything — no paperwork to chase, and everything you complete is instantly visible to your builder as evidence you're cleared for site.",
      bestPractice: [
        "Use an email you actually check — expiry warnings for your tickets go there.",
        "Set up your account before your first day, not at the gate.",
      ],
      mistakes: [
        "Sharing your invite link — it works once, and only for you.",
        "Opening the link again after you've set up. It'll say 'Already set up' — just sign in with your email instead.",
      ],
      faqs: [
        {
          q: "My invite link says it's invalid or already used.",
          a: "Links work once. If you've already set up, sign in at the Stakeholder portal with your email. If not, ask your builder to resend the invite — it's one click for them.",
        },
        {
          q: "I forgot my password.",
          a: "Ask your builder's office to help reset it, or email admin@ohsbuildervictoria.com.au from the address on your account.",
        },
      ],
      screenshot: shot("worker-login", "The invite page and the stakeholder sign-in", [
        "Your invite card — builder, trade and project.",
        "Email + password, then Set up & continue.",
        "Coming back? Use Enter Site Portal on the Stakeholder sign-in.",
      ]),
      video: video("worker-login", "Getting started in 45 seconds", "≈45s", [
        "Your builder invited you — here's what the link does.",
        "Open it, set your email and password, tap Set up & continue.",
        "Creates your own account, linked to your site record.",
        "Everything you complete counts as evidence you're cleared for site.",
      ]),
    },

    {
      slug: "my-site",
      title: "My Site & your tasks",
      icon: "🏠",
      routes: ["/worker/home"],
      summary:
        "Your home screen — which site you're on, whether you have site access, and what's left to do.",
      purpose:
        "My Site shows your assigned site and your task checklist. The banner at the top is the one that matters: Site Access Granted ✅ or Site Access Pending.",
      who: "You — it's the first screen after you sign in.",
      how: [
        "Check the banner: green means you're cleared; amber means finish the tasks below.",
        "Work down Your Tasks: complete the Site Induction, pass the Safety Quiz, sign your SWMS, and upload your documents (White Card, Insurance, Medical).",
        "Each task row takes you straight to the right screen; the bar shows how many of the 4 are done.",
        "See something dodgy on site? Tap the 'See something? Report it.' tile.",
      ],
      records: ["None from this screen — it just shows where you're at."],
      value:
        "No guessing. If the banner's green, you're right to work; if it's amber, the list tells you exactly what's missing — before you get turned around at the gate.",
      bestPractice: [
        "Knock the four tasks over the day you're invited — the induction and quiz take about half an hour all up.",
      ],
      mistakes: [
        "Turning up with the banner still amber and hoping for the best — a missing or expired item blocks site access.",
      ],
      faqs: [
        {
          q: "It says I'm not assigned to a site yet.",
          a: "Your builder hasn't put you on a project yet — give them a call. Everything you've completed still counts.",
        },
        {
          q: "Can I see other projects or other people's stuff?",
          a: "No — you only ever see your own record, your own documents and your own trade's SWMS.",
        },
      ],
      screenshot: shot("worker-home", "My Site with the access banner and the four tasks", [
        "The access banner — green cleared, amber pending.",
        "Your Tasks — the four things that unlock site access.",
        "'See something? Report it.' — straight to the report screen.",
      ]),
      video: video("worker-home", "My Site in 30 seconds", "≈30s", [
        "One screen: your site, your access, your to-dos.",
        "Work down the four tasks — each row takes you there.",
        "Nothing to fill in here — it tracks itself.",
        "Green banner means you're right to work.",
      ]),
    },

    {
      slug: "induction",
      title: "Complete your induction",
      icon: "🎓",
      routes: ["/worker/induction"],
      summary:
        "The daily fitness check, your builder's video, then six short modules — read each one and mark it complete.",
      purpose:
        "The site induction covers the rules, hazards, PPE and emergency setup for your builder's site. Finishing it flips your Induction tick to Verified — one of the four things that get you site access.",
      who: "Every stakeholder, before first starting on site.",
      how: [
        "First, the daily check: 'Before you start — are you right to work today?' Tick both boxes (fit for work, not impaired) and tap Confirm & start ✓. If you can't tick one honestly, tap 'I can't tick one of these today' and call the site contact shown.",
        "If your builder added an induction video, watch it — it plays right there.",
        "Read the six modules in order — Site Rules, Hazards & Emergency, PPE, High-Risk Work & Permits, Reporting, and the Knowledge Check. Each unlocks when the one before is done.",
        "Tap 'I've read this — mark complete' at the end of each module.",
        "When all six are green, tap 'Induction complete — Take the Safety Quiz →'.",
      ],
      records: [
        "Your daily fitness-for-work declaration (recorded each day, either answer).",
        "Your Induction tick flips to Verified on the builder's compliance record.",
      ],
      value:
        "You know this site's actual rules — muster point, site contact, its real hazards — and your builder has proof you were inducted, so nobody has to chase paper.",
      bestPractice: [
        "Actually read Module 2 — the muster point and site contact in it are the ones you'll need in a hurry.",
        "Do it somewhere quiet before your first day, not in the ute at 6:55am.",
      ],
      mistakes: [
        "Ticking the fitness boxes on autopilot. It's recorded — and it's there to protect you.",
        "Skimming for the quiz — the quiz needs every answer right, and it's drawn from these modules.",
      ],
      faqs: [
        {
          q: "Do I get a certificate?",
          a: "No printed certificate — your completion is recorded as the Induction tick your builder sees, which is the evidence that matters.",
        },
        {
          q: "Why does it ask if I'm fit for work every day?",
          a: "It's a daily declaration, once per day per site. If you're injured, crook, or affected by alcohol, drugs or medication, don't start — tap the second button and call the site contact.",
        },
        {
          q: "Do I redo the induction for a new site?",
          a: "Each builder's induction is per their site setup — if you're moved to a new project or builder, check My Site; it'll tell you if anything's outstanding.",
        },
      ],
      screenshot: shot("worker-induction", "The induction with the fitness check and six modules", [
        "The daily fitness check — both boxes, honestly.",
        "Your builder's video (if they added one).",
        "Six modules unlock in order — mark each complete.",
        "Progress bar shows N of 6.",
      ]),
      video: video("worker-induction", "Induction in 60 seconds", "≈60s", [
        "The site's rules, hazards and emergency setup — on your phone.",
        "Daily fitness check, watch the video, read six short modules.",
        "Records your declaration and flips your Induction tick to Verified.",
        "You're cleared faster, and nobody chases paper.",
      ]),
    },

    {
      slug: "safety-quiz",
      title: "Pass the safety quiz",
      icon: "📝",
      routes: ["/worker/quiz"],
      summary:
        "A short quiz on your induction. Every question must be right — have another go if you miss one.",
      purpose:
        "The quiz checks the induction actually went in. It's marked when you finish, and passing flips your Quiz tick to Verified.",
      who: "Every stakeholder, straight after the induction.",
      how: [
        "Answer one question at a time — A, B, C or D. Use ← Back if you want to change one.",
        "Tap 'Finish & submit' on the last question. It's marked on the spot.",
        "Passed? Tap 'Proceed to sign your SWMS →'. Missed one? Tap Retry Quiz — go back over the induction first.",
      ],
      records: [
        "Every attempt is recorded, pass or fail — that's your evidence of competency checking.",
        "A pass flips your Quiz tick to Verified.",
      ],
      value:
        "Five minutes now instead of a supervisor quizzing you at the gate — and a recorded, dated proof you knew the rules before you started.",
      bestPractice: [
        "Do it right after the induction while it's fresh.",
      ],
      mistakes: [
        "Guessing your way through — the pass mark is every question correct, so one guess wrong means a retry.",
      ],
      faqs: [
        {
          q: "What's the pass mark?",
          a: "100% — every question right. It's marked securely when you submit, and you can retry as many times as you need. All attempts are recorded.",
        },
        {
          q: "It says no quiz is set up.",
          a: "Your builder hasn't finished setting it up — let them know, and check back later.",
        },
      ],
      screenshot: shot("worker-quiz", "The quiz with one question showing and the progress bar", [
        "One question at a time — Question N of M up top.",
        "← Back lets you change an answer before submitting.",
        "Finish & submit marks it straight away.",
      ]),
      video: video("worker-quiz", "Safety quiz in 30 seconds", "≈30s", [
        "A quick check that the induction went in.",
        "Answer each question, then Finish & submit.",
        "Every attempt is recorded; a pass flips your tick to Verified.",
        "Dated proof of competency — done in five minutes.",
      ]),
    },

    {
      slug: "sign-swms",
      title: "Read & sign your SWMS",
      icon: "📋",
      routes: ["/worker/swms"],
      summary:
        "Your trade's Safe Work Method Statement — scroll to the end, tick, type your name, sign.",
      purpose:
        "Your SWMS lists the hazards and controls for your trade's work on this site. Signing it says you've read it and you'll work to it. It's read-only — you can't change it, only sign it.",
      who: "Every stakeholder, after passing the quiz.",
      how: [
        "Read the PPE and plant list at the top, then scroll through every hazard and its controls.",
        "Signing stays locked until you reach the bottom — '⬇ Scroll to the bottom to enable signing'.",
        "Tick 'I have read and understood this SWMS'.",
        "Type your full name and tap Sign SWMS.",
      ],
      records: [
        "Your signature against the exact version you read — permanent, timestamped, never editable by anyone.",
        "Your SWMS tick flips to Verified.",
      ],
      value:
        "You know the controls for your own work before you start, and your signature can never be altered or lost — it's on the register with the version and the date.",
      bestPractice: [
        "Actually read the controls for the tasks you'll do this week — that's the part that keeps you out of trouble.",
        "If a control doesn't match how the site really works, tell the supervisor — the SWMS gets revised, not ignored.",
      ],
      mistakes: [
        "Racing to the bottom just to unlock the tick — the controls are the point.",
      ],
      faqs: [
        {
          q: "Why am I being asked to sign again?",
          a: "The builder revised your trade's SWMS — something changed in the controls. Your old signature is kept, but you need to read and sign the new version before it counts.",
        },
        {
          q: "It says there's no SWMS for my trade.",
          a: "The builder hasn't set one up for your trade yet. Don't sign another trade's SWMS — it wouldn't cover you. Let the builder know.",
        },
      ],
      screenshot: shot("worker-swms", "The SWMS signing screen with hazards list and signature block", [
        "PPE and plant requirements up top.",
        "Every hazard with its risk rating and controls.",
        "Signing unlocks at the bottom — tick, type your name, Sign SWMS.",
      ]),
      video: video("worker-swms", "Signing your SWMS in 45 seconds", "≈45s", [
        "The hazards and controls for your trade, on this site.",
        "Read to the end, tick the box, type your name, sign.",
        "Creates a permanent signature against that exact version.",
        "You're covered by the controls you actually read.",
      ]),
    },

    {
      slug: "profile-documents",
      title: "Your details & documents",
      icon: "🗂️",
      routes: ["/worker/registration"],
      summary:
        "Keep your contact details current and upload your White Card, insurance and medical with their expiry dates.",
      purpose:
        "My Profile holds your personal details, emergency contact, licences and the documents that keep you cleared for site — with expiry tracking so you get warned before anything lapses.",
      who: "You — and only you can edit it.",
      how: [
        "Work through the four tabs: Personal, Emergency, Vehicle & Quals, Documents. Tap Save on each.",
        "On Documents, upload your White Card, Insurance and Medical — each needs its expiry date so you get warned before it lapses.",
        "Use Replace when you renew a ticket; the old one is kept on record automatically.",
        "Check the status badge on each row — Missing, Verified, Expiring or Expired — it's the same status your builder sees.",
      ],
      records: [
        "Your profile details and emergency contact.",
        "Each uploaded document with its expiry — old versions are kept, not overwritten.",
      ],
      value:
        "Upload your tickets once and every builder requirement reads from the same place. The expiry warnings mean you renew on your schedule, not at the gate.",
      bestPractice: [
        "Fill in your emergency contact properly — it's who gets called if something happens to you on site.",
        "Photograph tickets straight and in good light so the details are readable.",
      ],
      mistakes: [
        "Uploading a ticket without its expiry date — the warning system can't help you without it.",
        "Letting your phone number go stale — site contacts use it.",
      ],
      faqs: [
        {
          q: "Why can't I edit my Insurance row?",
          a: "You're covered by your company's insurance — the builder manages the company certificate, and it covers the whole crew. The row shows the company's cover and its expiry.",
        },
        {
          q: "How do I update a renewed White Card?",
          a: "Documents tab → your White Card row → pick the new file, set the new expiry, tap Replace. The old card stays on record.",
        },
      ],
      screenshot: shot("worker-profile", "My Profile with the four tabs and the Documents list", [
        "Four tabs — Personal, Emergency, Vehicle & Quals, Documents.",
        "Each document row shows the same status your builder sees.",
        "Upload / Replace with an expiry date — you'll be warned before it lapses.",
      ]),
      video: video("worker-profile", "Your documents in 45 seconds", "≈45s", [
        "Your details and tickets, in one place you control.",
        "Upload White Card, insurance, medical — with expiry dates.",
        "Old documents are kept when you replace them.",
        "Warned before anything lapses — never turned away at the gate.",
      ]),
    },

    {
      slug: "report",
      title: "Report a hazard or incident",
      icon: "⚠️",
      routes: ["/worker/report"],
      summary:
        "See something dodgy? Report it from your phone in under a minute — near misses count.",
      purpose:
        "The Report screen puts incident and hazard reporting in your pocket. If it could have hurt someone, it's worth reporting — near misses are how the next one gets prevented.",
      who: "Every stakeholder. Someone badly hurt? Call 000 first — the button's at the top of the screen.",
      how: [
        "Tap Report in the bottom bar (or the tile on My Site).",
        "Pick what sort of thing happened and how bad it was — each option explains itself in plain English.",
        "Answer the short questions: what happened, whereabouts on site, anyone hurt or involved (tap 'It was me' if it was you), and what was done straight away.",
        "Add photos if you've got them, then tap Send report.",
        "No signal? It saves on your phone and sends itself when you're back in range.",
      ],
      records: [
        "An incident record on your builder's register — dated today, marked as reported by you, with your photos.",
      ],
      value:
        "The near miss you report today is the incident that doesn't happen next month. Your report goes straight onto the builder's register — no forms, no 'tell the supervisor when you see him'.",
      bestPractice: [
        "Report near misses, not just injuries — they're free lessons.",
        "Photos beat descriptions — take two or three from different angles.",
      ],
      mistakes: [
        "Sitting on it until knock-off. Report it while the details are fresh and the hazard's still there to photograph.",
        "Downplaying severity — pick the honest option; the definitions beside each one make it easy.",
      ],
      faqs: [
        {
          q: "What happens after I send a report?",
          a: "It lands on your builder's incident register immediately. You can see your own reports at the bottom of the screen, including the status your builder has set.",
        },
        {
          q: "It says the incident is notifiable — what do I do?",
          a: "Tell your supervisor now. WorkSafe has to be called immediately and the area left alone. Your report is already in the system.",
        },
        {
          q: "Can I report without signal?",
          a: "Yes — it saves on your phone and sends itself as soon as you have signal. Photos need a connection to upload.",
        },
      ],
      screenshot: shot("worker-report", "The report screen with type, severity and photo options", [
        "000 tile up top — someone badly hurt, ring first.",
        "Pick the type and severity — plain-English definitions beside each.",
        "Photos, then Send report. Offline? It queues itself.",
      ]),
      video: video("worker-report", "Reporting in 45 seconds", "≈45s", [
        "If it could have hurt someone, report it.",
        "Pick type and severity, answer four questions, add photos, send.",
        "Creates an incident on the builder's register — yours to track.",
        "Near misses reported today prevent injuries next month.",
      ]),
    },

    {
      slug: "qr-signin",
      title: "Daily QR sign-in",
      icon: "📱",
      routes: ["/checkin"],
      summary:
        "Scan the poster at the gate each morning and tap one button — that's your attendance for the day.",
      purpose:
        "The QR poster at the site gate is the daily sign-in. One scan, one tap, and you're recorded on site for the day.",
      who: "Everyone on site, every morning.",
      how: [
        "Scan the QR poster at the gate with your phone camera.",
        "Check it names the right site, then tap 'I'm on site today'.",
        "Signed in to the portal, it records against your account; not signed in, just type your name.",
      ],
      records: [
        "A dated check-in for that site — it feeds the site diary's attendance count.",
      ],
      value:
        "Ten seconds a morning and there's an accurate record of who was on site — which matters for emergencies, for the site diary, and for the safety statistics behind everyone's back.",
      bestPractice: [
        "Scan on the way in, every day — one scan per day is all it takes.",
      ],
      mistakes: [
        "Scanning once and thinking it covers the week — it's one sign-in per day.",
      ],
      faqs: [
        {
          q: "The code says it's not recognised.",
          a: "The poster's out of date — ask the site supervisor for the current one.",
        },
        {
          q: "I scanned twice — is that a problem?",
          a: "No. It'll just tell you you're already signed in for today.",
        },
      ],
      screenshot: shot("worker-checkin", "The site check-in screen after scanning the gate poster", [
        "The site card — check it's the right project.",
        "One button: 'I'm on site today'.",
      ]),
      video: video("worker-checkin", "QR sign-in in 30 seconds", "≈30s", [
        "The poster at the gate is the sign-in sheet.",
        "Scan, check the site name, tap 'I'm on site today'.",
        "Creates a dated check-in that feeds the site diary.",
        "Ten seconds — and the site knows who's on it today.",
      ]),
    },
  ],
};
