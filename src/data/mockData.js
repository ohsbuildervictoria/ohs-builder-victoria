// ============================================================================
// OH&S Builder Victoria — Mock Data
// All data is fictional and for prototype/demo purposes only.
// ============================================================================

// ---------------------------------------------------------------------------
// Organisation
// ---------------------------------------------------------------------------
export const org = {
  name: "Arlington Homes",
  abn: "45 882 119 660",
  state: "Victoria",
  plan: "Professional",
  users: 7,
  billingContact: "david@arlingtonhomes.com.au",
  tagline: "Built by Builders for Builders.",
  builtBy: "Nexxt Nest Group",
};

// ---------------------------------------------------------------------------
// Demo users (simulated auth)
// ---------------------------------------------------------------------------
export const users = [
  {
    id: 1,
    name: "David Caruana",
    email: "david@arlingtonhomes.com.au",
    role: "builder_admin",
    status: "Active",
    lastLogin: "2026-06-10 08:14",
    projects: "All",
  },
  {
    id: 2,
    name: "Rebecca Lawson",
    email: "hse@arlingtonhomes.com.au",
    role: "hse_manager",
    status: "Active",
    lastLogin: "2026-06-10 07:52",
    projects: [1, 4],
  },
  {
    id: 3,
    name: "Tom Wallace",
    email: "supervisor@arlingtonhomes.com.au",
    role: "site_supervisor",
    status: "Active",
    lastLogin: "2026-06-09 16:40",
    projects: [1],
  },
  {
    id: 4,
    name: "Karen Mills",
    email: "hse2@arlingtonhomes.com.au",
    role: "hse_manager",
    status: "Active",
    lastLogin: "2026-06-09 09:05",
    projects: [2, 3],
  },
  {
    id: 5,
    name: "Greg Patterson",
    email: "supervisor2@arlingtonhomes.com.au",
    role: "site_supervisor",
    status: "Active",
    lastLogin: "2026-06-08 15:21",
    projects: [4],
  },
  {
    id: 6,
    name: "Steph Carmody",
    email: "supervisor3@arlingtonhomes.com.au",
    role: "site_supervisor",
    status: "Invited",
    lastLogin: "—",
    projects: [2],
  },
  {
    id: 7,
    name: "Liam Nguyen",
    email: "liam.nguyen@tradie.com.au",
    role: "worker",
    status: "Active",
    lastLogin: "2026-06-10 06:30",
    projects: [1],
    workerId: 1,
  },
];

// Maps a login email to the demo user. Password is ignored (simulated).
export const demoCredentials = {
  "david@arlingtonhomes.com.au": 1,
  "hse@arlingtonhomes.com.au": 2,
  "supervisor@arlingtonhomes.com.au": 3,
  "liam.nguyen@tradie.com.au": 7,
};

export const roleLabels = {
  builder_admin: "Builder Admin",
  hse_manager: "HSE Manager",
  site_supervisor: "Site Supervisor",
  worker: "Stakeholder / Tradie",
};

// ---------------------------------------------------------------------------
// Projects (Victoria)
// ---------------------------------------------------------------------------
export const projects = [
  { id: 1, name: "Docklands Tower Stage 2", address: "12 Harbour Esplanade, Docklands VIC 3008", status: "Active", buildPercent: 68, workers: 42, compliance: 94, incidents: 1, contractType: "Lump Sum", contractValue: 8400000 },
  { id: 2, name: "Geelong Marina Apartments", address: "45 Eastern Beach Rd, Geelong VIC 3220", status: "Active", buildPercent: 31, workers: 28, compliance: 88, incidents: 0, contractType: "Cost Plus", contractValue: 5200000 },
  { id: 3, name: "Ballarat Health Precinct", address: "1 Drummond St N, Ballarat VIC 3350", status: "Active", buildPercent: 85, workers: 19, compliance: 97, incidents: 0, contractType: "Lump Sum", contractValue: 3800000 },
  { id: 4, name: "Bendigo Civic Centre Upgrade", address: "189 Lyttleton Tce, Bendigo VIC 3550", status: "Active", buildPercent: 52, workers: 31, compliance: 91, incidents: 2, contractType: "Lump Sum", contractValue: 6100000 },
  { id: 5, name: "Cranbourne Logistics Warehouse", address: "67 Industrial Dr, Cranbourne VIC 3977", status: "Active", buildPercent: 14, workers: 22, compliance: 79, incidents: 0, contractType: "Design & Construct", contractValue: 4500000 },
  { id: 6, name: "Frankston Foreshore Hotel", address: "2 Beach St, Frankston VIC 3199", status: "Planning", buildPercent: 0, workers: 4, compliance: 100, incidents: 0, contractType: "Lump Sum", contractValue: 9200000 },
  { id: 7, name: "Werribee Town Centre", address: "80 Comben Dr, Werribee VIC 3030", status: "On Hold", buildPercent: 22, workers: 0, compliance: 85, incidents: 0, contractType: "Cost Plus", contractValue: 7700000 },
];

