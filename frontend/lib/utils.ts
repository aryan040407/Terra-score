import type { RiskLevel } from "./types";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const RISK_META: Record<RiskLevel, { color: string; bg: string; text: string; ring: string; hex: string; short: string }> = {
  "Very Low Risk": { color: "emerald", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", hex: "#059669", short: "VERY LOW RISK" },
  "Low Risk": { color: "green", bg: "bg-forest-50", text: "text-forest-600", ring: "ring-forest-200", hex: "#3e805b", short: "LOW RISK" },
  "Moderate Risk": { color: "amber", bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", hex: "#d97706", short: "MODERATE RISK" },
  "High Risk": { color: "orange", bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", hex: "#ea580c", short: "HIGH RISK" },
  "Critical Risk": { color: "red", bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", hex: "#dc2626", short: "CRITICAL RISK" },
};

export function riskLevel(score: number): RiskLevel {
  if (score < 200) return "Critical Risk";
  if (score < 400) return "High Risk";
  if (score < 600) return "Moderate Risk";
  if (score < 800) return "Low Risk";
  return "Very Low Risk";
}
export const riskHex = (score: number) => RISK_META[riskLevel(score)].hex;

export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString("en-IN"),
  num: (n: number, d = 1) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d }),
  pct: (n: number, d = 1) => `${n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d })}%`,
  inr: (n: number) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  },
  month: (m: string) => { const [y, mo] = m.split("-"); return new Date(Number(y), Number(mo) - 1, 1).toLocaleString("en", { month: "short", year: "2-digit" }); },
  time: (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
};

export const DISCLAIMER = "TerraScore is a prototype decision-support system using simulated data. It is not a credit score, insurance underwriting decision, or financial advice.";
