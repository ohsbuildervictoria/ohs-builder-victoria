import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import { Table, THead, TBody, TR, TD } from "../../components/ui/Table";
import Logo from "../../components/shared/Logo";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchPlatformOverview,
  fetchPlatformOrgs,
  fetchPlatformUsers,
} from "../../lib/api";
import { roleLabels } from "../../data/constants";
import { fetchPlatformInstitutions, createInstitution, eduJoinLink } from "../../lib/eduApi";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Notification";

// Education institutions — created here by the platform operator; the first
// Institution Admin receives an invite link (copy it or email it yourself).
function InstitutionsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", adminName: "", adminEmail: "", isDemo: false });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchPlatformInstitutions()
      .then((r) => alive && setRows(r || []))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [reload]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await createInstitution(form);
      setCreated({ ...form, link: eduJoinLink(res.inviteToken) });
      setOpen(false);
      setForm({ name: "", adminName: "", adminEmail: "", isDemo: false });
      setReload((k) => k + 1);
    } catch (e) {
      toast(e.message || "Could not create institution", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Education institutions"
        subtitle="Training organisations using OHS Builder Education. Each has its own admins, assessors, cohorts and student sandboxes."
        action={<Button size="sm" onClick={() => setOpen(true)}>+ New institution</Button>}
      />
      <CardBody className="overflow-x-auto pt-2">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No institutions yet.</p>
        ) : (
          <Table>
            <THead columns={["ID", "Institution", "RTO", "Type", "Admins", "Assessors", "Cohorts", "Students", "First admin", "Created"]} />
            <TBody>
              {rows.map((i) => (
                <TR key={i.id}>
                  <TD>#{i.id}</TD>
                  <TD className="font-medium text-slate-800">{i.name}</TD>
                  <TD>{i.rto_number || "—"}</TD>
                  <TD>{i.is_demo ? <Badge status="Pending">Demo</Badge> : <Badge status="Active">Customer</Badge>}</TD>
                  <TD>{i.admins}</TD>
                  <TD>{i.assessors}</TD>
                  <TD>{i.cohorts}</TD>
                  <TD>{i.students}</TD>
                  <TD>
                    {i.first_admin_email}
                    {i.pending_admin_token && (
                      <button
                        className="ml-2 text-xs font-medium text-blue-700 hover:underline"
                        onClick={() => { navigator.clipboard?.writeText(eduJoinLink(i.pending_admin_token)); toast("Invite link copied"); }}
                      >
                        Copy invite link
                      </button>
                    )}
                  </TD>
                  <TD>{fmtDate(i.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="New education institution"
        footer={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy || !form.name || !form.adminEmail} onClick={submit}>{busy ? "Creating…" : "Create and get invite link"}</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          {[["name", "Institution name", "e.g. Demo Training Institute"], ["adminName", "First administrator's name", ""], ["adminEmail", "First administrator's email", "admin@institution.edu.au"]].map(([k, label, ph]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder={ph}
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={form.isDemo} onChange={(e) => setForm((f) => ({ ...f, isDemo: e.target.checked }))} />
            Demo / internal institution (excluded from customer counts)
          </label>
        </div>
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Institution created" footer={<Button onClick={() => setCreated(null)}>Done</Button>}>
        {created && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>Send <span className="font-semibold">{created.adminName || created.adminEmail}</span> this private link. They open it once to set a password, then they run <span className="font-semibold">{created.name}</span> through the Education dashboard.</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="break-all font-mono text-xs text-slate-700">{created.link}</p></div>
            <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(created.link); toast("Invite link copied"); }}>Copy link</Button>
            <p className="text-xs text-slate-500">The link works once and only for {created.adminEmail}.</p>
          </div>
        )}
      </Modal>
    </Card>
  );
}

// ============================================================================
// Platform Administration — the operator's view across every organisation.
//
// Everything here is READ. The page holds no privilege of its own: each RPC
// is refused by the database unless the signed-in auth user is on the
// platform_admins allow-list, and every call is written to the audit log.
// Account metadata only — no passwords, hashes or tokens exist anywhere in
// this data path.
// ============================================================================

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-AU", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "never";

export default function PlatformAdmin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInternal, setShowInternal] = useState(true);

  const [reloadKey, setReloadKey] = useState(0);

  // Subscribe to the platform RPCs; state lands in .then callbacks.
  useEffect(() => {
    let alive = true;
    Promise.all([fetchPlatformOverview(), fetchPlatformOrgs(), fetchPlatformUsers()])
      .then(([ov, os, us]) => {
        if (!alive) return;
        setOverview(ov);
        setOrgs(os);
        setUsers(us);
      })
      .catch((err) => {
        if (alive) setError(err.message || "Could not load platform data");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const visibleOrgs = showInternal ? orgs : orgs.filter((o) => !o.is_internal);
  const visibleUsers = showInternal ? users : users.filter((u) => !u.org_is_internal);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Minimal standalone shell — this page sits outside any tenant workspace. */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <Logo light />
          <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-900">
            Platform Admin
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-300 sm:inline">{user?.email}</span>
          <Link to="/builder/dashboard" className="font-medium text-slate-300 hover:text-white">
            Workspace
          </Link>
          <button
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="font-medium text-slate-300 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Platform overview</h1>
            <p className="text-sm text-slate-500">
              Every organisation and account on OHS Builder Victoria. Read-only;
              every view here is recorded in the audit log.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
              />
              Show internal QA
            </label>
            <Button
              size="sm"
              variant="secondary"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setError(null);
                setReloadKey((k) => k + 1);
              }}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {/access required/i.test(error) && (
              <span className="block pt-1 text-xs">
                This account is not on the platform administrator allow-list, or
                migration 016 has not been applied yet.
              </span>
            )}
          </div>
        )}

        {overview && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Organisations" value={overview.organisations} tone="blue"
                sub={`${overview.customerOrgs} customer · ${overview.internalOrgs} internal QA`} />
              <StatCard label="Total Users" value={overview.totalUsers} tone="blue"
                sub={`${overview.usersSignedInEver} have signed in`} />
              <StatCard label="Online Now" value={overview.onlineNow} tone="green"
                sub="heartbeat in the last 5 minutes" />
              <StatCard label="Active (24h)" value={overview.active24h}
                sub={`${overview.active7d} in 7d · ${overview.active30d} in 30d`} />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Total Projects" value={overview.totalProjects} />
              <StatCard label="Active Projects" value={overview.activeProjects} tone="green" />
              <StatCard label="Pending Invitations" value={overview.pendingInvites} tone="amber" />
              <StatCard label="Customer Organisations" value={overview.customerOrgs} tone="blue" />
            </div>
          </>
        )}

        <InstitutionsPanel />

        <Card>
          <CardHeader
            title="Organisations"
            subtitle="Tenant workspaces — internal QA orgs and Education sandboxes are isolated from customer data and excluded from customer counts"
          />
          <CardBody className="overflow-x-auto pt-2">
            <Table>
              <THead columns={["ID", "Organisation", "Type", "Plan", "Users", "Workers", "Projects (active)", "Pending invites", "Created"]} />
              <TBody>
                {visibleOrgs.map((o) => (
                  <TR key={o.id}>
                    <TD>#{o.id}</TD>
                    <TD className="font-medium text-slate-800">{o.name}</TD>
                    <TD>
                      {o.is_internal ? (
                        <Badge status="Pending">Internal QA</Badge>
                      ) : (
                        <Badge status="Active">Customer</Badge>
                      )}
                    </TD>
                    <TD>{o.plan}</TD>
                    <TD>{o.user_count}</TD>
                    <TD>{o.worker_count}</TD>
                    <TD>{o.project_count} ({o.active_project_count})</TD>
                    <TD>{o.pending_invites}</TD>
                    <TD>{fmtDate(o.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Users"
            subtitle="Every account across every organisation — metadata only, no credentials exist in this view"
          />
          <CardBody className="overflow-x-auto pt-2">
            <Table>
              <THead columns={["Name", "Email", "Role", "Organisation", "Status", "Confirmed", "Last sign-in", "Online", "Welcome", "Created"]} />
              <TBody>
                {visibleUsers.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium text-slate-800">
                      {u.name || "—"}
                      {u.is_platform_admin && (
                        <span className="ml-1.5 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-800">
                          PLATFORM
                        </span>
                      )}
                    </TD>
                    <TD>{u.email}</TD>
                    <TD>{roleLabels[u.role] || u.role}</TD>
                    <TD>
                      {u.organization_name
                        ? `#${u.organization_id} ${u.organization_name}${u.org_is_internal ? " (QA)" : ""}`
                        : <span className="font-semibold text-amber-600">no organisation</span>}
                    </TD>
                    <TD><Badge status={u.status || "Active"}>{u.status || "Active"}</Badge></TD>
                    <TD>{u.email_confirmed ? "✓" : "—"}</TD>
                    <TD>{fmtDateTime(u.auth_last_sign_in || u.last_login)}</TD>
                    <TD>{u.online_now ? <Badge status="Active">online</Badge> : fmtDateTime(u.last_seen)}</TD>
                    <TD>{u.sees_welcome ? "✓" : "✕"}</TD>
                    <TD>{fmtDate(u.created_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="mt-3 text-xs text-slate-400">
              “Online” = presence heartbeat within the last 5 minutes (sent by the
              app every 2 minutes while a session is open). “Last sign-in” comes
              from the auth system. “Welcome” shows whether the account’s
              permission set includes the Welcome page.
            </p>
          </CardBody>
        </Card>

        {overview?.recentAudit?.length > 0 && (
          <Card>
            <CardHeader title="Recent platform activity" subtitle="Latest entries in the security audit log (all organisations)" />
            <CardBody className="space-y-2 pt-2">
              {overview.recentAudit.map((a, i) => (
                <div key={i} className="flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-2 text-sm last:border-0">
                  <span className="font-medium text-slate-800">{a.actor_name || "system"}</span>
                  <span className="text-xs text-slate-500">({a.actor_role})</span>
                  <span className="text-slate-600">{a.action}</span>
                  <span className="text-xs text-slate-400">{a.table_name}</span>
                  <span className="ml-auto text-xs text-slate-400">{fmtDateTime(a.occurred_at)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}
