import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";
import { brand } from "../data/constants";
import { workspaceState } from "../lib/workspace";
import { homeRouteFor } from "../lib/eduRoutes";

// Real builder signup — creates the account, a fresh organisation, and drops
// them into their own empty workspace. No pilot bypass, no shared data.
//
// Signup is two server steps (auth user, then the organisation RPC). If the
// second step fails the account is stranded — signed in, role 'worker', no
// organisation. This page (a) never navigates away from a failed attempt,
// and (b) offers "Finish workspace setup" to a stranded account: the same
// idempotent RPC, nothing else. See src/lib/workspace.js.
export default function Signup() {
  const { signup, finishWorkspace, user, permissions } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const state = workspaceState({ user, permissions });

  useEffect(() => {
    // Only bounce sessions that ARRIVE here already signed in and settled.
    // Never during a submit (SIGNED_IN fires while the organisation RPC is
    // still in flight) and never after an attempt on this page — a failed
    // attempt must show its error, not vanish into a wrong portal. A
    // stranded account stays here to finish setup.
    if (!user || submitting || attempted) return;
    if (state === "loading" || state === "missing_workspace") return;
    navigate(homeRouteFor(user, permissions), { replace: true });
  }, [user, permissions, state, submitting, attempted, navigate]);

  const onSubmit = async (data) => {
    setError(null);
    setSubmitting(true);
    setAttempted(true);
    try {
      await signup({
        email: data.email,
        password: data.password,
        name: data.name,
        orgName: data.orgName,
      });
      navigate("/builder/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not create your account.");
      setSubmitting(false);
    }
  };

  const onFinish = async (data) => {
    setError(null);
    setSubmitting(true);
    setAttempted(true);
    try {
      await finishWorkspace(data.orgName);
      navigate("/builder/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not finish setting up your workspace.");
      setSubmitting(false);
    }
  };

  if (state === "missing_workspace") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-6 flex flex-col items-center text-center">
              <Logo />
              <h1 className="mt-4 text-2xl font-bold text-slate-800">Finish setting up your workspace</h1>
              <p className="mt-1 text-sm text-slate-500">
                Your account ({user.email}) exists, but your company workspace wasn&apos;t created. Nothing is lost —
                enter the company name and we&apos;ll finish the last step.
              </p>
            </div>
            <form onSubmit={handleSubmit(onFinish)} className="space-y-4">
              <Field label="Company / builder name" error={errors.orgName}>
                <input
                  className="su-input"
                  placeholder="e.g. Northside Constructions"
                  {...register("orgName", { required: "Company name is required" })}
                />
              </Field>
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? "Finishing setup…" : "Finish workspace setup"}
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-slate-500">
              Invited by a builder as a tradie instead? Open the invite link they sent you.
            </p>
          </div>
        </div>
        <style>{`
          .su-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
          .su-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-2xl font-bold text-slate-800">
              Start your free trial
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Your own private OHS workspace — no card required.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Your name" error={errors.name}>
              <input
                className="su-input"
                autoComplete="name"
                {...register("name", { required: "Name is required" })}
              />
            </Field>
            <Field label="Company / builder name" error={errors.orgName}>
              <input
                className="su-input"
                placeholder="e.g. Northside Constructions"
                {...register("orgName", { required: "Company name is required" })}
              />
            </Field>
            <Field label="Work email" error={errors.email}>
              <input
                type="email"
                className="su-input"
                autoComplete="email"
                placeholder="you@company.com.au"
                {...register("email", { required: "Email is required" })}
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <input
                type="password"
                className="su-input"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Use at least 8 characters" },
                })}
              />
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Creating your workspace…" : "Create my workspace"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link className="font-medium text-blue-700 hover:underline" to="/login">
              Log in
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          {brand.fullName} · {brand.domain}
        </p>
      </div>

      <style>{`
        .su-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.5rem 0.75rem; font-size:0.875rem; }
        .su-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