// ---------------------------------------------------------------------------
// Workers (12 demo workers)
// ---------------------------------------------------------------------------
export const workers = [
  { id: 1, name: "Liam Nguyen", trade: "Carpenter", employer: "Arlington Homes", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 2, name: "Sophie Callahan", trade: "Electrician", employer: "Spark Solutions Pty Ltd", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Pending", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 3, name: "Mason Pereira", trade: "Concreter", employer: "Pereira Concrete", project: 2, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Missing", swms: "Pending", status: "Action Required" },
  { id: 4, name: "Ava Thompson", trade: "Plumber", employer: "AquaFix VIC", project: 1, induction: "Verified", quiz: "Pending", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Action Required" },
  { id: 5, name: "Noah Di Santo", trade: "Tiler", employer: "Di Santo Tiling", project: 3, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Pending", status: "Active" },
  { id: 6, name: "Isla Robertson", trade: "Framer", employer: "Arlington Homes", project: 4, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 7, name: "Ethan Marsh", trade: "Carpenter", employer: "Arlington Homes", project: 2, induction: "Pending", quiz: "Pending", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Missing", status: "Site Access Pending" },
  { id: 8, name: "Charlotte Webb", trade: "Electrician", employer: "Spark Solutions Pty Ltd", project: 3, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 9, name: "Jack Donnelly", trade: "Plumber", employer: "AquaFix VIC", project: 4, induction: "Verified", quiz: "Verified", whiteCard: "Missing", insurance: "Pending", medical: "Verified", swms: "Verified", status: "Action Required" },
  { id: 10, name: "Mia Fitzgerald", trade: "Concreter", employer: "Pereira Concrete", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 11, name: "Oliver Brennan", trade: "Steel Fixer", employer: "Arlington Homes", project: 5, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Verified", status: "Active" },
  { id: 12, name: "Priya Sharma", trade: "Crane Operator", employer: "Lift-Right VIC", project: 1, induction: "Verified", quiz: "Verified", whiteCard: "Verified", insurance: "Verified", medical: "Verified", swms: "Pending", status: "Action Required" },
];

// The 6 compliance categories used across the matrix
export const complianceCategories = [
  { key: "induction", label: "Induction" },
  { key: "quiz", label: "Quiz" },
  { key: "whiteCard", label: "White Card" },
  { key: "insurance", label: "Insurance" },
  { key: "medical", label: "Medical" },
  { key: "swms", label: "SWMS" },
];

// Top summary percentages on the Compliance Records screen
export const complianceSummary = {
  induction: 98,
  quiz: 100,
  whiteCard: 100,
  insurance: 75,
  medical: 100,
  swms: 85,
};

// ---------------------------------------------------------------------------
// SWMS Templates (trade-specific, version-controlled)
// ---------------------------------------------------------------------------
export const swmsTemplates = [
  {
    id: 1, trade: "Carpenter / Framer", ref: "SWMS-FRAMER-01", version: "v1.0", signed: 18, total: 18, status: "Compliant",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic), WorkSafe VIC SWMS template",
    hrcw: ["Risk of fall >2m", "Movement of powered mobile plant"],
    ppe: ["Hard hat", "Steel-capped boots", "Hi-visibility clothing", "Eye protection", "Hearing protection", "Gloves", "Respiratory protection (P2)", "Sun protection", "Harness & lanyard (when required)"],
    equipment: ["Circular saw", "Compound/drop saw", "Nail gun", "Hand tools", "Angle grinder", "Mobile scaffold", "Ladders / platform ladders", "EWP / scissor lift", "Power leads & RCD"],
  },
  {
    id: 2, trade: "Electrician", ref: "SWMS-ELEC-01", version: "v1.0", signed: 8, total: 8, status: "Compliant",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic), AS/NZS 3000, Electricity Safety Act 1998 (Vic)",
    hrcw: ["Risk of fall >2m", "Work on or near energised electrical installations or services"],
    ppe: ["Hard hat", "Steel-capped boots", "Hi-visibility clothing", "Eye protection", "Insulated gloves", "Sun protection", "Arc-rated clothing (where required)"],
    equipment: ["Insulated hand tools", "Power drills", "Cable tools", "Test instruments", "Ladders / platform ladders", "Conduit benders", "Power leads & RCD", "Lockout/tagout kit"],
  },
  {
    id: 3, trade: "Plumber", ref: "SWMS-PLUMB-01", version: "v1.0", signed: 9, total: 10, status: "Pending",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic), Plumbing Regulations 2018 (Vic)",
    hrcw: ["Risk of fall >2m", "Work on or near pressurised gas distribution mains or piping"],
    ppe: ["Hard hat", "Steel-capped boots", "Hi-visibility clothing", "Eye protection", "Gloves", "Hearing protection", "Sun protection"],
    equipment: ["Hand tools", "Power drills", "Pipe cutters", "Pressure testing equipment", "Ladders", "Power leads & RCD"],
  },
  {
    id: 4, trade: "Tiler", ref: "SWMS-TILER-01", version: "v1.0", signed: 3, total: 5, status: "Pending",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic)",
    hrcw: ["Manual handling of heavy materials", "Use of cutting equipment"],
    ppe: ["Hard hat", "Steel-capped boots", "Hi-visibility clothing", "Eye protection", "Gloves", "Knee protection", "Respiratory protection (P2)"],
    equipment: ["Tile cutter (wet saw)", "Angle grinder", "Hand tools", "Mixing paddle", "Knee pads", "Power leads & RCD"],
  },
  {
    id: 5, trade: "Concreter", ref: "SWMS-CONC-01", version: "v1.0", signed: 6, total: 8, status: "Pending",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic), WorkSafe VIC Code of Practice — Excavation",
    hrcw: ["Movement of powered mobile plant", "Work involves a trench or shaft (excavated depth >1.5m)"],
    ppe: ["Hard hat", "Steel-capped boots (rubber for wet concrete)", "Hi-visibility clothing", "Eye protection", "Gloves", "Respiratory protection (P2)", "Hearing protection", "Sun protection", "Waterproof clothing"],
    equipment: ["Concrete pump/agitator", "Vibrators", "Screeds", "Trowels & hand tools", "Power float", "Wheelbarrows", "Excavator (footings)", "Power leads & RCD"],
  },
  {
    id: 6, trade: "Steel Fixer", ref: "SWMS-STEEL-01", version: "v1.0", signed: 4, total: 4, status: "Compliant",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic), WorkSafe VIC — Precast & Tilt-up Code",
    hrcw: ["Risk of fall >2m", "Manual handling of heavy reinforcement"],
    ppe: ["Hard hat", "Steel-capped boots", "Hi-visibility clothing", "Eye protection", "Cut-resistant gloves", "Hearing protection", "Sun protection"],
    equipment: ["Bar bender / cutter", "Wire tying tools", "Hand tools", "Rebar caps", "Ladders", "Power leads & RCD"],
  },
  {
    id: 7, trade: "Crane Operator / Dogman", ref: "SWMS-CRANE-01", version: "v1.0", signed: 1, total: 2, status: "Pending",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic), Plant Regulations — High-Risk Work Licences",
    hrcw: ["Risk of fall >2m", "Movement of powered mobile plant", "Work on or near energised electrical installations"],
    ppe: ["Hard hat", "Steel-capped boots", "Hi-visibility clothing", "Eye protection", "Gloves", "Sun protection", "Harness & lanyard (when required)"],
    equipment: ["Mobile/crawler crane", "Rigging gear (slings, shackles, chains)", "Tag lines", "Load charts", "Outrigger pads"],
  },
  {
    id: 8, trade: "Bricklayer", ref: "SWMS-BRICK-01", version: "v1.0", signed: 5, total: 5, status: "Compliant",
    legislation: "OHS Act 2004 (Vic), OHS Regulations 2017 (Vic)",
    hrcw: ["Risk of fall >2m", "Movement of powered mobile plant (forklift / telehandler)"],
    ppe: ["Hard hat", "Steel-capped boots", "Hi-visibility clothing", "Eye protection", "Gloves", "Respiratory protection (P2)", "Hearing protection", "Sun protection"],
    equipment: ["Brick saw (wet)", "Hand tools", "Mixer", "Scaffold / trestles", "Forklift / telehandler (for pallet delivery)", "Power leads & RCD"],
  },
];

