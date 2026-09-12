"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  LayoutDashboard,
  Sprout,
  Map,
  FlaskConical,
  Code2,
  BrainCircuit,
  Menu,
  X,
  Play,
  ShieldAlert,
  Database,
} from "lucide-react";

import { Logo } from "./Logo";
import { RegionSelector } from "@/components/region/RegionSelector";
import { RegionProvider } from "@/contexts/RegionContext";
import { cn, DISCLAIMER } from "@/lib/utils";
import { api } from "@/lib/api";
import { ClimateCopilot } from "@/components/copilot/ClimateCopilot";
import {
  getSession,
  logout,
  type AuthSession,
} from "@/lib/auth";

const NAV = {
  farmer: [
    { href: "/farmer", label: "Overview", icon: LayoutDashboard },
    { href: "/farms", label: "My Farm", icon: Sprout },
    { href: "/regions", label: "Weather & Risk", icon: Map },
    { href: "/simulator", label: "What-If", icon: FlaskConical },
    { href: "/model", label: "Model Insights", icon: BrainCircuit },
    { href: "/data-sources", label: "Data & Research", icon: Database },
  ],
  lender: [
    { href: "/lender", label: "Portfolio", icon: LayoutDashboard },
    { href: "/farms", label: "Farm Risk", icon: Sprout },
    { href: "/regions", label: "Regional Exposure", icon: Map },
    { href: "/simulator", label: "Climate Scenarios", icon: FlaskConical },
    { href: "/model", label: "Model Insights", icon: BrainCircuit },
    { href: "/data-sources", label: "Data & Research", icon: Database },
    { href: "/api-demo", label: "API Demo", icon: Code2 },
  ],
  government: [
    { href: "/government", label: "National Overview", icon: LayoutDashboard },
    { href: "/regions", label: "Regional Risk", icon: Map },
    { href: "/simulator", label: "Risk Map", icon: FlaskConical },
    { href: "/model", label: "Model Insights", icon: BrainCircuit },
    { href: "/farms", label: "Soil Intelligence", icon: Sprout },
    { href: "/data-sources", label: "Data & Research", icon: Database },
  ],
} as const;

