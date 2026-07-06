import { useState } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Notification";
import { useAppContext } from "../../context/AppContext";
import { brand, policyCategories } from "../../data/constants";
import { bumpPolicyVersion, updateOrgNotifications } from "../../lib/api";

const TABS = ["Policy Register", "Notifications", "Organisation", "Platform"];

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
      )}

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
