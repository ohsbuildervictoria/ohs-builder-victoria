import { useState } from "react";
import { useForm } from "react-hook-form";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import StatCard from "../../components/ui/StatCard";
import RoleBadge from "../../components/shared/RoleBadge";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import { useToast } from "../../components/ui/Notification";
import { useProjects } from "../../hooks/useProjects";
import { useAppContext } from "../../context/AppContext";
import { roleLabels, permissionMatrix } from "../../data/constants";
import { updateProfileStatus, insertInvite } from "../../lib/api";

const formatLastLogin = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function AdminPortal() {
  const { projects } = useProjects();
  const { profiles, setProfiles, invites, setInvites } = useAppContext();
  const toast = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  // Real accounts + recorded invitations, shown together.
  const users = [
    ...profiles.map((p) => ({ ...p, lastLogin: formatLastLogin(p.lastLogin) })),
    ...invites,
  ];

  const roleCounts = users.reduce(
    (acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }),
    {}
  );

  const toggleStatus = async (u) => {
    if (String(u.id).startsWith("invite-")) {
      toast("This person hasn't accepted their invite yet", "warning");
      return;
    }
    const status = u.status === "Active" ? "Deactivated" : "Active";
    try {
      await updateProfileStatus(u.id, status);
      setProfiles((prev) =>
        prev.map((p) => (p.id === u.id ? { ...p, status } : p))
      );
      toast(`${u.name} ${status.toLowerCase()}`);
    } catch (err) {
      toast(err.message || "Update failed", "error");
    }
  };

  const onInvite = async (data) => {
    try {
      const created = await insertInvite({
        name: data.name,
        email: data.email,
        role: data.role,
      });
      setInvites((prev) => [...prev, created]);
      toast(
        `Invitation recorded for ${data.email} — account is provisioned by your administrator`
      );
      reset();
      setInviteOpen(false);
    } catch (err) {
      toast(err.message || "Could not record invitation", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin Portal</h1>
          <p className="text-sm text-slate-500">
            Platform users, roles and permissions
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>+ Invite Stakeholder</Button>
      </div>

      {/* Roles summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Builder Admin" value={roleCounts.builder_admin || 0} tone="blue" />
        <StatCard label="HSE Manager" value={roleCounts.hse_manager || 0} tone="blue" />
        <StatCard label="Site Supervisor" value={roleCounts.site_supervisor || 0} tone="blue" />
        <StatCard label="Stakeholder / Tradie" value={roleCounts.worker || 0} tone="green" />
      </div>

      {/* Users table */}
      <Card>
        <CardHeader title="Platform Users" />
        <CardBody className="pt-2">
          <Table>
            <THead
              columns={["Name", "Email", "Role", "Status", "Last Login", "Actions"]}
            />
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-slate-800">{u.name}</TD>
                  <TD>{u.email}</TD>
                  <TD>
                    <RoleBadge role={u.role} />
                  </TD>
                  <TD>
                    <Badge status={u.status === "Active" ? "Active" : u.status === "Invited" ? "Invited" : "On Hold"}>
                      {u.status}
                    </Badge>
                  </TD>
                  <TD>{u.lastLogin}</TD>
                  <TD>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toast(`Editing ${u.name}`)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={u.status === "Active" ? "danger" : "success"}
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      {/* Permission matrix */}
      <Card>
        <CardHeader title="Role Permission Matrix" subtitle="Read-only reference" />
        <CardBody className="pt-2">
          <Table>
            <THead
              columns={["Feature", ...permissionMatrix.roles.map((r) => roleLabels[r])]}
            />
            <TBody>
              {permissionMatrix.features.map((f) => (
                <TR key={f}>
                  <TD className="font-medium text-slate-700">{f}</TD>
                  {permissionMatrix.grid[f].map((allowed, idx) => (
                    <TD key={idx}>
                      {allowed ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-slate-300">✕</span>
                      )}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Stakeholder"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onInvite)}>Send Invite</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onInvite)}>
          <Field label="Name">
            <input className="adm-input" {...register("name", { required: true })} />
          </Field>
          <Field label="Email">
            <input type="email" className="adm-input" {...register("email", { required: true })} />
          </Field>
          <Field label="Role">
            <select className="adm-input" {...register("role", { required: true })}>
              {Object.entries(roleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project assignment">
            <select className="adm-input" {...register("project")}>
              <option value="All">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </form>
      </Modal>

      <style>{`
        .adm-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .adm-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
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
