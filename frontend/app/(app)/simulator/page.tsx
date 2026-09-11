"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FlaskConical, CloudRain, Thermometer, Droplets, Waves, Sun, Bug, Play, RotateCcw, ArrowRight, Sparkles, TrendingDown, TrendingUp, Search } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { WhatIfResponse } from "@/lib/types";
import { Card, CardSkeleton, EmptyState, ErrorState, RiskBadge, SimTag } from "@/components/ui/primitives";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { FactorBars } from "@/components/ui/FactorBars";
import { useToast } from "@/components/ui/Toast";
import { useCountUp } from "@/hooks/useCountUp";
import { useRegion } from "@/contexts/RegionContext";
import { cn, fmt, RISK_META } from "@/lib/utils";

export default function SimulatorPage() { return <Suspense fallback={<CardSkeleton />}><Simulator /></Suspense>; }

const PRESETS = [
  { name: "Dry spell", desc: "Rain −20%, Temp +2°C, Soil moisture −15%", v: { rain: -20, temp: 2, sm: -15 } },
  { name: "Severe drought", desc: "Rain −45%, Temp +3.5°C, Drought 0.85", v: { rain: -45, temp: 3.5, sm: -30, drought: 0.85 } },
  { name: "Irrigation upgrade", desc: "Irrigation → Good, Soil moisture +20%", v: { irrigation: "Good" as const, sm: 20 } },
  { name: "Pest outbreak", desc: "Pest risk 0.8, Humidity-driven", v: { pest: 0.8 } },
];

