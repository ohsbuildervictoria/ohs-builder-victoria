import { useState, useRef } from "react";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import QuizBankTab from "./QuizBank";
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
  uploadPolicyDoc,
  sendPolicyEmail,
} from "../../lib/api";

// "Policy Email" replaced the top-level "Templates" tab (David, 26 Aug): the
// template library still exists, one click deep inside the Policy Register.
const TABS = ["Policy Register", "Policy Email", "Safety Quiz", "Notifications", "Organisation", "Subscription", "Platform"];

// The plan/policy types a Victorian builder typically holds in the register.
// Listed as common practice — which of them a given project genuinely needs
// is the builder's call, not a legal checklist this software imposes.
const PLAN_TYPES = [
  "OH&S Management Plan",
  "Environmental Management Plan",
  "Quality Management Plan",
  "Emergency Management Plan",
  "Traffic Management Plan",
  "Waste Management Plan",
  "Site Security and Access Management Plan",
  "Risk Management Policy",
];

// What a full OH&S Management System / Plan commonly contains — David's
// educator framing (26 Aug), shown as examples rather than requirements.
const OHS_PLAN_CONTENTS = [
  { title: "Obligations of All Parties", body: "Responsibilities of employers, principal contractors, self-employed persons, supervisors and employees." },
  { title: "Hazard Identification and Risk Assessment", body: "Hazard identification, risk assessment and the risk management cycle." },
  { title: "Administration of OH&S", body: "Auditing, training, competency, communication and issue resolution." },
  { title: "First Aid, Emergencies and Incidents", body: "Emergency response, accident procedures, reporting and investigations." },
  { title: "Fire Emergency Procedures", body: "Warning notices and internal incident notification." },
  { title: "WorkSafe Notification", body: "Notification requirements for workplace incidents." },
  { title: "Workplace Policies", body: "Safety, drug and alcohol, UV protection and site rules." },
];

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
    body: `${brand.fullName} (a registered business name of ${brand.legalName}, ABN ${brand.abn}) collects only the information needed to manage workplace health and safety records: user accounts, site personnel compliance records, incident reports, site diaries and toolbox meeting records. Data is held with our cloud infrastructure provider with encryption in transit and at rest and role-based access control, and is not sold. Some data may be processed or stored outside Australia by our service providers — see the full Privacy Policy for details. For privacy queries or data requests contact ${brand.supportEmail}.`,
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
  const { permissions } = useAuth();
  // Inside an Education training sandbox the student is the builder, but
  // organisation settings and subscription belong to the institution — the
  // database returns orgSettings/billing = false and those tabs disappear.
  const visibleTabs = TABS.filter(
    (t) =>
      (t !== "Organisation" || permissions?.orgSettings !== false) &&
      (t !== "Subscription" || permissions?.billing !== false)
  );
  const [tab, setTab] = useState("Policy Register");
  const [modal, setModal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", version: "v1.0", category: policyCategories[0] });
  const [saving, setSaving] = useState(false);
  // Editor for a document's text — used by template drafts and any document
  // that carries content. null = closed.
  const [editing, setEditing] = useState(null);
  // Which template's preview is expanded in the template library (by key).
  const [preview, setPreview] = useState(null);
  // The template library lives inside the Policy Register tab, collapsed.
  const [showTemplates, setShowTemplates] = useState(false);

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

  // 027 — attach / replace the actual PDF (OHS Management Plan etc.). Private
  // org bucket; the builder/HSE writes, every org member (incl. stakeholders
  // via My Site → Site policies) reads.
  const pdfInputRef = useRef(null);
  const [pdfFor, setPdfFor] = useState(null);
  const pickPdf = (p) => { setPdfFor(p); pdfInputRef.current?.click(); };
  const onPdfChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pdfFor) return;
    setSaving(true);
    try {
      const updated = await uploadPolicyDoc(pdfFor, file, org?.id);
      setPolicies((prev) => prev.map((x) => (x.id === pdfFor.id ? updated : x)));
      toast(`${file.name} attached to ${pdfFor.name} — stakeholders can open it from My Site → Site policies`);
    } catch (err) {
      toast(err.message || "Could not upload the PDF", "error");
    } finally {
      setSaving(false);
      setPdfFor(null);
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

      <Tabs tabs={visibleTabs} active={tab} onChange={setTab} />

      {tab === "Policy Register" && (
        <div className="space-y-4">
          {/* What this page is for, and the plan types a builder keeps here. */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-blue-900">Policy &amp; Management Plan Types</p>
            <p className="mt-0.5 text-sm text-blue-800">
              Your organisation&apos;s register for storing and distributing the
              plans and policies your sites run on. Builders commonly hold:
            </p>
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-blue-900 sm:grid-cols-2">
              {PLAN_TYPES.map((t) => (
                <li key={t} className="flex items-baseline gap-1.5">
                  <span aria-hidden className="text-blue-400">•</span>{t}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-blue-700">
              Which of these a project needs depends on its scope and hazards —
              this list is common practice, not a legal checklist.
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
                        start from a template below.
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
                          <Button size="sm" variant="secondary" disabled={saving} onClick={() => pickPdf(p)}>
                            {p.fileName ? "Replace PDF" : "Upload PDF"}
                          </Button>
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

          <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPdfChosen} aria-label="Choose a PDF to attach" />

          {/* One card, not two: these ARE the document categories, described.
              (The old chip list repeated the same concepts a second time —
              David flagged the duplication 28 Aug.) Register rows and the
              Add Policy dropdown keep their existing category values. */}
          <Card>
            <CardHeader
              title="Document Categories"
              subtitle="What an OH&S Management System / Plan commonly covers — a guide for organising the register, not an exhaustive list of legal requirements"
            />
            <CardBody className="grid gap-3 pt-2 sm:grid-cols-2">
              {OHS_PLAN_CONTENTS.map((s) => (
                <div key={s.title} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.body}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* The template library — moved here when the top-level tab became
              Policy Email. Same drafts-only flow: nothing is adopted for you. */}
          <Card>
            <CardHeader
              title="Start from a template"
              subtitle="Copy a starting document into your register as a draft, then customise and publish it"
              action={
                <Button size="sm" variant="secondary" onClick={() => setShowTemplates((v) => !v)}>
                  {showTemplates ? "Hide templates" : `Browse templates (${policyTemplates.length})`}
                </Button>
              }
            />
            {showTemplates && (
              <CardBody className="space-y-4 pt-2">
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
              </CardBody>
            )}
          </Card>
        </div>
      )}

      {tab === "Policy Email" && <PolicyEmailTab policies={policies} />}

      {tab === "Safety Quiz" && <QuizBankTab />}

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

// ----------------------------------------------------------------------------
// Policy Email (David, 26 Aug) — distribute the register's current documents
// to ONE project's people: stakeholders on that site's roster plus the
// contacts of subcontractors with crew on it. The server recomputes the
// recipient list and signs every PDF link itself; this screen only chooses a
// project and which policies to include. Sending is distribution only — it
// never records an acknowledgement or acceptance for anyone.
// ----------------------------------------------------------------------------
function PolicyEmailTab({ policies }) {
  const toast = useToast();
  const { projects, workers, companies } = useAppContext();
  const [projectId, setProjectId] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [showRecipients, setShowRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSend, setLastSend] = useState(null);

  const sendable = policies.filter((p) => p.status !== "Draft");
  const pid = Number(projectId) || null;

  // Preview of who the server will email — same rules, derived client-side
  // from the already-loaded org data so the builder can check before sending.
  const crew = pid ? workers.filter((w) => Number(w.project) === pid) : [];
  const stakeholderRecipients = crew.filter((w) => (w.email || "").trim());
  const crewCompanyIds = new Set(crew.map((w) => w.companyId).filter(Boolean));
  const companyRecipients = companies.filter((c) => crewCompanyIds.has(c.id) && (c.contactEmail || "").trim());
  const uniqueEmails = new Set([
    ...stakeholderRecipients.map((w) => w.email.trim().toLowerCase()),
    ...companyRecipients.map((c) => c.contactEmail.trim().toLowerCase()),
  ]);

  const togglePolicy = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const onSend = async () => {
    if (!pid) return toast("Choose the project to send to", "warning");
    if (!selected.size) return toast("Tick at least one policy to include", "warning");
    if (!uniqueEmails.size) return toast("Nobody on that site's roster has an email address yet", "warning");
    setSending(true);
    try {
      const res = await sendPolicyEmail(pid, Array.from(selected));
      if (res.sent) {
        setLastSend(res);
        toast(`Policy email sent to ${res.recipients} recipient${res.recipients === 1 ? "" : "s"}`);
      } else {
        toast(res.skipped || "Nothing was sent", "warning");
      }
    } catch (err) {
      toast(err.message || "Could not send the policy email — try again", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-900">Policy Email</p>
        <p className="mt-0.5 text-sm text-blue-800">
          Email the current policies and management plans to everyone on one
          site — its stakeholders and its subcontractors&apos; contacts. PDF links
          are private and expire after 7 days; recipients can always find the
          latest versions under My Site → Site policies.
        </p>
        <p className="mt-1 text-xs text-blue-700">
          Sending records who was emailed — it does not mark anyone as having
          read or accepted a policy.
        </p>
      </div>

      <Card>
        <CardHeader title="1 · Project" subtitle="Only this site's people receive the email" />
        <CardBody className="pt-2">
          <select
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setShowRecipients(false); setLastSend(null); }}
            aria-label="Project to send to"
          >
            <option value="">— Choose a project —</option>
            {projects
              .filter((p) => p.status !== "Archived")
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="2 · Policies to include"
          subtitle={sendable.length ? "Published documents from your Policy Register" : "Publish documents in your Policy Register first — drafts are not sent"}
        />
        <CardBody className="space-y-2 pt-2">
          {sendable.length === 0 && (
            <p className="text-sm text-slate-400">No published policies yet.</p>
          )}
          {sendable.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(p.id)}
                onChange={() => togglePolicy(p.id)}
              />
              <span className="min-w-0 text-sm">
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="block text-xs text-slate-500">
                  {p.version} · {p.category}
                  {p.fileName ? ` · PDF attached (${p.fileName})` : " · no PDF — the email links to the portal"}
                </span>
              </span>
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="3 · Recipients"
          subtitle={pid ? "Who this email goes to — checked again on the server when you send" : "Choose a project to see who would receive it"}
          action={pid ? (
            <Button size="sm" variant="secondary" onClick={() => setShowRecipients((v) => !v)}>
              {showRecipients ? "Hide recipients" : "Preview recipients"}
            </Button>
          ) : null}
        />
        <CardBody className="space-y-3 pt-2">
          {pid && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">
                {stakeholderRecipients.length} stakeholder{stakeholderRecipients.length === 1 ? "" : "s"} with an email
              </span>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">
                {companyRecipients.length} subcontractor contact{companyRecipients.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-900">
                {uniqueEmails.size} unique address{uniqueEmails.size === 1 ? "" : "es"}
              </span>
            </div>
          )}
          {pid && crew.length > stakeholderRecipients.length && (
            <p className="text-xs text-amber-700">
              {crew.length - stakeholderRecipients.length} stakeholder{crew.length - stakeholderRecipients.length === 1 ? " has" : "s have"} no
              email address recorded and will be skipped — add emails on Stakeholder Compliance to include them.
            </p>
          )}
          {showRecipients && pid && (
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              {stakeholderRecipients.map((w) => (
                <p key={`w${w.id}`} className="flex justify-between gap-3 py-0.5">
                  <span className="truncate text-slate-700">{w.name}</span>
                  <span className="truncate text-xs text-slate-400">{w.email}</span>
                </p>
              ))}
              {companyRecipients.map((c) => (
                <p key={`c${c.id}`} className="flex justify-between gap-3 py-0.5">
                  <span className="truncate text-slate-700">{c.name} (subcontractor)</span>
                  <span className="truncate text-xs text-slate-400">{c.contactEmail}</span>
                </p>
              ))}
              <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-400">
                Recipients are BCC&apos;d — they never see each other&apos;s addresses. You receive a copy as the send receipt.
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button onClick={onSend} disabled={sending || !pid || !selected.size}>
              {sending ? "Sending…" : "Send Policy Email"}
            </Button>
            {lastSend?.sent && (
              <span className="text-sm text-green-700">
                ✓ Sent to {lastSend.recipients} recipient{lastSend.recipients === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
