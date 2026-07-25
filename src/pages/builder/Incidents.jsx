import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import Card, { CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Tabs from "../../components/ui/Tabs";
import Modal from "../../components/ui/Modal";
import AuditTrail from "../../components/shared/AuditTrail";
import BodyMap from "../../components/shared/BodyMap";
import EmailReportModal from "../../components/shared/EmailReportModal";
import { useIncidents } from "../../hooks/useIncidents";
import { useProjects } from "../../hooks/useProjects";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui/Notification";
import { useAuth } from "../../hooks/useAuth";
import { exportIncidentReport } from "../../lib/pdf";
import { PhotoPicker, PhotoStrip } from "../../components/shared/RecordPhotos";
import { usePhotos } from "../../hooks/usePhotos";
import {
  incidentTypeValues,
  incidentSeverityValues,
  incidentTypePurpose,
  incidentSeverityMeaning,
  legacyIncidentTypes,
  legacyIncidentSeverities,
  incidentLifecycle,
  correctiveActionStatuses,
} from "../../data/constants";

const TABS = ["All Incidents", "Near Miss", "WorkSafe Notifiable"];

// Evaluated once per page load. Incidents are reports of things that already
// happened — cap the picker at the end of today (local time).
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const TODAY_LOCAL = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const MAX_INCIDENT_DATETIME = `${TODAY_LOCAL}T23:59`;

export default function Incidents() {
  const { incidents, addIncident, updateStatus, editIncident, addCorrectiveAction, updateCorrectiveAction } = useIncidents();
  const { projects } = useProjects();
  const { org, audits } = useAppContext();
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("All Incidents");
  const [typeFilter, setTypeFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [actionFor, setActionFor] = useState(null);
  const [editing, setEditing] = useState(null); // incident being corrected
  // Body-diagram marks live outside react-hook-form (it registers inputs, and
  // this is a tap-on-a-picture control). Reset alongside the form.
  const [bodyMarks, setBodyMarks] = useState([]);
  const [editBodyMarks, setEditBodyMarks] = useState([]);
  // BodyMap owns its marks internally; bumping these keys remounts it, which
  // is how the diagram is cleared for a new report or loaded for an edit.
  const [bodyMapKey, setBodyMapKey] = useState(0);
  const [emailing, setEmailing] = useState(null); // incident being emailed

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const actionForm = useForm();
  const editForm = useForm();

  const openEdit = (i) => {
    editForm.reset({
      type: i.type, date: i.date, severity: i.severity, status: i.status,
      description: i.description, location: i.location, involved: i.involved,
      immediateAction: i.immediateAction, lostTime: i.lostTime,
    });
    setEditBodyMarks(i.bodyMap || []);
    setBodyMapKey((k) => k + 1);
    setEditing(i);
  };

  const onSaveEdit = async (data) => {
    try {
      const changed = await editIncident(editing.id, {
        type: data.type, date: (data.date || "").slice(0, 10), severity: data.severity,
        status: data.status, description: data.description, location: data.location,
        involved: data.involved, immediateAction: data.immediateAction,
        lostTime: !!data.lostTime, bodyMap: editBodyMarks,
      });
      toast(changed ? "Incident corrected — change logged" : "No changes to save");
      setEditing(null);
    } catch (err) {
      toast(err.message || "Could not save the correction", "error");
    }
  };

  // Apply tab + pill filters.
  let visible = incidents;
  if (tab === "Near Miss") visible = visible.filter((i) => i.type === "Near Miss");
  if (tab === "WorkSafe Notifiable") visible = visible.filter((i) => i.notifiable);
  if (typeFilter !== "All") visible = visible.filter((i) => i.type === typeFilter);

  const hasNotifiable = incidents.some((i) => i.notifiable);

  const { addPhotos } = usePhotos();
  const [photoFiles, setPhotoFiles] = useState([]);

  const onCreate = async (data) => {
    try {
      const saved = await addIncident({
        ...data,
        date: (data.date || "").slice(0, 10),
        projectId: Number(data.project) || null,
        reportedBy: user?.name || "Unknown",
        bodyMap: bodyMarks,
      });
      if (saved?.queued) {
        // Dead spot: the report syncs automatically; photos need signal.
        toast(
          photoFiles.length
            ? "No signal — report saved on this device and will send automatically. Photos need signal: re-attach them once you're back online."
            : "No signal — report saved on this device and will send automatically when you're back online.",
          "warning"
        );
      } else if (photoFiles.length) {
        const { saved: ok, failed } = await addPhotos("incident", saved.id, photoFiles);
        if (failed) toast(`Incident logged, but ${failed} photo${failed === 1 ? "" : "s"} failed to upload — try them again`, "error");
        else toast(`Incident logged with ${ok} photo${ok === 1 ? "" : "s"}`);
      } else {
        toast("Incident logged");
      }
      reset();
      setPhotoFiles([]);
      setBodyMarks([]);
      setBodyMapKey((k) => k + 1);
      setCreateOpen(false);
    } catch (err) {
      toast(err.message || "Could not log incident", "error");
    }
  };

  const onAddAction = async (data) => {
    try {
      await addCorrectiveAction(actionFor, {
        description: data.description,
        assignedTo: data.assignedTo,
        due: data.due,
      });
      toast("Corrective action assigned");
      actionForm.reset();
      setActionFor(null);
    } catch (err) {
      toast(err.message || "Could not assign action", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Incident Reporting</h1>
          <p className="text-sm text-slate-500">
            Log, investigate and close out site incidents
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/builder/incidents/near-miss">
            <Button variant="secondary">Near Miss Register</Button>
          </Link>
          <Button variant="danger" onClick={() => setCreateOpen(true)}>
            + Create New Incident
          </Button>
        </div>
      </div>

      {hasNotifiable && (tab === "All Incidents" || tab === "WorkSafe Notifiable") && (
        <div className="rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          🚨 This incident must be reported to WorkSafe Victoria immediately. Call
          000 if emergency.
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Type pills */}
      <div className="flex flex-wrap gap-2">
        {["All", ...incidentTypeValues].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              typeFilter === t
                ? "bg-blue-900 text-white"
                : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length ? (
          visible.map((i) => (
            <Card key={i.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge status={i.severity}>{i.type}</Badge>
                      {i.notifiable && (
                        <Badge status="Critical">WorkSafe Notifiable</Badge>
                      )}
                      {i.lostTime && <Badge status="High">Lost Time</Badge>}
                      <Badge status={i.status} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {i.description}
                    </p>
                    <p className="text-xs text-slate-500">
                      {i.project} · Reported by {i.reportedBy} · {i.date}
                      {i.location ? ` · ${i.location}` : ""}
                    </p>
                    <PhotoStrip entity="incident" entityId={i.id} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={i.status}
                      onChange={(e) =>
                        updateStatus(i.id, e.target.value).catch((err) =>
                          toast(err.message || "Update failed", "error")
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                    >
                      {incidentLifecycle.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(i)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setActionFor(i.id)}>
                        + Corrective Action
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await exportIncidentReport({ org, incident: i, audits });
                            toast("Incident report downloaded");
                          } catch (err) {
                            toast(err.message || "Could not build the report", "error");
                          }
                        }}
                      >
                        Download PDF
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEmailing(i)}>
                        ✉️ Send PDF
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Corrective actions */}
                {i.correctiveActions?.length > 0 && (
                  <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Corrective Actions
                    </p>
                    {i.correctiveActions.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-slate-700">{a.description}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          {a.assignedTo}
                          {a.due ? ` · due ${a.due}` : ""}
                          {/* An action you can't close isn't tracking — it's a
                              list that only grows. */}
                          <select
                            value={a.status}
                            onChange={(e) =>
                              updateCorrectiveAction(i.id, a.id, { status: e.target.value })
                                .then(() => toast(`Action marked ${e.target.value}`))
                                .catch((err) => toast(err.message || "Update failed", "error"))
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                            aria-label={`Status of corrective action: ${a.description}`}
                          >
                            {correctiveActionStatuses.map((st) => (
                              <option key={st}>{st}</option>
                            ))}
                          </select>
                          <Badge status={a.status} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Where it happened on the body — the same figure the
                    reporter tapped, and the same one the PDF carries. */}
                {i.bodyMap?.length > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Injury location
                    </p>
                    <BodyMap value={i.bodyMap} readOnly compact />
                  </div>
                )}

                <AuditTrail entity="incident" entityId={i.id} />
              </CardBody>
            </Card>
          ))
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">
            No incidents match this filter.
          </p>
        )}
      </div>

      {/* Create incident modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Incident"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleSubmit(onCreate)}>
              Log Incident
            </Button>
          </>
        }
      >
        <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(onCreate)}>
          <Field label="Incident type">
            <select
              className="modal-input"
              defaultValue=""
              {...register("type", { required: "Choose what happened" })}
            >
              <option value="" disabled>— Select incident type —</option>
              {incidentTypeValues.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Hint text={incidentTypePurpose[watch("type")]} />
            {errors.type && (
              <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>
            )}
          </Field>
          <Field label="Date / time">
            <input
              type="datetime-local"
              className="modal-input"
              max={MAX_INCIDENT_DATETIME}
              {...register("date", {
                required: true,
                validate: (v) =>
                  (v || "").slice(0, 10) <= TODAY_LOCAL ||
                  "Incident date can't be in the future",
              })}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
            )}
          </Field>
          <Field label="Project">
            <select className="modal-input" {...register("project", { required: true })}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location on site">
            <input className="modal-input" {...register("location")} />
          </Field>
          <Field label="Severity">
            <select
              className="modal-input"
              defaultValue=""
              {...register("severity", { required: "Grade the consequence" })}
            >
              <option value="" disabled>— Select severity —</option>
              {incidentSeverityValues.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Hint text={incidentSeverityMeaning[watch("severity")]} />
            {errors.severity && (
              <p className="mt-1 text-xs text-red-500">{errors.severity.message}</p>
            )}
          </Field>
          <Field label="Injured / involved person">
            <input className="modal-input" {...register("involved")} />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <textarea
                rows={2}
                className="modal-input"
                {...register("description", { required: "Description required" })}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
              )}
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Witnesses">
              <input className="modal-input" {...register("witnesses")} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Immediate action taken">
              <textarea rows={2} className="modal-input" {...register("immediateAction")} />
            </Field>
          </div>
          <div className="col-span-2">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5" {...register("lostTime")} />
              <span>
                <span className="font-medium">Lost-time injury</span> — the person
                could not return to their next scheduled shift (counts toward LTIFR)
              </span>
            </label>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              If the incident involved death, immediate hospital treatment, or a
              dangerous occurrence, it must be notified to WorkSafe Victoria
              (13 23 60) immediately — set the type to{" "}
              <span className="font-semibold">Notifiable (WorkSafe)</span>.
            </p>
          </div>
          <div className="col-span-2">
            <FieldGroup label="Where on the body (if someone was hurt)">
              <BodyMap key={`new-${bodyMapKey}`} value={bodyMarks} onChange={setBodyMarks} />
            </FieldGroup>
          </div>
          <div className="col-span-2">
            <PhotoPicker files={photoFiles} onChange={setPhotoFiles} />
          </div>
        </form>
      </Modal>

      {/* Correct an incident — records "edited by X, was: Y" */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Correct incident"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={editForm.handleSubmit(onSaveEdit)}>Save correction</Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          Corrections are logged with your name and the previous value — incident
          records are correctable but never silently overwritten.
        </p>
        <form className="grid grid-cols-2 gap-4" onSubmit={editForm.handleSubmit(onSaveEdit)}>
          <Field label="Incident type">
            <select className="modal-input" {...editForm.register("type")}>
              {optionsFor(incidentTypeValues, legacyIncidentTypes, editing?.type).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Hint text={incidentTypePurpose[editForm.watch("type")]} />
          </Field>
          <Field label="Date">
            <input type="date" max={TODAY_LOCAL} className="modal-input"
              {...editForm.register("date", { validate: (v) => (v || "").slice(0,10) <= TODAY_LOCAL || "Can't be in the future" })} />
          </Field>
          <Field label="Severity">
            <select className="modal-input" {...editForm.register("severity")}>
              {optionsFor(incidentSeverityValues, legacyIncidentSeverities, editing?.severity).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Hint text={incidentSeverityMeaning[editForm.watch("severity")]} />
          </Field>
          <Field label="Status">
            <select className="modal-input" {...editForm.register("status")}>
              {incidentLifecycle.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Location on site">
            <input className="modal-input" {...editForm.register("location")} />
          </Field>
          <Field label="Injured / involved person">
            <input className="modal-input" {...editForm.register("involved")} />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <textarea rows={2} className="modal-input" {...editForm.register("description")} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Immediate action taken">
              <textarea rows={2} className="modal-input" {...editForm.register("immediateAction")} />
            </Field>
          </div>
          <div className="col-span-2">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5" {...editForm.register("lostTime")} />
              <span><span className="font-medium">Lost-time injury</span> (counts toward LTIFR)</span>
            </label>
          </div>
          <div className="col-span-2">
            <FieldGroup label="Where on the body">
              <BodyMap key={`edit-${editing?.id}-${bodyMapKey}`} value={editBodyMarks} onChange={setEditBodyMarks} />
            </FieldGroup>
          </div>
        </form>
      </Modal>

      {/* Corrective action modal */}
      <Modal
        open={!!actionFor}
        onClose={() => setActionFor(null)}
        title="Assign Corrective Action"
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionFor(null)}>
              Cancel
            </Button>
            <Button onClick={actionForm.handleSubmit(onAddAction)}>Assign</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={actionForm.handleSubmit(onAddAction)}>
          <Field label="Action description">
            <input
              className="modal-input"
              {...actionForm.register("description", { required: true })}
            />
          </Field>
          <Field label="Assigned to (role)">
            <select className="modal-input" {...actionForm.register("assignedTo")}>
              <option>Site Supervisor</option>
              <option>HSE Manager</option>
              <option>Builder Admin</option>
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" className="modal-input" {...actionForm.register("due", { required: true })} />
          </Field>
        </form>
      </Modal>

      {/* Email one incident report as a PDF (same document as Download PDF) */}
      <EmailReportModal
        open={!!emailing}
        onClose={() => setEmailing(null)}
        kind="incident_report"
        title={emailing ? `Incident #${emailing.id} report` : "incident report"}
        summary={
          emailing
            ? `${emailing.type} · ${emailing.severity} severity · ${emailing.project} · ${emailing.date}${emailing.notifiable ? " · NOTIFIABLE to WorkSafe Victoria" : ""}`
            : ""
        }
        build={() =>
          exportIncidentReport({ org, incident: emailing, audits, mode: "attach" })
        }
      />

      <style>{`
        .modal-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .modal-input:focus { outline: none; border-color: #1e3a8a; box-shadow: 0 0 0 1px #1e3a8a; }
      `}</style>
    </div>
  );
}

// One-line explanation of the option currently selected. The whole point of a
// severity scale is that two supervisors grade the same event the same way,
// which only works if the definition is in front of them as they choose.
function Hint({ text }) {
  if (!text) return null;
  return <p className="mt-1 text-xs leading-snug text-slate-500">{text}</p>;
}

// Incidents recorded before the current scale keep their original wording — a
// safety record is corrected deliberately, not silently re-graded by a
// dropdown that no longer offers the value it was filed under.
function optionsFor(current, legacy, value) {
  if (value && !current.includes(value) && legacy.includes(value)) {
    return [...current, value];
  }
  return current;
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

// Same look as Field, but a <div> rather than a <label>.
//
// This is not cosmetic. A click anywhere inside a <label> is forwarded by the
// browser to the first labelable element it contains. Wrapping the body
// diagram in a <label> therefore meant that every tap after the first also
// "pressed" the ✕ button of mark 1 — so a second injury added a mark and
// silently deleted the first, and the diagram could never hold more than one
// point. Group controls that aren't a single input belong in a div.
function FieldGroup({ label, children }) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}
