import { useState } from "react";
import SubbiePanel, { CertControls } from "./Subcontractors";
import { useCompanies } from "../../hooks/useCompanies";
import { emailInvite, updateWorkerEmail } from "../../lib/api";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import ComplianceMatrix from "../../components/shared/ComplianceMatrix";
import { useWorkers } from "../../hooks/useWorkers";
import { useProjects } from "../../hooks/useProjects";
import { useDocuments } from "../../hooks/useDocuments";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui/Notification";
import { useForm } from "react-hook-form";
import {
  complianceCategories,
  categoryStatus,
  isBlocking,
  isCompliant,
  EXPIRY_CATEGORIES,
  DOC_CATEGORIES,
} from "../../lib/compliance";
import { downloadCsv } from "../../utils/export";
import { swmsLibrary } from "../../data/swmsLibrary";

// Stakeholder types. Stakeholders (the people matrix) and Subcontractors (the
// company register) are real; the rest stay hidden until something populates
// them (there is no record type for Suppliers/Developer yet).
const ALL_TABS = ["Stakeholders", "Subcontractors", "Suppliers", "Developer", "Other"];
const STATUSES = ["Verified", "Pending", "Missing"];

export default function Compliance() {
  const { workers, updateCompliance, addWorker } = useWorkers();
  const { projects } = useProjects();
  const { docsFor } = useDocuments();
  const { companies, addCompany } = useCompanies();
  const { refresh } = useAppContext();
  const toast = useToast();
  const [tab, setTab] = useState("Stakeholders");
  const [cell, setCell] = useState(null); // { worker, category }
  const [addOpen, setAddOpen] = useState(false);
  const [newLogin, setNewLogin] = useState(null); // credentials to show after create
  const [emailEdit, setEmailEdit] = useState(null); // worker whose email is being set
  const [emailSaving, setEmailSaving] = useState(false);
  const addForm = useForm();
  const emailForm = useForm();
  const companyChoice = addForm.watch("companyId");

  // Set/correct an invited worker's email, then offer to send their invite.
  const onSaveEmail = async ({ email }) => {
    if (!emailEdit) return;
    setEmailSaving(true);
    try {
      const updated = await updateWorkerEmail(emailEdit.id, email);
      await refresh();
      setEmailEdit(null);
      if (updated.email) {
        try {
          const r = await emailInvite(updated.id);
          toast(`Email saved — invite sent to ${r.to}`);
        } catch (err) {
          toast(`Email saved. Couldn't send the invite: ${err.message || "try again"}`, "warning");
        }
      } else {
        toast("Email cleared");
      }
    } catch (err) {
      toast(err.message || "Could not update email", "error");
    } finally {
      setEmailSaving(false);
    }
  };

  const tabs = ALL_TABS.filter((t) => t === "Stakeholders" || t === "Subcontractors");

  // Summary bars: % of the crew whose evidence is currently valid, per category.
  const complianceSummary = complianceCategories.reduce((acc, c) => {
    if (!workers.length) {
      acc[c.key] = 0;
      return acc;
    }
    const valid = workers.filter((w) =>
      isCompliant(categoryStatus(w, c.key, docsFor(w.id)[c.key]))
    ).length;
    acc[c.key] = Math.round((valid / workers.length) * 100);
    return acc;
  }, {});

  const onAddStakeholder = async (data) => {
    try {
      // Resolve who they work for: an existing subbie company, a brand-new
      // one (created here), or nobody (direct hire / sole trader).
      let companyId = null;
      let employer = "";
      if (data.companyId === "__new__") {
        const created = await addCompany({ name: data.newCompanyName });
        companyId = created.id;
        employer = created.name;
      } else if (data.companyId) {
        companyId = Number(data.companyId);
        employer = companies.find((c) => c.id === companyId)?.name || "";
      }
      const created = await addWorker({
        name: data.name,
        trade: data.trade,
        employer,
        companyId,
        email: data.email,
        project: data.project ? Number(data.project) : null,
      });
      setAddOpen(false);
      addForm.reset();
      const invite = {
        name: created.name,
        workerId: created.id,
        email: created.email || "",
        inviteLink: `${window.location.origin}/join/${created.inviteToken}`,
        emailState: created.email ? "sending" : "none",
      };
      setNewLogin(invite);
      // Email the link automatically when we have an address — the whole
      // point of real email delivery. Failure falls back to copy-the-link.
      if (created.email) {
        emailInvite(created.id)
          .then(() => setNewLogin((n) => (n?.workerId === created.id ? { ...n, emailState: "sent" } : n)))
          .catch(() => setNewLogin((n) => (n?.workerId === created.id ? { ...n, emailState: "failed" } : n)));
      }
      refresh(); // pick up the SWMS template created/bumped for their trade
    } catch (err) {
      toast(err.message || "Could not add stakeholder", "error");
    }
  };

  // Workers with any Missing/Expired item — surfaced as a banner.
  const blocked = workers.filter((w) => {
    const docs = docsFor(w.id);
    return complianceCategories.some((c) => isBlocking(categoryStatus(w, c.key, docs[c.key])));
  });

  const handleExport = () => {
    const headers = ["Name", "Trade", "Company", ...complianceCategories.map((c) => c.label), "Status"];
    const rows = workers.map((w) => {
      const docs = docsFor(w.id);
      const company = w.companyId ? companies.find((c) => c.id === w.companyId) : null;
      return [
        w.name,
        w.trade,
        company?.name || w.employer || "—",
        ...complianceCategories.map((c) => categoryStatus(w, c.key, docs[c.key])),
        w.status,
      ];
    });
    downloadCsv(`compliance-records-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast("Compliance CSV downloaded", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compliance Records</h1>
          <p className="text-sm text-slate-500">
            Stakeholder × 6-category compliance matrix — click a cell to upload evidence
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              addForm.reset({
                name: "", trade: "", companyId: "", newCompanyName: "", project: "", loginHandle: "",
              });
              setAddOpen(true);
            }}
          >
            + Add Stakeholder
          </Button>
          <Button variant="secondary" onClick={handleExport}>Export CSV</Button>
        </div>
      </div>

      {/* Summary bars */}
      <Card>
        <CardHeader title="Compliance Summary" />
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {complianceCategories.map((c) => (
            <div key={c.key}>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{c.label}</span>
                <span className="font-semibold text-slate-700">
                  {complianceSummary[c.key]}%
                </span>
              </div>
              <ProgressBar value={complianceSummary[c.key]} threshold />
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Critical rule banner */}
      {blocked.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">⛔ Site access blocked:</span>{" "}
          {blocked.length} stakeholder{blocked.length === 1 ? "" : "s"} (
          {blocked.map((w) => w.name).join(", ")}) have a missing or expired
          compliance item and cannot access site until resolved.
        </div>
      )}

      <Tabs tabs={tabs} active={tab} onChange={setTab} variant="pills" />

      {tab === "Stakeholders" && (
        <Card>
          <CardBody>
            <ComplianceMatrix
              workers={workers}
              docsFor={docsFor}
              onCellClick={(worker, category) => setCell({ worker, category })}
              onEmailInvite={async (w) => {
                try {
                  const r = await emailInvite(w.id);
                  toast(`Invite emailed to ${r.to}`);
                } catch (err) {
                  toast(err.message || "Could not email the invite", "error");
                }
              }}
              onSetEmail={(w) => {
                setEmailEdit(w);
                emailForm.reset({ email: w.email || "" });
              }}
            />
          </CardBody>
        </Card>
      )}

      {tab === "Subcontractors" && (
        <SubbiePanel
          onAddWorker={(company) => {
            addForm.reset({
              name: "", trade: "", companyId: String(company.id),
              newCompanyName: "", project: "", loginHandle: "",
            });
            setAddOpen(true);
          }}
        />
      )}

      {/* Set/correct an invited worker's email + resend their invite */}
      <Modal
        open={!!emailEdit}
        onClose={() => setEmailEdit(null)}
        title={emailEdit?.email ? "Update email" : "Add email"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEmailEdit(null)}>Cancel</Button>
            <Button onClick={emailForm.handleSubmit(onSaveEmail)} disabled={emailSaving}>
              {emailSaving ? "Saving…" : "Save & send invite"}
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={emailForm.handleSubmit(onSaveEmail)}>
          <p className="text-sm text-slate-600">
            {emailEdit?.name} was added without an email, so their invite link
            couldn&apos;t be sent. Add it here and we&apos;ll email their sign-in
            link straight away.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email address
            </span>
            <input
              type="email"
              autoFocus
              className="adm-input"
              placeholder="tradie@email.com"
              {...emailForm.register("email", { required: true })}
            />
          </label>
          <p className="text-xs text-slate-400">
            This updates their record only — the existing invite link stays valid.
          </p>
        </form>
        <style>{`
          .adm-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
          .adm-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
        `}</style>
      </Modal>

      {/* Add stakeholder modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Stakeholder"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addForm.handleSubmit(onAddStakeholder)}>Add Stakeholder</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={addForm.handleSubmit(onAddStakeholder)}>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Full name *
            </span>
            <input className="cmp-input" {...addForm.register("name", { required: true })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trade *
            </span>
            <input
              className="cmp-input"
              list="trade-options"
              placeholder="e.g. Carpenter – Framer"
              {...addForm.register("trade", { required: true })}
            />
            <datalist id="trade-options">
              {swmsLibrary.map((s) => (
                <option key={s.id} value={s.trade} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Works for
            </span>
            <select className="cmp-input" {...addForm.register("companyId")}>
              <option value="">No company — direct hire / sole trader</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="__new__">+ Add a new company…</option>
            </select>
            <span className="mt-1 block text-xs text-slate-400">
              Workers under a company are covered by that company&apos;s insurance.
            </span>
          </label>
          {companyChoice === "__new__" && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                New company name *
              </span>
              <input
                className="cmp-input"
                placeholder="e.g. Scope Plumbing Pty Ltd"
                {...addForm.register("newCompanyName", { required: true })}
              />
              <span className="mt-1 block text-xs text-slate-400">
                You can add their ABN and insurance in the Subcontractors tab.
              </span>
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned project
            </span>
            <select className="cmp-input" {...addForm.register("project")}>
              <option value="">— Unassigned —</option>
              {projects
                .filter((p) => p.status !== "Archived")
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Email (optional)
            </span>
            <input
              type="email"
              className="cmp-input"
              autoCapitalize="none"
              placeholder="subbie@email.com"
              {...addForm.register("email")}
            />
            <span className="mt-1 block text-xs text-slate-400">
              You&apos;ll get a private invite link to send them — they set their
              own password and see only their own site and documents.
            </span>
          </label>
        </form>
      </Modal>

      {/* Invite link to send the new subbie */}
      <Modal
        open={!!newLogin}
        onClose={() => setNewLogin(null)}
        title="Subbie added — send them this link"
        footer={<Button onClick={() => setNewLogin(null)}>Done</Button>}
      >
        {newLogin && (
          <div className="space-y-3 text-sm text-slate-700">
            {newLogin.emailState === "sent" && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-green-800">
                ✉️ Invite emailed to <span className="font-semibold">{newLogin.email}</span> — they can also use the link below.
              </p>
            )}
            {newLogin.emailState === "sending" && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">Emailing the invite to {newLogin.email}…</p>
            )}
            {newLogin.emailState === "failed" && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                Couldn&apos;t email the invite — send them the link below instead.
              </p>
            )}
            <p>
              Send <span className="font-semibold">{newLogin.name}</span> this private
              link (text, email or WhatsApp). They open it once to set their own
              password, then sign in with their email from then on.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="break-all font-mono text-xs text-slate-700">{newLogin.inviteLink}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(newLogin.inviteLink);
                toast("Invite link copied");
              }}
            >
              Copy link
            </Button>
            <p className="text-xs text-slate-500">
              The link works once and only for this subbie. They&apos;ll only ever
              see their own site, tasks and documents.
            </p>
          </div>
        )}
      </Modal>

      {/* Manage compliance item modal */}
      <CellModal
        cell={cell}
        onClose={() => setCell(null)}
        updateCompliance={updateCompliance}
      />

      <style>{`
        .cmp-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .cmp-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
      `}</style>
    </div>
  );
}

// Cell modal: for expiry categories (White Card/Insurance/Medical) the builder
// uploads a file + expiry and can view/replace/remove it; for the rest, the
// completion status is set manually and a supporting file can still be attached.
function CellModal({ cell, onClose, updateCompliance }) {
  const { docsFor, upload, remove, open } = useDocuments();
  const { getCompany } = useCompanies();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);

  if (!cell) return null;
  const { worker, category } = cell;
  const label = complianceCategories.find((c) => c.key === category)?.label;

  // A company-linked worker's Insurance is the company's Public Liability
  // certificate — manage the company document here, not a personal one.
  const company = worker.companyId ? getCompany(worker.companyId) : null;
  if (category === "insurance" && company) {
    return (
      <Modal
        open={!!cell}
        onClose={onClose}
        title={`Insurance — ${worker.name}`}
        footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {worker.name} works for <span className="font-semibold">{company.name}</span>,
            so their insurance comes from the company&apos;s Public Liability
            certificate. Updating it here updates the whole crew.
          </p>
          <CertControls company={company} catKey="publicLiability" onDone={onClose} />
        </div>
      </Modal>
    );
  }
  const doc = docsFor(worker.id)[category] || null;
  const status = categoryStatus(worker, category, doc);
  const isExpiryCat = EXPIRY_CATEGORIES.includes(category);
  const isDocCat = DOC_CATEGORIES.includes(category);
  const today = new Date().toISOString().slice(0, 10);

  const reset = () => { setFile(null); setExpiry(""); setBusy(false); };

  const onUpload = async () => {
    if (!file) return toast("Choose a file first", "warning");
    if (isExpiryCat && !expiry) return toast("Set an expiry date for this document", "warning");
    setBusy(true);
    try {
      await upload(worker.id, category, file, isExpiryCat ? expiry : null);
      toast(`${label} evidence uploaded for ${worker.name}`);
      reset();
      onClose();
    } catch (err) {
      toast(err.message || "Upload failed", "error");
      setBusy(false);
    }
  };

  const onView = async () => {
    try {
      const url = await open(doc);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast(err.message || "Could not open document", "error");
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await remove(doc);
      toast(`${label} evidence removed`);
      reset();
      onClose();
    } catch (err) {
      toast(err.message || "Could not remove document", "error");
      setBusy(false);
    }
  };

  const close = () => { reset(); onClose(); };

  return (
    <Modal
      open={!!cell}
      onClose={close}
      title={`${label} — ${worker.name}`}
      footer={<Button variant="secondary" onClick={close}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">Current status:</span>
          <Badge status={status} icon />
        </div>

        {/* Existing document */}
        {isDocCat && doc && (
          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="font-medium text-slate-800">{doc.fileName}</p>
            {doc.expiry && (
              <p className="text-xs text-slate-500">Expires {doc.expiry}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={onView}>View / Download</Button>
              <Button size="sm" variant="danger" onClick={onRemove} disabled={busy}>Remove</Button>
            </div>
          </div>
        )}

        {/* Upload / replace */}
        {isDocCat && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {doc ? "Replace evidence" : "Upload evidence"}
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
            />
            {isExpiryCat && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Expiry date *
                </span>
                <input
                  type="date"
                  min={today}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="cmp-input"
                />
              </label>
            )}
            <Button onClick={onUpload} disabled={busy}>
              {busy ? "Uploading…" : doc ? "Replace document" : "Upload document"}
            </Button>
          </div>
        )}

        {/* Manual completion status for non-expiry categories */}
        {!isExpiryCat && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              Set completion status {category === "quiz" ? "" : "(evidence optional above)"}:
            </p>
            <div className="flex gap-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={s === "Verified" ? "success" : s === "Missing" ? "danger" : "secondary"}
                  onClick={async () => {
                    try {
                      await updateCompliance(worker.id, category, s);
                      toast(`${worker.name} · ${label} → ${s}`);
                      close();
                    } catch (err) {
                      toast(err.message || "Update failed", "error");
                    }
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
