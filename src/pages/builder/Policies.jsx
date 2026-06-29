import { useState } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Notification";
import { policies, policyCategories, org, brand } from "../../data/mockData";

const TABS = ["Policy Register", "Notifications", "Organisation", "Platform"];

const NOTIFICATION_TOGGLES = [
  { key: "incident", label: "Incident alerts", locked: false },
  { key: "compliance", label: "Compliance lapses", locked: false },
  { key: "swms", label: "Pending SWMS sign-offs", locked: false },
  { key: "toolbox", label: "Toolbox meeting reminders", locked: false },
  { key: "worksafe", label: "WorkSafe notifications", locked: true },
];

const PLATFORM_LINKS = [
  { key: "privacy", label: "Privacy Policy" },
  { key: "terms", label: "Terms & Conditions" },
  { key: "refund", label: "Refund Policy" },
  { key: "security", label: "Security Policy" },
];

export default function Policies() {
  const toast = useToast();
  const [tab, setTab] = useState("Policy Register");
  const [toggles, setToggles] = useState({
    incident: true,
    compliance: true,
    swms: true,
    toolbox: true,
    worksafe: true,
  });
  const [modal, setModal] = useState(null);

  const flip = (key, locked) => {
    if (locked) {
      toast("WorkSafe notifications cannot be disabled", "warning");
      return;
    }
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Policies</h1>
        <p className="text-sm text-slate-500">
          WHS policy register, notifications, organisation details and platform
          terms — pushed to all stakeholders on site.
        </p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Policy Register" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Active Policies" subtitle={`${org.name} · ${brand.region}`} />
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
                          <Button size="sm" variant="secondary" onClick={() => toast(`Editing ${p.name}`)}>
                            Edit
                          </Button>
                          <Button size="sm" onClick={() => toast(`New version uploaded for ${p.name}`)}>
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
            <Info label="Organisation Name" value={org.name} />
            <Info label="ABN" value={org.abn} />
            <Info label="State" value={org.state} />
            <Info label="Plan Tier" value={`${org.plan} (${org.users} users)`} />
            <Info label="Billing Contact" value={org.billingContact} />
            <Info label="Built By" value={org.builtBy} />
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
        <p className="text-sm leading-relaxed text-slate-600">
          Placeholder content for the {modal?.label}. In production this document
          governs use of {brand.fullName} by {org.name}. Refer to {org.builtBy}{" "}
          for the authoritative version.
        </p>
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
