import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";
import { brand } from "../data/constants";

// Tradie sign-in: the email + password they set up via their invite link.
export default function StakeholderLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // A tradie already signed in on this device goes straight to their site.
  useEffect(() => {
    if (user?.role === "worker" && user?.workerId) {
      navigate("/worker/home", { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const profile = await login(username.trim(), password);
      navigate(profile.role === "worker" ? "/worker/home" : "/builder/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Could not sign you in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-bold text-slate-800">
            Worker Sign-in
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with the email and password you set up from your invite link.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="you@email.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Enter Site Portal"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Got an invite link from your builder? Open it to set up your account.
          No account yet? Ask your builder, or contact{" "}
          <a
            className="font-medium text-blue-700 hover:underline"
            href={`mailto:${brand.supportEmail}`}
          >
            {brand.supportEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
