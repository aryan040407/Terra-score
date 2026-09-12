"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudRain,
  Droplets,
  Gauge,
  Lightbulb,
  MapPin,
  ShieldAlert,
  Sprout,
  Thermometer,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { WeatherTrend } from "@/components/charts/charts";
import { DataFreshness, DecisionSignal, ExplainScore, ModelConfidence, WhatChanged } from "@/components/explainability/ExplainScore";
import { FactorBars } from "@/components/ui/FactorBars";
import { Card, CardSkeleton, EmptyState, ErrorState, RiskBadge, SimTag, Stat } from "@/components/ui/primitives";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function FarmerPage() {
  return (
    <RoleGuard requiredRole="farmer">
      <FarmerPortal />
    </RoleGuard>
  );
}

function FarmerPortal() {
  const session = getSession();
  const summary = useApi("summary", api.summary, { ttl: 60_000 });
  const alerts = useApi("alerts", () => api.alerts(5), { ttl: 60_000 });
  const demo = useApi("demo", api.demo, { ttl: 60_000 });

  const score = demo.data?.scoring;
  const farm = demo.data?.farm;
  const liveWeather = useApi(
    farm ? `weather-${farm.farm_id}` : null,
    () => api.weather(farm!.latitude, farm!.longitude),
    { ttl: 300_000 },
  );
  const weather = demo.data?.telemetry;
  const riskFactors = score?.top_risk_factors ?? [];
  const name = session?.name || "Farmer";
  const liveWeatherTimestamp = liveWeather.data?.timestamp ? new Date(liveWeather.data.timestamp).getTime() : null;
  const liveWeatherAgeMinutes = liveWeatherTimestamp ? Math.max(0, Math.round((Date.now() - liveWeatherTimestamp) / 60000)) : null;

  const recommendations = [
    score && score.risk_probability > 0.45
      ? "Rainfall stress detected. Consider reviewing irrigation planning and soil moisture monitoring before the next dry spell."
      : "Current rainfall conditions remain manageable. Maintain irrigation timing and monitor soil moisture changes closely.",
    farm && farm.soil_health < 65
      ? "Soil health is below the preferred threshold. Continue moisture retention practices and schedule a field check."
      : "Soil condition is stable. Continue routine monitoring to keep the crop resilient through seasonal variability.",
    score && score.predicted_yield_loss_pct > 0.1
      ? "Crop stress is elevated. Monitor the affected field more closely and adjust irrigation or crop protection practices as needed."
      : "Yield risk remains moderate. Maintain the current monitoring cadence and watch rainfall signals.",
  ].filter(Boolean) as string[];

  const observedChanges = demo.data?.scoring?.top_risk_factors?.map((factor) => ({
    label: factor.label,
    baseline: Number(factor.value.toFixed(2)),
    scenario: Number(factor.value.toFixed(2)),
    delta: 0,
    direction: "up" as const,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">Good morning, {name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-charcoal-500">Understand your farm&apos;s climate risk and what to do next.</p>
        </div>
        <SimTag text="Demo weather scenario" />
      </div>

      {summary.loading || demo.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} lines={3} />)}
        </div>
      ) : summary.error || demo.error ? (
        <ErrorState message={summary.error || demo.error || "Farm data unavailable."} onRetry={() => { summary.refresh(); demo.refresh(); }} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 animate-fadeUp">
          <Stat label="TerraScore" value={score ? score.terra_score : "Data unavailable"} sub={score ? score.risk_level : "Model output pending"} icon={Gauge} tone="good" />
          <Stat label="Risk probability" value={score ? `${(score.risk_probability * 100).toFixed(0)}%` : "Data unavailable"} sub={score ? "model-estimated" : "pending"} icon={ShieldAlert} tone="warn" />
          <Stat label="Model confidence" value={score ? `${(score.confidence * 100).toFixed(0)}%` : "Data unavailable"} sub={score ? "actual model output" : "pending"} icon={CheckCircle2} tone="good" />
          <Stat label="Yield loss" value={score ? `${(score.predicted_yield_loss_pct * 100).toFixed(1)}%` : "Data unavailable"} sub="expected impact" icon={Droplets} tone="bad" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card title="Farm risk overview" subtitle={farm ? `${farm.farm_id} · ${farm.district}, ${farm.state}` : "Use the live demo farm inputs"} icon={Sprout}>
          {farm && score ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-4xl font-semibold tracking-tight text-charcoal-900">{score.terra_score}</p>
                  <p className="mt-1 text-sm text-charcoal-500">TerraScore / 1000</p>
                </div>
                <RiskBadge level={score.risk_level} size="lg" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Updated</p>
                  <p className="mt-1 text-sm font-medium text-charcoal-900">{summary.data?.last_updated ? new Date(summary.data.last_updated).toLocaleDateString("en-IN") : "—"}</p>
                </div>
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Crop</p>
                  <p className="mt-1 text-sm font-medium text-charcoal-900">{farm.crop_type}</p>
                </div>
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Area</p>
                  <p className="mt-1 text-sm font-medium text-charcoal-900">{farm.farm_area} ha</p>
                </div>
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Soil health</p>
                  <p className="mt-1 text-sm font-medium text-charcoal-900">{farm.soil_health}/100</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Farm score unavailable" detail="The backend has not returned a valid demo farm snapshot yet." />
          )}
        </Card>

        <Card title="Live weather" subtitle={liveWeather.data ? `Source: ${liveWeather.data.source}` : "Live weather unavailable — showing historical/model data."} icon={CloudRain}>
          {liveWeather.loading ? (
            <CardSkeleton lines={3} />
          ) : liveWeather.data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Live</p>
                  <p className="mt-1 text-xs text-emerald-700">Updated {liveWeatherAgeMinutes !== null ? `${liveWeatherAgeMinutes} minutes ago` : "recently"}</p>
                </div>
                <span className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Open-Meteo</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Rainfall</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-charcoal-900"><CloudRain size={14} className="text-blue-500" /> {liveWeather.data.precipitation ?? 0} mm</p>
                </div>
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Temperature</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-charcoal-900"><Thermometer size={14} className="text-amber-500" /> {liveWeather.data.temperature ?? 0}°C</p>
                </div>
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Humidity</p>
                  <p className="mt-1 text-sm font-semibold text-charcoal-900">{liveWeather.data.humidity ?? 0}%</p>
                </div>
                <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Condition</p>
                  <p className="mt-1 text-sm font-semibold text-charcoal-900">{liveWeather.data.weather_condition}</p>
                </div>
              </div>
              <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3 text-[11px] text-charcoal-500">
                <p><strong className="text-charcoal-700">Timestamp:</strong> {new Date(liveWeather.data.timestamp).toLocaleString("en-IN")}</p>
                <p className="mt-1"><strong className="text-charcoal-700">Source:</strong> {liveWeather.data.source}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Live weather unavailable — showing historical/model data.</div>
              {weather ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Rainfall</p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-charcoal-900"><CloudRain size={14} className="text-blue-500" /> {weather.readings.precipitation_mm} mm</p>
                  </div>
                  <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Temperature</p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-charcoal-900"><Thermometer size={14} className="text-amber-500" /> {weather.readings.temperature_c}°C</p>
                  </div>
                  <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Soil moisture</p>
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-charcoal-900"><Droplets size={14} className="text-emerald-600" /> {weather.readings.soil_moisture_pct}%</p>
                  </div>
                  <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Humidity</p>
                    <p className="mt-1 text-sm font-semibold text-charcoal-900">{weather.readings.humidity_pct}%</p>
                  </div>
                </div>
              ) : (
                <EmptyState title="Weather data unavailable" detail="No live weather feed is connected for this demo session." />
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card title="Why this score?" subtitle="Model-derived drivers for the current TerraScore" icon={AlertTriangle}>
          {score && riskFactors.length ? (
            <ExplainScore score={score.terra_score} riskLevel={score.risk_level} factors={riskFactors.slice(0, 4)} />
          ) : (
            <EmptyState title="Detailed explanation unavailable" detail="The score itself is available, but the current model driver breakdown is not populated." />
          )}
        </Card>

        <Card title="What changed?" subtitle="Deterministic changes from the current scenario data" icon={Lightbulb}>
          <WhatChanged changes={observedChanges} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recommended action" subtitle="Based on the current risk factors" icon={CheckCircle2}>
          {recommendations.length ? (
            <div className="space-y-3">
              {recommendations.map((item, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-charcoal-100 bg-forest-50/30 p-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p className="text-sm leading-relaxed text-charcoal-700">{item}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No recommendations available" detail="The model data does not currently show actionable deviations." />
          )}
        </Card>

        <Card title="Data status" subtitle="Clear source and freshness labels" icon={ShieldAlert}>
          <DataFreshness
            weatherStatus={liveWeather.data ? "Updated recently" : "Historical weather data"}
            modelStatus={score ? "Historical dataset" : "Model output pending"}
            scenarioStatus={"Scenario calculated now"}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Model confidence" subtitle="Actual value from the trained model" icon={CheckCircle2}>
          {score ? <ModelConfidence confidence={score.confidence} /> : <EmptyState title="Confidence unavailable" detail="The current prediction response does not include a valid confidence value." />}
        </Card>

        <Card title="Alerts" subtitle="Relevant climate and agronomic signals" icon={ShieldAlert}>
          {alerts.loading ? (
            <CardSkeleton lines={3} />
          ) : alerts.error ? (
            <ErrorState message={alerts.error} onRetry={alerts.refresh} />
          ) : (alerts.data?.alerts?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {alerts.data?.alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                  <p className="text-sm font-semibold text-charcoal-900">{alert.title}</p>
                  <p className="mt-1 text-xs text-charcoal-500">{alert.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No active high-risk alerts" detail="The current model snapshot does not show elevated alerts for this farm." />
          )}
        </Card>
      </div>

      {demo.data?.trends?.length ? (
        <Card title="Recent weather trend" subtitle="Rainfall and risk signals over the recent period" icon={MapPin}>
          <WeatherTrend data={demo.data.trends} height={220} />
        </Card>
      ) : null}
    </div>
  );
}
