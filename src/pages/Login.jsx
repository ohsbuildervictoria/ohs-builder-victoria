import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { org, demoLoginRoles, brand } from "../data/mockData";

const BUILDER_ROLES = demoLoginRoles.filter((r) => r.role !== "worker");
const STAKEHOLDER_ROLE = demoLoginRoles.find((r) => r.role === "worker");

export default function Login() {
  const [mode, setMode] = useState("builder");
  const [demoRole, setDemoRole] = useState("builder_admin");
  const [inductionOpen, setInductionOpen] = useState(false);
  const [inductionAck, setInductionAck] = useState(false);
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });

  const routeFor = (user) =>
    user?.role === "worker" ? "/worker/home" : "/builder/dashboard";

  const guardInduction = () => {
    if (!inductionAck) {
      setInductionOpen(true);
      return false;
    }
    return true;
  };

  const onSubmit = (data) => {
    if (!guardInduction()) return;
    const fallbackRole = mode === "worker" ? "worker" : demoRole;
    const user = login(data.email, data.password, fallbackRole);
    navigate(routeFor(user));
  };

  const onDemo = () => {
    if (!guardInduction()) return;
    const role = mode === "worker" ? "worker" : demoRole;
    const user = loginDemo(role);
    navigate(routeFor(user));
  };

  const activeRoles = mode === "worker" ? [STAKEHOLDER_ROLE] : BUILDER_ROLES;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => setInductionOpen(true)}
          className="mb-4 w-full rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-center text-sm font-medium text-yellow-200 transition hover:bg-yellow-500/20"
        >
          Before you commence, refer to{" "}
          <span className="font-semibold underline">Builder Policy Site Induction</span>
          {inductionAck && (
            <span className="ml-2 text-green-300">✓ Acknowledged</span>
          )}
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-2xl font-bold text-slate-800">
              {brand.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{org.tagline}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {org.name} · {brand.domain}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { value: "builder", label: "Builder" },
              { value: "worker", label: "Stakeholder" },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setMode(m.value);
                  setDemoRole(m.value === "worker" ? "worker" : "builder_admin");
                }}
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === m.value
                    ? "bg-blue-900 text-white shadow"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Demo as
            </label>
            <select
              value={mode === "worker" ? "worker" : demoRole}
              onChange={(e) => setDemoRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none"
            >
              {activeRoles.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label} — {r.user}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                placeholder={
                  mode === "worker"
                    ? "liam.nguyen@tradie.com.au"
                    : "david@arlingtonhomes.com.au"
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg">
              {mode === "worker"
                ? "Enter Stakeholder Portal"
                : "Enter Builder Workspace"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button variant="gold" className="w-full" onClick={onDemo}>
            🚀 Continue in Demo Mode
          </Button>

          <p className="mt-6 text-center text-xs text-slate-400">
            Prototype demo — choose a role above. Data saves in this browser until
            you clear it.
          </p>
        </div>
      </div>

      <Modal
        open={inductionOpen}
        onClose={() => setInductionOpen(false)}
        title="Site Induction / Video / AI"
        footer={
          <Button
            disabled={!inductionAck}
            onClick={() => setInductionOpen(false)}
          >
            Continue
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-900 p-6 text-center text-white">
            <p className="text-3xl">▶</p>
            <p className="mt-2 text-sm font-medium">Site Induction Module</p>
            <p className="mt-1 text-xs text-slate-300">
              Video / AI-assisted induction — prototype placeholder
            </p>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
            <li>Read the {org.name} WHS Management Plan</li>
            <li>Understand emergency procedures and muster points</li>
            <li>Confirm PPE requirements for your trade</li>
            <li>Report hazards before work commences</li>
          </ul>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={inductionAck}
              onChange={(e) => setInductionAck(e.target.checked)}
              className="mt-0.5"
            />
            I have read and understood the Builder Policy Site Induction
          </label>
        </div>
      </Modal>
    </div>
  );
}
