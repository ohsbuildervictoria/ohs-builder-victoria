// ============================================================================
// Document templates — starting points a builder copies into their own
// register as a DRAFT, customises, reviews and then deliberately publishes.
//
// Templates are resources only. OHS Builder Victoria is software — not a
// regulator, policy maker, lawyer or OHS consultant — so nothing here is
// presented as legal advice or as satisfying a legal duty by itself.
//
// Terminology checked against:
//   · Occupational Health and Safety Act 2004 (Vic)
//   · Occupational Health and Safety Regulations 2017 (Vic) — Part 5.1
//     (rr. 333, 335, 336: principal contractor, health and safety
//     co-ordination plans and their required content)
//   · WorkSafe Victoria "Health and safety coordination plan template"
//     (worksafe.vic.gov.au/resources/health-and-safety-coordination-plan-template)
// ============================================================================

// Shown wherever a template or an unadopted draft is displayed.
export const TEMPLATE_WARNING = {
  title: "Important — Template only",
  body:
    "This template is a starting point for organising OHS documentation. It is " +
    "not legal advice and does not by itself satisfy legal obligations. The " +
    "builder/principal contractor remains responsible for preparing, reviewing " +
    "and maintaining documentation appropriate to the project, workplace, " +
    "hazards, contractors and work performed. Refer to current Victorian " +
    "legislation and WorkSafe Victoria guidance and obtain competent advice " +
    "where required.",
};

export const DRAFT_LABEL = "DRAFT / TEMPLATE — NOT YET ADOPTED";

export const policyTemplates = [
  {
    key: "hs-coordination-plan",
    name: "Health & Safety Coordination Plan / OHS Management Plan",
    category: "OHS Mgmt Plan",
    blurb:
      "An editable starting structure for the plan a principal contractor " +
      "prepares for a Victorian construction project, based on the content " +
      "areas in the OHS Regulations 2017 (Vic) and WorkSafe Victoria's own " +
      "coordination plan template.",
    content: `HEALTH & SAFETY COORDINATION PLAN / OHS MANAGEMENT PLAN
[Your company name] — [Project name and site address]

STATUS: DRAFT — review every section, replace the bracketed prompts with your
own project's details, delete anything that does not apply, and add anything
your project needs. Publish only once it reflects how this site will actually
be run.

Context (delete before adopting): under the Occupational Health and Safety
Regulations 2017 (Vic), a "construction project" is one where the cost of the
construction work is $350,000 or more. Such a project must have one principal
contractor, and the principal contractor must prepare a written health and
safety coordination plan before construction work starts, keep it up to date
while the work is performed, and make it available. The content areas below
follow what the Regulations require the plan to include — but this document
only helps you organise that information; it does not decide it for you.

1. PROJECT AND PRINCIPAL CONTRACTOR DETAILS
   • Project name and description: [ ]
   • Site address: [ ]
   • Principal contractor (legal name and ABN): [ ]
   • Site contact and phone: [ ]
   • Expected start date and duration: [ ]
   • Signage: the principal contractor's name and contact details are
     displayed at the site entrance: [where]

2. PEOPLE WITH SPECIFIC HEALTH AND SAFETY RESPONSIBILITIES
   List each person or role with a specific OHS responsibility on this
   project and what they are responsible for.
   • Site manager / supervisor: [name] — [responsibilities]
   • First aid officer(s): [name(s)] — [location of kit]
   • Emergency coordinator / fire warden: [name]
   • Health and Safety Representatives (if elected): [name(s)]
   • Subcontractor supervisors: [names / arrangement]

3. COORDINATION OF CONTRACTORS AND WORKERS
   How the health and safety of everyone performing construction work on
   this site is coordinated.
   • Site induction: everyone completes the site induction before starting
     work: [how — e.g. digital induction in this platform]
   • Compliance checks before site access (White Card, insurance, SWMS
     signed): [process]
   • Daily sign-in / sign-out arrangements: [process — e.g. QR check-in]
   • Coordination meetings (toolbox talks, pre-starts): [frequency]
   • How overlapping trades are sequenced and consulted: [process]

4. SAFE WORK METHOD STATEMENTS (HIGH RISK CONSTRUCTION WORK)
   • Trades performing high risk construction work on this project: [list]
   • SWMS are prepared/reviewed and signed before that work starts: [process]
   • SWMS are reviewed and revised when the work or controls change, or when
     controls are found not to be working: [process]

5. SITE SAFETY RULES
   The rules that apply to everyone at this workplace, and how every person
   at the workplace is informed of them.
   • [Rule — e.g. minimum PPE for this site]
   • [Rule — e.g. exclusion zones / plant movement]
   • [Rule — e.g. no alcohol or drugs]
   • How the rules are communicated: [induction, signage, toolbox talks]

6. MANAGING INCIDENTS
   The arrangements for managing occupational health and safety incidents
   when they occur.
   • How incidents, injuries and near misses are reported on this site: [ ]
   • First aid arrangements: [kits, trained officers, nearest hospital]
   • Emergency procedures and muster point: [ ]
   • Incident investigation and corrective actions: [who, how recorded]
   • Notifiable incidents are reported to WorkSafe Victoria immediately on
     13 23 60, and the scene preserved as required: [who makes the call]

7. RISK MANAGEMENT
   • How hazards on this project are identified and recorded: [ ]
   • How risks are assessed and controlled: [ ]
   • How controls are reviewed: [ ]

8. KEEPING THIS PLAN CURRENT
   • This plan is reviewed and updated when the scope, contractors, site
     conditions or arrangements change: [who reviews, how often]
   • Where the current plan is available on site: [ ]
   • Version history is kept in the document register.

Prepared by: [name, role]        Date: [ ]
Reviewed by: [name, role]        Date: [ ]
Adopted on:  [date it takes effect on site]`,
  },
];
