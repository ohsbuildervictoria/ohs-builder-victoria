// ============================================================================
// Document templates — starting points a builder copies into their own
// register as a DRAFT, customises, reviews and then deliberately publishes.
//
// Templates are resources only. OHS Builder Victoria is software — not a
// regulator, policy maker, lawyer or OHS consultant — so nothing here is
// presented as legal advice or as satisfying a legal duty by itself.
//
// PROVENANCE: developed with permission to adapt industry source material.
// The published template is a NEW, genericised OHS Builder Victoria document —
// all source-specific identity, people, ABN, project and contact details were
// removed and replaced with editable placeholders, and every clause was
// checked against current Victorian requirements rather than carried over
// verbatim. Permission holder and source file are recorded privately in
// docs/TEMPLATE_PROVENANCE.local.md (gitignored) — do NOT name the source
// individual/company in committed code or to customers.
//
// Content checked against current authoritative Victorian sources:
//   · Occupational Health and Safety Act 2004 (Vic) — general duties, ss.21–23
//     (duty to employees, independent contractors, other persons), s.35
//     (consultation), Part 5 (incident notification).
//   · Occupational Health and Safety Regulations 2017 (Vic) — Part 5.1
//     Construction (rr. 333 principal contractor; 335 requirement for a health
//     and safety co-ordination plan; 336 required content) and High Risk
//     Construction Work / SWMS (rr. 322–326).
//   · WorkSafe Victoria: "Health and safety coordination plan template",
//     "Safe Work Method Statements (SWMS)", "Notifiable incidents under the
//     OHS Act 2004", "Report an incident" (notify on 13 23 60).
// Last reviewed: 2026-08-09.
// ============================================================================

// Shown wherever a template or an unadopted draft is displayed.
export const TEMPLATE_WARNING = {
  title: "Important — Template only",
  body:
    "This document is provided as a starting point for preparing and organising " +
    "OHS documentation. It is not legal advice and does not by itself satisfy a " +
    "builder's or principal contractor's legal obligations. The user is " +
    "responsible for reviewing, customising, implementing and maintaining " +
    "documentation appropriate to their workplace, project, hazards, " +
    "contractors and work activities. Refer to current Victorian legislation " +
    "and WorkSafe Victoria guidance and obtain competent advice where required.",
};

export const DRAFT_LABEL = "DRAFT / TEMPLATE — NOT YET ADOPTED";
export const ADOPTION_BANNER = "TEMPLATE — MUST BE REVIEWED AND CUSTOMISED BEFORE ADOPTION";