const ROLE_LABELS = {
  farmer: "Farmer",
  lender: "Lender",
  government: "Government",
} as const;

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("terrascore-sidebar-collapsed");
    setSidebarCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("terrascore-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // -----------------------------------------
  // AUTHENTICATION
  // -----------------------------------------

  useEffect(() => {
    const currentSession = getSession();

    if (!currentSession) {
      router.replace("/login");
      return;
    }

    setSession(currentSession);
    setCheckingAuth(false);
  }, [router]);

  // -----------------------------------------
  // LOGOUT
  // -----------------------------------------

  function handleLogout() {
    logout();
    setSession(null);
    router.replace("/login");
  }

  // -----------------------------------------
  // API HEALTH CHECK
  // -----------------------------------------

  useEffect(() => {
    let alive = true;

    const ping = () => {
      api
        .health()
        .then((h) => {
          if (alive) {
            setOnline(h.status === "ok");
          }
        })
        .catch(() => {
          if (alive) {
            setOnline(false);
          }
        });
    };

    ping();

    const id = setInterval(ping, 20000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // -----------------------------------------
  // SIDEBAR
  // -----------------------------------------

  const roleNav = session ? NAV[session.role] : NAV.farmer;

  const Sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-charcoal-100 bg-white/80 backdrop-blur-lg transition-all duration-300",
        sidebarCollapsed ? "w-[88px]" : "w-[248px]"
      )}
    >
      {/* LOGO */}
      <div className="flex items-center justify-between px-3 py-4">
        <Link href="/" className={cn("flex min-w-0 items-center", sidebarCollapsed && "justify-center w-full")}>
          <Logo compact={sidebarCollapsed} />
        </Link>

        <button
          className="hidden rounded-lg p-2 text-charcoal-500 transition hover:bg-charcoal-100 lg:inline-flex"
          onClick={() => setSidebarCollapsed((v) => !v)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <Menu size={16} /> : <X size={16} />}
        </button>

        <button
          className="lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-1 overflow-hidden px-2">
        {roleNav.map((n) => {
          const active = path?.startsWith(n.href);

          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              title={sidebarCollapsed ? n.label : undefined}
              aria-label={n.label}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-forest-800 text-white shadow-sm"
                  : "text-charcoal-600 hover:bg-forest-50 hover:text-forest-800",
                sidebarCollapsed && "justify-center px-2"
              )}
            >
              <n.icon
                size={17}
                className={cn(
                  active
                    ? "text-emerald-300"
                    : "text-charcoal-400 group-hover:text-forest-700",
                  sidebarCollapsed && "shrink-0"
                )}
              />

              {!sidebarCollapsed && <span className="truncate">{n.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* SIDEBAR FOOTER */}
      <div className={cn("space-y-3 p-3", sidebarCollapsed && "px-2") }>
        <Link
          href="/dashboard?demo=1"
          className={cn("btn-primary w-full", sidebarCollapsed && "px-0 justify-center")}
          title={sidebarCollapsed ? "Launch Demo" : undefined}
          aria-label="Launch Demo"
        >
          <Play size={14} />
          {!sidebarCollapsed && "Launch Demo"}
        </Link>

        {!sidebarCollapsed && (
          <div className="rounded-xl border border-charcoal-100 bg-charcoal-50 p-3">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  online === null
                    ? "bg-charcoal-300"
                    : online
                      ? "bg-emerald-500 animate-pulseDot"
                      : "bg-red-500"
                )}
              />

              <span className="font-medium text-charcoal-700">
                {online === null
                  ? "Connecting…"
                  : online
                    ? "API connected"
                    : "API offline"}
              </span>
            </div>

            <p className="mt-1.5 text-[11px] leading-snug text-charcoal-400">
              Data source: Simulated / synthetic demo data
            </p>
          </div>
        )}
      </div>
    </aside>
  );

  // -----------------------------------------
  // APPLICATION
  // -----------------------------------------

  if (checkingAuth || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
          <p className="text-xs font-medium text-charcoal-500">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <RegionProvider>
      <ClimateCopilot role={session.role} />
      <div className="flex min-h-screen">

        {/* DESKTOP SIDEBAR */}
        <div className="fixed inset-y-0 left-0 z-40 hidden lg:flex">
          {Sidebar}
        </div>

        {/* MOBILE SIDEBAR */}
        {open && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="h-full w-[82vw] max-w-[280px]">
              {Sidebar}
            </div>

            <div
              className="flex-1 bg-charcoal-950/40"
              onClick={() => setOpen(false)}
            />
          </div>
        )}

        {/* MAIN AREA */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-all duration-300",
            sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[248px]"
          )}
        >

          {/* HEADER */}
          <header className="sticky top-0 z-30 border-b border-charcoal-100 bg-[var(--bg)]/80 backdrop-blur-lg">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">

              {/* LEFT */}
              <div className="flex items-center gap-3">

                <button
                  className="rounded-lg p-2 hover:bg-charcoal-100 lg:hidden"
                  onClick={() => setOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu size={18} />
                </button>

                <button
                  className="hidden rounded-lg p-2 text-charcoal-500 transition hover:bg-charcoal-100 lg:inline-flex"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
                </button>

              </div>

              <div className="w-full max-w-[340px] lg:max-w-[420px]">
                <RegionSelector />
              </div>

              {/* RIGHT — LOGGED IN USER */}
              {session && (
                <div className="flex items-center gap-3">

                  {/* USER INFO */}
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-semibold text-charcoal-900">
                      {session.name}
                    </p>

                    <p className="text-[10px] text-charcoal-400">
                      {ROLE_LABELS[session.role]}
                    </p>
                  </div>

                  {/* PROFILE + LOGOUT */}
                  <div className="flex items-center gap-2 rounded-xl bg-white p-1 shadow-card ring-1 ring-charcoal-100">

                    {/* INITIAL */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-800 text-xs font-bold text-emerald-200">
                      {session.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    {/* LOGOUT */}
                    <button
                      onClick={handleLogout}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-charcoal-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      Logout
                    </button>

                  </div>
                </div>
              )}

            </div>
          </header>

          {/* PAGE */}
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>

          {/* FOOTER */}
          <footer className="border-t border-charcoal-100 px-4 py-5 md:px-8">
            <p className="max-w-4xl text-[11px] leading-relaxed text-charcoal-400">
              {DISCLAIMER} Data source: Simulated / synthetic demo data.
            </p>
          </footer>

        </div>
      </div>
    </RegionProvider>
  );
}