import { useState, useRef } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Notification";
import { useAppContext } from "../../context/AppContext";
import { useAuth } from "../../hooks/useAuth";
import { brand, policyCategories } from "../../data/constants";
import { PLANS, TRIAL, BILLING_LIVE, planByKey, formatPrice } from "../../data/pricing";
import {
  bumpPolicyVersion,
  updateOrgNotifications,
  uploadOrgLogo,
  clearOrgLogo,
} from "../../lib/api";

const TABS = ["Policy Register", "Notifications", "Organisation", "Subscription", "Platform"];

const NOTIFICATION_TOGGLES = [
  { key: "incident", label: "Incident alerts", locked: false },
  { key: "compliance", label: "Compliance lapses", locked: false },
  { key: "swms", label: "Pending SWMS sign-offs", locked: false },
  { key: "toolbox", label: "Toolbox meeting reminders", locked: false },
  { key: "worksafe", label: "WorkSafe notifications", locked: true },
];

const PLATFORM_LINKS = [
  {
    key: "privacy",
    label: "Privacy Policy",
    body: `${brand.fullName} collects only the information needed to manage workplace health and safety records: user accounts, site personnel compliance records, incident reports, site diaries and toolbox meeting records. Data is stored securely in Australia-region cloud infrastructure and is never sold or shared with third parties. Access is restricted by role. For privacy queries or data requests contact ${brand.supportEmail}.`,
  },
  {
    key: "terms",
    label: "Terms & Conditions",
    body: `${brand.fullName} is provided to licensed builders and their nominated stakeholders for managing OHS obligations on Victorian construction sites. The platform assists with record keeping and does not replace your legal duties under the OHS Act 2004 (Vic) and OHS Regulations 2017 (Vic). You remain responsible for the accuracy of records entered. Questions: ${brand.supportEmail}.`,
  },
  {
    key: "refund",
    label: "Refund Policy",
    body: `Subscription fees are billed in advance. If ${brand.fullName} does not perform as described, contact ${brand.supportEmail} within 30 days of billing and we will work with you on a remedy, including pro-rata refunds where required under Australian Consumer Law.`,
  },
  {
    key: "security",
    label: "Security Policy",
    body: `All access to ${brand.fullName} requires an authenticated account with role-based permissions. Data is encrypted in transit (TLS) and at rest. Database access is protected by row-level security. Report security concerns to ${brand.supportEmail} — we treat reports as priority incidents.`,
  },
];

