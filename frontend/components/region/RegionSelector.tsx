"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { useRegion } from "@/contexts/RegionContext";
import { cn } from "@/lib/utils";

export function RegionSelector({ className }: { className?: string }) {
  const { regions, selectedRegion, setSelectedRegionId } = useRegion();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => selectedRegion, [selectedRegion]);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select demo region"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-charcoal-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
            <MapPin size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Demo region</div>
            <div className="truncate text-sm font-semibold text-charcoal-900">{selected.displayName}</div>
            <div className="truncate text-[11px] text-charcoal-500">{selected.state} · {selected.primaryCrop}</div>
          </div>
        </div>
        <ChevronDown size={16} className={cn("shrink-0 text-charcoal-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 rounded-2xl border border-charcoal-200 bg-white p-2 shadow-xl">
          <div className="mb-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Select demo region</div>
          <div className="space-y-1" role="listbox" aria-label="Demo region options">
            {regions.map((region) => {
              const active = region.id === selected.id;
              return (
                <button
                  key={region.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedRegionId(region.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all",
                    active ? "bg-forest-800 text-white" : "hover:bg-forest-50 hover:text-forest-800 text-charcoal-800"
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{region.displayName}</div>
                    <div className={cn("truncate text-[11px]", active ? "text-emerald-200" : "text-charcoal-500")}>{region.state} · {region.primaryCrop}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
