// ============================================================================
// OHS Builder Victoria — subscription plans
//
// Single source of truth for the public Pricing page and the in-app
// Subscription tab, so the tier a builder is shown in Settings always matches
// what the marketing page says they bought.
//
// BILLING IS NOT WIRED YET. These are placeholder tiers and prices for the
// structure only — no Stripe products, prices or webhooks exist. When billing
// goes live, add the Stripe price id to each tier below and point the CTAs at
// a real checkout; nothing else on either page should need to change.
// ============================================================================

export const BILLING_LIVE = false;

export const PLANS = [
  {
    key: "Starter",
    name: "Starter",
    price: 89,
    cadence: "per month",
    blurb: "For the solo builder running one or two sites at a time.",
    // A single residential build cycles through 25–40 subcontracting trades,
    // and each subbie can bring a small crew. Two active sites therefore burn
    // through ~50 individual stakeholders in a normal year — the cap exists to
    // separate the tiers, not to make a builder ration their own trades.
    limits: { projects: 2, stakeholders: 50 },
    features: [
      "Up to 2 active projects",
      "Up to 50 stakeholders across your sites",
      "Digital site inductions + safety quiz",
      "Contractor compliance register",
      "Site diary and toolbox meetings",
      "Incident reporting with WorkSafe flagging",
      "PDF exports of every record",
    ],
    stripePriceId: null,
  },
  {
    key: "Professional",
    name: "Professional",
    price: 189,
    cadence: "per month",
    popular: true,
    blurb: "For established builders running multiple sites and crews.",
    // Ten concurrent sites share a trade pool — the same plumber works three
    // of them — so ~25 stakeholders per project is the realistic ceiling.
    limits: { projects: 10, stakeholders: 250 },
    features: [
      "Up to 10 active projects",
      "Up to 250 stakeholders across your sites",
      "Everything in Starter, plus:",
      "QR site sign-in and attendance records",
      "Your own branded induction per project",
      "Emailed monthly OHS and incident reports",
      "Company logo on all PDFs and letterheads",
      "Daily compliance digest email",
    ],
    stripePriceId: null,
  },
  {
    key: "Enterprise",
    name: "Enterprise",
    price: null,
    cadence: "custom",
    blurb: "For volume builders and groups with their own OHS team.",
    limits: { projects: null, stakeholders: null },
    features: [
      "Unlimited projects and stakeholders",
      "Everything in Professional, plus:",
      "Multiple builder entities under one group",
      "Priority support and onboarding",
      "Custom policy and SWMS library import",
      "Data export and API access on request",
    ],
    stripePriceId: null,
  },
];

// Trial tier: what a brand-new signup lands on before choosing a plan.
export const TRIAL = {
  key: "Trial",
  name: "Free trial",
  days: 30,
  blurb: "Full Professional features while you set up your first project.",
};

export const planByKey = (key) =>
  PLANS.find((p) => p.key.toLowerCase() === String(key || "").toLowerCase()) || null;

export const formatPrice = (plan) =>
  plan?.price == null ? "Let's talk" : `$${plan.price}`;
