"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sprout, Gauge, AlertTriangle, TrendingDown, Activity, Clock, ShieldCheck, MapPin, Landmark, Building2, ArrowRight, Sparkles, Wallet, PieChart as PieIcon, Lightbulb, CheckCircle2 } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { getSession, type AuthSession, type UserRole } from "@/lib/auth";
import { Card, CardSkeleton, ErrorState, RiskBadge, SimTag, Stat, Tag } from "@/components/ui/primitives";
import { ScoreRing, ScoreBar } from "@/components/ui/ScoreRing";
import { FactorBars } from "@/components/ui/FactorBars";
import { TerraScoreTrend, WeatherTrend, YieldRiskTrend, ImportanceBars, RiskDistribution, Donut, SimpleBars } from "@/components/charts/charts";
import { AlertsPanel, LiveTelemetry } from "@/components/dashboard/widgets";
import { useToast } from "@/components/ui/Toast";
import { useRegion } from "@/contexts/RegionContext";
import { fmt, RISK_META, cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const RiskMap = dynamic(() => import("@/components/map/RiskMap").then((m) => m.RiskMap), { ssr: false, loading: () => <div className="skeleton h-[380px] w-full" /> });

export default function DashboardPage() { return <Suspense fallback={<CardSkeleton />}><Dashboard /></Suspense>; }

function Dashboard() {
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  const [session, setSession] = useState<AuthSession | null>(null);
  const { toast } = useToast();
  const { selectedRegion } = useRegion();
  const [farmId, setFarmId] = useState(selectedRegion.farmId);

  useEffect(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    setFarmId(selectedRegion.farmId);
  }, [selectedRegion.farmId]);

  const role: UserRole = session?.role || "farmer";

  const summary = useApi("summary", api.summary, { ttl: 60_000 });
  const farm = useApi(`farm-${farmId}`, () => api.farm(farmId));
  const trends = useApi(`trends-${farmId}-12`, () => api.trends(farmId, 12));
  const model = useApi("model", api.model, { ttl: 300_000 });
  const regions = useApi("regions-all", () => api.regions(), { ttl: 120_000 });

  useEffect(() => {
    if (demo) {
      setFarmId(selectedRegion.farmId);
      toast("success", "Demo scenario loaded", `${selectedRegion.farmId} · ${selectedRegion.primaryCrop} · ${selectedRegion.displayName}`);
    }
  }, [demo, selectedRegion, toast]);

  const s = summary.data; const f = farm.data;
  const fi = useMemo(() => (model.data?.feature_importance || []).slice(0, 8), [model.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">
            {role === "lender" ? "Lender Portfolio Overview" : role === "government" ? "Government Risk Overview" : "Farmer Risk Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {role === "farmer"
              ? "Farm-level climate risk intelligence, explained."
              : role === "lender"
                ? "Portfolio climate exposure, credit risk, and farm-level vulnerability."
                : "Regional climate vulnerability and agricultural adaptation monitoring."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimTag text="Data source: Simulated / synthetic" />
          {s && <Tag><Clock size={11} /> Updated {fmt.time(s.last_updated)}</Tag>}
        </div>
      </div>

      {/* KPI row */}
      {summary.loading ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} lines={1} />)}</div>
        : summary.error ? <ErrorState message={summary.error} onRetry={summary.refresh} />
        : s && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 animate-fadeUp">
            <Stat label="Total Farms Analyzed" value={fmt.int(s.total_farms)} sub={`${s.states} states · ${s.districts} districts`} icon={Sprout} />
            <Stat label="Average TerraScore" value={fmt.num(s.average_terra_score, 0)} sub={`median ${s.median_terra_score}`} icon={Gauge} tone="good" />
            <Stat label="High Risk Farms" value={fmt.int(s.high_risk_farms)} sub={`${fmt.pct(s.high_risk_pct)} of portfolio (<400)`} icon={AlertTriangle} tone="bad" />
            <Stat label="Predicted Yield Loss" value={fmt.pct(s.predicted_yield_loss_pct)} sub="avg. model-implied" icon={TrendingDown} tone="warn" />
            <Stat label="Climate Risk Trend" value={<span className={s.climate_risk_trend_points >= 0 ? "text-emerald-700" : "text-red-600"}>{s.climate_risk_trend_points >= 0 ? "+" : ""}{fmt.num(s.climate_risk_trend_points, 0)} pts</span>} sub="avg score, QoQ" icon={Activity} tone={s.climate_risk_trend_points >= 0 ? "good" : "bad"} />
          </div>
        )}

      {role === "lender" && s && <LenderView s={s} />}
      {role === "government" && s && <GovernmentOverview s={s} />}

      {/* Hero score */}
      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {farm.loading ? <CardSkeleton lines={8} className="min-h-[360px]" /> : farm.error ? <ErrorState message={farm.error} onRetry={farm.refresh} /> : f && (
          <Card className="relative overflow-hidden animate-fadeUp">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />
            <div className="relative grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-3">
                <ScoreRing score={f.scoring.terra_score} size={210} />
                <RiskBadge level={f.scoring.risk_level} size="lg" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="label">TerraScore</p>
                    <h2 className="mt-1 text-xl font-semibold text-charcoal-900">{f.farm.farmer_name} · <span className="text-charcoal-500">{f.farm.farm_id}</span></h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-charcoal-500"><MapPin size={13} />{f.farm.district}, {f.farm.state} · {f.farm.crop_type} · {f.farm.farm_area} ha</p>
                  </div>
                  {demo && <span className="badge bg-forest-800 text-white"><Sparkles size={12} /> Demo scenario</span>}
                </div>
                <ScoreBar score={f.scoring.terra_score} className="mt-4" />
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <Mini label="Risk probability" value={fmt.pct(f.scoring.risk_probability * 100)} />
                  <Mini label="Model confidence" value={fmt.pct(f.scoring.confidence * 100, 0)} />
                  <Mini label="Predicted yield loss" value={fmt.pct(f.scoring.predicted_yield_loss_pct)} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/farms?farm=${f.farm.farm_id}`} className="btn-secondary">Why this score? <ArrowRight size={14} /></Link>
                  <Link href={`/simulator?farm=${f.farm.farm_id}`} className="btn-primary">Run What-If <ArrowRight size={14} /></Link>
                </div>
                <p className="mt-4 text-[11px] text-charcoal-400">Last updated {new Date().toLocaleString("en-IN")} · {f.scoring.model_type} v{f.scoring.model_version}</p>
              </div>
            </div>
          </Card>
        )}
        <Card title="Why this score?" subtitle={f ? f.scoring.explanation_method : "Model-derived feature importance"} icon={ShieldCheck}>
          {farm.loading ? <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-6" />)}</div> : f && (
            <div className="space-y-5">
              <div><p className="label mb-2 text-red-500">Top risk factors</p><FactorBars factors={f.scoring.top_risk_factors.slice(0, 3)} tone="risk" /></div>
              <div><p className="label mb-2 text-emerald-600">Resilience factors</p><FactorBars factors={f.scoring.positive_resilience_factors.slice(0, 3)} tone="protective" /></div>
            </div>
          )}
        </Card>
      </div>

      {/* Farmer recommendations */}
      {role === "farmer" && f && <FarmerRecommendations f={f} />}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="TerraScore Trend" subtitle={`${farmId} · last 12 months`} action={<SimTag />}>
          {trends.loading ? <div className="skeleton h-[240px]" /> : trends.error ? <ErrorState message={trends.error} onRetry={trends.refresh} /> : <TerraScoreTrend data={trends.data?.series || []} />}
        </Card>
        <Card title="Weather Trend" subtitle="Rainfall, temperature and soil moisture" action={<SimTag />}>
          {trends.loading ? <div className="skeleton h-[240px]" /> : <WeatherTrend data={trends.data?.series || []} />}
        </Card>
        <Card title="Yield & Risk Probability" subtitle="Model risk vs realised yield" action={<SimTag />}>
          {trends.loading ? <div className="skeleton h-[240px]" /> : <YieldRiskTrend data={trends.data?.series || []} />}
        </Card>
        <Card title="Feature Importance" subtitle="Model-derived feature importance (global)" action={<Link href="/model" className="text-xs font-medium text-forest-700 hover:underline">Model insights →</Link>}>
          {model.loading ? <div className="skeleton h-[280px]" /> : model.error ? <ErrorState message={model.error} onRetry={model.refresh} /> : <ImportanceBars data={fi} height={260} />}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Regional Risk Map" subtitle="District-level average TerraScore" action={<Link href="/regions" className="text-xs font-medium text-forest-700 hover:underline">Open heatmap →</Link>} className="overflow-hidden">
          {regions.error ? <ErrorState message={regions.error} onRetry={regions.refresh} /> : <div className="h-[380px] overflow-hidden rounded-xl"><RiskMap regions={regions.data?.regions || []} height={380} compact /></div>}
        </Card>
        <div className="space-y-6">
          <AlertsPanel limit={5} compact />
        </div>
      </div>

      <LiveTelemetry farmId={farmId} />

      {s && (
        <Card title="Portfolio Risk Distribution" subtitle="Farms per TerraScore band" action={<SimTag text="Demo / Simulated Portfolio" />}>
          <RiskDistribution data={s.risk_distribution} />
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-charcoal-900">{value}</p></div>;
}

function LenderView({ s }: { s: NonNullable<ReturnType<typeof useApi<import("@/lib/types").Summary>>["data"]> }) {
  const l = s.lender;
  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800"><Landmark size={14} /><span className="font-semibold">Lender View · Demo / Simulated Portfolio.</span> Notional exposure = area × expected yield × crop price. Not integrated with any bank.</div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Portfolio Exposure" value={fmt.inr(l.portfolio_exposure_inr)} sub="notional, simulated" icon={Wallet} />
        <Stat label="Expected Loss" value={fmt.inr(l.expected_loss_inr)} sub={`${fmt.pct(l.expected_loss_ratio_pct, 2)} loss ratio`} icon={TrendingDown} tone="bad" />
        <Stat label="Avg TerraScore" value={fmt.num(s.average_terra_score, 0)} sub="portfolio-weighted" icon={Gauge} tone="good" />
        <Stat label="High-Risk Farms" value={fmt.int(s.high_risk_farms)} sub={`${fmt.pct(s.high_risk_pct)} of loans`} icon={AlertTriangle} tone="warn" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Risk Distribution" subtitle="Loans per TerraScore band"><RiskDistribution data={s.risk_distribution} height={230} /></Card>
        <Card title="Regional Exposure" subtitle="Notional exposure by state (₹)" className="lg:col-span-2">
          <SimpleBars data={l.regional_exposure as unknown as Record<string, unknown>[]} xKey="state" yKey="exposure" name="Exposure" format={(v) => fmt.inr(v)} height={230} />
        </Card>
      </div>
      <Card title="Highest-Risk Farms" subtitle="Lowest TerraScore in the portfolio" action={<Link href="/farms" className="text-xs font-medium text-forest-700 hover:underline">All farms →</Link>}>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-charcoal-400"><th className="pb-2 pr-4 font-semibold">Farm</th><th className="pb-2 pr-4 font-semibold">Location</th><th className="pb-2 pr-4 font-semibold">Crop</th><th className="pb-2 pr-4 font-semibold text-right">TerraScore</th><th className="pb-2 pr-4 font-semibold text-right">Yield loss</th><th className="pb-2 font-semibold">Risk</th></tr></thead>
          <tbody className="divide-y divide-charcoal-100">{l.high_risk_farms.map((r) => (
            <tr key={r.farm_id} className="hover:bg-forest-50/40"><td className="py-2.5 pr-4"><Link href={`/farms?farm=${r.farm_id}`} className="font-medium text-forest-700 hover:underline">{r.farm_id}</Link><p className="text-xs text-charcoal-400">{r.farmer_name}</p></td><td className="py-2.5 pr-4 text-charcoal-600">{r.district}, {r.state}</td><td className="py-2.5 pr-4">{r.crop_type}</td><td className="py-2.5 pr-4 text-right font-semibold tabular-nums" style={{ color: RISK_META[r.risk_level].hex }}>{r.terra_score}</td><td className="py-2.5 pr-4 text-right tabular-nums">{fmt.pct(r.predicted_yield_loss_pct)}</td><td className="py-2.5"><RiskBadge level={r.risk_level} size="sm" /></td></tr>
          ))}</tbody></table></div>
      </Card>
    </div>
  );
}

function GovernmentOverview({ s }: { s: import("@/lib/types").Summary }) {
  const i = s.insurer;
  const seg = i.segments.map((x, k) => ({
    name: x.segment.replace("Preferred", "High Resilience").replace("Standard", "Moderate Resilience").replace("Sub-standard", "Moderate Vulnerability").replace("High-risk", "High Vulnerability").replace("Decline / Review", "Critical Vulnerability"),
    value: x.farms,
    color: ["#059669", "#3e805b", "#d97706", "#ea580c", "#dc2626"][k],
  }));
  const exp = [
    ["Drought", i.climate_exposure.drought_exposed],
    ["Flood", i.climate_exposure.flood_exposed],
    ["Pest", i.climate_exposure.pest_exposed],
    ["Heat", i.climate_exposure.heat_exposed],
  ].map(([k, v]) => ({ hazard: k, farms: v }));

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs text-purple-900">
        <Building2 size={14} />
        <span className="font-semibold">Government View · Climate Vulnerability Monitoring.</span> Area-level vulnerability tracking, hazard exposure, and policy intervention priorities across 1,500 farms.
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Avg Vulnerability Index" value={fmt.pct(i.avg_loss_probability * 100)} sub="model-predicted risk" icon={PieIcon} tone="warn" />
        <Stat label="High Vulnerability Farms" value={fmt.int(i.farms_loss_prob_over_50)} sub="priority assistance (>50% risk)" icon={AlertTriangle} tone="bad" />
        <Stat label="Past Climate Distress" value={fmt.int(i.historical_claims_proxy)} sub={`${fmt.pct(i.historical_claims_rate_pct)} of farms affected`} icon={Activity} />
        <Stat label="Drought-Exposed Farms" value={fmt.int(i.climate_exposure.drought_exposed)} sub="water-stress intervention" icon={TrendingDown} tone="warn" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Vulnerability Classification" subtitle="Farms grouped by resilience band"><Donut data={seg} /></Card>
        <Card title="Crop Vulnerability" subtitle="Average predicted risk by crop type"><SimpleBars data={i.crop_risk.map((c) => ({ crop: c.crop_type, p: +(c.loss_probability * 100).toFixed(1) }))} xKey="crop" yKey="p" name="Vulnerability" format={(v) => `${v}%`} color="#ea580c" /></Card>
        <Card title="Climate Hazard Exposure" subtitle="Farms exceeding hazard stress thresholds"><SimpleBars data={exp} xKey="hazard" yKey="farms" name="Farms" color="#3e805b" /></Card>
      </div>
    </div>
  );
}

function FarmerRecommendations({ f }: { f: import("@/lib/types").FarmDetail }) {
  const recs: { title: string; desc: string; impact: string }[] = [];

  if (f.farm.drought_index > 0.4 || f.farm.precipitation < 60) {
    recs.push({
      title: "Micro-Irrigation & Moisture Retention",
      desc: "Install drip irrigation lines or mulching to buffer against dry spells and stabilize root-zone soil moisture.",
      impact: "Reduces drought stress contribution",
    });
  }
  if (f.farm.pest_risk > 0.4) {
    recs.push({
      title: "Integrated Pest Management (IPM)",
      desc: "Deploy pheromone traps and bio-pesticides ahead of peak humidity to prevent crop infestation.",
      impact: "Mitigates pest-driven yield risk",
    });
  }
  if (f.farm.soil_health < 65) {
    recs.push({
      title: "Organic Soil Conditioning",
      desc: "Apply compost or green manure to rebuild organic matter and enhance nutrient holding capacity.",
      impact: "Strengthens baseline resilience",
    });
  }
  if (f.farm.irrigation_status !== "Good") {
    recs.push({
      title: "Irrigation Infrastructure Upgrade",
      desc: `Upgrade from ${f.farm.irrigation_status} to Good irrigation to build resilience against erratic rainfall.`,
      impact: "Can boost TerraScore by 40–80 pts",
    });
  }
  if (recs.length === 0) {
    recs.push({
      title: "Sustain Optimal Soil & Water Practices",
      desc: "Current soil health and moisture levels are resilient. Continue scheduled crop rotation and timely weeding.",
      impact: "Maintains high resilience tier",
    });
  }

  return (
    <Card title="Farmer Resilience Recommendations" subtitle="Data-driven actions to improve TerraScore and mitigate risk" icon={Lightbulb}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recs.slice(0, 3).map((r, idx) => (
          <div key={idx} className="rounded-xl border border-charcoal-100 bg-forest-50/40 p-4 transition-all hover:bg-forest-50/70">
            <div className="flex items-center gap-2 text-forest-800">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <p className="text-sm font-semibold text-charcoal-900">{r.title}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-charcoal-600">{r.desc}</p>
            <p className="mt-3 inline-block rounded-md bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{r.impact}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
