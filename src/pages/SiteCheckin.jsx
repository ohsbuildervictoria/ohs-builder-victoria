import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { fetchCheckinInfo, performCheckin } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";

// A tradie scans the site poster and lands here to sign in for the day.
// Works whether or not they're logged in — a signed-in tradie is linked to
// their worker record; otherwise they enter their name. Mobile-first.
export default function SiteCheckin() {
  const { token } = useParams();
  const { user } = useAuth();
  const [info, setInfo] = useState(undefined); // undefined=loading, null=invalid
  const [name, setName] = useState("");
  const [done, setDone] = useState(null); // { name, date, alreadyCheckedIn }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const signedInName = user?.role === "worker" ? user?.name : "";

  useEffect(() => {
    let live = true;
    fetchCheckinInfo(token)
      .then((d) => live && setInfo(d))
      .catch(() => live && setInfo(null));
    return () => { live = false; };
  }, [token]);

  const onCheckin = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await performCheckin(token, signedInName || name);
      setDone(res);
    } catch (err) {
      setError(err.message || "Could not check you in.");
      setBusy(false);
    }
  };

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo />
        </div>

        {info === undefined && (
          <p className="py-8 text-center text-sm text-slate-500">Loading site…</p>
        )}

        {info === null && (
          <div className="py-6 text-center">
            <p className="text-3xl">⚠️</p>
            <h1 className="mt-2 text-lg font-bold text-slate-800">Sign-in code not recognised</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ask your site supervisor for the current sign-in poster.
            </p>
          </div>
        )}

        {info && done && (
          <div className="py-6 text-center">
            <p className="text-4xl">✅</p>
            <h1 className="mt-2 text-xl font-bold text-slate-800">
              {done.alreadyCheckedIn ? "Already signed in" : "You're signed in"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {done.name} · {info.projectName}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{today}</p>
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
              Have a safe day on site. Complete your induction and SWMS if you
              haven&apos;t already.
            </p>
          </div>
        )}

        {info && !done && (
          <>
            <div className="mb-5 rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-blue-700">Site sign-in</p>
              <p className="mt-0.5 text-lg font-bold text-blue-900">{info.projectName}</p>
              {info.address && <p className="text-sm text-slate-600">{info.address}</p>}
              <p className="mt-1 text-xs text-slate-500">{info.orgName} · {today}</p>
            </div>

            {!signedInName && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Your name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoCapitalize="words"
                  placeholder="e.g. Liam Nguyen"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>
            )}
            {signedInName && (
              <p className="mb-4 text-center text-sm text-slate-600">
                Signing in as <span className="font-semibold">{signedInName}</span>
              </p>
            )}

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={busy || (!signedInName && name.trim().length < 2)}
              onClick={onCheckin}
            >
              {busy ? "Signing in…" : "I'm on site today"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
