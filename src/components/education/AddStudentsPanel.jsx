import { useRef, useState } from "react";
import Button from "../ui/Button";
import { useToast } from "../ui/Notification";
import { inputClass } from "./EduBits";
import { addStudents, eduJoinLink } from "../../lib/eduApi";
import { parseStudentCsv, studentCsvTemplate } from "../../data/education";

// ============================================================================
// Enrol students into a cohort — manual rows or CSV (upload or paste). Used by
// the setup wizard and the cohort page. Reports every row's outcome and hands
// back the invite links; the server (edu_add_students) owns all the checks.
// ============================================================================

const blankRow = () => ({ name: "", email: "" });

export default function AddStudentsPanel({ cohortId, cohortName, onAdded, compact = false }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [mode, setMode] = useState("manual");
  const [rows, setRows] = useState([blankRow(), blankRow(), blankRow()]);
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const parsedCsv = mode === "csv" ? parseStudentCsv(csvText) : [];
  const pending = mode === "manual" ? rows.filter((r) => r.email.trim()) : parsedCsv;

  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([studentCsvTemplate], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (!cohortId) { toast("Create a cohort first", "error"); return; }
    if (!pending.length) { toast("Add at least one student with an email", "error"); return; }
    setBusy(true);
    try {
      const res = await addStudents(Number(cohortId), pending.map((r) => ({ name: r.name.trim(), email: r.email.trim() })));
      setResult(res);
      toast(`${res.added} student${res.added === 1 ? "" : "s"} enrolled${res.skipped ? ` · ${res.skipped} skipped` : ""}`, res.added ? "success" : "warning");
      if (res.added) {
        setRows([blankRow(), blankRow(), blankRow()]);
        setCsvText("");
        onAdded?.(res);
      }
    } catch (err) {
      toast(err.message || "Could not enrol students", "error");
    } finally {
      setBusy(false);
    }
  };

  const copyAll = () => {
    const lines = (result?.rows || []).filter((r) => r.inviteToken).map((r) => `${r.name} <${r.email}>: ${eduJoinLink(r.inviteToken)}`);
    navigator.clipboard?.writeText(lines.join("\n"));
    toast("All invite links copied");
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <p className="text-sm text-slate-600">
          Each student gets a private invite link. When they open it they set a password and their own simulated construction site is built for them automatically.
          {cohortName && <> Enrolling into <span className="font-semibold text-slate-800">{cohortName}</span>.</>}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:max-w-xs">
        {[["manual", "Type them in"], ["csv", "CSV import"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)} className={`rounded-md py-1.5 text-sm font-semibold ${mode === v ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>

      {mode === "manual" ? (
        <div className="space-y-2">
          <div className="hidden grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid"><span>Name</span><span>Email</span></div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input className={inputClass} placeholder="Student name" value={r.name} onChange={(e) => setRow(i, "name", e.target.value)} />
              <input className={inputClass} type="email" placeholder="student@email.com" value={r.email} onChange={(e) => setRow(i, "email", e.target.value)} />
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows((rs) => [...rs, blankRow()])}>+ Another row</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>Upload CSV</Button>
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>Download template</Button>
            <span className="text-xs text-slate-500">Columns: name, email. Extra columns are ignored.</span>
          </div>
          <textarea rows={6} className={inputClass} placeholder={"name,email\nJordan Lee,jordan.lee@example.edu"} value={csvText} onChange={(e) => setCsvText(e.target.value)} />
          <p className="text-xs text-slate-500">{parsedCsv.length} student{parsedCsv.length === 1 ? "" : "s"} detected.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{pending.length} ready to enrol</span>
        <Button type="button" disabled={busy || !pending.length} onClick={submit}>{busy ? "Enrolling…" : `Enrol ${pending.length || ""} student${pending.length === 1 ? "" : "s"}`}</Button>
      </div>

      {result && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
            <p className="text-sm font-semibold text-slate-800">Result: {result.added} added · {result.skipped} skipped</p>
            {(result.rows || []).some((r) => r.inviteToken) && <Button size="sm" variant="secondary" onClick={copyAll}>Copy all invite links</Button>}
          </div>
          <ul className="divide-y divide-slate-100">
            {(result.rows || []).map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-800">{r.name || r.email}</span> <span className="text-xs text-slate-500">{r.email}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.status === "added" ? "bg-green-100 text-green-700" : r.status === "error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
                  {r.message && <span className="ml-2 text-xs text-slate-500">{r.message}</span>}
                </div>
                {r.inviteToken && !r.claimed && (
                  <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText(eduJoinLink(r.inviteToken)); toast("Invite link copied"); }}>Copy invite link</Button>
                )}
              </li>
            ))}
          </ul>
          <p className="px-4 py-2 text-xs text-slate-500">Send each student their link (email, LMS message or in class). Each works once and only for that email.</p>
        </div>
      )}
    </div>
  );
}
