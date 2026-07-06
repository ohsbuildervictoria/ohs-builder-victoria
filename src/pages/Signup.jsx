import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";
import { brand } from "../data/constants";

// Real builder signup — creates the account, a fresh organisation, and drops
// them into their own empty workspace. No pilot bypass, no shared data.
export default function Signup() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (user) navigate("/builder/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (data) => {
    setError(null);
    setSubmitting(true);
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