function Simulator() {
  const params = useSearchParams();
  const { toast } = useToast();
  const { selectedRegion } = useRegion();
  const [farmId, setFarmId] = useState(params.get("farm") || selectedRegion.farmId);
  const [input, setInput] = useState(farmId);
  const farm = useApi(`farm-${farmId}`, () => api.farm(farmId));
  const f = farm.data;
  const liveWeather = useApi(f ? `weather-${f.farm.farm_id}` : null, () => api.weather(f!.farm.latitude, f!.farm.longitude), { ttl: 300_000 });

  const [rain, setRain] = useState(0); const [temp, setTemp] = useState(0); const [sm, setSm] = useState(0);
  const [irrigation, setIrrigation] = useState<"None" | "Partial" | "Good" | "">(""); const [drought, setDrought] = useState<number | null>(null); const [pest, setPest] = useState<number | null>(null);
  const [result, setResult] = useState<WhatIfResponse | null>(null); const [running, setRunning] = useState(false); const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFarmId(params.get("farm") || selectedRegion.farmId);
  }, [params, selectedRegion.farmId]);

  useEffect(() => { if (f) { setDrought(f.farm.drought_index); setPest(f.farm.pest_risk); setIrrigation(f.farm.irrigation_status); setResult(null); } }, [f]);

  const reset = () => { setRain(0); setTemp(0); setSm(0); if (f) { setDrought(f.farm.drought_index); setPest(f.farm.pest_risk); setIrrigation(f.farm.irrigation_status); } setResult(null); };
  const applyPreset = (p: typeof PRESETS[number]) => { reset(); setRain(p.v.rain ?? 0); setTemp(p.v.temp ?? 0); setSm(p.v.sm ?? 0); if (p.v.drought !== undefined) setDrought(p.v.drought); if (p.v.pest !== undefined) setPest(p.v.pest); if (p.v.irrigation) setIrrigation(p.v.irrigation); };
  const applyCurrentWeather = () => {
    if (!f || !liveWeather.data) return;
    const rainfallDelta = ((liveWeather.data.precipitation ?? f.farm.precipitation) - f.farm.precipitation) / f.farm.precipitation * 100;
    const tempDelta = (liveWeather.data.temperature ?? f.farm.temperature) - f.farm.temperature;
    setRain(Number((rainfallDelta || 0).toFixed(1)));
    setTemp(Number(tempDelta.toFixed(1)));
    setSm(0);
    setDrought(f.farm.drought_index);
    setPest(f.farm.pest_risk);
    setIrrigation(f.farm.irrigation_status);
    setResult(null);
  };

  const run = async () => {
    if (!f) return;
    setRunning(true); setErr(null);
    try {
      // Only send overrides that actually differ from baseline so the backend can apply its secondary coupling
      const dChanged = drought !== null && Math.abs(drought - f.farm.drought_index) > 1e-6;
      const pChanged = pest !== null && Math.abs(pest - f.farm.pest_risk) > 1e-6;
      const r = await api.whatIf({ farm_id: farmId, rainfall_change_pct: rain, temperature_change_c: temp, soil_moisture_change_pct: sm,
        irrigation_status: irrigation && irrigation !== f.farm.irrigation_status ? irrigation : undefined,
        drought_index: dChanged ? drought! : undefined, pest_risk: pChanged ? pest! : undefined });
      setResult(r);
    } catch (e) {
      const m = "Prediction could not be generated. Please check your inputs and try again.";
      setErr(m);
      toast("error", "Simulation failed", m);
    } finally {
      setRunning(false);
    }
  };

  const changed = rain !== 0 || temp !== 0 || sm !== 0 || (f && (irrigation !== f.farm.irrigation_status || Math.abs((drought ?? 0) - f.farm.drought_index) > 1e-6 || Math.abs((pest ?? 0) - f.farm.pest_risk) > 1e-6));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">What-If AI Simulator</h1>
          <p className="mt-1 text-sm text-charcoal-500">Demo context: {selectedRegion.displayName}. Change climate conditions and let the trained ML model recalculate risk and yield impact in real time.</p>
        </div>
        <div className="flex items-center gap-2">
          <SimTag text="Trained Model Prediction" />
          <form onSubmit={(e) => { e.preventDefault(); setFarmId(input.trim().toUpperCase()); }} className="flex items-center gap-2">
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" /><input value={input} onChange={(e) => setInput(e.target.value)} className="w-40 rounded-xl border border-charcoal-200 py-2 pl-8 pr-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="FARM-001" /></div>
            <button className="btn-secondary" type="submit">Load</button>
          </form>
        </div>
      </div>

      {farm.error ? <ErrorState message={farm.error} onRetry={farm.refresh} /> : (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          {/* Controls */}
          <Card title="Scenario Controls" subtitle={f ? `${f.farm.farm_id} · ${f.farm.crop_type} · ${f.farm.district}, ${f.farm.state}` : "Loading farm…"} icon={FlaskConical}
            action={<button onClick={reset} className="btn-ghost text-xs"><RotateCcw size={13} /> Reset</button>}>
            {!f ? <div className="space-y-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12" />)}</div> : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRESETS.map((p) => <button key={p.name} onClick={() => applyPreset(p)} title={p.desc} className="rounded-xl border border-charcoal-200 p-2.5 text-left text-xs transition-all hover:border-emerald-300 hover:bg-emerald-50/40"><p className="font-semibold text-charcoal-900">{p.name}</p><p className="mt-0.5 line-clamp-2 text-[10px] text-charcoal-500">{p.desc}</p></button>)}
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Current weather</p>
                      <p className="mt-1 text-sm font-semibold text-charcoal-900">{liveWeather.loading ? "Loading…" : liveWeather.data ? `${liveWeather.data.temperature ?? f.farm.temperature}°C · ${liveWeather.data.precipitation ?? f.farm.precipitation} mm` : "Live weather unavailable"}</p>
                    </div>
                    <button type="button" onClick={applyCurrentWeather} disabled={!liveWeather.data} className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-50">Use current weather</button>
                  </div>
                </div>
                <Slider icon={CloudRain} label="Rainfall" value={rain} min={-60} max={60} step={5} onChange={setRain} format={(v) => `${v > 0 ? "+" : ""}${v}%`} base={`${f.farm.precipitation} mm/mo`} scenario={`${(f.farm.precipitation * (1 + rain / 100)).toFixed(0)} mm/mo`} />
                <Slider icon={Thermometer} label="Temperature" value={temp} min={-3} max={6} step={0.5} onChange={setTemp} format={(v) => `${v > 0 ? "+" : ""}${v}°C`} base={`${f.farm.temperature}°C`} scenario={`${(f.farm.temperature + temp).toFixed(1)}°C`} />
                <Slider icon={Droplets} label="Soil moisture" value={sm} min={-50} max={50} step={5} onChange={setSm} format={(v) => `${v > 0 ? "+" : ""}${v}%`} base={`${f.farm.soil_moisture}%`} scenario={`${Math.min(100, f.farm.soil_moisture * (1 + sm / 100)).toFixed(0)}%`} />
                <Slider icon={Sun} label="Drought index" value={drought ?? 0} min={0} max={1} step={0.05} onChange={setDrought} format={(v) => v.toFixed(2)} base={f.farm.drought_index.toFixed(2)} scenario={(drought ?? 0).toFixed(2)} />
                <Slider icon={Bug} label="Pest risk" value={pest ?? 0} min={0} max={1} step={0.05} onChange={setPest} format={(v) => v.toFixed(2)} base={f.farm.pest_risk.toFixed(2)} scenario={(pest ?? 0).toFixed(2)} />
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-medium text-charcoal-800"><Waves size={15} className="text-forest-600" />Irrigation</span><span className="text-xs text-charcoal-500">baseline {f.farm.irrigation_status}</span></div>
                  <div className="grid grid-cols-3 gap-2">{(["None", "Partial", "Good"] as const).map((o) => <button key={o} onClick={() => setIrrigation(o)} className={cn("rounded-xl border py-2 text-sm font-medium transition-all", irrigation === o ? "border-forest-700 bg-forest-800 text-white" : "border-charcoal-200 hover:border-emerald-300")}>{o}</button>)}</div>
                </div>
                <button onClick={run} disabled={running || !changed} className="btn-primary w-full py-3 text-[15px]">
                  {running ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Recalculating with model…</> : <><Play size={15} /> Simulate Risk</>}
                </button>
                {!changed && <p className="text-center text-xs text-charcoal-400">Adjust a slider or pick a preset to enable simulation.</p>}
                {err && <p className="text-center text-xs text-red-600">{err}</p>}
              </div>
            )}
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {!f ? <CardSkeleton lines={6} className="min-h-[300px]" /> : !result ? (
              <Card className="min-h-[300px]">
                <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center">
                  <div className="flex flex-col items-center gap-2"><ScoreRing score={f.scoring.terra_score} size={170} /><RiskBadge level={f.scoring.risk_level} /></div>
                  <div>
                    <p className="label">Current TerraScore</p>
                    <p className="mt-1 text-sm text-charcoal-600">Baseline risk probability {fmt.pct(f.scoring.risk_probability * 100)} · predicted yield {fmt.num(f.scoring.predicted_yield, 2)} t/ha</p>
                    <EmptyState title="No scenario simulated yet" detail="Set a scenario on the left and click Simulate Risk. The same trained model will re-score the farm." className="mt-2 p-4" />
                  </div>
                </div>
              </Card>
            ) : <Result r={result} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({ icon: Icon, label, value, min, max, step, onChange, format, base, scenario }: { icon: typeof Sun; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; base: string; scenario: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-charcoal-800"><Icon size={15} className="text-forest-600" />{label}</span>
        <span className="flex items-center gap-2 text-xs text-charcoal-500"><span>{base}</span><ArrowRight size={11} /><span className="font-semibold text-charcoal-900">{scenario}</span><span className="rounded-md bg-charcoal-100 px-1.5 py-0.5 font-semibold tabular-nums text-charcoal-700">{format(value)}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Result({ r }: { r: WhatIfResponse }) {
  const change = useCountUp(r.change, 900);
  const yi = useCountUp(r.predicted_yield_impact_pct, 900);
  const worse = r.change < 0;
  const levelChanged = r.baseline_risk_level !== r.new_risk_level;

  const summaryText = r.scenario_summary.join(", ");
  const riskChangeText =
    r.baseline_risk_level === r.new_risk_level
      ? `remains ${r.new_risk_level}`
      : `shifts from ${r.baseline_risk_level} to ${r.new_risk_level}`;
  const changeText = r.change >= 0 ? `+${Math.round(r.change)}` : `${Math.round(r.change)}`;
  const explanationSentence = `With simulated scenario (${summaryText}), predicted crop risk ${riskChangeText}. TerraScore adjusts by ${changeText} points (from ${r.baseline_terra_score} to ${r.new_terra_score}) with estimated yield impact of ${r.predicted_yield_impact_pct >= 0 ? "+" : ""}${r.predicted_yield_impact_pct.toFixed(1)}%.`;

  return (
    <>
      <Card className="relative overflow-hidden animate-fadeUp">
        <div className={cn("pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl", worse ? "bg-red-100/60" : "bg-emerald-100/60")} />
        <div className="relative grid gap-6 md:grid-cols-[auto_1fr] items-center">
          <div className="flex items-center gap-4">
            <div className="text-center"><p className="label mb-1">Current</p><p className="text-3xl font-semibold tabular-nums text-charcoal-400">{r.baseline_terra_score}</p></div>
            <ArrowRight className="text-charcoal-300" />
            <div className="flex flex-col items-center gap-2"><ScoreRing score={r.new_terra_score} size={170} label="new TerraScore" /><RiskBadge level={r.new_risk_level} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="label">Scenario</p>
              <SimTag text="Model Prediction" />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5"><span className="badge bg-emerald-100 text-emerald-800">Model assessment using current weather conditions</span>{r.scenario_summary.map((s) => <span key={s} className="badge bg-charcoal-100 text-charcoal-700">{s}</span>)}</div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-charcoal-100 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Change</p><p className={cn("mt-1 flex items-center gap-1 text-xl font-semibold tabular-nums", worse ? "text-red-600" : "text-emerald-600")}>{worse ? <TrendingDown size={18} /> : <TrendingUp size={18} />}{change >= 0 ? "+" : ""}{Math.round(change)}</p></div>
              <div className="rounded-xl border border-charcoal-100 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Risk</p><p className="mt-1 text-sm font-semibold text-charcoal-900">{r.baseline_risk_level.replace(" Risk", "")} → <span style={{ color: RISK_META[r.new_risk_level].hex }}>{r.new_risk_level.replace(" Risk", "")}</span></p>{levelChanged && <p className="text-[10px] text-amber-600">Band changed</p>}</div>
              <div className="rounded-xl border border-charcoal-100 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Yield impact</p><p className={cn("mt-1 text-xl font-semibold tabular-nums", yi < 0 ? "text-red-600" : "text-emerald-600")}>{yi >= 0 ? "+" : ""}{yi.toFixed(1)}%</p></div>
            </div>
            <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs leading-relaxed text-forest-900">
              <span className="font-semibold text-emerald-800">Model Prediction Explanation: </span>
              {explanationSentence}
            </div>
            <p className="mt-3 text-xs text-charcoal-500">Risk probability {fmt.pct(r.baseline_risk_probability * 100)} → <b>{fmt.pct(r.new_risk_probability * 100)}</b> · predicted yield {r.baseline_predicted_yield} → <b>{r.new_predicted_yield}</b> t/ha · confidence {fmt.pct(r.confidence * 100, 0)}</p>
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top changed inputs" subtitle="Including secondary effects (e.g. less rain → lower soil moisture)" icon={Sparkles}>
          {r.top_changed_factors.length === 0 ? <EmptyState title="No inputs changed" /> : (
            <ul className="divide-y divide-charcoal-100 text-sm">{r.top_changed_factors.map((c) => (
              <li key={c.feature} className="flex items-center justify-between py-2.5"><span className="text-charcoal-800">{c.label}</span><span className="flex items-center gap-2 tabular-nums text-xs"><span className="text-charcoal-400">{c.baseline}</span><ArrowRight size={11} className="text-charcoal-300" /><span className="font-semibold text-charcoal-900">{c.scenario}</span><span className={cn("rounded-md px-1.5 py-0.5 font-semibold", c.direction === "up" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>{c.direction === "up" ? "▲" : "▼"} {Math.abs(c.delta)}</span></span></li>
            ))}</ul>
          )}
        </Card>
        <Card title="Scenario drivers" subtitle="Model-derived, for the simulated conditions">
          <p className="label mb-2 text-red-500">Risk factors</p><FactorBars factors={r.top_risk_factors.slice(0, 3)} tone="risk" />
          <p className="label mb-2 mt-4 text-emerald-600">Resilience factors</p><FactorBars factors={r.positive_resilience_factors.slice(0, 3)} tone="protective" />
        </Card>
      </div>
    </>
  );
}
