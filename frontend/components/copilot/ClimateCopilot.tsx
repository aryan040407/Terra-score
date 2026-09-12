"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Sparkles, Loader2, X } from "lucide-react";
import { useRegion } from "@/contexts/RegionContext";
import { api } from "@/lib/api";
import type { CopilotResponse } from "@/lib/types";

const DEFAULT_MESSAGE = "How is the climate risk looking in this region right now?";

export function ClimateCopilot({ role }: { role: "farmer" | "lender" | "government" }) {
  const { selectedRegion } = useRegion();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CopilotResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setQuestion((q) => q || DEFAULT_MESSAGE), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const farmId = useMemo(() => selectedRegion?.farmId ?? "FARM-001", [selectedRegion]);

  async function askCopilot() {
    setLoading(true);
    try {
      const result = await api.copilot({
        message: question.trim() || DEFAULT_MESSAGE,
        role,
        farm_id: farmId,
        location: selectedRegion?.displayName,
      });
      setResponse(result);
    } catch (error) {
      setResponse({
        provider: "offline",
        answer: error instanceof Error ? error.message : "The Climate Copilot could not respond right now. The model and weather context remain available in TerraScore.",
        role,
        grounding: {
          farm_id: farmId,
          location: selectedRegion?.displayName ?? null,
          terra_score: null,
          risk_level: null,
          weather: { source: "offline" },
          top_risk_factors: ["Weather volatility", "Yield risk", "Soil moisture stress"],
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-forest-800 px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-forest-700 transition hover:bg-forest-700"
        aria-label="Open Climate Copilot"
      >
        <Bot size={16} />
        Climate Copilot
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-end bg-charcoal-950/20 p-4">
          <div className="w-full max-w-md rounded-3xl border border-charcoal-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-charcoal-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-forest-100 p-2 text-forest-800"><Sparkles size={16} /></div>
                <div>
                  <p className="text-sm font-semibold text-charcoal-900">Climate Copilot</p>
                  <p className="text-[11px] text-charcoal-500">Grounded in TerraScore + weather</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-charcoal-100" aria-label="Close copilot">
                <X size={16} className="text-charcoal-600" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded-2xl bg-charcoal-50 p-3 text-xs text-charcoal-600">
                Context: {selectedRegion?.displayName ?? "Selected region"} · {role}
              </div>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal-900 outline-none ring-0 transition focus:border-forest-600"
                placeholder="Ask about rainfall, heat stress, soil moisture, or risk trend..."
              />

              <button
                onClick={askCopilot}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {loading ? "Analyzing..." : "Ask Copilot"}
              </button>

              {response && (
                <div className="rounded-2xl border border-forest-100 bg-forest-50 p-3 text-sm text-charcoal-700">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-forest-700">
                    {response.provider === "offline" ? "Grounded fallback" : `Provider: ${response.provider}`}
                  </p>
                  <p className="leading-relaxed">{response.answer}</p>
                  <div className="mt-3 border-t border-forest-100 pt-3 text-[11px] text-charcoal-500">
                    <p>Farm: {response.grounding.farm_id ?? "selected region"}</p>
                    <p>Location: {response.grounding.location ?? "not supplied"}</p>
                    <p>Source: {response.grounding.weather?.source ?? "TerraScore"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
