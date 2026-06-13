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
import {
  users as seedUsers,
  roleCounts,
  roleLabels,
  permissionMatrix,
} from "../../data/mockData";

export default function AdminPortal() {
  const { projects } = useProjects();
  const toast = useToast();
  const [users, setUsers] = useState(seedUsers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const toggleStatus = (id) =>
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "Active" ? "Deactivated" : "Active" }
          : u
      )
    );

  const onInvite = (data) => {
    setUsers((prev) => [
      ...prev,
      {
        id: prev.reduce((m, u) => Math.max(m, u.id), 0) + 1,
        name: data.name,
        email: data.email,
        role: data.role,
        status: "Invited",
        lastLogin: "—",
        projects: data.project === "All" ? "All" : [Number(data.project)],
      },
    ]);
    toast(`Invitation sent to ${data.email}`);
    reset();
    setInviteOpen(false);
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
        <StatCard label="Builder Admin" value={roleCounts.builder_admin} tone="blue" />
        <StatCard label="HSE Manager" value={roleCounts.hse_manager} tone="blue" />
        <StatCard label="Site Supervisor" value={roleCounts.site_supervisor} tone="blue" />
        <StatCard label="Stakeholder / Tradie" value={roleCounts.worker} tone="green" />
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
                        onClick={() => toggleStatus(u.id)}
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
 