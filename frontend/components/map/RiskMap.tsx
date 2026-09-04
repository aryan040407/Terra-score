"use client";
import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { Region } from "@/lib/types";
import { riskHex } from "@/lib/utils";

function FitBounds({ regions }: { regions: Region[] }) {
  const map = useMap();
  useMemo(() => {
    if (regions.length > 1) {
      const lats = regions.map((r) => r.latitude); const lons = regions.map((r) => r.longitude);
      map.fitBounds([[Math.min(...lats) - 1, Math.min(...lons) - 1], [Math.max(...lats) + 1, Math.max(...lons) + 1]], { padding: [10, 10] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions.length]);
  return null;
}

export function RiskMap({ regions, onSelect, selected, height = 520, compact = false }: { regions: Region[]; onSelect?: (r: Region) => void; selected?: Region | null; height?: number; compact?: boolean }) {
  const key = (r: Region) => `${r.state}-${r.district}`;
  return (
    <MapContainer center={[22.5, 79]} zoom={5} minZoom={4} maxZoom={10} style={{ height, width: "100%", background: "#eef2ee" }} scrollWheelZoom={!compact} zoomControl attributionControl={!compact}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" opacity={0.85} />
      <FitBounds regions={regions} />
      {regions.map((r) => {
        const color = riskHex(r.average_terra_score);
        const isSel = selected && key(selected) === key(r);
        const radius = compact ? 5 + Math.sqrt(r.farms) * 1.2 : 7 + Math.sqrt(r.farms) * 1.8;
        return (
          <CircleMarker key={key(r)} center={[r.latitude, r.longitude]} radius={radius}
            pathOptions={{ color: isSel ? "#18181c" : "#fff", weight: isSel ? 2.5 : 1.2, fillColor: color, fillOpacity: 0.78 }}
            eventHandlers={{ click: () => onSelect?.(r), mouseover: (e) => e.target.setStyle({ fillOpacity: 1, weight: 2 }), mouseout: (e) => e.target.setStyle({ fillOpacity: 0.78, weight: isSel ? 2.5 : 1.2 }) }}>
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                <strong>{r.district}</strong>, {r.state}<br />
                TerraScore <strong style={{ color }}>{Math.round(r.average_terra_score)}</strong> · {r.farms} farms<br />
                {r.dominant_crop} · {r.risk_level}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