// Hazard & control lines shown when signing a SWMS (worker portal)
// Source: WorkSafe Victoria SWMS templates — real hazard/control data from David's trade library
export const swmsHazards = [
  // Carpenter / Framer (SWMS-FRAMER-01)
  { id: 1, tradeRef: "SWMS-FRAMER-01", task: "Site arrival and induction", hazard: "Unfamiliar site conditions", risk: "Medium", controls: "Complete site induction. Review this SWMS. Sign attendance register." },
  { id: 2, tradeRef: "SWMS-FRAMER-01", task: "Delivery and unloading of timber frames", hazard: "Vehicle movements; crush injuries; powered mobile plant", risk: "High", controls: "Designated unloading zone. Spotter used. Exclusion zones established around plant." },
  { id: 3, tradeRef: "SWMS-FRAMER-01", task: "Manual handling of timber", hazard: "Musculoskeletal injuries", risk: "Medium", controls: "Team lifting. Mechanical aids where available. Reduce load sizes. Safe lifting techniques." },
  { id: 4, tradeRef: "SWMS-FRAMER-01", task: "Setting out wall frames", hazard: "Trips and slips", risk: "Low", controls: "Maintain housekeeping. Remove waste materials regularly. Work area kept clear." },
  { id: 5, tradeRef: "SWMS-FRAMER-01", task: "Use of circular saw", hazard: "Cuts, amputations, flying particles", risk: "High", controls: "Guards fitted. Safety glasses worn. Pre-use tool inspection. PPE issued and worn." },
  { id: 6, tradeRef: "SWMS-FRAMER-01", task: "Use of nail gun", hazard: "Puncture wounds, ricochet injuries", risk: "High", controls: "Sequential trigger preferred. Operator training required. Tools maintained and tagged." },
  { id: 7, tradeRef: "SWMS-FRAMER-01", task: "Working at height — wall / roof framing", hazard: "Falls more than 2m", risk: "High", controls: "Scaffolding or platform ladder used. Harness and lanyard when on roof. Edge protection where practicable." },
  { id: 8, tradeRef: "SWMS-FRAMER-01", task: "Adverse weather conditions", hazard: "Slips, falls, wind loading on frames", risk: "Medium", controls: "Cease work during high winds, storms or unsafe conditions. Supervisor monitors conditions." },
  { id: 9, tradeRef: "SWMS-FRAMER-01", task: "Cutting treated timber", hazard: "Dust inhalation", risk: "Medium", controls: "Dust extraction. Respiratory protection (P2). Extraction fitted to tools, RPE issued." },
  { id: 10, tradeRef: "SWMS-FRAMER-01", task: "Removal of temporary bracing", hazard: "Structural instability", risk: "High", controls: "Supervisor approval before removal. Engineer sign-off obtained before any bracing removed." },
  // Electrician (SWMS-ELEC-01)
  { id: 11, tradeRef: "SWMS-ELEC-01", task: "Site arrival and induction", hazard: "Unfamiliar site conditions", risk: "Medium", controls: "Complete site induction. Review SWMS. Sign attendance register." },
  { id: 12, tradeRef: "SWMS-ELEC-01", task: "Isolation of electrical supply", hazard: "Electric shock; arc flash", risk: "High", controls: "Test before touch. Lockout/tagout (LOTO). Verify de-energised. Licensed electrician only." },
  { id: 13, tradeRef: "SWMS-ELEC-01", task: "Cable installation and routing", hazard: "Manual handling; cuts; falls", risk: "Medium", controls: "Team lifting of cable drums. Cable trays at safe height. Ladders secured." },
  { id: 14, tradeRef: "SWMS-ELEC-01", task: "Working at height (ceiling/roof spaces)", hazard: "Falls more than 2m; ceiling collapse", risk: "High", controls: "Platform ladder or scaffold used. Walk on joists/boards only. Fall protection in place." },
  { id: 15, tradeRef: "SWMS-ELEC-01", task: "Working near energised installations", hazard: "Electric shock; arc flash", risk: "High", controls: "De-energise where possible. Insulated tools. Arc-rated PPE. Safe approach distances maintained." },
  { id: 16, tradeRef: "SWMS-ELEC-01", task: "Use of power tools", hazard: "Electric shock; flying particles", risk: "Medium", controls: "Tools tested and tagged. RCD protection. Eye protection worn at all times." },
  // Concreter (SWMS-CONC-01)
  { id: 17, tradeRef: "SWMS-CONC-01", task: "Site arrival and induction", hazard: "Unfamiliar site conditions", risk: "Medium", controls: "Complete site induction. Review SWMS. Sign attendance register." },
  { id: 18, tradeRef: "SWMS-CONC-01", task: "Excavation of footings", hazard: "Trench collapse; falls; underground services", risk: "High", controls: "Locate services (Dial Before You Dig). Batter/bench/shore trenches >1.5m. Barricades in place." },
  { id: 19, tradeRef: "SWMS-CONC-01", task: "Formwork setup", hazard: "Manual handling; struck by; collapse", risk: "High", controls: "Team lifting. Secure formwork. Inspect before pour. Formwork inspected by supervisor." },
  { id: 20, tradeRef: "SWMS-CONC-01", task: "Steel reinforcement placement", hazard: "Cuts; impalement; manual handling", risk: "High", controls: "Cap exposed rebar. Cut-resistant gloves worn. Team lifting of mesh. Rebar caps fitted." },
  { id: 21, tradeRef: "SWMS-CONC-01", task: "Concrete pour (pump/agitator)", hazard: "Struck by plant; cement burns; manual handling", risk: "High", controls: "Exclusion zones around plant. Gloves and boots worn. Spotter assigned at pump." },
  { id: 22, tradeRef: "SWMS-CONC-01", task: "Handling wet concrete", hazard: "Cement dermatitis / chemical burns", risk: "Medium", controls: "Waterproof PPE worn. Wash facilities on site. Avoid prolonged skin contact." },
  { id: 23, tradeRef: "SWMS-CONC-01", task: "Screeding and finishing", hazard: "Musculoskeletal strain; UV exposure", risk: "Medium", controls: "Knee pads worn. Sun protection applied. Rotate tasks to minimise strain." },
  // Crane Operator / Dogman (SWMS-CRANE-01)
  { id: 24, tradeRef: "SWMS-CRANE-01", task: "Pre-start machine inspection", hazard: "Mechanical failure; fluid leaks", risk: "High", controls: "Daily pre-start checks completed. Defects reported and tagged out before use." },
  { id: 25, tradeRef: "SWMS-CRANE-01", task: "Setting up crane", hazard: "Overturning; ground failure", risk: "High", controls: "Level ground confirmed. Outrigger pads used. Setup within load chart limits. Exclusion zone established." },
  { id: 26, tradeRef: "SWMS-CRANE-01", task: "Rigging and slinging loads", hazard: "Falling load; rigging failure", risk: "High", controls: "Tested and tagged rigging gear. Correct sling angles. Ticketed dogman required." },
  { id: 27, tradeRef: "SWMS-CRANE-01", task: "Lifting operations", hazard: "Struck by load; crush injuries", risk: "High", controls: "Exclusion zone under load. Tag lines used. Clear communication and agreed signals." },
  { id: 28, tradeRef: "SWMS-CRANE-01", task: "Working near overhead power lines", hazard: "Electrocution", risk: "High", controls: "No-go zones established. Spotter assigned. Tiger tails where arranged. Permit required." },
  { id: 29, tradeRef: "SWMS-CRANE-01", task: "Adverse weather", hazard: "Load swing; structural instability", risk: "High", controls: "Cease lifting in high winds per load chart limits. Wind speed monitored by operator." },
];

