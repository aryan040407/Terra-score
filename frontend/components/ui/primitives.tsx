"use client";
import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import { cn, RISK_META } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

export function Card({ children, className, title, subtitle, action, icon: Icon }: { children?: ReactNode; className?: string; title?: string; subtitle?: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <section className={cn("card p-5 md:p-6", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {Icon && <div className="mt-0.5 rounded-lg bg-forest-50 p-2 text-forest-700"><Icon size={16} /></div>}
            <div>
              {title && <h3 className="text-[15px] font-semibold text-charcoal-900">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-charcoal-500">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function RiskBadge({ level, size = "md", className }: { level: RiskLevel; size?: "sm" | "md" | "lg"; className?: string }) {
  const m = RISK_META[level];
  return (
    <span className={cn("badge ring-1", m.bg, m.text, m.ring, size === "lg" && "px-3.5 py-1.5 text-sm", size === "sm" && "px-2 py-0.5 text-[10px]", className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.hex }} />{m.short}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md bg-charcoal-100/80 px-2 py-0.5 text-[11px] font-medium text-charcoal-600", className)}>{children}</span>;
}

export function SimTag({ text = "Simulated data" }: { text?: string }) {
  return <Tag className="bg-sage-100 text-sage-600">{text}</Tag>;
}

export function Skeleton({ className }: { className?: string }) { return <div className={cn("skeleton", className)} />; }

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("card p-6", className)}>
      <Skeleton className="mb-4 h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className={cn("mb-2.5 h-3", i % 2 ? "w-2/3" : "w-full")} />)}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn("card flex flex-col items-center justify-center gap-3 p-8 text-center", className)}>
      <div className="rounded-full bg-red-50 p-3 text-red-600"><AlertTriangle size={20} /></div>
      <div>
        <p className="text-sm font-semibold text-charcoal-900">Something went wrong</p>
        <p className="mt-1 max-w-sm text-xs text-charcoal-500">{message}</p>
      </div>
      {onRetry && <button onClick={onRetry} className="btn-secondary"><RefreshCw size={14} /> Retry</button>}
    </div>
  );
}

export function EmptyState({ title, detail, className }: { title: string; detail?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 p-8 text-center", className)}>
      <div className="rounded-full bg-charcoal-100 p-3 text-charcoal-400"><Inbox size={20} /></div>
      <p className="text-sm font-semibold text-charcoal-800">{title}</p>
      {detail && <p className="max-w-xs text-xs text-charcoal-500">{detail}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = "default", delta }: { label: string; value: ReactNode; sub?: string; icon?: LucideIcon; tone?: "default" | "good" | "bad" | "warn"; delta?: number }) {
  const tones = { default: "bg-forest-50 text-forest-700", good: "bg-emerald-50 text-emerald-700", bad: "bg-red-50 text-red-600", warn: "bg-amber-50 text-amber-700" };
  return (
    <div className="card group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between">
        <p className="label">{label}</p>
        {Icon && <div className={cn("rounded-lg p-1.5", tones[tone])}><Icon size={15} /></div>}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-charcoal-900 md:text-[28px]">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-charcoal-500">
        {delta !== undefined && <span className={cn("font-semibold", delta >= 0 ? "text-emerald-600" : "text-red-600")}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}</span>}
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl bg-charcoal-100/80 p-1", className)}>
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-all", value === o.value ? "bg-white text-charcoal-900 shadow-sm" : "text-charcoal-500 hover:text-charcoal-800")}>{o.label}</button>
      ))}
    </div>
  );
}

export function Select({ value, onChange, options, placeholder, className }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("rounded-xl border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20", className)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
