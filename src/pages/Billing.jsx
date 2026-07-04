import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { fetchSubscription, startCheckout, BILLING_ENFORCED } from "../lib/billing";
import { brand } from "../data/constants";

const PLAN = {
  name: "Professional",
  price: "$149",
  cadence: "per month · billed via Stripe",
  features: [
    "Unlimited projects and stakeholders",
    "SWMS library (75 Victorian trades) with digital sign-off",
    "Incident, near-miss and corrective-action tracking",
    "Site diary, toolbox meetings and LTIFR reporting",
    "Compliance matrix with site-access control",
  ],
};

// Subscription / paywall screen (feature/auth-billing — not live in the pilot).
export default function Billing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSubscription().then(setSub);
  }, []);

  const onSubscribe = async () => {
    setError(null);
    setBusy(true);
    try {
      await startCheckout();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-bold text-slate-800">
            {sub?.status === "active" ? "Your subscription" : "Activate your workspace"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as {user?.email}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-semibold text-slate-800">{PLAN.name}</p>
            <p>
              <span className="text-2xl font-bold text-slate-800">{PLAN.price}</span>
              <span className="ml-1 text-xs text-slate-500">{PLAN.cadence}</span>
            </p>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
            {PLAN.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-green-600">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {sub?.status === "active" ? (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Subscription active
            {sub.raw?.current_period_end &&
              ` — renews ${new Date(sub.raw.current_period_end).toLocaleDateString("en-AU")}`}
            .
            <Button className="mt-3 w-full" onClick={() => navigate("/builder/dashboard")}>
              Open workspace
            </Button>
          </div>
        ) : (
          <>
            <Button className="mt-5 w-full" size="lg" onClick={onSubscribe} disabled={busy}>
              {busy ? "Opening checkout…" : "Subscribe with Stripe"}
            </Button>
            {!BILLING_ENFORCED && (
              <p className="mt-2 text-center text-xs text-amber-600">
                Billing enforcement is currently off (VITE_BILLING_ENFORCED).
              </p>
            )}
          </>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
          <button onClick={logout} className="hover:underline">
            Sign out
          </button>
          <a className="hover:underline" href={`mailto:${brand.supportEmail}`}>
            {brand.supportEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
