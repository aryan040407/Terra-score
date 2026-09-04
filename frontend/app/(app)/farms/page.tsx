"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, MapPin, Sprout, Thermometer, Droplets, CloudRain, Wind, Waves, Bug, Sun, ShieldCheck, TrendingUp, ArrowRight, Ruler, Calendar, Layers } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { FarmListItem } from "@/lib/types";
import { Card, CardSkeleton, EmptyState, ErrorState, RiskBadge, Segmented, Select, SimTag, Tag } from "@/components/ui/primitives";
import { ScoreRing, ScoreBar } from "@/components/ui/ScoreRing";
import { FactorBars } from "@/components/ui/FactorBars";
import { TerraScoreTrend, WeatherTrend, YieldRiskTrend } from "@/components/charts/charts";
import { cn, fmt, RISK_META } from "@/lib/utils";

const RANGES = [{ value: "7", label: "7 mo" }, { value: "12", label: "12 mo" }, { value: "24", label: "24 mo" }, { value: "60", label: "5 yr" }];

export default function FarmsPage() { return <Suspense fallback={<CardSkeleton />}><Farms /></Suspense>; }

function Farms() {
  const params = useSearchParams();
  const [farmId, setFarmId] = useState(params.get("farm") || "FARM-001");
  const [search, setSearch] = useState(""); const [state, setState] = useState(params.get("state") || ""); const [crop, setCrop] = useState("");
  const [months, setMonths] = useState("12");
  useEffect(() => { const f = params.get("farm"); if (f) setFarmId(f); }, [params]);

  const list = useApi(`farms-${state}-${crop}-${search}`, () => api.farms({ state, crop, search, limit: 60 }), { ttl: 60_000 });
  const filters = useApi("regions-all", () => api.regions(), { ttl: 120_000 });
  const detail = useApi(`farm-${farmId}`, () => api.farm(farmId));
  const trends = useApi(`trends-${farmId}-${months}`, () => api.trends(farmId, Number(months)));

  const d = detail.data;
  const districtFilter = params.get("district");
  const items = useMemo(() => (list.data?.items || []).filter((i) => !districtFilter || i.district === districtFilter), [list.data, districtFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div><h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">Farm Risk Analysis</h1><p className="mt-1 text-sm text-charcoal-500">Select a farm to see its TerraScore and the factors behind it.</p></div>
        <SimTag text="Simulated farm records" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* Selector */}
        <Card className="h-fit xl:sticky xl:top-24">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search farm, farmer or district…" className="w-full rounded-xl border border-charcoal-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" /></div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Select value={state} onChange={setState} options={filters.data?.filters.states || []} placeholder="All states" className="text-xs" />
            <Select value={crop} onChange={setCrop} options={filters.data?.filters.crops || []} placeholder="All crops" className="text-xs" />
          </div>
          {districtFilter && <p className="mt-2 flex items-center gap-1 text-xs text-charcoal-500"><MapPin size={11} /> Filtered to {districtFilter} <Link href="/farms" className="ml-1 text-forest-700 underline">clear</Link></p>}
          <p className="label mt-4 mb-2">{list.data ? `${items.length} of ${list.data.total} farms` : "Farms"}</p>
          <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
            {list.loading && !list.data ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14" />) : list.error ? <ErrorState message={list.error} onRetry={list.refresh} className="p-4" /> : items.length === 0 ? <EmptyState title="No farms found" detail="Try a different search or filter." /> : items.map((f: FarmListItem) => (
              <button key={f.farm_id} onClick={() => setFarmId(f.farm_id)} className={cn("flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition-all", farmId === f.farm_id ? "border-forest-700 bg-forest-50/70 shadow-sm" : "border-transparent hover:border-charcoal-200 hover:bg-charcoal-50")}>
                <div className="min-w-0"><p className="truncate text-sm font-medium text-charcoal-900">{f.farm_id} <span className="font-normal text-charcoal-500">· {f.farmer_name}</span></p><p className="truncate text-xs text-charcoal-500">{f.district}, {f.state} · {f.crop_type}</p></div>
                <span className="text-base font-semibold tabular-nums" style={{ color: RISK_META[f.risk_level].hex }}>{f.terra_score}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Detail */}
        <div className="space-y-6">
          {detail.loading && !d ? <CardSkeleton lines={8} className="min-h-[320px]" /> : detail.error ? <ErrorState message={detail.error} onRetry={detail.refresh} /> : d && (
            <>
              <Card className="relative overflow-hidden animate-fadeUp">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />
                <div className="relative grid gap-6 md:grid-cols-[auto_1fr]">
                  <div className="flex flex-col items-center gap-3"><ScoreRing score={d.scoring.terra_score} size={190} /><RiskBadge level={d.scoring.risk_level} size="lg" /></div>
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="label">TerraScore · {d.farm.farm_id}</p><h2 className="mt-1 text-xl font-semibold text-charcoal-900">{d.farm.farmer_name}</h2>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-500"><span className="flex items-center gap-1"><MapPin size={13} />{d.farm.district}, {d.farm.state}</span><span className="flex items-center gap-1"><Sprout size={13} />{d.farm.crop_type}</span><span className="flex items-center gap-1"><Ruler size={13} />{d.farm.farm_area} ha</span><span className="flex items-center gap-1"><Calendar size={13} />{d.farm.season}</span></p></div>
                      <Link href={`/simulator?farm=${d.farm.farm_id}`} className="btn-primary">What-If Simulator <ArrowRight size={14} /></Link>
                    </div>
                    <ScoreBar score={d.scoring.terra_score} className="mt-4" />
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Kv label="Crop failure prob." value={fmt.pct(d.scoring.risk_probability * 100)} />
                      <Kv label="Model confidence" value={fmt.pct(d.scoring.confidence * 100, 0)} />
                      <Kv label="Expected yield" value={`${fmt.num(d.scoring.expected_yield, 2)} t/ha`} />
                      <Kv label="Predicted yield" value={`${fmt.num(d.scoring.predicted_yield, 2)} t/ha`} sub={`−${fmt.pct(d.scoring.predicted_yield_loss_pct)}`} />
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Why this score?" subtitle={d.scoring.explanation_method} icon={ShieldCheck}>
                  <div className="space-y-5">
                    <div><p className="label mb-2 text-emerald-600">+ Protective factors</p><FactorBars factors={d.scoring.positive_resilience_factors} tone="protective" /></div>
                    <div><p className="label mb-2 text-red-500">− Risk drivers</p><FactorBars factors={d.scoring.top_risk_factors} tone="risk" /></div>
                  </div>
                  <p className="mt-4 text-[11px] text-charcoal-400">Contributions are normalised shares of model-derived importance × this farm&apos;s deviation from the training distribution.</p>
                </Card>
                <Card title="Farm Conditions" subtitle="Current inputs feeding the model" icon={Layers}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Cond icon={Thermometer} label="Temperature" value={`${d.farm.temperature}°C`} />
                    <Cond icon={CloudRain} label="Rainfall" value={`${d.farm.precipitation} mm/mo`} />
                    <Cond icon={Droplets} label="Soil moisture" value={`${d.farm.soil_moisture}%`} bar={d.farm.soil_moisture / 100} />
                    <Cond icon={Sprout} label="Soil health" value={`${d.farm.soil_health}/100`} bar={d.farm.soil_health / 100} />
                    <Cond icon={Wind} label="Humidity" value={`${d.farm.humidity}%`} />
                    <Cond icon={Waves} label="Irrigation" value={d.farm.irrigation_status} bar={{ None: 0.1, Partial: 0.5, Good: 0.95 }[d.farm.irrigation_status]} />
                    <Cond icon={Sun} label="Drought index" value={fmt.num(d.farm.drought_index, 2)} bar={d.farm.drought_index} bad />
                    <Cond icon={Waves} label="Flood risk" value={fmt.num(d.farm.flood_risk, 2)} bar={d.farm.flood_risk} bad />
                    <Cond icon={Bug} label="Pest risk" value={fmt.num(d.farm.pest_risk, 2)} bar={d.farm.pest_risk} bad />
                    <Cond icon={TrendingUp} label="Weather volatility" value={fmt.num(d.farm.weather_volatility, 2)} bar={d.farm.weather_volatility} bad />
                    <Cond icon={ShieldCheck} label="Climate resilience" value={fmt.num(d.farm.climate_resilience, 2)} bar={d.farm.climate_resilience} />
                    <Cond icon={TrendingUp} label="Historical yield" value={`${d.farm.historical_yield} t/ha`} />
                  </div>
                </Card>
              </div>

              <Card title="Historical Risk" subtitle="TerraScore, weather and yield over time" action={<div className="flex items-center gap-2"><SimTag /><Segmented value={months} onChange={setMonths} options={RANGES} /></div>}>
                {trends.loading && !trends.data ? <div className="skeleton h-[240px]" /> : trends.error ? <ErrorState message={trends.error} onRetry={trends.refresh} /> : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div><p className="label mb-2">TerraScore</p><TerraScoreTrend data={trends.data?.series || []} height={220} /></div>
                    <div><p className="label mb-2">Weather</p><WeatherTrend data={trends.data?.series || []} height={220} /></div>
                    <div className="lg:col-span-2"><p className="label mb-2">Yield vs risk probability</p><YieldRiskTrend data={trends.data?.series || []} height={220} /></div>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kv({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">{label}</p><p className="mt-1 text-base font-semibold tabular-nums text-charcoal-900">{value} {sub && <span className="text-xs font-medium text-red-500">{sub}</span>}</p></div>;
}
function Cond({ icon: Icon, label, value, bar, bad }: { icon: typeof Sun; label: string; value: string; bar?: number; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-charcoal-100 p-3">
      <div className="flex items-center justify-between text-xs text-charcoal-500"><span className="flex items-center gap-1.5"><Icon size={13} className="text-forest-600" />{label}</span></div>
      <p className="mt-1 text-sm font-semibold text-charcoal-900">{value}</p>
      {bar !== undefined && <div className="mt-1.5 h-1.5 w-full rounded-full bg-charcoal-100"><div className={cn("h-1.5 rounded-full", bad ? "bg-gradient-to-r from-amber-400 to-red-500" : "bg-gradient-to-r from-emerald-400 to-forest-600")} style={{ width: `${Math.round(bar * 100)}%` }} /></div>}
    </div>
  );
}