export const incidents = [
  {
    id: 1, type: "Near Miss", description: "Scaffold component fell near worker on Level 3",
    project: "Docklands Tower Stage 2", reportedBy: "Noah Di Santo", date: "2026-06-02",
    status: "Investigating", severity: "Medium", location: "Level 3 — East face",
    involved: "No injuries", notifiable: false,
    correctiveActions: [
      { id: 1, description: "Re-inspect all scaffold ties on Level 3", assignedTo: "Site Supervisor", due: "2026-06-12", status: "In Progress" }
    ]
  },
  {
    id: 2, type: "Low Risk", description: "Worker slipped on wet concrete surface",
    project: "Bendigo Civic Centre Upgrade", reportedBy: "Mason Pereira", date: "2026-06-05",
    status: "Corrective Action", severity: "Low", location: "Ground floor slab",
    involved: "Mason Pereira — minor bruising", notifiable: false,
    correctiveActions: [
      { id: 1, description: "Install additional non-slip signage and matting", assignedTo: "Site Supervisor", due: "2026-06-11", status: "Done" }
    ]
  },
  {
    id: 3, type: "High Risk", description: "Temporary propping altered without engineer sign-off",
    project: "Bendigo Civic Centre Upgrade", reportedBy: "Site Supervisor", date: "2026-06-08",
    status: "Open", severity: "High", location: "Basement Level 1",
    involved: "No injuries", notifiable: true,
    correctiveActions: [
      { id: 1, description: "Halt works in affected zone until engineer review", assignedTo: "HSE Manager", due: "2026-06-10", status: "In Progress" }
    ]
  },
];

