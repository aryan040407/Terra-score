"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight, BarChart3, CloudRain, Droplets, Globe2, MapPinned, ShieldAlert, Sprout, TrendingDown } from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { TerraScoreTrend } from "@/components/charts/charts";
import { Card, CardSkeleton, EmptyState, ErrorState, SimTag, Stat } from "@/components/ui/primitives";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";

const RiskMap = dynamic(() => import("@/components/map/RiskMap").then((m) => m.RiskMap), {
  ssr: false,
  loading: () => <div className="skeleton h-[420px] w-full" />,
});

export default function GovernmentPage() {
  return (
    <RoleGuard requiredRole="government">
      <GovernmentPortal />
    </RoleGuard>
  );
}

function GovernmentPortal() {
  const summary = useApi("summary", api.summary, { ttl: 60_000 });
  const regions = useApi("regions-all", () => api.regions(), { ttl: 120_000 });
  const alerts = useApi("alerts", () => api.alerts(5), { ttl: 60_000 });
  const farms = useApi("farms-gov", () => api.farms({ limit: 12 }), { ttl: 60_000 });

  const regionList = regions.data?.regions ?? [];
  const priorityRegions = useMemo(
    () => [...regionList].sort((a, b) => a.average_terra_score - b.average_terra_score).slice(0, 5),
    [regionList],
  );
  const stateSummary = useMemo(() => {
    const map = new Map<string, { state: string; farms: number; avg_terra_score: number; avg_rainfall: number; avg_soil_moisture: number; avg_drought_index: number; districts: number; high_risk_farms: number }>();
    regionList.forEach((r) => {
      const existing = map.get(r.state);
      const farmsCount = existing ? existing.farms + r.farms : r.farms;
      const avgTerra = existing ? (existing.avg_terra_score * existing.farms + r.average_terra_score * r.farms) / farmsCount : r.average_terra_score;
      const avgRain = existing ? (existing.avg_rainfall * existing.farms + r.avg_rainfall * r.farms) / farmsCount : r.avg_rainfall;
      const avgSoil = existing ? (existing.avg_soil_moisture * existing.farms + r.avg_soil_moisture * r.farms) / farmsCount : r.avg_soil_moisture;
      const avgDrought = existing ? (existing.avg_drought_index * existing.farms + r.avg_drought_index * r.farms) / farmsCount : r.avg_drought_index;
      const highRisk = existing ? existing.high_risk_farms + r.high_risk_farms : r.high_risk_farms;
      map.set(r.state, {
        state: r.state,
        farms: farmsCount,
        avg_terra_score: avgTerra,
        avg_rainfall: avgRain,
        avg_soil_moisture: avgSoil,
        avg_drought_index: avgDrought,
        districts: (existing?.districts ?? 0) + 1,
        high_risk_farms: highRisk,
      });
    });
    return [...map.values()].sort((a, b) => a.avg_terra_score - b.avg_terra_score);
  }, [regionList]);

  const worstRegion = priorityRegions[0];
  const mostAtRiskState = stateSummary[0];
  const climateAverage = regionList.length
    ? regionList.reduce((acc, r) => ({
        avg_rainfall: acc.avg_rainfall + r.avg_rainfall,
        avg_soil_moisture: acc.avg_soil_moisture + r.avg_soil_moisture,
        avg_drought_index: acc.avg_drought_index + r.avg_drought_index,
      }), { avg_rainfall: 0, avg_soil_moisture: 0, avg_drought_index: 0 })
    : null;
  const avgRainfall = climateAverage && regionList.length ? climateAverage.avg_rainfall / regionList.length : null;
  const avgSoilMoisture = climateAverage && regionList.length ? climateAverage.avg_soil_moisture / regionList.length : null;
  const avgDroughtIndex = climateAverage && regionList.length ? climateAverage.avg_drought_index / regionList.length : null;
  const soilAverage = farms.data?.items && farms.data.items.length
    ? farms.data.items.reduce((sum, f) => sum + f.soil_health, 0) / farms.data.items.length
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">Government climate intelligence portal</h1>
          <p className="mt-1 text-sm text-charcoal-500">A district-level view of climate risk using the project&apos;s actual farm, rainfall, soil moisture, and TerraScore data.</p>
        </div>
        <SimTag text="Regional intelligence" />
      </div>

      {summary.loading || regions.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} lines={3} />)}
        </div>
      ) : summary.error || regions.error ? (
        <ErrorState message={summary.error || regions.error || "Regional data unavailable."} onRetry={() => { summary.refresh(); regions.refresh(); }} />
      ) : summary.data && regions.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 animate-fadeUp">
            <Stat label="Districts monitored" value={regionList.length} sub="risk coverage" icon={Globe2} tone="good" />
            <Stat label="States covered" value={summary.data.states} sub="district-level view" icon={Sprout} tone="good" />
            <Stat label="Avg district TerraScore" value={Math.round(summary.data.average_terra_score)} sub="portfolio baseline" icon={BarChart3} tone="warn" />
            <Stat label="Highest-risk state" value={mostAtRiskState ? mostAtRiskState.state : "N/A"} sub={mostAtRiskState ? `${Math.round(mostAtRiskState.avg_terra_score)} avg score` : "pending"} icon={TrendingDown} tone="bad" />
            <Stat label="Priority districts" value={priorityRegions.length} sub="lowest avg TerraScore" icon={AlertTriangle} tone="bad" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card title="Regional risk map" subtitle="District risk concentrations from available data" icon={MapPinned}>
              <div className="h-[420px] overflow-hidden rounded-xl">
                <RiskMap regions={regionList} height={420} compact />
              </div>
            </Card>

            <Card title="Priority regions" subtitle="Districts with the lowest average TerraScore in the current view" icon={ShieldAlert}>
              {priorityRegions.length ? (
                <div className="space-y-3">
                  {priorityRegions.map((r, index) => (
                    <div key={`${r.state}-${r.district}`} className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-charcoal-900">{index === 0 ? "Priority 1" : index === 1 ? "Priority 2" : index === 2 ? "Priority 3" : `Priority ${index + 1}`} · {r.district}</p>
                          <p className="mt-1 text-xs text-charcoal-500">{r.state} · {r.farms} farms · {r.dominant_crop}</p>
                        </div>
                        <span className="text-lg font-semibold tabular-nums text-charcoal-900">{Math.round(r.average_terra_score)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No regional priority data" detail="No region records are available in the current dataset." />
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="State risk concentration" subtitle="Average district performance by state" icon={Globe2}>
              {stateSummary.length ? (
                <div className="space-y-3">
                  {stateSummary.slice(0, 8).map((s) => (
                    <div key={s.state} className="flex items-center justify-between gap-3 rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-charcoal-900">{s.state}</p>
                        <p className="text-xs text-charcoal-500">{s.districts} districts · {s.farms} farms</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-charcoal-900">{Math.round(s.avg_terra_score)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-charcoal-400">Avg TerraScore</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No state-level records" detail="The current dataset does not provide state-level district aggregation for this view." />
              )}
            </Card>

            <Card title="Climate conditions snapshot" subtitle="Averages from the active district dataset" icon={CloudRain}>
              {avgRainfall !== null && avgSoilMoisture !== null && avgDroughtIndex !== null ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Rainfall</p>
                      <p className="mt-2 text-2xl font-semibold text-charcoal-900">{avgRainfall.toFixed(0)} mm</p>
                    </div>
                    <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Soil moisture</p>
                      <p className="mt-2 text-2xl font-semibold text-charcoal-900">{avgSoilMoisture.toFixed(0)}%</p>
                    </div>
                    <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Drought index</p>
                      <p className="mt-2 text-2xl font-semibold text-charcoal-900">{avgDroughtIndex.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-charcoal-600">These climate values are directly derived from the available district and farm records in the project dataset. No live weather feed or external government statistics are being invented in this view.</p>
                </div>
              ) : (
                <EmptyState title="Climate snapshot unavailable" detail="No district climate records are available in the current data layer." />
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Regional risk" subtitle="District-level risk summary" icon={Globe2}>
              {regionList.length ? (
                <div className="space-y-3">
                  {regionList.slice(0, 8).map((r) => (
                    <div key={`${r.state}-${r.district}`} className="flex items-center justify-between gap-3 rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-charcoal-900">{r.district}</p>
                        <p className="text-xs text-charcoal-500">{r.state} · {r.farms} farms · {r.dominant_crop}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-charcoal-900">{Math.round(r.average_terra_score)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-charcoal-400">Avg score</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No regional records" detail="The available dataset does not include monitored districts for this view." />
              )}
            </Card>

            <Card title="Soil and field conditions" subtitle="Based on the current farm-level dataset" icon={Droplets}>
              {soilAverage !== null ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Average soil health</p>
                    <p className="mt-2 text-3xl font-semibold text-charcoal-900">{soilAverage.toFixed(1)}/100</p>
                  </div>
                  <div className="space-y-2 text-sm text-charcoal-600">
                    <p>Current soil health values are derived from farm records in the active dataset.</p>
                    <p>Where the dataset does not contain deeper soil chemistry, the dashboard remains explicit about the limitation rather than inferring missing values.</p>
                  </div>
                </div>
              ) : (
                <EmptyState title="Soil conditions unavailable" detail="No farm-level soil health values are available in the active dataset." />
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Climate risk trends" subtitle="Current dataset snapshot" icon={CloudRain}>
              {summary.data.trend_series?.length ? (
                <TerraScoreTrend data={summary.data.trend_series} height={220} />
              ) : (
                <EmptyState title="Trend data unavailable" detail="No trend history is present in the current snapshot." />
              )}
            </Card>

            <Card title="Regional alerts" subtitle="Signals from the model and current data" icon={ShieldAlert}>
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
                <EmptyState title="No regional alerts" detail="No active regional alerts are present in the current dataset." />
              )}
            </Card>
          </div>

          <Card title="Model insights" subtitle="Review the signal driving the regional view" icon={ArrowRight}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-sm text-charcoal-600">TerraScore turns district climate, soil moisture, drought pressure, and crop conditions into a measurable risk score that can guide intervention decisions and field prioritisation.</p>
              <Link href="/model" className="btn-primary inline-flex items-center gap-2">
                Open model insights <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
