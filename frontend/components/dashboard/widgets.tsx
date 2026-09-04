"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Radio, ArrowRight, Thermometer, Droplets, CloudRain, Wind, Leaf, Activity } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { Alert, Telemetry } from "@/lib/types";
import { Card, CardSkeleton, EmptyState, ErrorState, SimTag, Tag } from "@/components/ui/primitives";
import { cn, fmt } from "@/lib/utils";

export function AlertsPanel({ limit = 6, compact = false }: { limit?: number; compact?: boolean }) {
  const { data, loading, error, refresh } = useApi(`alerts-${limit}`, () => api.alerts(limit), { ttl: 60_000 });
  if (loading) return <CardSkeleton lines={5} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const alerts = data?.alerts || [];
  return (
    <Card title="Intelligent Alerts" subtitle="Generated from portfolio data movements" icon={Activity} action={<SimTag text="Generated from simulated data" />}>
      {alerts.length === 0 ? <EmptyState title="No alerts" detail="No notable movements detected in the current window." /> : (
        <ul className={cn("divide-y divide-charcoal-100", compact && "text-sm")}>
          {alerts.map((a: Alert, i) => (
            <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 animate-fadeUp" style={{ animationDelay: `${i * 50}ms` }}>
              <span className={cn("mt-0.5 rounded-lg p-1.5", a.type === "warning" ? "bg-amber-50 text-amber-600" : a.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-forest-50 text-forest-700")}>
                {a.type === "warning" ? <AlertTriangle size={14} /> : a.type === "success" ? <CheckCircle2 size={14} /> : <Info size={14} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-charcoal-900">{a.title}</p>
                {!compact && <p className="mt-0.5 text-xs text-charcoal-500">{a.detail}</p>}
              </div>
              <Tag>{a.region}</Tag>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type Reading = keyof Telemetry["readings"];
const READINGS: { key: Reading; label: string; unit: string; icon: typeof Thermometer }[] = [
  { key: "temperature_c", label: "Temperature", unit: "°C", icon: Thermometer },
  { key: "soil_moisture_pct", label: "Soil moisture", unit: "%", icon: Droplets },
  { key: "precipitation_mm", label: "Precipitation", unit: "mm", icon: CloudRain },
  { key: "humidity_pct", label: "Humidity", unit: "%", icon: Wind },
  { key: "ndvi", label: "NDVI (crop vigour)", unit: "", icon: Leaf },
];

export function LiveTelemetry({ farmId, intervalMs = 4000 }: { farmId: string; intervalMs?: number }) {
  const { data, error, loading, refresh } = useApi(`telemetry-${farmId}`, () => api.telemetry(farmId), { ttl: 0, refreshMs: intervalMs });
  const prev = useRef<Telemetry["readings"] | null>(null);
  const [last, setLast] = useState<Telemetry["readings"] | null>(null);
  useEffect(() => { if (data) { setLast(prev.current); prev.current = data.readings; } }, [data]);
  if (loading && !data) return <CardSkeleton lines={5} />;
  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;
  return (
    <Card title="Data Ingestion" subtitle={`Streaming feeds for ${farmId}`} icon={Radio}
      action={<span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulseDot" />Simulated live telemetry</span>}>
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        {data.sources.map((s) => (
          <div key={s.name} className="rounded-xl border border-charcoal-100 bg-charcoal-50/60 p-2.5">
            <p className="text-xs font-semibold text-charcoal-800">{s.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-charcoal-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{s.status} · {s.latency_ms} ms</p>
          </div>
        ))}
      </div>
      <ul className="divide-y divide-charcoal-100">
        {READINGS.map((r) => {
          const cur = data.readings[r.key]; const old = last?.[r.key];
          const d = old !== undefined && old !== null ? cur - old : 0;
          return (
            <li key={r.key} className="flex items-center justify-between py-2.5 text-sm">
              <span className="flex items-center gap-2 text-charcoal-700"><r.icon size={14} className="text-forest-600" />{r.label}</span>
              <span className="flex items-center gap-2 tabular-nums">
                {old !== undefined && old !== null && <span className="text-xs text-charcoal-400">{old}{r.unit}</span>}
                {old !== undefined && old !== null && <ArrowRight size={12} className="text-charcoal-300" />}
                <span key={cur} className="font-semibold text-charcoal-900 animate-fadeUp">{cur}{r.unit}</span>
                {d !== 0 && <span className={cn("text-[10px] font-semibold", d > 0 ? "text-amber-600" : "text-forest-600")}>{d > 0 ? "▲" : "▼"}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-charcoal-400">Last update {fmt.time(data.timestamp)} · providers are mock adapters; real feeds plug into the same interface.</p>
    </Card>
  );
}