export const incidentTypes = [
  "Near Miss", "Low Risk", "Medium Risk", "High Risk",
  "Environmental", "Property Damage", "Vehicle", "Security", "Notifiable (WorkSafe)",
];

export const incidentSeverities = ["Low", "Medium", "High", "Critical"];

export const incidentLifecycle = [
  "Open", "Investigating", "Corrective Actions Assigned",
  "Corrective Actions Complete", "Closed",
];

export const incidentsByType = [
  { name: "Near Miss", value: 4 },
  { name: "Low Risk", value: 3 },
  { name: "Medium Risk", value: 2 },
  { name: "High Risk", value: 1 },
  { name: "Environmental", value: 1 },
];

// ---------------------------------------------------------------------------
// Policies (Settings)
// ---------------------------------------------------------------------------
export const policies = [
  { id: 1, name: "OH&S Management Plan", version: "v4.1", category: "OH&S Mgmt Plan", status: "Active", updated: "2026-05-18" },
  { id: 2, name: "Alcohol & Drugs Policy", version: "v2.0", category: "Workplace Conduct", status: "Active", updated: "2026-03-02" },
  { id: 3, name: "Emergency Response Procedure", version: "v3.2", category: "Fire Emergency", status: "Active", updated: "2026-04-22" },
  { id: 4, name: "Environmental Management Plan", version: "v1.8", category: "Auditing/Environment", status: "Active", updated: "2026-02-15" },
  { id: 5, name: "High-Risk Work Procedures", version: "v2.5", category: "Hazard ID & Risk", status: "Active", updated: "2026-05-30" },
  { id: 6, name: "Site Access & Induction Policy", version: "v3.0", category: "Site Induction", status: "Active", updated: "2026-05-05" },
  { id: 7, name: "First Aid & Accident Investigation", version: "v2.1", category: "First Aid / Accident & Investigation", status: "Active", updated: "2026-04-10" },
  { id: 8, name: "Incident Reporting to WorkSafe", version: "v1.5", category: "Incidents to WorkSafe", status: "Active", updated: "2026-05-01" },
];

