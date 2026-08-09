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
import { policyTemplates, TEMPLATE_WARNING, DRAFT_LABEL, ADOPTION_BANNER } from "../../data/policyTemplates";
import { PLANS, TRIAL, BILLING_LIVE, planByKey, formatPrice } from "../../data/pricing";
import {
  bumpPolicyVersion,
  updateOrgNotifications,
  uploadOrgLogo,
  clearOrgLogo,
  insertPolicy,
  deletePolicyRow,
  updatePolicyRow,
  updateOrgDetails,
  policyDocUrl,
} from "../../lib/api";

const TABS = ["Policy Register", "Templates", "Notifications", "Organisation", "Subscription", "Platform"];

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
    body: `${brand.fullName} (a registered business name of ${brand.legalName}, ABN ${brand.abn}) collects only the information needed to manage workplace health and safety records: user accounts, site personnel compliance records, incident reports, site diaries and toolbox meeting records. Data is stored securely in Australia-region cloud infrastructure and is never sold or shared with third parties. Access is restricted by role. For privacy queries or data requests contact ${brand.supportEmail}.`,
  },
  {
    key: "terms",
    label: "Terms & Conditions",
    body: `${brand.fullName} is a registered business name of ${brand.legalName} (ABN ${brand.abn}, ACN ${brand.acn}). The platform is provided to licensed builders and their nominated stakeholders for managing OHS obligations on Victorian construction sites. It assists with record keeping and does not replace your legal duties under the OHS Act 2004 (Vic) and OHS Regulations 2017 (Vic). ${brand.fullName} is software — not a regulator, policy maker, lawyer or OHS consultant — and you remain responsible for the accuracy of records entered. Questions: ${brand.supportEmail}.`,
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
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", version: "v1.0", category: policyCategories[0] });
  const [saving, setSaving] = useState(false);
  // Editor for a document's text — used by template drafts and any document
  // that carries content. null = closed.
  const [editing, setEditing] = useState(null);
  // Which template's preview is expanded on the Templates tab (by key).
  const [preview, setPreview] = useState(null);

  // The register had no insert path anywhere in the codebase, so the page
  // could never hold a single policy.
  const onAddPolicy = async () => {
    if (!draft.name.trim()) return toast("Give the policy a name", "warning");
    setSaving(true);
    try {
      const created = await insertPolicy(draft);
      setPolicies((prev) => [...prev, created]);
      setAddOpen(false);
      setDraft({ name: "", version: "v1.0", category: policyCategories[0] });
      toast(`${created.name} added to the register`);
    } catch (err) {
      toast(err.message || "Could not add the policy", "error");
    } finally {
      setSaving(false);
    }
  };

  // Open a builder-supplied original document via a short-lived signed URL
  // (private, org-scoped bucket — only resolves for the owning organisation).
  const onOpenDoc = async (p) => {
    try {
      const url = await policyDocUrl(p.filePath);
      if (url) window.open(url, "_blank", "noopener");
      else toast("No file attached to this document", "warning");
    } catch (err) {
      toast(err.message || "Could not open the document", "error");
    }
  };

  const onRemovePolicy = async (p) => {
    try {
      await deletePolicyRow(p.id);
      setPolicies((prev) => prev.filter((x) => x.id !== p.id));
      toast(`${p.name} removed from the register`);
    } catch (err) {
      toast(err.message || "Could not remove the policy", "error");
    }
  };

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

  // Prefill the placeholders the platform already knows (org name, ABN),
  // leaving them fully editable. Project-level fields stay as placeholders
  // because a register document isn't tied to a single project.
  const prefillTemplate = (text) => {
    let out = text;
    if (org?.name) out = out.split("[Builder / Principal Contractor]").join(org.name);
    if (org?.abn) out = out.split("[ABN]").join(org.abn);
    return out;
  };

  // Templates → Draft → customise → review → deliberate publish. A template is
  // never treated as the builder's adopted document; it lands as a Draft and
  // stays one until someone chooses to publish it.
  const onUseTemplate = async (t) => {
    setSaving(true);
    try {
      const content = prefillTemplate(t.content);
      const created = await insertPolicy({
        name: t.name,
        version: "v0.1",
        category: t.category,
        status: "Draft",
        content,
      });
      setPolicies((prev) => [...prev, created]);
      setTab("Policy Register");
      setEditing({ id: created.id, name: created.name, content: created.content || content, status: "Draft" });
      toast("Template copied into your register as a draft — customise it, then publish when it's yours");
    } catch (err) {
      toast(err.message || "Could not create the draft", "error");
    } finally {
      setSaving(false);
    }
  };

  const onSaveContent = async (publish = false) => {
    if (!editing) return;
    setSaving(true);
    try {
      const patch = { name: editing.name, content: editing.content };
      if (publish) patch.status = "Active";
      const updated = await updatePolicyRow(editing.id, patch);
      setPolicies((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      setEditing(null);
      toast(
        publish
          ? `${updated.name} published — it is now an adopted document in your register`
          : "Draft saved — publish it when you've finished reviewing"
      );
    } catch (err) {
      toast(err.message || "Could not save the document", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Policies</h1>
        <p className="text-sm text-slate-500">
          Manage your OHS documents, stakeholder notifications, organisation
          settings, subscription and platform information. Publish relevant
          documents to the people who need them.
        </p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "Policy Register" && (
        <div className="space-y-4">
          {/* What this page is for — in one honest sentence. */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-blue-900">What is Policies?</p>
            <p className="mt-0.5 text-sm text-blue-800">
              Your organisation&apos;s document register for storing and
              distributing OHS plans, policies and procedures to relevant site
              stakeholders.
            </p>
          </div>

          <Card>
            <CardHeader
              title="Policy Register"
              subtitle={`${org?.name || brand.fullName} · ${brand.region} — add and manage your organisation's own OHS plans, policies and procedures`}
              action={<Button size="sm" onClick={() => setAddOpen(true)}>+ Add Policy</Button>}
            />
            <CardBody className="pt-2">
              <Table>
                <THead
                  columns={["Name", "Version", "Category", "Status", "Last Updated", "Actions"]}
                />
                <TBody>
                  {policies.length === 0 && (
                    <TR>
                      <TD className="py-6 text-center text-sm text-slate-400">
                        No documents in the register yet — add your OHS
                        Management Plan and site policies with + Add Policy, or
                        start from the Templates tab.
                      </TD>
                    </TR>
                  )}
                  {policies.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium text-slate-800">
                        {p.name}
                        {p.status === "Draft" && (
                          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                            {DRAFT_LABEL}
                          </span>
                        )}
                        {(p.source || p.fileName) && (
                          <span className="mt-0.5 block text-[11px] text-slate-400">
                            {p.source ? `${p.source}` : ""}
                            {p.source && p.fileName ? " · " : ""}
                            {p.fileName ? (
                              <button
                                className="font-medium text-blue-700 hover:underline"
                                onClick={() => onOpenDoc(p)}
                              >
                                {p.fileName}
                              </button>
                            ) : ""}
                          </span>
                        )}
                      </TD>
                      <TD>{p.version}</TD>
                      <TD>{p.category}</TD>
                      <TD>
                        <Badge status={p.status || "Active"}>{p.status || "Active"}</Badge>
                      </TD>
                      <TD>{p.updated}</TD>
                      <TD>
                        <div className="flex flex-wrap gap-2">
                          {p.content != null && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setEditing({ id: p.id, name: p.name, content: p.content || "", status: p.status })
                              }
                            >
                              {p.status === "Draft" ? "Edit Draft" : "View / Edit"}
                            </Button>
                          )}
                          {p.status !== "Draft" && (
                            <Button size="sm" onClick={() => onUploadVersion(p)}>
                              New Version
                            </Button>
                          )}
                          <Button size="sm" variant="danger" onClick={() => onRemovePolicy(p)}>
                            Remove
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
            <CardHeader
              title="Document Categories"
              subtitle="Common groupings to keep the register organised — not an exhaustive list of legal requirements"
            />
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

      {tab === "Templates" && (
        <div className="space-y-4">
          {/* The responsibility warning, before any template is touched. */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">⚠ {TEMPLATE_WARNING.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">{TEMPLATE_WARNING.body}</p>
          </div>

          {policyTemplates.map((t) => (
            <Card key={t.key}>
              <CardHeader
                title={t.name}
                subtitle={t.blurb}
                action={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPreview(preview === t.key ? null : t.key)}
                    >
                      {preview === t.key ? "Hide preview" : "Preview"}
                    </Button>
                    <Button size="sm" disabled={saving} onClick={() => onUseTemplate(t)}>
                      Use Template
                    </Button>
                  </div>
                }
              />
              <CardBody className="pt-2">
                {/* Template metadata */}
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge status="Draft">{t.status || "Template"}</Badge>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">Version {t.version}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">Last reviewed {t.lastReviewed}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">{t.category}</span>
                </div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-600">
                  {ADOPTION_BANNER}
                </p>
                {t.sourceBasis && (
                  <p className="mb-3 text-xs text-slate-500">
                    <span className="font-semibold">Source basis:</span> {t.sourceBasis}
                  </p>
                )}
                {preview === t.key && (
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 scrollbar-thin">
                    {t.content}
                  </pre>
                )}
                <p className="mt-3 text-xs text-slate-500">
                  Use Template copies this document into your Policy Register as a{" "}
                  <span className="font-semibold">draft</span>. Customise it to
                  your project, review it, and publish it only when it reflects
                  how your site is actually run. Nothing is adopted on your
                  behalf.
                </p>
              </CardBody>
            </Card>
          ))}
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
          <OrganisationCard />
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
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a policy"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={onAddPolicy} disabled={saving}>
              {saving ? "Adding…" : "Add to register"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Policy name
            </span>
            <input
              className="pol-input"
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. OHS Management Plan"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Version
              </span>
              <input
                className="pol-input"
                value={draft.version}
                onChange={(e) => setDraft({ ...draft, version: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category
              </span>
              <select
                className="pol-input"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {policyCategories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </div>
        <style>{`
          .pol-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
          .pol-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
        `}</style>
      </Modal>

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

      {/* Document editor — where a template draft becomes the builder's own
          document. Publishing is a deliberate, separate act. */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.status === "Draft" ? "Edit draft document" : "View / edit document"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => onSaveContent(false)} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {editing?.status === "Draft" && (
              <Button onClick={() => onSaveContent(true)} disabled={saving}>
                Publish &amp; adopt
              </Button>
            )}
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            {editing.status === "Draft" && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  {DRAFT_LABEL}
                </p>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  <span className="font-semibold">{TEMPLATE_WARNING.title}.</span>{" "}
                  {TEMPLATE_WARNING.body}
                </div>
              </>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document name
              </span>
              <input
                className="pol-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document text
              </span>
              <textarea
                className="pol-input min-h-[320px] font-mono text-xs leading-relaxed"
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            </label>
            {editing.status === "Draft" && (
              <p className="text-xs text-slate-500">
                Publish &amp; adopt marks this as an active document in your
                register. Do that only after you have customised and reviewed it
                for your project.
              </p>
            )}
            <style>{`
              .pol-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
              .pol-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
            `}</style>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Organisation details.
//
// This tab was labelled "Read-only" and had no way in, so a paying customer
// could not enter their own ABN — which then printed as a blank on every PDF
// they hand a client or WorkSafe. Builder Admins can edit; everyone else still
// sees the values.
// ---------------------------------------------------------------------------
function OrganisationCard() {
  const { org, setOrg } = useAppContext();
  const { role } = useAuth();
  const toast = useToast();
  const isAdmin = role === "builder_admin";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  const start = () => {
    setForm({
      name: org?.name || "",
      abn: org?.abn || "",
      state: org?.state || "Victoria",
      billingContact: org?.billingContact || "",
    });
    setEditing(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast("Your organisation needs a name", "warning");
    setSaving(true);
    try {
      const saved = await updateOrgDetails(org.id, form);
      setOrg((prev) => ({ ...prev, ...saved }));
      setEditing(false);
      toast("Organisation details saved");
    } catch (err) {
      toast(err.message || "Could not save details", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Organisation Details"
        subtitle="Shown on your exported PDFs and letterheads."
        action={
          isAdmin && !editing ? (
            <Button size="sm" variant="secondary" onClick={start}>Edit</Button>
          ) : null
        }
      />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {editing ? (
          <>
            <EditField label="Organisation Name" value={form.name}
              onChange={(v) => setForm({ ...form, name: v })} />
            <EditField label="ABN" value={form.abn} placeholder="e.g. 12 345 678 901"
              onChange={(v) => setForm({ ...form, abn: v })} />
            <EditField label="State" value={form.state}
              onChange={(v) => setForm({ ...form, state: v })} />
            <EditField label="Billing Contact" value={form.billingContact}
              placeholder={brand.supportEmail}
              onChange={(v) => setForm({ ...form, billingContact: v })} />
            <div className="col-span-full flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save details"}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
            <style>{`
              .org-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
              .org-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
            `}</style>
          </>
        ) : (
          <>
            <Info label="Organisation Name" value={org?.name || "—"} />
            <Info label="ABN" value={org?.abn || "— not set"} />
            <Info label="State" value={org?.state || "Victoria"} />
            <Info label="Plan Tier" value={org?.plan || "—"} />
            <Info label="Billing Contact" value={org?.billingContact || brand.supportEmail} />
            <Info label="Support" value={brand.supportEmail} />
            <Info
              label="Platform"
              value={`${brand.fullName} — ${brand.legalName} · ABN ${brand.abn}`}
            />
            <Info label="Domain" value={brand.domain} />
          </>
        )}
      </CardBody>
    </Card>
  );
}

function EditField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        className="org-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
