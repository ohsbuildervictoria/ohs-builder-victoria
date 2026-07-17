import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import { fetchStaffInviteInfo } from "../lib/api";
import { roleLabels } from "../data/constants";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";

// Invited staff (Builder Admin / HSE Manager / Site Supervisor) open the link
// their admin sent them, see who invited them and as what, and set a password.
// The invite is bound to one email address — the accept RPC enforces it.
export default function JoinStaff() {
  const { token } = useParams();
  const { joinAsStaff, user } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState(undefined); // undefined=loading, null=invalid
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState("signup"); // signup | signin
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (user && (user.role === "builder_admin" || user.role === "hse_manager" || user.role === "site_supervisor")) {
      navigate("/builder/dashboard", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let live = true;
    fetchStaffInviteInfo(token)
      .then((data) => live && setInfo(data))
      .catch(() => live && setInfo(null));
    return () => { live = false; };
  }, [token]);

  const onSubmit = async (data) => {
    setError(null);
    setSubmitting(true);
    try {
      await joinAsStaff({ token, email: info.email, password: data.password, mode });
      navigate("/builder/dashboard", { replace: true });
    } catch (err) {
      if (err.message === "ALREADY_REGISTERED") {
        setMode("signin");
        setError("This email already has an account — enter its password to sign in and accept the invite.");
      } else {
        setError(err.message || "Could not set up your account.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo />
        </div>

        {info === undefined && (
          <p className="py-8 text-center text-sm text-slate-500">Loading your invite…</p>
        )}

        {info === null && (
          <div className="py-6 text-center">
            <p className="text-3xl">🔗</p>
            <h1 className="mt-2 text-lg font-bold text-slate-800">Invite not found</h1>
            <p className="mt-1 text-sm text-slate-500">
              This link is invalid or has already been used. Ask your
              administrator for a new one.
            </p>
          </div>
        )}

        {info && info.claimed && (
          <div className="py-6 text-center">
            <p className="text-3xl">✅</p>
            <h1 className="mt-2 text-lg font-bold text-slate-800">Already set up</h1>
            <p className="mt-1 text-sm text-slate-500">
              This invite has already been used. Sign in with your email instead.
            </p>
            <Button className="mt-4 w-full" onClick={() => navigate("/login")}>
              Go to sign-in
            </Button>
          </div>
        )}

        {info && !info.claimed && (
          <>
            <div className="mb-5 rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-blue-700">
                You&apos;ve been invited to join
              </p>
              <p className="mt-0.5 text-lg font-bold text-blue-900">{info.orgName}</p>
              <p className="mt-1 text-sm text-slate-600">
                as <span className="font-medium">{roleLabels[info.role] || info.role}</span>
              </p>
            </div>

            <h1 className="mb-1 text-center text-lg font-bold text-slate-800">
              {mode === "signin" ? "Sign in to accept" : "Set up your account"}
            </h1>
            <p className="mb-4 text-center text-sm text-slate-500">
              {mode === "signin"
                ? "Use this email's existing password."
                : "You'll use this to sign in and manage your sites."}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Your email
                </label>
                <input
                  type="email"
                  className="join-input bg-slate-50 text-slate-500"
                  value={info.email}
                  readOnly
                />
                <p className="mt-1 text-xs text-slate-400">
                  This invite only works for this email address.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {mode === "signin" ? "Your password" : "Create a password"}
                </label>
                <input
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="join-input"
                  placeholder={mode === "signin" ? "Your existing password" : "At least 8 characters"}
                  {...register("password", {
                    required: "Password is required",
                    ...(mode === "signup"
                      ? { minLength: { value: 8, message: "Use at least 8 characters" } }
                      : {}),
                  })}
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting
                  ? "Setting up…"
                  : mode === "signin" ? "Sign in & accept invite" : "Set up & continue"}
              </Button>

              <button
                type="button"
                className="w-full text-center text-xs text-slate-500 underline"
                onClick={() => { setError(null); setMode(mode === "signin" ? "signup" : "signin"); }}
              >
                {mode === "signin" ? "New here? Create a password instead" : "Already have an account? Sign in"}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .join-input { width:100%; border-radius:0.5rem; border:1px solid #cbd5e1; padding:0.625rem 0.75rem; font-size:1rem; }
        .join-input:focus { outline:none; border-color:#1e3a8a; box-shadow:0 0 0 1px #1e3a8a; }
      `}</style>
    </div>
  );
}