export const policyCategories = [
  "OH&S Mgmt Plan",
  "Hazard ID & Risk",
  "Auditing / Environment / Maintenance",
  "First Aid / Accident & Investigation",
  "Fire Emergency",
  "Incidents to WorkSafe",
  "Site Access & Induction (Builders Policy Site Induction)",
];

// ---------------------------------------------------------------------------
// Site Diary
// ---------------------------------------------------------------------------
export const diaryEntries = [
  {
    id: "d1", date: "2026-06-09", project: "Docklands Tower Stage 2",
    weather: "Partly cloudy, 17°C", wind: "15 km/h SW", labour: 58,
    deliveries: ["Reo steel — Liberty (07:30)", "Concrete pour 32MPa — Hanson (11:00)"],
    notes: "Level 12 slab pour completed by 14:00. Crane down for routine inspection 09:00–10:30. All toolbox topics covered.",
    supervisor: "David Caruana", photos: 3,
    tags: ["Concrete Pour", "Crane", "Inspection"],
  },
  {
    id: "d2", date: "2026-06-08", project: "Docklands Tower Stage 2",
    weather: "Rain, 13°C", wind: "28 km/h S", labour: 41,
    deliveries: ["Formply — Bowens (08:00)"],
    notes: "Wet weather — external works paused after lunch. Internal fit-out continued on levels 6–8. Drainage checked, no pooling.",
    supervisor: "David Caruana", photos: 2,
    tags: ["Wet Weather", "Fit-out"],
  },
  {
    id: "d3", date: "2026-06-07", project: "Docklands Tower Stage 2",
    weather: "Sunny, 19°C", wind: "10 km/h N", labour: 60,
    deliveries: ["Glazing units — Viridian (07:45)", "Plasterboard — CSR (13:15)"],
    notes: "Glazing install commenced level 9. Minor slip incident logged — area isolated, no lost time.",
    supervisor: "David Caruana", photos: 4,
    tags: ["Glazing", "Incident"],
  },
  {
    id: "d4", date: "2026-06-06", project: "Geelong Marina Apartments",
    weather: "Overcast, 15°C", wind: "20 km/h SW", labour: 28,
    deliveries: ["Structural steel — OneSteel (08:30)"],
    notes: "Steel frame erection Level 2–3. Safety harness inspection completed for all workers. No incidents.",
    supervisor: "David Caruana", photos: 2,
    tags: ["Steel Frame", "Inspection"],
  },
];

