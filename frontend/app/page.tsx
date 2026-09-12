import Link from "next/link";
import { ArrowRight, CloudRain, Sprout, BrainCircuit, Gauge, Landmark, Umbrella, Building2, Globe2, Play, Database, Cpu, Layers, ShieldCheck, TrendingDown, AlertTriangle, LineChart, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { DISCLAIMER } from "@/lib/utils";

const PROBLEMS = [
  { icon: CloudRain, title: "Farmers", text: "Face unpredictable weather and crop losses with little advance warning or access to fair credit." },
  { icon: Landmark, title: "Lenders", text: "Traditional credit scores ignore localized climate and agronomic risk, so rural loans are priced blind." },
  { icon: Umbrella, title: "Insurers", text: "Regional variability and complex loss assessment make agricultural underwriting slow and expensive." },
];
const STEPS = [
  { icon: Database, title: "Ingest", text: "Weather, soil, crop/yield and location signals (simulated in this prototype; adapters ready for real feeds)." },
  { icon: Layers, title: "Engineer", text: "Water stress, heat stress, irrigation buffers and volatility features are derived per farm." },
  { icon: Cpu, title: "Predict", text: "A trained Random Forest estimates the probability of a significant yield loss." },
  { icon: Gauge, title: "Score", text: "Probability becomes a 0–1000 TerraScore with transparent, model-derived drivers." },
];
const USERS = [
  { icon: Landmark, title: "Lenders", text: "Price agri-loans on climate-adjusted risk, monitor portfolio exposure by region and crop." },
  { icon: Umbrella, title: "Insurers", text: "Segment policies, estimate loss probability and track climate exposure across a book." },
  { icon: Building2, title: "Agri platforms", text: "Embed a resilience signal into input financing, advisory and marketplace flows." },
  { icon: Globe2, title: "Government & DFIs", text: "Target climate-adaptation programs where measurable risk is concentrating." },
];
const BANDS = [
  { r: "800–1000", l: "Very Low Risk", c: "#059669" }, { r: "600–799", l: "Low Risk", c: "#3e805b" }, { r: "400–599", l: "Moderate Risk", c: "#d97706" },
  { r: "200–399", l: "High Risk", c: "#ea580c" }, { r: "0–199", l: "Critical Risk", c: "#dc2626" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(16,185,129,.12),transparent),radial-gradient(800px_500px_at_-10%_20%,rgba(30,66,48,.08),transparent)]">
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-charcoal-600 md:flex">
            <a href="#problem" className="hover:text-charcoal-900">Problem</a><a href="#how" className="hover:text-charcoal-900">How it works</a>
            <a href="#score" className="hover:text-charcoal-900">TerraScore</a><a href="#users" className="hover:text-charcoal-900">Who uses it</a><a href="#tech" className="hover:text-charcoal-900">Technology</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign In</Link>
            <Link href="/login" className="btn-primary"><Play size={14} /> Launch Demo</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
        <div className="animate-fadeUp">
          <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulseDot" /> Prototype · Simulated data · Hackathon MVP</span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-charcoal-950 sm:text-5xl lg:text-[60px]">
            Turn climate signals <span className="bg-gradient-to-r from-forest-700 to-emerald-500 bg-clip-text text-transparent">into decisions.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-600">
            Weather + agriculture + machine learning — converted into a clear TerraScore for farmers, lenders and government teams.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-[15px]">Explore TerraScore <ArrowRight size={16} /></Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-[15px]"><Play size={15} /> View Live Demo</Link>
          </div>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-charcoal-100 pt-6">
            {[["1,500", "synthetic farms scored"], ["13", "Indian states covered"], ["0–1000", "explainable score"]].map(([v, l]) => (
              <div key={l}><p className="text-2xl font-semibold tracking-tight text-charcoal-900">{v}</p><p className="text-xs text-charcoal-500">{l}</p></div>
            ))}
          </div>          <div className="mt-8 rounded-2xl border border-forest-100 bg-forest-50/60 p-4 text-sm text-charcoal-700">
            <p className="font-semibold text-charcoal-900">Built on climate, agricultural and machine-learning data.</p>
            <p className="mt-1 text-charcoal-600">Weather, soil, crop and risk signals are combined into one transparent TerraScore signal.</p>
            <Link href="/data-sources" className="mt-3 inline-flex items-center gap-2 text-forest-700 hover:underline">Explore our data <ArrowRight size={14} /></Link>
          </div>        </div>

        {/* Hero visual: Climate data -> AI -> TerraScore -> Financial decisions */}
        <div className="relative animate-fadeUp [animation-delay:150ms]">
          <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-emerald-200/40 via-transparent to-forest-200/40 blur-2xl" />
          <div className="glass relative p-6 md:p-8">
            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
              <Node icon={CloudRain} title="Climate Data" sub="Weather · Soil · Crop" />
              <Arrow /><Node icon={BrainCircuit} title="AI" sub="Random Forest" accent />
              <Arrow /><Node icon={Gauge} title="TerraScore" sub="0 – 1000" accent />
              <Arrow /><Node icon={Landmark} title="Decisions" sub="Credit · Insurance" />
            </div>
            <div className="mt-6 rounded-2xl border border-charcoal-100 bg-white p-5">
              <div className="flex items-center justify-between"><p className="label">FARM-001 · Ludhiana, Punjab · Wheat</p><span className="badge bg-forest-50 text-forest-600 ring-1 ring-forest-200">LOW RISK</span></div>
              <div className="mt-3 flex items-end gap-3"><span className="text-5xl font-semibold tracking-tight text-charcoal-900">771</span><span className="pb-2 text-sm text-charcoal-400">/ 1000</span></div>
              <div className="mt-3 h-2 w-full rounded-full bg-charcoal-100"><div className="h-2 rounded-full bg-gradient-to-r from-forest-600 to-emerald-500" style={{ width: "77.1%" }} /></div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-emerald-50/70 p-2.5 text-emerald-800"><p className="font-semibold">+ Strong soil health</p><p className="text-emerald-700/80">78 / 100</p></div>
                <div className="rounded-lg bg-red-50/70 p-2.5 text-red-800"><p className="font-semibold">− Rainfall volatility</p><p className="text-red-700/80">0.66 index</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <Section id="problem" eyebrow="The Problem" title="Climate risk is real, local, and invisible to finance.">
        <div className="grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="card p-6 transition-all hover:-translate-y-0.5 hover:shadow-glow">
              <div className="mb-4 inline-flex rounded-xl bg-red-50 p-2.5 text-red-600"><p.icon size={18} /></div>
              <h3 className="text-lg font-semibold text-charcoal-900">{p.title}</h3><p className="mt-2 text-sm leading-relaxed text-charcoal-600">{p.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* INTELLIGENCE LAYER */}
      <Section eyebrow="The Intelligence Layer" title="One signal that sits between climate data and financial decisions.">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="card p-6 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {[["Weather", "Temperature, rainfall, humidity and volatility", CloudRain], ["Soil", "Health index and moisture", Sprout], ["Crop & yield", "History, variance, price and season", LineChart], ["Location", "District-level climate exposure", Globe2]].map(([t, s, I]) => {
                const Icon = I as typeof CloudRain;
                return (<div key={t as string} className="flex gap-3 rounded-xl border border-charcoal-100 p-4"><div className="rounded-lg bg-forest-50 p-2 text-forest-700"><Icon size={16} /></div><div><p className="text-sm font-semibold text-charcoal-900">{t as string}</p><p className="text-xs text-charcoal-500">{s as string}</p></div></div>);
              })}
            </div>
          </div>
          <div className="rounded-2xl bg-forest-900 p-6 text-white md:p-8">
            <p className="label text-emerald-300/80">Output</p>
            <h3 className="mt-2 text-2xl font-semibold">Explainable, dynamic, API-first.</h3>
            <ul className="mt-5 space-y-3 text-sm text-forest-100">
              {["Every score ships with its top risk and resilience drivers", "Recalculates as conditions change — What-If scenarios in milliseconds", "Consumable via a single REST endpoint per farm", "Clear risk bands for underwriting and credit workflows"].map((t) => <li key={t} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />{t}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how" eyebrow="How It Works" title="From raw signals to a decision-grade score.">
        <div className="grid gap-5 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card relative p-6">
              <span className="absolute right-5 top-5 text-4xl font-semibold text-charcoal-100">0{i + 1}</span>
              <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><s.icon size={18} /></div>
              <h3 className="font-semibold text-charcoal-900">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-charcoal-600">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* SCORE */}
      <Section id="score" eyebrow="TerraScore" title="A 0–1000 score. Higher means more resilient.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6 md:p-8">
            <code className="block rounded-xl bg-charcoal-950 p-4 text-sm text-emerald-300">TerraScore = round((1 − risk_probability) × 1000)</code>
            <p className="mt-4 text-sm leading-relaxed text-charcoal-600">The risk probability is the trained model&apos;s estimate that a farm will suffer a significant (≥20%) yield loss. The score is clamped to 0–1000 and returned with a confidence estimate and its top contributing features.</p>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle size={14} className="shrink-0" />Prototype on simulated data — not a credit score or underwriting decision.</div>
          </div>
          <div className="card p-6 md:p-8">
            <ul className="space-y-3">
              {BANDS.map((b) => (
                <li key={b.l} className="flex items-center gap-4">
                  <span className="w-20 text-sm tabular-nums font-semibold text-charcoal-800">{b.r}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-charcoal-100"><div className="h-2.5 rounded-full" style={{ width: `${parseInt(b.r.split("–")[1]) / 10}%`, background: b.c }} /></div>
                  <span className="w-28 text-right text-xs font-medium" style={{ color: b.c }}>{b.l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* USERS */}
      <Section id="users" eyebrow="Who Uses It" title="Built for every institution exposed to agricultural climate risk.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USERS.map((u) => (<div key={u.title} className="card p-6"><div className="mb-4 inline-flex rounded-xl bg-forest-50 p-2.5 text-forest-700"><u.icon size={18} /></div><h3 className="font-semibold text-charcoal-900">{u.title}</h3><p className="mt-2 text-sm leading-relaxed text-charcoal-600">{u.text}</p></div>))}
        </div>
      </Section>

      {/* TECH + IMPACT */}
      <Section id="tech" eyebrow="Technology" title="Simple, transparent, production-shaped.">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-3">
              {[["Frontend", "Next.js · TypeScript · Tailwind · Recharts · Leaflet"], ["Backend", "FastAPI · Pydantic · SQLite cache"], ["ML", "scikit-learn Random Forest · pandas · joblib"], ["Explainability", "Model-derived feature importance + local deviation"], ["Infra", "Docker Compose · .env config · REST API"], ["Data", "1,500 synthetic farms · 5-year monthly history"]].map(([t, s]) => (
                <div key={t} className="rounded-xl border border-charcoal-100 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-charcoal-400">{t}</p><p className="mt-1.5 text-sm text-charcoal-800">{s}</p></div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-forest-800 to-emerald-700 p-6 text-white">
            <p className="label text-emerald-200/80">Impact</p>
            <h3 className="mt-2 text-xl font-semibold">Fairer credit. Faster underwriting. Targeted adaptation.</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-emerald-50/90">
              <li className="flex gap-2"><TrendingDown size={16} className="mt-0.5 shrink-0" />Lower risk-pricing uncertainty for rural lending</li>
              <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0" />Portfolio-level early warning for insurers</li>
              <li className="flex gap-2"><Sprout size={16} className="mt-0.5 shrink-0" />Resilience-linked incentives for farmers</li>
            </ul>
          </div>
        </div>
      </Section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="card flex flex-col items-center gap-5 bg-gradient-to-b from-white to-emerald-50/50 p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[.16em] text-forest-600">Climate Data → AI → TerraScore → Better Financial Decisions</p>
          <h2 className="text-3xl font-semibold tracking-tight text-charcoal-950">See it work on a real scenario.</h2>
          <Link href="/login" className="btn-primary px-7 py-3 text-[15px]"><Play size={15} /> Launch Demo</Link>
        </div>
      </section>

      <footer className="border-t border-charcoal-100 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <Logo />
          <p className="max-w-2xl text-[11px] leading-relaxed text-charcoal-400">{DISCLAIMER} Data source: Simulated / synthetic demo data.</p>
        </div>
      </footer>
    </div>
  );
}

function Node({ icon: Icon, title, sub, accent }: { icon: typeof CloudRain; title: string; sub: string; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 ${accent ? "bg-forest-800 text-white" : "bg-white text-charcoal-800 ring-1 ring-charcoal-100"}`}>
      <Icon size={18} className={accent ? "text-emerald-300" : "text-forest-700"} />
      <p className="text-[11px] font-semibold leading-tight sm:text-xs">{title}</p>
      <p className={`hidden text-[10px] sm:block ${accent ? "text-emerald-200/80" : "text-charcoal-400"}`}>{sub}</p>
    </div>
  );
}
function Arrow() { return <ArrowRight size={14} className="text-charcoal-300" />; }
function Section({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-6 py-14">
      <p className="label text-forest-600">{eyebrow}</p>
      <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-charcoal-950">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}
