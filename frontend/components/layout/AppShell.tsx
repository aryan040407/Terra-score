"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Sprout, Map, FlaskConical, Code2, BrainCircuit, Menu, X, Play, ShieldAlert, Landmark, Tractor, Umbrella } from "lucide-react";
import { Logo } from "./Logo";
import { cn, DISCLAIMER } from "@/lib/utils";
import { ViewModeContext, type ViewMode } from "@/hooks/useViewMode";
import { api } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/farms", label: "Farm Analysis", icon: Sprout },
  { href: "/regions", label: "Regional Risk", icon: Map },
  { href: "/simulator", label: "Predictions", icon: FlaskConical },
  { href: "/api-demo", label: "API", icon: Code2 },
  { href: "/model", label: "Model Insights", icon: BrainCircuit },
];
const MODES: { value: ViewMode; label: string; icon: typeof Tractor }[] = [
  { value: "farmer", label: "Farmer", icon: Tractor }, { value: "lender", label: "Lender", icon: Landmark }, { value: "insurer", label: "Insurer", icon: Umbrella },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setModeState] = useState<ViewMode>("farmer");
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => { const m = (typeof window !== "undefined" && localStorage.getItem("ts-mode")) as ViewMode | null; if (m) setModeState(m); }, []);
  const setMode = (m: ViewMode) => { setModeState(m); localStorage.setItem("ts-mode", m); };
  useEffect(() => {
    let alive = true;
    const ping = () => api.health().then((h) => alive && setOnline(h.status === "ok")).catch(() => alive && setOnline(false));
    ping(); const id = setInterval(ping, 20000); return () => { alive = false; clearInterval(id); };
  }, []);

  const Sidebar = (
    <aside className="flex h-full w-[248px] flex-col border-r border-charcoal-100 bg-white/80 backdrop-blur-lg">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((n) => {
          const active = path?.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active ? "bg-forest-800 text-white shadow-sm" : "text-charcoal-600 hover:bg-forest-50 hover:text-forest-800")}>
              <n.icon size={17} className={cn(active ? "text-emerald-300" : "text-charcoal-400 group-hover:text-forest-700")} />{n.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 p-4">
        <Link href="/dashboard?demo=1" className="btn-primary w-full"><Play size={14} /> Launch Demo</Link>
        <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("h-2 w-2 rounded-full", online === null ? "bg-charcoal-300" : online ? "bg-emerald-500 animate-pulseDot" : "bg-red-500")} />
            <span className="font-medium text-charcoal-700">{online === null ? "Connecting…" : online ? "API connected" : "API offline"}</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-charcoal-400">Data source: Simulated / synthetic demo data</p>
        </div>
      </div>
    </aside>
  );

  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      <div className="flex min-h-screen">
        <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{Sidebar}</div>
        {open && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="h-full">{Sidebar}</div><div className="flex-1 bg-charcoal-950/40" onClick={() => setOpen(false)} /></div>}
        <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
          <header className="sticky top-0 z-30 border-b border-charcoal-100 bg-[var(--bg)]/80 backdrop-blur-lg">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
              <div className="flex items-center gap-3">
                <button className="rounded-lg p-2 hover:bg-charcoal-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
                <div className="hidden items-center gap-2 text-sm text-charcoal-500 sm:flex">
                  <ShieldAlert size={14} className="text-amber-500" /><span className="hidden md:inline">Demo / Simulated Portfolio</span>
                </div>
              </div>
              <div className="inline-flex rounded-xl bg-white p-1 shadow-card ring-1 ring-charcoal-100">
                {MODES.map((m) => (
                  <button key={m.value} onClick={() => setMode(m.value)} title={`${m.label} View`}
                    className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all", mode === m.value ? "bg-forest-800 text-white shadow-sm" : "text-charcoal-500 hover:text-charcoal-900")}>
                    <m.icon size={13} /><span className="hidden sm:inline">{m.label} View</span><span className="sm:hidden">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
          <footer className="border-t border-charcoal-100 px-4 py-5 md:px-8">
            <p className="max-w-4xl text-[11px] leading-relaxed text-charcoal-400">{DISCLAIMER} Data source: Simulated / synthetic demo data.</p>
          </footer>
        </div>
      </div>
    </ViewModeContext.Provider>
  );
}
