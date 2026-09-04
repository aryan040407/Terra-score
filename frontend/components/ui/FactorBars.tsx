"use client";
import type { Factor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { EmptyState } from "./primitives";

export function FactorBars({ factors, tone, className }: { factors: Factor[]; tone: "risk" | "protective"; className?: string }) {
  if (!factors.length) return <EmptyState title={tone === "risk" ? "No material risk drivers" : "No protective factors detected"} className="p-4" />;
  const max = Math.max(...factors.map((f) => f.contribution), 0.0001);
  return (
    <ul className={cn("space-y-3", className)}>
      {factors.map((f, i) => (
        <li key={f.feature} className="animate-fadeUp" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-charcoal-800">
              {tone === "risk" ? <ArrowUpRight size={14} className="text-red-500" /> : <ArrowDownRight size={14} className="text-emerald-600" />}
              {f.description}
            </span>
            <span className="tabular-nums text-xs font-semibold text-charcoal-500">{(f.contribution * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal-100">
            <div className={cn("h-full rounded-full transition-all duration-700", tone === "risk" ? "bg-gradient-to-r from-orange-400 to-red-500" : "bg-gradient-to-r from-emerald-400 to-forest-600")} style={{ width: `${(f.contribution / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
