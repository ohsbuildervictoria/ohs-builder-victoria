import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { fetchEduInviteInfo, acceptEduInvite } from "../../lib/eduApi";
import { fetchPermissions, fetchProfile } from "../../lib/api";
import { homeRouteFor } from "../../lib/eduRoutes";
import Logo from "../../components/shared/Logo";
import Button from "../../components/ui/Button";
import { eduBrand, eduRoleLabels } from "../../data/education";

// ============================================================================
// /edu/join/:token — one page for every Education invitation (institution
// admin, assessor, student). Shows who invited them and for what, lets them
// create an account (or sign in if they already have one with that email),
// then claims the invite. For students the claim also builds their sandbox.
// ============================================================================

export default function EduJoin() {
  const { token } = useParams();
  const { user, logout } = useAuth();
  const [info, setInfo] = useState(undefined); // undefined=loading, null=invalid
  const [mode, setMode] = useState("signup");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    let alive = true;
    fetchEduInviteInfo(token)
      .then((d) => alive && setInfo(d || null))
      .catch(() => alive && setInfo(null));
    return () => { alive = false; };
  }, [token]);

  const roleLabel = eduRoleLabels[info?.role] || "member";
  const primary = info?.primaryColour || "#1e3a8a";

  const finish = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const profile = await fetchProfile(authUser.id);
    const perms = await fetchPermissions().catch(() => null);
    // Reload the app state from scratch so every context picks up the new role.
    window.location.assign(homeRouteFor(profile, perms));
  };

  const claim = async () => {
    const res = await acceptEduInvite(token);
    setDone(res);
    setTimeout(finish, 900);
  };

  const onSubmit = async (data) => {
    setError(null);
    setBusy(true);
    try {
      const creds = { email: (info?.email || "").trim(), password: data.password };
      if (mode === "signin") {
        const { error: e } = await supabase.auth.signInWithPassword(creds);
        if (e) throw new Error(/invalid login credentials/i.test(e.message) ? "Incorrect password for this email." : e.message);
      } else {
        const { data: d, error: e } = await supabase.auth.signUp({
          ...creds,
          options: { data: { name: info?.name || "" } },
        });
        if (e) throw new Error(e.message);
        if (!d.session) {
          // Obfuscated "user, no session" = that email is already registered.
          setMode("signin");
          throw new Error("An account with this email already exists — enter its password to sign in and accept the invitation.");
        }
      }
      await claim();
    } catch (err) {
      setError(err.message || "Could not accept this invitation.");
      setBusy(false);
    }
  };

  const onAcceptSignedIn = async () => {
    setError(null);
    setBusy(true);
    try {
      await claim();
    } catch (err) {
      setError(err.message || "Could not accept this invitation.");
      setBusy(false);
    }
  };

  const shell = (children) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="h-1.5" style={{ backgroundColor: primary }} />
          <div className="p-8">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          {eduBrand.productName} · {eduBrand.attribution}
        </p>
      </div>
    </div>
  );

  if (info === undefined) return shell(<p className="text-center text-sm text-slate-500">Checking your invitation…</p>);

  if (info === null) {
    return shell(
      <div className="text-center">
        <Logo />
        <h1 className="mt-4 text-xl font-bold text-slate-800">This invitation link isn't valid</h1>
        <p className="mt-2 text-sm text-slate-500">
          It may have been used already, or copied incompletely. Ask your institution to send a new one.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">Go to sign in →</Link>
      </div>
    );
  }

  if (info.claimed) {
    return shell(
      <div className="text-center">
        <Logo />
        <h1 className="mt-4 text-xl font-bold text-slate-800">This invitation has already been accepted</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with {info.email} to continue.</p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">Go to sign in →</Link>
      </div>
    );
  }

  if (done) {
    return shell(
      <div className="text-center">
        <p className="text-4xl" aria-hidden>✅</p>
        <h1 className="mt-3 text-xl font-bold text-slate-800">You're in</h1>
        <p className="mt-2 text-sm text-slate-500">
          {done.role === "student"
            ? "Your simulated construction site is ready. Taking you to your training…"
            : `Welcome to ${info.institutionName}. Taking you to your dashboard…`}
        </p>
      </div>
    );
  }

  const header = (
    <div className="text-center">
      {info.logoUrl ? (
        <img src={info.logoUrl} alt={`${info.institutionName} logo`} className="mx-auto max-h-14 max-w-[200px] object-contain" />
      ) : (
        <Logo />
      )}
      <p className="mt-4 text-xs font-bold uppercase tracking-wider" style={{ color: primary }}>
        {info.institutionName}
      </p>
      <h1 className="mt-1 text-xl font-bold text-slate-800">
        {info.role === "student" ? "You've been enrolled in a construction simulation" : `You're invited as ${roleLabel}`}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {info.role === "student" ? (
          <>
            {info.cohortName && <>Cohort <span className="font-medium text-slate-700">{info.cohortName}</span>. </>}
            {info.unitCode && <>Unit <span className="font-medium text-slate-700">{info.unitCode}</span>. </>}
            {info.scenarioTitle && <>Scenario <span className="font-medium text-slate-700">{info.scenarioTitle}</span>.</>}
          </>
        ) : (
          <>Set up your sign-in to get started. This invitation is for <span className="font-medium text-slate-700">{info.email}</span>.</>
        )}
      </p>
    </div>
  );

  // Signed in already with the right email: one click.
  if (user && user.email?.toLowerCase() === (info.email || "").toLowerCase()) {
    return shell(
      <>
        {header}
        <div className="mt-6 space-y-3">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
            You're signed in as {user.email}.
          </p>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <Button className="w-full" size="lg" disabled={busy} onClick={onAcceptSignedIn}>
            {busy ? "Setting things up…" : "Accept invitation"}
          </Button>
        </div>
      </>
    );
  }

  if (user) {
    return shell(
      <>
        {header}
        <div className="mt-6 space-y-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            You're signed in as <span className="font-medium">{user.email}</span>, but this invitation was issued to{" "}
            <span className="font-medium">{info.email}</span>. Sign out, then open the link again.
          </p>
          <Button className="w-full" variant="secondary" onClick={async () => { await logout(); window.location.reload(); }}>
            Sign out and continue
          </Button>
        </div>
      </>
    );
  }

  return shell(
    <>
      {header}
      <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {[{ v: "signup", l: "Create my password" }, { v: "signin", l: "I have an account" }].map((m) => (
          <button
            key={m.v}
            type="button"
            onClick={() => { setMode(m.v); setError(null); }}
            className={`rounded-md py-2 text-sm font-semibold transition-colors ${mode === m.v ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-700"}`}
          >
            {m.l}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input value={info.email} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {mode === "signup" ? "Choose a password" : "Password"}
          </label>
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Use at least 8 characters" },
            })}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy
            ? info.role === "student" ? "Building your site…" : "Setting things up…"
            : info.role === "student" ? "Start my simulation" : "Accept and continue"}
        </Button>
      </form>
      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">{eduBrand.disclaimer}</p>
    </>
  );
}
