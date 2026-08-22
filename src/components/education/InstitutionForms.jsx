import { useRef, useState } from "react";
import Button from "../ui/Button";
import { useToast } from "../ui/Notification";
import { Field, inputClass } from "./EduBits";
import { updateInstitution, uploadInstitutionLogo } from "../../lib/eduApi";
import { eduBrand, usablePrimary } from "../../data/education";

// ============================================================================
// Institution profile + branding forms — shared by the setup wizard and the
// Institution & branding settings page, so the two can never drift apart.
// `institution` is the mapped/JSON institution object (camelCase keys).
// ============================================================================

const PROFILE_FIELDS = [
  ["name", "Institution display name *", "e.g. Demo Training Institute", "Shown to students and assessors everywhere."],
  ["legalName", "Legal name", "e.g. Demo Training Institute Pty Ltd", ""],
  ["rtoNumber", "RTO number (if applicable)", "e.g. 12345", ""],
  ["website", "Website", "https://", ""],
  ["address", "Address", "Street, suburb, state, postcode", ""],
  ["contactName", "Main contact name", "", ""],
  ["contactEmail", "Main contact email", "name@institution.edu.au", ""],
  ["supportEmail", "Student support email", "support@institution.edu.au", "Students see this on their training dashboard."],
  ["department", "Department / faculty", "e.g. Building & Construction", ""],
  ["campus", "Main campus", "e.g. City campus", ""],
];

export function InstitutionProfileForm({ institution, onSaved, submitLabel = "Save", children }) {
  const toast = useToast();
  const [form, setForm] = useState(() =>
    Object.fromEntries(PROFILE_FIELDS.map(([k]) => [k, institution?.[k] || ""]))
  );
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.name.trim()) {
      toast("Give the institution a display name", "error");
      return;
    }
    setBusy(true);
    try {
      const saved = await updateInstitution(institution.id, form);
      toast("Institution details saved");
      onSaved?.(saved);
    } catch (err) {
      toast(err.message || "Could not save", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map(([k, label, ph, hint]) => (
          <Field key={k} label={label} hint={hint} className={k === "address" || k === "name" ? "sm:col-span-2" : ""}>
            <input className={inputClass} placeholder={ph} value={form[k]} onChange={set(k)} />
          </Field>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {children || <span />}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}

export function BrandingPreview({ name, logoUrl, primary, secondary }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="h-1.5 w-full" style={{ backgroundColor: primary }} />
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="max-h-8 max-w-[110px] object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: primary }}>
              {(name || "I").charAt(0)}
            </span>
          )}
          <div className="leading-tight">
            <p className="text-xs font-bold text-slate-800">{name || "Your institution"}</p>
            <p className="text-[10px] text-slate-500">{eduBrand.productName}</p>
          </div>
        </div>
        <span className="rounded-md px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: primary }}>Student view</span>
      </div>
      <div className="space-y-2 p-3">
        <div className="rounded-lg bg-white p-2 text-[11px] text-slate-600 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primary }}>My Training</p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200"><div className="h-1.5 w-1/3 rounded-full" style={{ backgroundColor: primary }} /></div>
          <div className="mt-2 flex gap-1">
            <span className="rounded px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: primary }}>Start task</span>
            <span className="rounded px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: secondary, color: "#0f172a" }}>Accent</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500">{eduBrand.attribution}</p>
      </div>
    </div>
  );
}

export function InstitutionBrandingForm({ institution, onSaved, submitLabel = "Save branding", children }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [logoUrl, setLogoUrl] = useState(institution?.logoUrl || "");
  const [primary, setPrimary] = useState(institution?.primaryColour || "#1e3a8a");
  const [secondary, setSecondary] = useState(institution?.secondaryColour || "#fbbf24");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onLogo = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("Choose an image file (PNG, JPG or SVG)", "error"); return; }
    if (file.size > 2 * 1024 * 1024) { toast("Logo must be under 2 MB", "error"); return; }
    setUploading(true);
    try {
      const url = await uploadInstitutionLogo(institution.id, file);
      setLogoUrl(url);
      toast("Logo uploaded");
      onSaved?.({ ...institution, logoUrl: url });
    } catch (err) {
      toast(err.message || "Could not upload logo", "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      const saved = await updateInstitution(institution.id, {
        primaryColour: primary,
        secondaryColour: secondary,
        onboarding: { ...(institution?.onboarding || {}), brandingSaved: true },
      });
      setPrimary(saved.primaryColour);
      setSecondary(saved.secondaryColour);
      toast("Branding saved");
      onSaved?.(saved, { advance: true });
    } catch (err) {
      toast(err.message || "Could not save", "error");
    } finally {
      setBusy(false);
    }
  };

  const colourField = (label, value, setValue, hint) => (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-slate-300" />
        <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} pattern="^#[0-9a-fA-F]{6}$" />
      </div>
    </Field>
  );

  return (
    <form onSubmit={save} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="Institution logo" hint="PNG, JPG or SVG, under 2 MB. It appears in the Education navigation, on the student and assessor screens and on evidence pack headers.">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="Current logo" className="max-h-12 max-w-[160px] rounded border border-slate-200 bg-white object-contain p-1" />}
            <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
            </Button>
          </div>
        </Field>
        {colourField("Primary colour", primary, setPrimary, "Navigation, buttons and progress bars.")}
        {usablePrimary(primary) !== String(primary || "").toLowerCase() && (
          <p className="-mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Adjusted for readability: shown as <span className="font-mono">{usablePrimary(primary)}</span> so white text stays legible on it.
          </p>
        )}
        {colourField("Secondary colour (accent)", secondary, setSecondary, "Used sparingly for highlights.")}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {children || <span />}
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Live preview</p>
        <BrandingPreview name={institution?.name} logoUrl={logoUrl} primary={usablePrimary(primary)} secondary={secondary} />
        <p className="mt-2 text-xs text-slate-500">
          Your branding flows into the Education navigation, the student training environment, the assessor environment, evidence pack headers and training/assessment records. OHS Builder Victoria attribution is retained.
        </p>
      </div>
    </form>
  );
}
