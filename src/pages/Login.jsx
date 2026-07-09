import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";
import { brand } from "../data/constants";

export default function Login() {
  const [mode, setMode] = useState("builder");
  const [authError, setAuthError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { login, resetPassword, user } = useAuth();
  const navigate = useNavigate();

  // Already signed in (including via the temporary pilot bypass —
  // see src/lib/pilotBypass.js): go straight to the workspace.
  useEffect(() => {
    if (user) {
      navigate(user.role === "worker" ? "/worker/home" : "/builder/dashboard", {
        replace: true,
      });
    }
  }, [user, navigate]);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });

  const routeFor = (user) =>
    user?.role === "worker" ? "/worker/home" : "/builder/dashboard";

  const onSubmit = async (data) => {
    setAuthError(null);
    setSubmitting(true);
    try {
      const user = await login(data.email, data.password);
      navigate(routeFor(user));
    } catch (err) {
      setAuthError(
        /invalid login credentials/i.test(err.message)
          ? "Incorrect email or password."
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    const email = getValues("email");
    if (!email) {
      setAuthError("Enter your email above first, then click Forgot password.");
      return;
    }
    setAuthError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-2xl font-bold text-slate-800">
              {brand.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{brand.tagline}</p>
            <p className="mt-0.5 text-xs text-slate-400">{brand.domain}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { value: "builder", label: "Builder" },
              { value: "worker", label: "Stakeholder" },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com.au"
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
                autoComplete="current-password"
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

            {authError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                {authError}
              </p>
            )}
            {resetSent && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                Password reset email sent — check your inbox.
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting
                ? "Signing in…"
                : mode === "worker"
                  ? "Enter Stakeholder Portal"
                  : "Enter Builder Workspace"}
            </Button>
          </form>

          <button
            type="button"
            onClick={onForgotPassword}
            className="mt-4 w-full text-center text-xs font-medium text-blue-700 hover:underline"
          >
            Forgot password?
          </button>

          <p className="mt-6 text-center text-xs text-slate-400">
            New builder?{" "}
            <a className="font-medium text-blue-700 hover:underline" href="/signup">
              Start a free trial
            </a>
            {" · "}
            Stakeholders sign in{" "}
            <a className="font-medium text-blue-700 hover:underline" href="/stakeholder">
              here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
