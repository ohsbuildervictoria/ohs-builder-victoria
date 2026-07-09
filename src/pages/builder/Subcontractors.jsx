import { useState } from "react";
import Card, { CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import { useCompanies } from "../../hooks/useCompanies";
import { useDocuments } from "../../hooks/useDocuments";
import { useToast } from "../../components/ui/Notification";
import { useForm } from "react-hook-form";
import {
  companyDocCategories,
  docExpiryStatus,
  overallStatus,
} from "../../lib/compliance";

// ============================================================================
// Subcontractor company register — the "Subcontractors" tab on the Compliance
// page. A subbie company (e.g. "Scope Plumbing") holds business-level details
// (ABN, contact, insurance certificates); its workers sit underneath with
// their own personal tickets. The company's Public Liability certificate IS
// each crew member's Insurance status in the matrix.
// ============================================================================

export default function SubbiePanel({ onAddWorker }) {
  const { companies, docsFor, workersOf, removeCompany } = useCompanies();
  const { docsFor: workerDocsFor } = useDocuments();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // company | "new" | null
  const [certModal, setCertModal] = useState(null); // { company, catKey }
  const [removing, setRemoving] = useState(null); // company | null
  const [busy, setBusy] = useState(false);

  const onRemove = async () => {
    setBusy(true);
    try {
      await removeCompany(removing);
      toast(`${removing.name} removed`);
      setRemoving(null);
    } catch (err) {
      toast(err.message || "Could not remove company", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Each subbie company holds its own ABN and insurance — its workers keep
          their personal tickets (White Card, induction, medical) underneath.
        </p>
        <Button onClick={() => setEditing("new")}>+ Add Company</Button>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-sm font-medium text-slate-600">No subbie companies yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
              Add the companies you engage (plumbers, sparkies, chippies). Their
              insurance lives on the company; each of their workers holds their
              own White Card and induction.
            </p>
            <Button className="mt-4" onClick={() => setEditing("new")}>
              + Add your first company
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {companies.map((c) => {
            const docs = docsFor(c.id);
            const crew = workersOf(c.id);
            const contact = [c.contactName, c.contactPhone, c.contactEmail]
              .filter(Boolean)
              .join(" · ");
            return (
              <Card key={c.id}>
                <CardBody className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">{c.name}</h3>
                      <p className="text-xs text-slate-500">
                        {c.abn ? `ABN ${c.abn}` : "ABN not recorded"}
                      </p>
                      {contact && <p className="mt-0.5 text-xs text-slate-500">{contact}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setRemoving(c)}>
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Company insurance certificates */}
                  <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Company insurance
                    </p>
                    {companyDocCategories.map((cat) => {
                      const doc = docs[cat.key] || null;
                      return (
                        <div key={cat.key} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-700">{cat.label}</p>
                            {doc?.expiry && (
                              <p className="text-xs text-slate-400">Expires {doc.expiry}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge status={docExpiryStatus(doc)} icon />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setCertModal({ company: c, catKey: cat.key })}
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-slate-400">
                      The Public Liability certificate covers this company&apos;s whole
                      crew — it shows as each worker&apos;s Insurance in the matrix.
                    </p>
                  </div>

                  {/* Crew */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Workers ({crew.length})
                      </p>
                      <Button size="sm" variant="secondary" onClick={() => onAddWorker?.(c)}>
                        + Add worker
                      </Button>
                    </div>
                    {crew.length === 0 ? (
                      <p className="text-sm text-slate-400">No workers added yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {crew.map((w) => (
                          <li key={w.id} className="flex items-center justify-between gap-2 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-700">{w.name}</p>
                              <p className="truncate text-xs text-slate-400">{w.trade}</p>
                            </div>
                            <Badge status={overallStatus(w, workerDocsFor(w.id))} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <CompanyFormModal company={editing} onClose={() => setEditing(null)} />

      <Modal
        open={!!certModal}
        onClose={() => setCertModal(null)}
        title={
          certModal
            ? `${companyDocCategories.find((x) => x.key === certModal.catKey)?.label} — ${certModal.company.name}`
            : ""
        }
        footer={<Button variant="secondary" onClick={() => setCertModal(null)}>Close</Button>}
      >
        {certModal && (
          <CertControls company={certModal.company} catKey={certModal.catKey} onDone={() => setCertModal(null)} />
        )}
      </Modal>

      {/* Remove confirmation — plain language about what actually happens */}
      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.name}?` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" onClick={onRemove} disabled={busy}>
              {busy ? "Removing…" : "Remove company"}
            </Button>
          </>
        }
      >
        {removing && (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              This removes the company record and its insurance certificates.
            </p>
            <p>
              Its {workersOf(removing.id).length} worker
              {workersOf(removing.id).length === 1 ? "" : "s"} stay in the system,
              but they&apos;ll no longer be covered by the company&apos;s insurance —
              their Insurance status will show as Missing until sorted.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Add / edit company details
// ----------------------------------------------------------------------------
function CompanyFormModal({ company, onClose }) {
  const { addCompany, updateCompany } = useCompanies();
  const toast = useToast();
  const isNew = company === "new";
  const form = useForm({
    values: isNew
      ? { name: "", abn: "", contactName: "", contactPhone: "", contactEmail: "" }
      : {
          name: company?.name || "",
          abn: company?.abn || "",
          contactName: company?.contactName || "",
          contactPhone: company?.contactPhone || "",
          contactEmail: company?.contactEmail || "",
        },
  });

  const onSave = async (data) => {
    try {
      if (isNew) {
        await addCompany(data);
        toast(`${data.name} added`);
      } else {
        await updateCompany(company.id, data);
        toast(`${data.name} updated`);
      }
      onClose();
    } catch (err) {
      toast(err.message || "Could not save company", "error");
    }
  };

  return (
    <Modal
      open={!!company}
      onClose={onClose}
      title={isNew ? "Add Subbie Company" : `Edit ${company?.name || ""}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={form.handleSubmit(onSave)}>
            {isNew ? "Add company" : "Save changes"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSave)}>
        <FormField label="Company name *">
          <input
            className="cmp-input"
            placeholder="e.g. Scope Plumbing Pty Ltd"
            {...form.register("name", { required: true })}
          />
        </FormField>
        <FormField label="ABN">
          <input
            className="cmp-input"
            inputMode="numeric"
            placeholder="11 digits"
            {...form.register("abn")}
          />
        </FormField>
        <FormField label="Contact person">
          <input className="cmp-input" {...form.register("contactName")} />
        </FormField>
        <FormField label="Contact phone">
          <input type="tel" className="cmp-input" {...form.register("contactPhone")} />
        </FormField>
        <FormField label="Contact email">
          <input
            type="email"
            className="cmp-input"
            autoCapitalize="none"
            {...form.register("contactEmail")}
          />
        </FormField>
      </form>
    </Modal>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

// ----------------------------------------------------------------------------
// Upload / view / replace / remove one company certificate. Also used by the
// compliance-matrix cell modal when a crew member's Insurance cell is clicked.
// ----------------------------------------------------------------------------
export function CertControls({ company, catKey, onDone }) {
  const { docsFor, uploadDoc, removeDoc, open } = useCompanies();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);

  const label = companyDocCategories.find((x) => x.key === catKey)?.label || catKey;
  const doc = docsFor(company.id)[catKey] || null;
  const status = docExpiryStatus(doc);
  const today = new Date().toISOString().slice(0, 10);

  const onUpload = async () => {
    if (!file) return toast("Choose a file first", "warning");
    if (!expiry) return toast("Add the expiry date shown on the certificate", "warning");
    setBusy(true);
    try {
      await uploadDoc({ companyId: company.id, category: catKey, file, expiry });
      toast(`${label} uploaded for ${company.name}`);
      setFile(null);
      setExpiry("");
      onDone?.();
    } catch (err) {
      toast(err.message || "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const onView = async () => {
    try {
      window.open(await open(doc), "_blank", "noopener");
    } catch (err) {
      toast(err.message || "Could not open certificate", "error");
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await removeDoc(doc);
      toast(`${label} removed`);
      onDone?.();
    } catch (err) {
      toast(err.message || "Could not remove certificate", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-500">Current status:</span>
        <Badge status={status} icon />
      </div>

      {doc && (
        <div className="rounded-lg border border-slate-200 p-3 text-sm">
          <p className="font-medium text-slate-800">{doc.fileName}</p>
          {doc.expiry && <p className="text-xs text-slate-500">Expires {doc.expiry}</p>}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={onView}>View / Download</Button>
            <Button size="sm" variant="danger" onClick={onRemove} disabled={busy}>Remove</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {doc ? "Replace certificate" : "Upload certificate"}
        </p>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
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
        <Button onClick={onUpload} disabled={busy}>
          {busy ? "Uploading…" : doc ? "Replace certificate" : "Upload certificate"}
        </Button>
      </div>
    </div>
  );
}