export default function Policies() {
  const toast = useToast();
  const { policies, setPolicies, org, setOrg } = useAppContext();
  const [tab, setTab] = useState("Policy Register");
  const [modal, setModal] = useState(null);

  // Source of truth is org_settings.notifications; worksafe is always locked on.
  const toggles = {
    incident: true, compliance: true, swms: true, toolbox: false,
    ...(org?.notifications || {}),
    worksafe: true,
  };

  const flip = async (key, locked) => {
    if (locked) {
      toast("WorkSafe notifications cannot be disabled", "warning");
      return;
    }
    const next = { ...toggles, [key]: !toggles[key] };
    try {
      await updateOrgNotifications(org.id, next);
      setOrg((prev) => (prev ? { ...prev, notifications: next } : prev));
    } catch (err) {
      toast(err.message || "Could not save preference", "error");
    }
  };

  const onUploadVersion = async (p) => {
    try {
      const updated = await bumpPolicyVersion(p);
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      toast(`${p.name} updated to ${updated.version}`);
    } catch (err) {
      toast(err.message || "Could not update policy", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Policies</h1>
        <p className="text-sm text-slate-500">
          OHS policy register, notifications, organisation details and platform
          terms — pushed to all stakeholders on site.
        </p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Policy Register" && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Active Policies"
              subtitle={`${org?.name || brand.fullName} · ${brand.region}`}
            />
            <CardBody className="pt-2">
              <Table>
                <THead
                  columns={["Name", "Version", "Category", "Status", "Last Updated", "Actions"]}
                />
                <TBody>
                  {policies.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium text-slate-800">{p.name}</TD>
                      <TD>{p.version}</TD>
                      <TD>{p.category}</TD>
                      <TD>
                        <Badge status="Active">{p.status}</Badge>
                      </TD>
                      <TD>{p.updated}</TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              toast("Policy editing opens in a future release", "warning")
                            }
                          >
                            Edit
                          </Button>
                          <Button size="sm" onClick={() => onUploadVersion(p)}>
                            Upload New Version
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Policy Categories" />
            <CardBody className="flex flex-wrap gap-2 pt-2">
              {policyCategories.map((c) => (
                <span
                  key={c}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
                >
                  {c}
                </span>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "Notifications" && (
        <Card>
          <CardHeader title="Notification Preferences" />
          <CardBody className="space-y-1 pt-2">
            {NOTIFICATION_TOGGLES.map((t) => (
              <div
                key={t.key}
                className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.label}</p>
                  {t.locked && (
                    <p className="text-xs text-amber-600">
                      Locked — required for compliance
                    </p>
                  )}
                </div>
                <button
                  onClick={() => flip(t.key, t.locked)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    toggles[t.key] ? "bg-green-500" : "bg-slate-300"
                  } ${t.locked ? "opacity-70" : ""}`}
                  aria-pressed={toggles[t.key]}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      toggles[t.key] ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {tab === "Organisation" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Organisation Details" subtitle="Read-only" />
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Info label="Organisation Name" value={org?.name || "—"} />
              <Info label="ABN" value={org?.abn || "—"} />
              <Info label="State" value={org?.state || "Victoria"} />
              <Info label="Plan Tier" value={org?.plan || "—"} />
              <Info label="Billing Contact" value={org?.billingContact || brand.supportEmail} />
              <Info label="Support" value={brand.supportEmail} />
              <Info label="Platform" value={brand.fullName} />
              <Info label="Domain" value={brand.domain} />
            </CardBody>
          </Card>
          <BrandingCard />
        </div>
      )}

      {tab === "Subscription" && <SubscriptionTab />}

      {tab === "Platform" && (
        <Card>
          <CardHeader title="Platform Policies" />
          <CardBody className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            {PLATFORM_LINKS.map((l) => (
              <button
                key={l.key}
                onClick={() => setModal(l)}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:border-blue-900 hover:bg-slate-50"
              >
                {l.label}
                <span className="text-slate-400">→</span>
              </button>
            ))}
          </CardBody>
        </Card>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.label}
        footer={
          <Button variant="secondary" onClick={() => setModal(null)}>
            Close
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">{modal?.body}</p>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client branding — the builder's own logo.
// Goes on their exported PDFs (letterhead), and in the workspace header, so
// the documents they hand a client or WorkSafe are theirs, not ours.
// ---------------------------------------------------------------------------
function BrandingCard() {
  const { org, setOrg } = useAppContext();
  const { role } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = role === "builder_admin";

  const onPick = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      return toast("Choose an image file (PNG, JPG or SVG)", "warning");
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast("That logo is over 2 MB — use a smaller version", "warning");
    }
    setBusy(true);
    try {
      const url = await uploadOrgLogo(org.id, file);
      setOrg((prev) => (prev ? { ...prev, logoUrl: url } : prev));
      toast("Logo saved — it's on your PDFs from now on");
    } catch (err) {
      toast(err.message || "Could not save the logo", "error");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await clearOrgLogo(org.id);
      setOrg((prev) => (prev ? { ...prev, logoUrl: "" } : prev));
      toast("Logo removed");
    } catch (err) {
      toast(err.message || "Could not remove the logo", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Branding"
        subtitle="Your logo appears on exported PDFs and in your workspace header."
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-24 w-48 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
            {org?.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={`${org?.name || "Organisation"} logo`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-400">No logo uploaded</span>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!isAdmin || busy}
                onClick={() => inputRef.current?.click()}
              >
                {busy ? "Saving…" : org?.logoUrl ? "Replace logo" : "Upload logo"}
              </Button>
              {org?.logoUrl && (
                <Button size="sm" variant="danger" disabled={!isAdmin || busy} onClick={onRemove}>
                  Remove
                </Button>
              )}
            </div>
            <p className="max-w-xs text-xs text-slate-400">
              PNG, JPG, WebP or SVG, up to 2 MB. A wide logo on a transparent or
              white background reproduces best on a letterhead.
            </p>
            {!isAdmin && (
              <p className="text-xs text-amber-600">
                Only a Builder Admin can change the company logo.
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Subscription
// Shows what the organisation is on today and what the other tiers include.
// Billing is not connected yet (see src/data/pricing.js) — this is the shell
// that a Stripe customer portal link drops into.
// ---------------------------------------------------------------------------
function SubscriptionTab() {
  const { org, workers, projects } = useAppContext();
  const toast = useToast();

  const planKey = org?.plan || TRIAL.key;
  const current = planByKey(planKey);
  const onTrial = !current;

  const activeProjects = projects.filter((p) => p.status !== "Archived" && p.status !== "Completed").length;
  const usage = [
    {
      label: "Active projects",
      used: activeProjects,
      cap: current?.limits.projects ?? null,
    },
    {
      label: "Stakeholders on site",
      used: workers.length,
      cap: current?.limits.stakeholders ?? null,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Your Subscription" />
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current plan
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-800">
                {onTrial ? TRIAL.name : current.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {onTrial ? TRIAL.blurb : current.blurb}
              </p>
            </div>
            <div className="text-right">
              <Badge status="Active">Active</Badge>
              <p className="mt-1 text-sm text-slate-500">
                {onTrial || current.price == null
                  ? "—"
                  : `${formatPrice(current)} + GST ${current.cadence}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Organisation" value={org?.name || "—"} />
            <Info label="Billing contact" value={org?.billingContact || brand.supportEmail} />
            <Info
              label="Customer since"
              value={
                org?.createdAt
                  ? new Date(org.createdAt).toLocaleDateString("en-AU", {
                      day: "numeric", month: "long", year: "numeric",
                    })
                  : "—"
              }
            />
            <Info label="Payment method" value="Not set up yet" />
          </div>

          {/* Usage against the plan's limits */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Usage this period
            </p>
            {usage.map((u) => (
              <div key={u.label}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{u.label}</span>
                  <span className="font-semibold text-slate-700">
                    {u.used}
                    {u.cap ? ` / ${u.cap}` : " · unlimited"}
                  </span>
                </div>
                <ProgressBar
                  value={u.cap ? Math.min(100, Math.round((u.used / u.cap) * 100)) : 100}
                  color={u.cap && u.used > u.cap ? "bg-red-500" : "bg-blue-900"}
                />
              </div>
            ))}
          </div>

          {!BILLING_LIVE && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <span className="font-semibold">Billing isn&apos;t switched on yet.</span>{" "}
              Your workspace is fully active and nothing is being charged. When
              billing goes live you&apos;ll be able to add a payment method and
              manage invoices from this tab.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Plans" subtitle="What each tier includes" />
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const isCurrent = !onTrial && p.key === current.key;
            return (
              <div
                key={p.key}
                className={`flex flex-col rounded-xl border p-4 ${
                  isCurrent ? "border-blue-900 bg-blue-50/40" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800">{p.name}</h4>
                  {isCurrent && <Badge status="Active">Current</Badge>}
                </div>
                <p className="mt-1 text-lg font-bold text-slate-800">
                  {formatPrice(p)}
                  {p.price != null && (
                    <span className="text-xs font-normal text-slate-500"> +GST {p.cadence}</span>
                  )}
                </p>
                <ul className="mt-3 flex-1 space-y-1.5 text-xs text-slate-600">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-1.5">
                      <span className="text-green-600">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={isCurrent ? "secondary" : "primary"}
                  className="mt-4"
                  disabled={isCurrent}
                  onClick={() =>
                    toast(
                      `Plan changes aren't self-service yet — email ${brand.supportEmail} and we'll move you to ${p.name}.`,
                      "warning"
                    )
                  }
                >
                  {isCurrent ? "Current plan" : `Switch to ${p.name}`}
                </Button>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