export const weatherOptions = [
  "Sunny", "Partly cloudy", "Overcast", "Rain", "Heavy rain",
  "Windy", "Storm", "Fog", "Hot (>35°C)", "Cold (<5°C)",
];

export const diaryTags = [
  "Concrete Pour", "Steel Frame", "Glazing", "Fit-out", "Inspection",
  "Incident", "Wet Weather", "Crane", "Delivery", "Toolbox Meeting",
  "Visitor on Site", "Subcontractor", "Survey / Engineering",
];

// ---------------------------------------------------------------------------
// Toolbox Meetings
// ---------------------------------------------------------------------------
export const toolboxMeetings = [
  {
    id: "t1", topic: "Working at Heights — Edge Protection",
    date: "2026-06-09", project: "Docklands Tower Stage 2",
    presenter: "David Caruana", attendees: 18, total: 20, duration: "15 min",
    points: [
      "Inspect harness before every use",
      "Never remove edge protection without a permit",
      "Report damaged anchor points immediately",
    ],
  },
  {
    id: "t2", topic: "Wet Weather & Slip Hazards",
    date: "2026-06-08", project: "Docklands Tower Stage 2",
    presenter: "Marcus Reid", attendees: 15, total: 15, duration: "10 min",
    points: ["Use designated walkways", "Report pooling water", "Wear appropriate footwear"],
  },
  {
    id: "t3", topic: "Manual Handling Refresher",
    date: "2026-06-06", project: "Ballarat Health Precinct",
    presenter: "Priya Sharma", attendees: 22, total: 24, duration: "12 min",
    points: [
      "Use mechanical aids where possible",
      "Team lift loads over 20 kg",
      "Maintain neutral spine posture",
    ],
  },
  {
    id: "t4", topic: "Heat & Sun Safety",
    date: "2026-06-04", project: "Cranbourne Logistics Warehouse",
    presenter: "David Caruana", attendees: 19, total: 22, duration: "10 min",
    points: ["Hydrate every 20 minutes in hot conditions", "Use shade structures during breaks", "Know heat illness warning signs"],
  },
];

export const toolboxStats = {
  thisMonth: 6,
  avgAttendance: 92,
  topicsDue: 2,
};

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------
export const dashboardKpis = [
  { label: "Overall Compliance", value: "91%", trend: "up", delta: "+3%", color: "green" },
  { label: "Active Stakeholders", value: "142", trend: "up", delta: "+8", color: "blue" },
  { label: "Open Incidents", value: "3", trend: "down", delta: "-1", color: "amber" },
  { label: "SWMS Signed", value: "94%", trend: "up", delta: "+2%", color: "green" },
  { label: "Toolbox Meetings", value: "6", trend: "neutral", delta: "this month", color: "blue" },
  { label: "Expiring Certs", value: "7", trend: "up", delta: "+2", color: "red" },
];

