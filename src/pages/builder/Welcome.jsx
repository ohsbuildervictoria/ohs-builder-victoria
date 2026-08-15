import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import { useAppContext } from "../../context/AppContext";
import { brand } from "../../data/constants";

// ============================================================================
// Welcome to OHS Builder Victoria
// The plain-English overview of what the platform is and what it does — the
// page a builder sends a new site supervisor or a sceptical subbie to. Its own
// item in the sidebar, not buried inside Policies.
// ============================================================================

const SECTIONS = [
  {
    icon: "🏗️",
    title: "OHS Management",
    body: [
      "Every builder has a legal and moral responsibility to provide a safe workplace. OHS Builder Victoria supports that responsibility by letting you implement and administer your company's OHS Management Plan across every project.",
      "The platform helps establish a consistent safety culture while making sure your policies and procedures are communicated to — and followed by — all stakeholders.",
    ],
  },
  {
    icon: "📱",
    title: "Digital Site Inductions",
    body: [
      "Before entering site, head subcontractors, contractors and suppliers complete their mandatory site inductions electronically. Every person understands the project's safety requirements, site rules and builder expectations before they start work.",
    ],
  },
  {
    icon: "✅",
    title: "Safety Quizzes and Competency Verification",
    body: [
      "Create and administer safety quizzes to confirm workers have understood the induction and the critical site safety requirements. Completion records are stored automatically as evidence of compliance.",
    ],
  },
  {
    icon: "📋",
    title: "Contractor Compliance Register",
    body: [
      "Head subcontractors securely upload and maintain all mandatory compliance documentation:",
    ],
    list: [
      "White Card",
      "Workers Compensation (WorkCover) Insurance",
      "Public Liability Insurance (where applicable)",
      "Signed Safe Work Method Statements (SWMS)",
      "Relevant medical certificates (where applicable)",
      "Other project-specific compliance documentation",
    ],
    after: [
      "Builders can quickly verify that every required document is current before allowing a contractor onto site.",
    ],
  },
  {
    icon: "🛡️",
    title: "Project Risk Register",
    body: [
      "Every project carries its own risk register — each identified hazard assessed on a standard 5×5 likelihood × consequence matrix, with current controls, a residual rating, a control owner and a review date. Seed it in one click from the SWMS trades already on site, and export the colour-coded register as an audit-ready PDF.",
    ],
  },
  {
    icon: "☁️",
    title: "Cloud Document Management",
    body: [
      "All project documentation is stored securely in a cloud-based environment — working drawings, permits, certificates, compliance records and other important project files, accessible from virtually anywhere.",
    ],
  },
  {
    icon: "📓",
    title: "Site Diary",
    body: [
      "Keep a complete digital record of your project. Log daily site activities, weather conditions, inspections, incidents, photographs, deliveries, visitor records and progress notes — building a valuable history of every project.",
    ],
  },
  {
    icon: "🧰",
    title: "Toolbox Meetings",
    body: [
      "Schedule and record toolbox meetings directly in the platform. Capture attendance, discussion topics, safety alerts and meeting minutes so important information reaches everyone working on site.",
    ],
  },
  {
    icon: "🎯",
    title: "Action Tracking and Accountability",
    body: [
      "Accountability is one of the platform's key features. Any action arising from a toolbox meeting, inspection or safety observation can be assigned to a responsible person and tracked through to completion.",
      "That creates clear ownership, improves follow-up, and demonstrates an ongoing commitment to continuous improvement.",
    ],
  },
  {
    icon: "📊",
    title: "Builder Dashboard",
    body: [
      "Manage all of your projects from a single dashboard with visibility of contractor compliance, outstanding actions, document status, inductions, toolbox meetings and project activity — so you can identify potential compliance issues before they become risks.",
    ],
  },
];

export default function Welcome() {
  const { org } = useAppContext();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-xl bg-blue-900 px-6 py-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
          {brand.tagline}
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Welcome to {brand.fullName}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
          {brand.fullName} is a purpose-built digital compliance platform for the
          building and construction industry. It gives builders a secure,
          cloud-based way to manage every project's Occupational Health and
          Safety requirements from one central location.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100">
          Our mission is a practical, cost-effective platform that simplifies
          compliance, improves accountability, and helps protect everyone
          working on your construction sites.
        </p>
        {org?.name && (
          <p className="mt-4 inline-block rounded-lg bg-blue-950/60 px-3 py-1.5 text-xs text-blue-100">
            You're signed in to <span className="font-semibold text-white">{org.name}</span>
          </p>
        )}
      </div>

      {/* What the platform does */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <CardHeader title={`${s.icon}  ${s.title}`} />
            <CardBody className="space-y-3 pt-2 text-sm leading-relaxed text-slate-600">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {s.list && (
                <ul className="ml-1 space-y-1">
                  {s.list.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-blue-900">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.after?.map((p, i) => (
                <p key={`a${i}`}>{p}</p>
              ))}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Closing statement */}
      <Card className="border-yellow-300 bg-yellow-50">
        <CardBody className="space-y-3 text-sm leading-relaxed text-slate-700">
          <h2 className="text-lg font-semibold text-slate-800">
            Protecting your business and your people
          </h2>
          <p>
            Compliance is more than satisfying legislative requirements — it is
            about protecting lives. Every person who enters a construction site
            has the right to return home safely to their loved ones.
          </p>
          <p>
            {brand.fullName} has been developed by builders, for builders, with
            one clear objective: to make health and safety compliance simple,
            practical and accountable.
          </p>
          <p>
            By streamlining administration, improving record keeping and
            strengthening workplace accountability, the platform helps reduce
            risk while supporting a safer and more professional construction
            industry.
          </p>
          <p className="pt-1 text-xs text-slate-500">
            Questions or feedback? Contact{" "}
            <a className="font-medium text-blue-800 hover:underline" href={`mailto:${brand.supportEmail}`}>
              {brand.supportEmail}
            </a>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
