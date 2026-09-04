"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Map as MapIcon, Filter, X, MapPin, Sprout, TrendingDown, Droplets, CloudRain, ArrowRight, Layers } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Region } from "@/lib/types";
import { Card, CardSkeleton, EmptyState, ErrorState, RiskBadge, Select, SimTag, Tag } from "@/components/ui/primitives";
import { RISK_META, fmt, cn } from "@/lib/utils";
import { Donut } from "@/components/charts/charts";

const RiskMap = dynamic(() => import("@/components/map/RiskMap").then((m) => m.RiskMap), { ssr: false, loading: () => <div className="skeleton h-[560px] w-full" /> });
const LEVELS = ["Very Low Risk", "Low Risk", "Moderate Risk", "High Risk", "Critical Risk"] as const;

export default function RegionsPage() {
  const [state, setState] = useState(""); const [crop, setCrop] = useState(""); const [level, setLevel] = useState("");
  const [selected, setSelected] = useState<Region | null>(null);
  const key = `regions-${state}-${crop}-${level}`;
  const { data, loading, error, refresh } = useApi(key, () => api.regions({ state, crop, risk_level: level }), { ttl: 120_000 });
  const regions = data?.regions || [];
  useEffect(() => { if (!regions.length) setSelected(null); }, [regions.length]);

  const stats = useMemo(() => {
    if (!regions.length) return null;
    const farms = regions.reduce((a, r) => a + r.farms, 0);
    const avg = regions.reduce((a, r) => a + r.average_terra_score * r.farms, 0) / farms;
    const high = regions.filter((r) => r.average_terra_score < 400).length;
    const worst = [...regions].sort((a, b) => a.average_terra_score - b.average_terra_score).slice(0, 5);
    return { farms, avg, high, worst, districts: regions.length };
  }, [regions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">Regional Risk Heatmap</h1>
          <p className="mt-1 text-sm text-charcoal-500">District-level portfolio monitoring for lenders and insurers. Click a region for details.</p>
        </div>
        <SimTag text="Simulated farm locations & risk" />
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3 animate-fadeUp">
        <span className="flex items-center gap-1.5 pl-1 text-xs font-semibold text-charcoal-500"><Filter size={13} /> Filters</span>
        <Select value={state} onChange={setState} options={data?.filters.states || []} placeholder="All states" />
        <Select value={crop} onChange={setCrop} options={data?.filters.crops || []} placeholder="All crops" />
        <Select value={level} onChange={setLevel} options={[...LEVELS]} placeholder="All risk levels" />
        {(state || crop || level) && <button onClick={() => { setState(""); setCrop(""); setLevel(""); }} className="btn-ghost text-xs"><X size={13} /> Clear</button>}
        <div className="ml-auto flex flex-wrap items-center gap-3 pr-1 text-[11px] text-charcoal-500">
          {LEVELS.map((l) => <span key={l} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_META[l].hex }} />{l.replace(" Risk", "")}</span>)}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-fadeUp">
          {[["Districts", stats.districts, Layers], ["Farms", fmt.int(stats.farms), Sprout], ["Weighted Avg TerraScore", fmt.num(stats.avg, 0), MapIcon], ["High-Risk Districts", stats.high, TrendingDown]].map(([l, v, I]) => {
            const Icon = I as typeof MapIcon;
            return <div key={l as string} className="card flex items-center gap-3 p-4"><div className="rounded-lg bg-forest-50 p-2 text-forest-700"><Icon size={16} /></div><div><p className="label">{l as string}</p><p className="text-xl font-semibold text-charcoal-900">{v as string}</p></div></div>;
          })}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden p-0">
          {error ? <ErrorState message={error} onRetry={refresh} className="border-0 shadow-none" /> : loading && !data ? <div className="skeleton h-[560px]" /> : regions.length === 0 ? <EmptyState title="No regions match these filters" detail="Try clearing a filter." className="h-[560px]" /> : (
            <div className="h-[560px]"><RiskMap regions={regions} onSelect={setSelected} selected={selected} height={560} /></div>
          )}
        </Card>

        <div className="space-y-6">
          {selected ? <RegionDetail r={selected} onClose={() => setSelected(null)} /> : (
            <Card title="Region Details" subtitle="Select a district on the map" icon={MapPin}>
              <EmptyState title="No region selected" detail="Click any circle to see district TerraScore, farm count, dominant crop and predicted yield loss." />
            </Card>
          )}
          {stats && (
            <Card title="Highest-Risk Districts" subtitle="Lowest average TerraScore in view">
              <ul className="divide-y divide-charcoal-100">
                {stats.worst.map((r) => (
                  <li key={`${r.state}-${r.district}`}>
                    <button onClick={() => setSelected(r)} className={cn("flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:bg-forest-50/50", selected?.district === r.district && "bg-forest-50/60")}>
                      <div><p className="font-medium text-charcoal-900">{r.district}</p><p className="text-xs text-charcoal-500">{r.state} · {r.farms} farms · {r.dominant_crop}</p></div>
                      <span className="text-lg font-semibold tabular-nums" style={{ color: RISK_META[r.risk_level].hex }}>{Math.round(r.average_terra_score)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function RegionDetail({ r, onClose }: { r: Region; onClose: () => void }) {
  const mix = Object.entries(r.crop_mix).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: ["#1e4230", "#3e805b", "#10b981", "#6ee7b7", "#93aa80", "#d5dfcc", "#b6c7a8"][i % 7] }));
  return (
    <Card className="animate-fadeUp" title={r.district} subtitle={r.state} icon={MapPin} action={<button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close"><X size={14} /></button>}>
      <div className="flex items-end justify-between">
        <div><p className="label">Average TerraScore</p><p className="text-4xl font-semibold tracking-tight" style={{ color: RISK_META[r.risk_level].hex }}>{Math.round(r.average_terra_score)}</p></div>
        <RiskBadge level={r.risk_level} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Kv label="Number of farms" value={String(r.farms)} />
        <Kv label="Dominant crop" value={r.dominant_crop} />
        <Kv label="Average risk" value={fmt.pct(r.average_risk_probability * 100)} />
        <Kv label="Predicted yield loss" value={fmt.pct(r.predicted_yield_loss_pct)} />
        <Kv label="High-risk farms" value={String(r.high_risk_farms)} />
        <Kv label="Good irrigation" value={fmt.pct(r.irrigation_good_pct, 0)} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg bg-charcoal-50 p-2"><CloudRain size={13} className="text-blue-500" />{fmt.num(r.avg_rainfall, 0)} mm</div>
        <div className="flex items-center gap-1.5 rounded-lg bg-charcoal-50 p-2"><Droplets size={13} className="text-forest-600" />{fmt.num(r.avg_soil_moisture, 0)}% SM</div>
        <div className="flex items-center gap-1.5 rounded-lg bg-charcoal-50 p-2"><TrendingDown size={13} className="text-amber-600" />DI {fmt.num(r.avg_drought_index, 2)}</div>
      </div>
      <p className="label mt-4 mb-1">Crop mix</p>
      <Donut data={mix} height={170} />
      <Link href={`/farms?state=${encodeURIComponent(r.state)}&district=${encodeURIComponent(r.district)}`} className="btn-secondary mt-3 w-full">View farms in {r.district} <ArrowRight size={14} /></Link>
    </Card>
  );
}
function Kv({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-charcoal-100 p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">{label}</p><p className="mt-0.5 font-semibold text-charcoal-900">{value}</p></div>;
}
