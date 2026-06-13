import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/shared/Logo";
import Button from "../components/ui/Button";
import { org } from "../data/mockData";

export default function Login() {
  const [mode, setMode] = useState("builder"); // "builder" | "worker"
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

  const onSubmit = (data) => {
    const fallbackRole = mode === "worker" ? "worker" : "builder_admin";
    const user = login(data.email, data.password, fallbackRole);
    navigate(routeFor(user));
  };

  const onDemo = () => {
    const user = loginDemo(mode === "worker" ? "worker" : "builder_admin");
    navigate(routeFor(user));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Induction banner */}
        <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-center text-sm font-medium text-yellow-200">
          Before you commence, refer to{" "}
          <span className="font-semibold underline">
            Builder Policy Site Induction
          </span>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-4 text-2xl font-bold text-slate-800">
              OH&amp;S Builder Victoria
            </h1>
            <p className="mt-1 text-sm text-slate-500">{org.tagline}</p>
          </div>

          {/* Role toggle */}
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
                placeholder={
                  mode === "worker"
                    ? "liam.nguyen@tradie.com.au"
                    : "daniel@hartleyco.com.au"
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

          <p className="mt-6 text-center text-xs text