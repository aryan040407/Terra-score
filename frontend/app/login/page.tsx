"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Landmark,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sprout,
  TreePine,
  Wheat,
} from "lucide-react";
import { DEMO_USERS, getRoleRedirect, login, type UserRole } from "@/lib/auth";

const DEMOS: {
  role: UserRole;
  title: string;
  email: string;
  password: string;
  icon: typeof Sprout;
  tone: string;
}[] = [
  {
    role: "farmer",
    title: "Farmer",
    email: "farmer@terrascore.in",
    password: "farmer123",
    icon: Sprout,
    tone: "green",
  },
  {
    role: "lender",
    title: "Lender",
    email: "lender@terrascore.in",
    password: "lender123",
    icon: Landmark,
    tone: "blue",
  },
  {
    role: "government",
    title: "Government",
    email: "govt@terrascore.in",
    password: "govt123",
    icon: Building2,
    tone: "purple",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const session = login(email, password);

    if (!session) {
      setLoading(false);
      setError("Invalid email or password. Use one of the demo accounts below.");
      return;
    }

    router.push(getRoleRedirect(session.role));
  }

  function loginAs(role: UserRole) {
    const demo = DEMO_USERS.find((user) => user.role === role);
    if (!demo) return;

    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
    setLoading(true);

    const session = login(demo.email, demo.password);
    if (session) router.push(getRoleRedirect(session.role));
    else setLoading(false);
  }

  return (
    <main className="min-h-screen bg-charcoal-50 lg:grid lg:grid-cols-2">
      {/* LEFT — farmer / climate story */}
      <section className="relative hidden min-h-screen overflow-hidden bg-forest-950 lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/terrascore-login-hero.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-transparent to-forest-950/10" />

        <div className="relative z-10 flex min-h-screen flex-col justify-between p-10 xl:p-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/15 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-md">
              <ShieldCheck size={14} className="text-emerald-300" />
              Climate intelligence for agriculture
            </div>
          </div>

          <div className="max-w-xl pb-2">
            <div className="mb-5 flex items-center gap-2 text-emerald-200">
              <TreePine size={22} />
              <span className="text-sm font-semibold uppercase tracking-[0.18em]">
                TerraScore
              </span>
            </div>

            <h1 className="text-5xl font-semibold leading-[1.03] tracking-tight text-white xl:text-6xl">
              Stronger farmers.
              <br />
              <span className="text-emerald-300">Greener tomorrow.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/75 xl:text-lg">
              Turn rainfall, soil and crop signals into clear climate-risk
              intelligence — helping people make better decisions before risk
              becomes loss.
            </p>

            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {[
                [Wheat, "Better", "decisions"],
                [Sprout, "Healthier", "farms"],
                [TreePine, "Climate", "resilience"],
              ].map(([Icon, top, bottom]) => {
                const I = Icon as typeof Wheat;
                return (
                  <div
                    key={String(top)}
                    className="rounded-2xl border border-white/15 bg-black/15 p-4 backdrop-blur-md"
                  >
                    <I size={20} className="text-emerald-300" />
                    <p className="mt-3 text-sm font-semibold text-white">
                      {String(top)}
                    </p>
                    <p className="text-xs text-white/55">{String(bottom)}</p>
                  </div>
                );
              })}
            </div>

            <p className="mt-7 text-sm italic text-white/55">
              “Data today, safer harvests tomorrow.”
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT — authentication */}
      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-800 shadow-glow">
              <Leaf className="text-emerald-300" size={28} />
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-charcoal-950">
              Welcome to TerraScore
            </h2>
            <p className="mt-2 text-sm text-charcoal-500">
              Sign in to access your climate intelligence portal
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-charcoal-100 bg-white p-6 shadow-card sm:p-8"
          >
            <label className="label">Email</label>
            <div className="relative mt-2">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                className="h-12 w-full rounded-xl border border-charcoal-200 bg-white pl-11 pr-4 text-sm text-charcoal-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <label className="label">Password</label>
              <button
                type="button"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                onClick={() =>
                  setError("Demo mode: use one of the demo passwords below.")
                }
              >
                Forgot password?
              </button>
            </div>

            <div className="relative mt-2">
              <LockKeyhole
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-12 w-full rounded-xl border border-charcoal-200 bg-white pl-11 pr-12 text-sm text-charcoal-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-charcoal-400 hover:bg-charcoal-50 hover:text-charcoal-700"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-700/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-charcoal-100" />
            <span className="text-xs text-charcoal-400">or try a demo account</span>
            <div className="h-px flex-1 bg-charcoal-100" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {DEMOS.map((demo) => {
              const Icon = demo.icon;
              return (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => loginAs(demo.role)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card ${
                    demo.tone === "green"
                      ? "border-emerald-100 bg-emerald-50/60"
                      : demo.tone === "blue"
                        ? "border-blue-100 bg-blue-50/60"
                        : "border-purple-100 bg-purple-50/60"
                  }`}
                >
                  <Icon
                    size={20}
                    className={
                      demo.tone === "green"
                        ? "text-emerald-600"
                        : demo.tone === "blue"
                          ? "text-blue-600"
                          : "text-purple-600"
                    }
                  />
                  <p className="mt-3 text-sm font-semibold text-charcoal-900">
                    {demo.title}
                  </p>
                  <p className="mt-1 truncate text-[10px] text-charcoal-500">
                    {demo.email}
                  </p>
                  <p className="mt-2 text-[10px] font-medium text-charcoal-400">
                    Demo access
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-charcoal-400">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Different perspectives. A common goal.</span>
          </div>
          <p className="mt-1 text-center text-sm font-semibold text-forest-700">
            A more resilient tomorrow.
          </p>
        </div>
      </section>
    </main>
  );
}