// One high-quality primary template (consolidated — no duplicate coordination
// plan). It covers the health and safety co-ordination plan content the
// Regulations require AND the wider OHS management-program sections a builder
// runs a project on, so a builder has a single place to start.
export const policyTemplates = [
  {
    key: "ohs-management-plan",
    name: "OHS Management Plan / Health & Safety Coordination Plan",
    category: "OHS Mgmt Plan",
    version: "v1.0",
    status: "Template",
    lastReviewed: "2026-08-09",
    sourceBasis:
      "Victorian OHS requirements and WorkSafe Victoria guidance; adapted with permission from industry source material.",
    blurb:
      "A starting document to help builders organise project OHS " +
      "responsibilities, arrangements and procedures. Must be reviewed and " +
      "customised for the specific workplace/project before adoption.",
    content: `OHS MANAGEMENT PLAN / HEALTH & SAFETY COORDINATION PLAN
[Builder / Principal Contractor] — [Project Name], [Site Address]

${"TEMPLATE — MUST BE REVIEWED AND CUSTOMISED BEFORE ADOPTION"}

How to use this document (delete before adopting): replace every [bracketed]
field with your own details, delete anything that does not apply to this
project, and add anything your project needs. Publish and adopt it only once it
reflects how this site will actually be run. This template does not by itself
satisfy any legal obligation.

Context (delete before adopting): under the Occupational Health and Safety
Regulations 2017 (Vic), a "construction project" is one where the cost of the
construction work is $350,000 or more. Such a project must have one principal
contractor (r.333), who must prepare a written health and safety co-ordination
plan before high-risk construction work starts (r.335), keep it current, and
make it available. Regulation 336 sets out what the plan must contain — the
sections below follow it. Adopting this document does not remove your duties
under the OHS Act 2004 (Vic).

1. OHS POLICY STATEMENT
   [Builder / Principal Contractor] is committed to providing and maintaining,
   so far as is reasonably practicable, a working environment that is safe and
   without risks to health for employees, contractors, and any other person at
   the workplace. We will consult with workers on matters that affect their
   health and safety.
   Signed: [Responsible Person]   Position: [ ]   Date: [ ]

2. PROJECT AND PRINCIPAL CONTRACTOR DETAILS
   • Project: [Project Name] — [brief description]
   • Site address: [Site Address]
   • Principal contractor (legal name and ABN): [Builder / Principal Contractor]
   • Site management contact: [Responsible Person] — [phone/email]
   • Expected start date / duration: [ ]
   • Site entrance signage shows the principal contractor's name and contact
     details: [where displayed]

3. RESPONSIBILITIES
   List each role with a specific health and safety responsibility on this
   project and what they are responsible for.
   • Principal contractor / director: [name] — overall duty holder
   • Site manager / supervisor: [Responsible Person] — [responsibilities]
   • Health and Safety Representative(s), if elected: [name(s)]
   • First aid officer(s): [name(s)] — [kit location(s)]
   • Emergency / fire warden: [name]
   • Subcontractors: responsible for their own workers, SWMS and compliance.

4. CONSULTATION AND COMMUNICATION
   How workers and contractors are consulted on health and safety (OHS Act
   2004, s.35).
   • Pre-start / toolbox meetings: [frequency and who attends]
   • How HSRs and workers raise issues and how they are resolved: [process]
   • How safety information and changes are communicated on site: [process]

5. COORDINATION OF CONTRACTORS AND WORKERS (r.336)
   • Site induction: everyone completes it before starting work — [how]
   • Checks before site access (White Card, insurance, relevant licences,
     signed SWMS): [process]
   • Daily sign-in / sign-out: [process, e.g. QR check-in]
   • How overlapping trades are sequenced and consulted: [process]

6. RISK MANAGEMENT
   • How hazards on this project are identified and recorded: [ ]
   • How risks are assessed and controlled using the hierarchy of control: [ ]
   • How controls are monitored and reviewed: [ ]

7. HIGH RISK CONSTRUCTION WORK (HRCW) AND SWMS (rr.322–326)
   • HRCW activities expected on this project: [list — e.g. work at height >2m,
     work near powered mobile plant, trenches, demolition, etc.]
   • A SWMS is prepared for each HRCW activity before it starts, is available
     on site, and is followed: [process]
   • SWMS are reviewed and revised when the work changes, when controls change,
     after an incident during HRCW, or if controls are not working: [process]

8. SITE SAFETY RULES (r.336)
   The rules that apply to everyone at this workplace and how each person is
   informed of them.
   • [Rule — e.g. minimum PPE for this site]
   • [Rule — e.g. exclusion zones / powered mobile plant]
   • [Rule — e.g. no alcohol or other drugs]
   • How the rules are communicated: [induction, signage, toolbox talks]

9. INDUCTION AND TRAINING
   • Site-specific induction content and who delivers it: [ ]
   • Evidence of competency/licences held for the work performed: [ ]
   • Records of inductions and training kept: [where]

10. INCIDENT MANAGEMENT (r.336; OHS Act 2004 Part 5)
    The arrangements for managing OHS incidents that occur.
    • How incidents, injuries and near misses are reported on site: [ ]
    • First aid arrangements: [kits, trained officers, nearest hospital]
    • Notifiable incidents are reported to WorkSafe Victoria immediately on
      13 23 60, and the incident site is preserved as required: [who notifies]
    • Incident investigation and corrective actions: [who, how recorded]

11. EMERGENCY PROCEDURES
    • Emergency and evacuation procedures and muster point: [ ]
    • Emergency contacts: [Emergency Contact]
    • How emergency arrangements are communicated and tested: [ ]

12. MONITORING, REVIEW AND RECORDS
    • Site inspections and audits: [frequency, who]
    • This plan is reviewed and updated when the scope, contractors, site
      conditions or arrangements change: [who reviews, how often]
    • Where the current plan is available on site: [ ]
    • Records retained (inductions, SWMS, incidents, toolbox, inspections):
      [where and for how long]

Prepared by: [Responsible Person]   Position: [ ]   Date: [ ]
Reviewed by: [ ]                     Position: [ ]   Date: [ ]
Adopted (takes effect on site) on:  [Review Date]`,
  },
];