export const complianceTrend = [
  { month: "Jan", compliance: 84 },
  { month: "Feb", compliance: 87 },
  { month: "Mar", compliance: 85 },
  { month: "Apr", compliance: 89 },
  { month: "May", compliance: 91 },
  { month: "Jun", compliance: 91 },
];

export const activityFeed = [
  { id: 1, type: "compliance", text: "Sophie Callahan updated insurance — Docklands Tower", time: "10 min ago" },
  { id: 2, type: "incident", text: "New incident logged — Bendigo Civic Centre", time: "1 hr ago" },
  { id: 3, type: "swms", text: "SWMS-CRANE-01 signed by Priya Sharma", time: "2 hrs ago" },
  { id: 4, type: "induction", text: "3 stakeholders completed site induction — Geelong Marina", time: "3 hrs ago" },
  { id: 5, type: "toolbox", text: "Toolbox meeting completed — Ballarat Health Precinct (22 attended)", time: "Yesterday" },
];

// ---------------------------------------------------------------------------
// Worker Portal — Induction & Quiz
// ---------------------------------------------------------------------------
export const inductionModules = [
  { id: 1, title: "Welcome & Site Rules", mins: 4, done: true },
  { id: 2, title: "Site Hazards & Emergency Procedures", mins: 6, done: true },
  { id: 3, title: "PPE Requirements", mins: 3, done: true },
  { id: 4, title: "High-Risk Work & Permits", mins: 5, done: false },
  { id: 5, title: "Reporting Incidents & Near Misses", mins: 3, done: false },
  { id: 6, title: "OH&S Knowledge Check", mins: 5, done: false },
];

export const quizQuestions = [
  {
    q: "What should you do FIRST if you witness a serious incident on site?",
    options: [
      "Take a photo for the report",
      "Ensure the area is safe and call for help / first aid",
      "Continue working and tell the supervisor later",
      "Move the injured person immediately",
    ],
    answer: 1,
  },
  {
    q: "When is a SWMS required to be signed?",
    options: [
      "Only after an incident occurs",
      "Once a year regardless of task",
      "Before commencing any high-risk construction work",
      "It is optional for experienced workers",
    ],
    answer: 2,
  },
  {
    q: "Which PPE is mandatory at all times on this site?",
    options: [
      "Hard hat, hi-vis and steel-capped boots",
      "Only when operating machinery",
      "Gloves and glasses only",
      "PPE is recommended but not enforced",
    ],
    answer: 0,
  },
  {
    q: "What does an untagged piece of scaffolding mean?",
    options: [
      "It is brand new and safe to use",
      "It can be used with supervisor approval",
      "Do NOT use it — it has not been inspected/approved",
      "Only the top level is unsafe",
    ],
    answer: 2,
  },
  {
    q: "Under Victorian OHS law, who must be notified of a notifiable incident?",
    options: [
      "The project architect only",
      "WorkSafe Victoria — immediately by phone",
      "The client within 48 hours",
      "No notification required for near misses",
    ],
    answer: 1,
  },
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
export const formatAUD = (amount) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(amount);

export const projectName = (id, projectsArr) => {
  const p = (projectsArr || []).find((x) => x.id === id);
  return p ? p.name : `Project ${id}`;
};

// ---------------------------------------------------------------------------
// Permission matrix (role → feature access)
// ---------------------------------------------------------------------------
export const permissionMatrix = {
  builder_admin:    { projects: true,  workers: true,  compliance: true,  incidents: true,  swms: true,  diary: true,  toolbox: true,  reports: true,  admin: true,  settings: true  },
  hse_manager:      { projects: false, workers: true,  compliance: true,  incidents: true,  swms: true,  diary: false, toolbox: true,  reports: true,  admin: false, settings: false },
  site_supervisor:  { projects: false, workers: true,  compliance: false, incidents: true,  swms: false, diary: true,  toolbox: true,  reports: false, admin: false, settings: false },
  worker:           { projects: false, workers: false, compliance: false, incidents: false, swms: true,  diary: false, toolbox: false, reports: false, admin: false, setting