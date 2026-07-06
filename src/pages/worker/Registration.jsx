import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import { useDocuments } from "../../hooks/useDocuments";
import Tabs from "../../components/ui/Tabs";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/Notification";
import {
  complianceCategories,
  categoryStatus,
  EXPIRY_CATEGORIES,
} from "../../lib/compliance";

const TABS = ["Personal", "Emergency", "Vehicle & Quals", "Documents"];

// Order tradies see their documents in (expiry-bound ones first).
const DOC_ORDER = ["whiteCard", "insurance", "medical", "induction", "swms"];
const labelFor = (key) => complianceCategories.find((c) => c.key === key)?.label || key;

export default function Registration() {
  const { user, isBuilder } = useAuth();
  const { getWorker, workers, saveProfile } = useWorkers();
  const worker = getWorker(user?.workerId ?? (isBuilder ? workers[0]?.id : null));
  const toast = useToast();
  const [tab, setTab] = useState("Personal");

  // Saved profile values win, but blanks never clobber the worker-record
  // defaults. `values` (not defaultValues) so the form fills in once the
  // worker record loads; keepDirtyValues protects in-progress edits.
  const savedProfile = Object.fromEntries(
    Object.entries(worker?.profile || {}).filter(([, v]) => v !== "")
  );
  const { register, handleSubmit } = useForm({
    values: {
      firstName: worker?.name?.split(" ")[0] || "",
      surname: worker?.name?.split(" ").slice(1).join(" ") || "",
      trade: worker?.trade || "",
      employer: worker?.employer || "",
      email: user?.email || "",
      ...savedProfile,
    },
    resetOptions: { keepDirtyValues: true },
  });

  const onSave = async (data) => {
    if (!worker?.id) return;
    try {
      await saveProfile(worker.id, data);
      toast("Profile saved");
    } catch (err) {
      toast(err.message || "Could not save profile", "error");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
      <p className="text-sm text-slate-500">Stakeholder registration &amp; documents</p>

      <div className="mt-3 overflow-x-auto scrollbar-thin">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <form onSubmit={handleSubmit(onSave)} className="mt-4 space-y-4">
        {tab === "Personal" && (
          <>
            <Field label="First Name">
              <input className="w-input" {...register("firstName")} />
            </Field>
            <Field label="Surname">
              <input className="w-input" {...register("surname")} />
            </Field>
            <Field label="Date of Birth">
              <input type="date" className="w-input" {...register("dob")} />
            </Field>
            <Field label="Phone">
              <input className="w-input" {...register("phone")} />
            </Field>
            <Field label="Email">
              <input type="email" className="w-input" {...register("email")} />
            </Field>
            <Field label="Home Address">
              <input className="w-input" {...register("address")} />
            </Field>
            <Field label="Trade">
              <input className="w-input" {...register("trade")} />
            </Field>
            <Field label="Employer">
              <input className="w-input" {...register("employer")} />
            </Field>
          </>
        )}

        {tab === "Emergency" && (
          <>
            <Field label="Contact Name">
              <input className="w-input" {...register("ecName")} />
            </Field>
            <Field label="Relationship">
              <input className="w-input" {...register("ecRelationship")} />
            </Field>
            <Field label="Phone">
              <input className="w-input" {...register("ecPhone")} />
            </Field>
            <Field label="Alternate Phone">
              <input className="w-input" {...register("ecAltPhone")} />
            </Field>
          </>
        )}

        {tab === "Vehicle & Quals" && (
          <>
            <Field label="White Card Number">
              <input className="w-input" {...register("whiteCardNo")} />
            </Field>
            <Field label="Licence Number">
              <input className="w-input" {...register("licenceNo")} />
            </Field>
            <Field label="Licence Expiry">
              <input type="date" className="w-input" {...register("licenceExpiry")} />
            </Field>
            <Field label="Vehicle Rego (optional)">
              <input className="w-input" {...register("rego")} />
            </Field>
            <Field label="Additional Qualifications">
              <textarea rows={3} className="w-input" {...register("quals")} />
            </Field>
          </>
        )}

        {tab === "Documents" && (
          <DocumentsTab worker={worker} />
        )}

        {tab !== "Documents" && (
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white"
          >
            Save
          </button>
        )}
      </form>

      <style>{`
        .w-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .w-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

// Tradie document list — reads the SAME records (useDocuments + categoryStatus)
// that the builder compliance matrix reads, so the two views never diverge.
function DocumentsTab({ worker }) {
  const { docsFor, upload, open } = useDocuments();
  const toast = useToast();
  const docs = worker ? docsFor(worker.id) : {};

  if (!worker) {
    return <p className="py-8 text-center text-sm text-slate-400">No stakeholder record.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Upload a photo or PDF of each document. White Card, Insurance and Medical
        need an expiry date so we can warn you before they lapse.
      </p>
      {DOC_ORDER.map((key) => (
        <DocumentRow
          key={key}
          worker={worker}
          categoryKey={key}
          doc={docs[key] || null}
          upload={upload}
          open={open}
          toast={toast}
        />
      ))}
    </div>
  );
}

function DocumentRow({ worker, categoryKey, doc, upload, open, toast }) {
  const [file, setFile] = useState(null);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const status = categoryStatus(worker, categoryKey, doc);
  const isExpiryCat = EXPIRY_CATEGORIES.includes(categoryKey);
  const today = new Date().toISOString().slice(0, 10);

  const onUpload = async () => {
    if (!file) return toast("Choose a file first", "warning");
    if (isExpiryCat && !expiry) return toast("Add the expiry date shown on the document", "warning");
    setBusy(true);
    try {
      await upload(worker.id, categoryKey, file, isExpiryCat ? expiry : null);
      toast(`${labelFor(categoryKey)} uploaded`);
      setFile(null);
      setExpiry("");
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
      toast(err.message || "Could not open document", "error");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">{labelFor(categoryKey)}</p>
          {doc ? (
            <p className="text-xs text-slate-500">
              {doc.fileName}
              {doc.expiry ? ` · expires ${doc.expiry}` : ""}
            </p>
          ) : (
            <p className="text-xs text-slate-400">No file uploaded yet</p>
          )}
        </div>
        <Badge status={status} icon />
      </div>

      <div className="mt-3 space-y-2">
        {doc && (
          <Button type="button" size="sm" variant="secondary" onClick={onView}>
            View / Download
          </Button>
        )}
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        {isExpiryCat && (
          <input
            type="date"
            min={today}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-input"
            aria-label={`${labelFor(categoryKey)} expiry date`}
          />
        )}
        <Button type="button" size="sm" onClick={onUpload} disabled={busy}>
          {busy ? "Uploading…" : doc ? "Replace" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
