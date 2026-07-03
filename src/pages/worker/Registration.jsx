import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../hooks/useAuth";
import { useWorkers } from "../../hooks/useWorkers";
import Tabs from "../../components/ui/Tabs";
import Badge from "../../components/ui/Badge";
import { useToast } from "../../components/ui/Notification";

const TABS = ["Personal", "Emergency", "Vehicle & Quals", "Documents"];

const DOCUMENTS = [
  { name: "White Card", file: "white-card.jpg", date: "2026-05-20", status: "Verified" },
  { name: "Insurance Certificate", file: "insurance.pdf", date: "2026-05-22", status: "Verified" },
  { name: "Medical Clearance", file: "medical.pdf", date: "2026-06-01", status: "Pending" },
  { name: "Other", file: "", date: "—", status: "Pending" },
];

export default function Registration() {
  const { user } = useAuth();
  const { getWorker, workers } = useWorkers();
  const worker = getWorker(user?.workerId ?? workers[0]?.id);
  const toast = useToast();
  const [tab, setTab] = useState("Personal");

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: worker?.name?.split(" ")[0] || "",
      surname: worker?.name?.split(" ").slice(1).join(" ") || "",
      trade: worker?.trade || "",
      employer: worker?.employer || "",
      email: user?.email || "",
    },
  });

  const onSave = () => toast("Profile saved");

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
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toast("Document upload is coming in the next release", "warning")}
              className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-slate-300 py-8 text-center hover:border-blue-900"
            >
              <span className="text-2xl">📤</span>
              <span className="mt-1 text-sm font-medium text-slate-700">
                Upload Document
              </span>
              <span className="text-xs text-slate-400">Coming in the next release</span>
            </button>
            {DOCUMENTS.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{d.name}</p>
                  <p className="text-xs text-slate-500">
                    {d.file || "Not uploaded"} {d.file ? `· ${d.date}` : ""}
                  </p>
                </div>
                <Badge status={d.status === "Verified" ? "Verified" : "Pending"}>
                  {d.status === "Verified" ? "Verified" : "Pending review"}
                </Badge>
              </div>
            ))}
          </div>
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
