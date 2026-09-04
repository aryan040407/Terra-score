"use client";
import { useCountUp } from "@/hooks/useCountUp";
import { riskHex, cn } from "@/lib/utils";

export function ScoreRing({ score, size = 200, stroke = 14, className, label = "/ 1000" }: { score: number; size?: number; stroke?: number; className?: string; label?: string }) {
  const v = useCountUp(score);
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const pct = Math.max(0, Math.min(1, v / 1000));
  const color = riskHex(Math.round(v));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".55" /><stop offset="100%" stopColor={color} /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef0ee" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ringGrad)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke .4s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[44px] font-semibold leading-none tracking-tight text-charcoal-900" style={{ fontSize: size * 0.22 }}>{Math.round(v)}</span>
        <span className="mt-1 text-xs font-medium text-charcoal-400">{label}</span>
      </div>
    </div>
  );
}

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, score / 10));
  return (
    <div className={cn("relative h-2.5 w-full overflow-hidden rounded-full", className)} style={{ background: "linear-gradient(90deg,#dc2626 0%,#ea580c 20%,#d97706 40%,#3e805b 60%,#059669 80%,#059669 100%)" }}>
      <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-charcoal-900 shadow transition-all duration-700" style={{ left: `${pct}%` }} />
    </div>
  );
}
