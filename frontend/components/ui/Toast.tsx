"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; title: string; detail?: string }
const Ctx = createContext<{ toast: (kind: Kind, title: string, detail?: string) => void }>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((kind: Kind, title: string, detail?: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, title, detail }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  const icons = { success: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" size={18} />, error: <AlertTriangle size={18} className="text-red-600" />, info: <Info size={18} className="text-forest-600" /> };
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[1000] flex w-[340px] max-w-[calc(100vw-2.5rem)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto flex animate-fadeUp items-start gap-3 rounded-xl border bg-white/95 p-3.5 shadow-card backdrop-blur",
            t.kind === "error" ? "border-red-200" : t.kind === "success" ? "border-emerald-200" : "border-charcoal-100")}>
            <div className="mt-0.5">{icons[t.kind]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-charcoal-900">{t.title}</p>
              {t.detail && <p className="mt-0.5 text-xs text-charcoal-500">{t.detail}</p>}
            </div>
            <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="text-charcoal-400 hover:text-charcoal-700" aria-label="Dismiss"><X size={14} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
