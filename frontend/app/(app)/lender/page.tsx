"use client";

import Link from "next/link";
import { ArrowRight, Banknote, Landmark, MapPinned, ShieldAlert, TrendingDown, Wallet } from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { RiskDistribution, SimpleBars } from "@/components/charts/charts";
import { DecisionSignal, DataFreshness } from "@/components/explainability/ExplainScore";
import { Card, CardSkeleton, EmptyState, ErrorState, RiskBadge, SimTag, Stat } from "@/components/ui/primitives";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import type { FarmListItem } from "@/lib/types";

export default function LenderPage() {
  return (
    <RoleGuard requiredRole="lender">
      <LenderPortal />
    </RoleGuard>
  );
}

function LenderPortal() {
  const summary = useApi("summary", api.summary, { ttl: 60_000 });
  const farms = useApi("farms-portfolio", () => api.farms({ limit: 8 }), { ttl: 60_000 });

  const riskSignal = summary.data && summary.data.high_risk_pct > 0.35 ? "HIGH CLIMATE RISK" : summary.data && summary.data.high_risk_pct > 0.18 ? "MODERATE CLIMATE RISK" : "LOW CLIMATE RISK";
  const portfolioExposure = summary.data?.lender.portfolio_exposure_inr ?? 0;
  const avgScore = summary.data?.average_terra_score ?? 0;
  const lendersDrivers = ["rainfall stress", "soil moisture", "crop risk"];
  const action = avgScore < 600 ? "Consider enhanced climate-risk monitoring." : "Continue standard monitoring.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">Portfolio climate risk</h1>
          <p className="mt-1 text-sm text-charcoal-500">Identify which farms and regions are carrying elevated climate exposure.</p>
        </div>
        <SimTag text="Portfolio monitoring" />
      </div>

      {summary.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} lines={3} />)}
        </div>
      ) : summary.error ? (
        <ErrorState message={summary.error} onRetry={summary.refresh} />
      ) : summary.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 animate-fadeUp">
            <Stat label="Portfolio TerraScore" value={Math.round(summary.data.average_terra_score)} sub="weighted average" icon={Landmark} tone="good" />
            <Stat label="High-risk farms" value={summary.data.high_risk_farms} sub="at-risk exposure" icon={TrendingDown} tone="bad" />
            <Stat label="Moderate-risk farms" value={summary.data.risk_distribution.find((r) => r.level === "Moderate Risk")?.count ?? 0} sub="watch list" icon={MapPinned} tone="warn" />
            <Stat label="Low-risk farms" value={summary.data.risk_distribution.find((r) => r.level === "Low Risk")?.count ?? 0} sub="stable" icon={Banknote} tone="good" />
            <Stat label="Climate-exposed portfolio" value={`${(summary.data.high_risk_pct * 100).toFixed(1)}%`} sub="portfolio share" icon={Wallet} tone="warn" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card title="Risk distribution" subtitle="Farm-level TerraScore profile" icon={ShieldAlert}>
              <RiskDistribution data={summary.data.risk_distribution} height={240} />
            </Card>

            <Card title="Climate risk signal" subtitle="Risk signal derived from portfolio TerraScore" icon={TrendingDown}>
              <DecisionSignal title="CLIMATE-ADJUSTED RISK SIGNAL" signal={riskSignal} drivers={lendersDrivers} action={action} tone={avgScore < 600 ? "warn" : "good"} />
              <div className="mt-4 rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-charcoal-400">Portfolio exposure</p>
                <p className="mt-1 text-lg font-semibold text-charcoal-900">₹{portfolioExposure.toLocaleString("en-IN")}</p>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
            <Card title="Borrower / farm risk" subtitle="Actual farms in the dataset" icon={Landmark}>
              {farms.loading ? (
                <CardSkeleton lines={4} />
              ) : farms.error ? (
                <ErrorState message={farms.error} onRetry={farms.refresh} />
              ) : farms.data?.items?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-charcoal-400">
                        <th className="pb-2 pr-4 font-semibold">Farm</th>
                        <th className="pb-2 pr-4 font-semibold">Location</th>
                        <th className="pb-2 pr-4 font-semibold">Crop</th>
                        <th className="pb-2 pr-4 font-semibold">TerraScore</th>
                        <th className="pb-2 font-semibold">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal-100">
                      {farms.data.items.slice(0, 6).map((farm: FarmListItem) => (
                        <tr key={farm.farm_id} className="hover:bg-forest-50/40">
                          <td className="py-2.5 pr-4 font-medium text-charcoal-900">{farm.farm_id}</td>
                          <td className="py-2.5 pr-4 text-charcoal-600">{farm.district}, {farm.state}</td>
                          <td className="py-2.5 pr-4">{farm.crop_type}</td>
                          <td className="py-2.5 pr-4 font-semibold tabular-nums text-charcoal-900">{farm.terra_score}</td>
                          <td className="py-2.5"><RiskBadge level={farm.risk_level} size="sm" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No portfolio farms available" detail="The farm dataset is empty for the current filters." />
              )}
            </Card>

            <Card title="Regional exposure" subtitle="Average risk by region" icon={MapPinned}>
              {summary.data.lender.regional_exposure.length ? (
                <SimpleBars data={summary.data.lender.regional_exposure.slice(0, 6).map((r) => ({ state: r.state, exposure: r.exposure }))} xKey="state" yKey="exposure" name="Exposure" format={(v) => `₹${Math.round(v / 100000) / 10}L`} height={220} />
              ) : (
                <EmptyState title="Regional exposure unavailable" detail="No regional exposure data is available in the summary snapshot." />
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Data status" subtitle="Source and freshness labels for the decision signal" icon={TrendingDown}>
              <DataFreshness weatherStatus={"Live weather scenario input"} modelStatus={"Historical dataset"} scenarioStatus={"Scenario calculated now"} />
            </Card>
            <Card title="Climate scenario" subtitle="Use the simulator to stress-test the portfolio" icon={ArrowRight}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm text-charcoal-600">Run climate scenario analysis to understand how rainfall stress or temperature shocks could affect the current portfolio.</p>
                <Link href="/simulator" className="btn-primary inline-flex items-center gap-2">
                  Run climate scenario <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
