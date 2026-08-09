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
    version: "v2.0",
    status: "Template",
    lastReviewed: "2026-08-09",
    sourceBasis:
      "Victorian OHS requirements and WorkSafe Victoria guidance; adapted with permission from industry source material.",
    blurb:
      "A comprehensive starting document to help builders organise project OHS " +
      "responsibilities, arrangements, policies and site controls. Must be " +
      "reviewed and customised for the specific workplace/project before adoption.",
    content: `OHS MANAGEMENT PLAN / HEALTH & SAFETY COORDINATION PLAN
[Builder / Principal Contractor]  ·  ABN [ABN]
[Project Name] — [Site Address]

TEMPLATE — MUST BE REVIEWED AND CUSTOMISED BEFORE ADOPTION

How to use this document (delete before adopting): replace every [bracketed]
field with your own details, delete anything that does not apply, and add
anything your project needs. Publish and adopt it only once it reflects how
this site will actually be run. This template is a starting point only — it
does not by itself satisfy any legal obligation.

Context (delete before adopting): under the Occupational Health and Safety
Regulations 2017 (Vic), a "construction project" is one where the cost of the
construction work is $350,000 or more. Such a project must have one principal
contractor (r.333), who must prepare a written health and safety co-ordination
plan before high-risk construction work starts (r.335) and keep it available
and current. Regulation 336 sets out the required content. Adopting this
document does not remove duties under the Occupational Health and Safety Act
2004 (Vic).

DOCUMENT HISTORY & VERSION CONTROL
 Version | Date | Approved by | Description
 [v1.0]  | [date] | [Responsible Person] | [initial adoption]
 (Update this table each time the document is reviewed or revised.)

COMPANY / PRINCIPAL CONTRACTOR DETAILS
 • Business / builder name: [Builder / Principal Contractor]
 • ABN: [ABN]
 • Business address: [Business Address]
 • Phone / email: [Phone] / [Email]
 • Director / responsible officer: [Responsible Person]
 • Project manager: [Project Manager]
 • Project: [Project Name] — [brief description]
 • Site address: [Site Address]
 • Site signage shows the principal contractor's name and contact details at
   the site entrance: [where displayed]

A. OBLIGATIONS OF ALL PARTIES (OHS Act 2004 (Vic), ss.21–25)
 Employer / principal contractor — so far as is reasonably practicable, provide
   and maintain a safe workplace and systems of work; eliminate or control
   hazards; ensure the health and safety of employees and other persons; and
   consult with workers.
 Self-employed persons / subcontractors — ensure their own and others' health
   and safety is not put at risk by their work; prepare a SWMS for each high
   risk construction activity before it starts.
 Supervisors / foremen — implement this plan, observe OHS law, keep work safe,
   and lead by example.
 Employees / workers — follow reasonable safety instructions, use PPE provided
   and in which they are trained, and not misuse anything provided for safety.

B. CONSULTATION, COMMUNICATION AND ISSUE RESOLUTION (OHS Act 2004, ss.35–39)
 • How workers and contractors are consulted: [pre-start / toolbox meetings —
   frequency and who attends].
 • Health and Safety Representative(s), if elected: [name(s) / work group(s)].
 • Issue resolution: a worker raises a health and safety issue with their HSR
   or supervisor; the issue is discussed and resolved as soon as possible; if
   it cannot be resolved immediately, interim controls are put in place. An
   HSR's power to issue a Provisional Improvement Notice is not overridden.
 • How safety information and changes are communicated on site: [process].

C. HAZARD IDENTIFICATION AND RISK MANAGEMENT
 Apply the five-step cycle to every activity:
   1) Identify hazards  2) Assess the risk  3) Decide on control measures
   4) Implement controls  5) Monitor and review.
 Choose controls using the hierarchy of control (eliminate first; then
 substitute, isolate, engineering, administrative; PPE last).
 • How hazards are identified and recorded on this project: [ ]
 • How risk assessments are documented and reviewed: [ ]

D. HIGH RISK CONSTRUCTION WORK (HRCW) AND SWMS (OHS Regs 2017, rr.322–326)
 A SWMS is prepared, available on site and followed for each HRCW activity
 before it starts. HRCW includes work that involves or is carried out:
   • a risk of a fall of more than 2 metres
   • on a telecommunications tower
   • demolition of load-bearing structure
   • likely disturbance of asbestos
   • structural alterations needing temporary support
   • a confined space
   • a trench or shaft deeper than 1.5 m, or a tunnel
   • use of explosives
   • near pressurised gas mains/piping, or chemical/fuel/refrigerant lines
   • near energised electrical installations or services
   • in an area that may have a contaminated or flammable atmosphere
   • tilt-up or precast concrete elements
   • on, in or adjacent to a road, railway or other traffic corridor in use
   • in an area with movement of powered mobile plant
   • in areas with artificial temperature extremes
   • in or near water/liquid with a drowning risk
   • diving work
 • HRCW expected on this project: [list]
 • SWMS are reviewed and revised when the work changes, when a control changes,
   after an incident during HRCW, or if a control is not working: [process].

E. SITE MANAGEMENT AND CONTROLS
 Customise to the project; delete what does not apply.
 • Control of site & access: only inducted persons who have been given this plan
   may enter; the principal contractor controls the site until handover.
 • Public safety: members of the public excluded unless authorised; risk assess
   and control public hazards; signage/fencing as required.
 • Housekeeping: waste in bins/cages; access ways kept clear; work areas tidy.
 • Hazardous substances: current Safety Data Sheet (SDS) held on site for each
   substance; stored and used per the SDS. (Note: "MSDS" is now "SDS".)
 • Mobile plant & lifting gear: only licensed/competent operators; exclusion
   zones; plant maintained and, where required, registered.
 • Working at heights (>2 m): fall prevention first; edge protection, scaffold
   or harness systems as assessed; ladders only as an interim/low-risk measure.
 • Manual handling: assess and reduce; mechanical aids where practicable.
 • Licences & competency: hold and verify required licences/tickets.
 • Hot works: permit system; extinguisher present; no hot works in a confined
   space without approval.
 • PPE & power tools: used per manufacturer instructions and site signage.
 • Electrical: test-and-tag; no-go zones near live electrical; work near
   overhead powerlines controlled and authorised.
 • Trenching/excavation & underground services: locate services (e.g. Dial
   Before You Dig) before excavating; shoring/benching as assessed.
 • Amenities: toilets, drinking water and washing facilities provided.

F. SITE SAFETY RULES (r.336)
 The rules that apply to everyone, and how each person is informed of them.
   • Site operating hours: [e.g. 7:00am–5:00pm, Mon–Fri]
   • No entry without prior arrangement with the principal contractor
   • Current OHS induction evidence required before starting work
   • A SWMS completed before any high risk construction work
   • Minimum PPE for this site: [specify]
   • No alcohol or other drugs on site
   • Barricaded/exclusion areas must not be entered
   • All incidents, near misses and unsafe plant reported to the principal
     contractor immediately
   • SDS kept on site for all hazardous substances
 • How the rules are communicated: [induction, signage, toolbox talks].

G. BUILDER POLICIES (customise or remove)
 • Safety Policy: [Builder / Principal Contractor] treats the health and safety
   of everyone affected by its work as a priority and consults workers on it.
 • Drug & Alcohol Policy: no person attends or remains on site under the
   influence of alcohol or illicit drugs; breaches lead to disciplinary action.
 • Sun protection (UV): outdoor workers encouraged to use protective clothing,
   hats, eye protection, shade and SPF30+ sunscreen; reviewed periodically.

H. INDUCTION AND TRAINING
 • Site-specific induction content and who delivers it: [ ]
 • General construction induction (White Card) and trade licences verified: [ ]
 • Induction and training records kept: [where].

I. FIRST AID, EMERGENCIES AND FIRE
 • First aid: adequate kits on site and in vehicles; trained first aider(s):
   [name(s)]; nearest hospital: [ ].
 • Emergency/evacuation: on alarm, stop work, make safe if safe to do so, and
   move to the muster point: [location]. Assist anyone unfamiliar with the site.
 • Fire: warn/rescue anyone in danger; call 000 (or 112 from a mobile);
   evacuate; only attack a fire if safe. If clothing catches fire: STOP, DROP,
   ROLL. Emergency contact: [Emergency Contact].

J. INCIDENT NOTIFICATION AND INVESTIGATION (OHS Act 2004 (Vic), Part 5)
 • All incidents and near misses are reported internally and recorded.
 • Notifiable incidents (a death, a serious injury or illness, or a dangerous
   occurrence) must be notified to WorkSafe Victoria IMMEDIATELY on 13 23 60,
   followed by written notification within 48 hours; keep the record for at
   least 5 years.
 • The incident site must not be disturbed until an inspector arrives or directs
   otherwise, except to help an injured person, make the site safe, or prevent
   a further incident.
 • Investigation and corrective actions: [who investigates; how recorded]. Where
   needed, engage a competent OHS advisor.

K. MONITORING, REVIEW AND RECORDS
 • Site inspections/audits: [frequency, who].
 • This plan is reviewed and updated when scope, contractors, site conditions
   or arrangements change: [who reviews, how often].
 • Where the current plan is available on site: [ ].
 • Records retained (inductions, SWMS, incidents, toolbox, inspections): [where
   and for how long].

Prepared by: [Responsible Person]   Position: [ ]   Date: [ ]
Reviewed by: [ ]                     Position: [ ]   Date: [ ]
Adopted (takes effect on site) on:  [Review Date]`,
  },
];
