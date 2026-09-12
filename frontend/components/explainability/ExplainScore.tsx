"use client";

import { Activity, ArrowDownRight, ArrowUpRight, Database, Gauge, Info, ShieldCheck } from "lucide-react";
import type { Factor } from "@/lib/types";
import { cn, RISK_META } from "@/lib/utils";

function impactLabel(value: number): "High impact" | "Medium impact" | "Low impact" {
  if (value >= 0.32) return "High impact";
  if (value >= 0.14) return "Medium impact";
  return "Low impact";
}

export function ExplainScore({
  score,
  riskLevel,
  factors,
  title = "WHY THIS SCORE?",
}: {
  score: number;
  riskLevel: string;
  factors: Factor[];
  title?: string;
}) {
  if (!factors?.length) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">Detailed explanation unavailable for this prediction.</p>
        <p>Model results are available, but the farm-specific driver breakdown is not currently populated.</p>
      </div>
    );
  }

  const max = Math.max(...factors.map((f) => Math.abs(f.contribution)), 0.0001);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-charcoal-200 bg-charcoal-50/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">{title}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-charcoal-900">{score}</p>
          </div>
          <div className="rounded-xl border border-charcoal-200 bg-white px-3 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Risk</p>
            <span className={cn("mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1", RISK_META[riskLevel as keyof typeof RISK_META]?.bg ?? "bg-charcoal-100", RISK_META[riskLevel as keyof typeof RISK_META]?.text ?? "text-charcoal-700", RISK_META[riskLevel as keyof typeof RISK_META]?.ring ?? "ring-charcoal-200")}>{riskLevel}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Main contributing factors</p>
        {factors.map((factor) => {
          const width = Math.max((Math.abs(factor.contribution) / max) * 100, 10);
          const impact = impactLabel(Math.abs(factor.contribution));
          return (
            <div key={factor.feature} className="rounded-xl border border-charcoal-100 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-red-500" />
                  <span className="text-sm font-medium text-charcoal-800">{factor.label}</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal-500">{impact}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal-100">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-red-400 to-red-500" style={{ width: `${width}%` }} />
              </div>
              <p className="mt-2 text-xs text-charcoal-500">{factor.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScoreComparison({
  currentScore,
  scenarioScore,
  currentRisk,
  scenarioRisk,
}: {
  currentScore: number;
  scenarioScore: number;
  currentRisk: string;
  scenarioRisk: string;
}) {
  const delta = scenarioScore - currentScore;
  return (
    <div className="rounded-2xl border border-charcoal-200 bg-charcoal-50 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-charcoal-200 bg-white p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Current</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-charcoal-900">{currentScore}</p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-500">{currentRisk}</p>
        </div>
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-charcoal-900 p-3 text-white">
            <ArrowDownRight size={18} />
          </div>
        </div>
        <div className="rounded-xl border border-charcoal-200 bg-white p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Scenario</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-charcoal-900">{scenarioScore}</p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-500">{scenarioRisk}</p>
        </div>
      </div>
      <div className="mt-4 text-center text-sm font-medium text-charcoal-700">
        Score change <span className={cn("tabular-nums font-semibold", delta < 0 ? "text-red-600" : "text-emerald-600")}>{delta >= 0 ? "+" : ""}{delta}</span>
      </div>
    </div>
  );
}

export function WhatChanged({
  changes,
}: {
  changes: { label: string; baseline: number; scenario: number; delta: number; direction: "up" | "down" }[];
}) {
  if (!changes?.length) {
    return <p className="text-sm text-charcoal-500">No deterministic changes were detected in the current scenario.</p>;
  }

  return (
    <ul className="space-y-3">
      {changes.map((change) => (
        <li key={change.label} className="flex items-center justify-between gap-3 rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
          <div>
            <p className="text-sm font-medium text-charcoal-800">{change.label}</p>
            <p className="text-[11px] text-charcoal-500">{change.baseline} → {change.scenario}</p>
          </div>
          <div className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold", change.direction === "up" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
            {change.direction === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change.direction === "up" ? "+" : ""}{change.delta}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DataFreshness({
  weatherStatus,
  modelStatus,
  scenarioStatus,
}: {
  weatherStatus: string;
  modelStatus: string;
  scenarioStatus: string;
}) {
  const entries = [
    { label: "Weather", value: weatherStatus, icon: Database },
    { label: "Model", value: modelStatus, icon: Gauge },
    { label: "Scenario", value: scenarioStatus, icon: Activity },
  ];

  return (
    <div className="space-y-3">
      {entries.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-forest-50 p-1.5 text-forest-700"><Icon size={13} /></span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">{label}</p>
          </div>
          <p className="text-xs font-medium text-charcoal-700">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function ModelConfidence({
  confidence,
  probability,
}: {
  confidence?: number;
  probability?: number;
}) {
  if (confidence === undefined && probability === undefined) {
    return <p className="text-sm text-charcoal-500">Model probability available</p>;
  }

  const pct = typeof confidence === "number" ? confidence * 100 : (probability ?? 0) * 100;
  const label = typeof confidence === "number" ? "Model confidence" : "Estimated crop-failure probability";

  return (
    <div className="rounded-2xl border border-charcoal-200 bg-charcoal-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-charcoal-900">{pct.toFixed(0)}%</p>
        </div>
        <div className="rounded-full bg-emerald-100 p-2 text-emerald-700"><ShieldCheck size={18} /></div>
      </div>
      <p className="mt-3 text-xs text-charcoal-500">Derived from the trained model output in the repository and the current prediction state.</p>
    </div>
  );
}

export function DecisionSignal({
  title,
  signal,
  drivers,
  action,
  tone = "neutral",
}: {
  title: string;
  signal: string;
  drivers: string[];
  action: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneMap = {
    neutral: "border-charcoal-200 bg-charcoal-50 text-charcoal-700",
    good: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <div className={cn("rounded-2xl border p-4", toneMap[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-current/75">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{signal}</p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-current/90"><Info size={14} /> <span>Key drivers: {drivers.join(" · ")}</span></div>
        <div className="flex items-center gap-2 text-current/90"><Activity size={14} /> <span>Suggested action: {action}</span></div>
      </div>
    </div>
  );
}
