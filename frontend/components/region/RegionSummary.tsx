"use client";

import { CloudRain, Droplets, MapPin, Sprout, TrendingDown } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { useRegion } from "@/contexts/RegionContext";
import { Card } from "@/components/ui/primitives";
import { fmt, RISK_META } from "@/lib/utils";

export function RegionSummary() {
  const { selectedRegion } = useRegion();
  const regionData = useApi(`region-detail-${selectedRegion.state}-${selectedRegion.district}`, () => api.regions({ state: selectedRegion.state, risk_level: undefined }), { ttl: 120_000 });
  const farms = useApi(`region-farms-${selectedRegion.state}-${selectedRegion.district}`, () => api.farms({ state: selectedRegion.state, district: selectedRegion.district, limit: 50 }), { ttl: 60_000 });

  const entry = regionData.data?.regions.find((r) => r.state === selectedRegion.state && r.district === selectedRegion.district) ?? null;
  const totalFarms = farms.data?.total ?? entry?.farms ?? 0;

  return (
    <Card className="animate-fadeUp" title="Current demonstration region" subtitle={selectedRegion.description}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-charcoal-700">
          <span className="flex items-center gap-2 rounded-full bg-forest-50 px-2.5 py-1.5 text-forest-800"><MapPin size={14} /> {selectedRegion.displayName}</span>
          <span className="rounded-full bg-charcoal-100 px-2.5 py-1.5 text-charcoal-700">{selectedRegion.primaryCrop}</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={MapPin} label="State" value={selectedRegion.state} />
          <Metric icon={Sprout} label="District" value={selectedRegion.district} />
          <Metric icon={CloudRain} label="Rainfall" value={entry ? `${fmt.num(entry.avg_rainfall, 0)} mm` : "Unavailable"} />
          <Metric icon={Droplets} label="Soil moisture" value={entry ? `${fmt.num(entry.avg_soil_moisture, 0)}%` : "Unavailable"} />
          <Metric icon={TrendingDown} label="Yield / crop risk" value={entry ? fmt.pct(entry.predicted_yield_loss_pct) : "Unavailable"} />
          <Metric icon={MapPin} label="Farm / record count" value={String(totalFarms)} />
          <Metric icon={MapPin} label="TerraScore" value={entry ? `${Math.round(entry.average_terra_score)}` : "Unavailable"} />
          <Metric icon={MapPin} label="Risk band" value={entry ? entry.risk_level : "Unavailable"} tone={entry ? RISK_META[entry.risk_level].text : undefined} />
        </div>

        {regionData.error || farms.error ? (
          <p className="text-xs text-amber-700">Regional data is temporarily unavailable. Try refreshing the page or switch to another demo region.</p>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof MapPin; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal-400">
        <Icon size={12} /> {label}
      </div>
      <div className={`mt-2 text-sm font-semibold ${tone ?? "text-charcoal-900"}`}>{value}</div>
    </div>
  );
}
