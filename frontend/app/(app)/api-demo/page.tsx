"use client";
import { useEffect, useState } from "react";
import { Code2, Copy, Check, Play, Terminal, KeyRound, Lock, Zap, BookOpen } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, Segmented, Tag } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const ENDPOINTS = [
  { method: "GET", path: "/api/terrascore/FARM-001", desc: "Partner-facing score payload for one farm" },
  { method: "GET", path: "/api/farms/FARM-001", desc: "Full farm record + explanation + history preview" },
  { method: "GET", path: "/api/farms?state=Punjab&crop=Wheat&limit=5", desc: "List / filter farms" },
  { method: "GET", path: "/api/regions?state=Maharashtra", desc: "District-level aggregates" },
  { method: "GET", path: "/api/risk-trends/FARM-001?months=7", desc: "Time-series (simulated)" },
  { method: "POST", path: "/api/what-if", desc: "Scenario re-scoring", body: { farm_id: "FARM-001", rainfall_change_pct: -20, temperature_change_c: 2, soil_moisture_change_pct: -15 } },
  { method: "POST", path: "/api/predict", desc: "Score arbitrary farm attributes", body: { crop_type: "Cotton", season: "Kharif", irrigation_status: "Partial", soil_health: 52, soil_moisture: 31, temperature: 31.5, precipitation: 48, humidity: 50, drought_index: 0.62, flood_risk: 0.15, pest_risk: 0.55, historical_yield: 1.6, yield_variation: 0.4, weather_volatility: 0.55, crop_price: 6600, previous_loss: 0.35, climate_resilience: 0.42, farm_area: 2.4 } },
  { method: "GET", path: "/api/model/explanation", desc: "Model metadata + feature importance" },
  { method: "GET", path: "/api/alerts", desc: "Data-derived alerts" },
  { method: "GET", path: "/api/health", desc: "Service health" },
];

export default function ApiDemoPage() {
  const { toast } = useToast();
  const [sample, setSample] = useState<string>(""); const [copied, setCopied] = useState(false);
  const [sel, setSel] = useState(0); const [path, setPath] = useState(ENDPOINTS[0].path); const [method, setMethod] = useState<"GET" | "POST">("GET"); const [body, setBody] = useState("");
  const [out, setOut] = useState<string>(""); const [status, setStatus] = useState<{ code: number; ms: number } | null>(null); const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<"curl" | "python" | "js">("curl");

  useEffect(() => { api.terrascore("FARM-001").then((j) => setSample(JSON.stringify(j, null, 2))).catch((e) => setSample(`// ${e.message}`)); }, []);
  const pick = (i: number) => { const e = ENDPOINTS[i]; setSel(i); setPath(e.path); setMethod(e.method as "GET" | "POST"); setBody(e.body ? JSON.stringify(e.body, null, 2) : ""); setOut(""); setStatus(null); };

  const send = async () => {
    setBusy(true); const t0 = performance.now();
    try {
      if (method === "POST" && body) JSON.parse(body);
      const j = await api.raw(method, path, body);
      setOut(JSON.stringify(j, null, 2)); setStatus({ code: 200, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      const code = e instanceof ApiError ? e.status : 0;
      setOut(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }, null, 2)); setStatus({ code, ms: Math.round(performance.now() - t0) });
      toast("error", code === 0 && !(e instanceof ApiError) ? "Invalid JSON body" : `Request failed (${code || "network"})`, e instanceof Error ? e.message : undefined);
    } finally { setBusy(false); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); toast("success", "Copied JSON to clipboard"); setTimeout(() => setCopied(false), 1500); } catch { toast("error", "Clipboard unavailable"); } };

  const snippet = { curl: `curl -H "X-API-Key: <your-key>" \\\n  http://localhost:8000/api/terrascore/FARM-001`, python: `import requests\n\nr = requests.get(\n    "http://localhost:8000/api/terrascore/FARM-001",\n    headers={"X-API-Key": "<your-key>"},\n)\nscore = r.json()\nif score["terra_score"] < 400:\n    flag_for_manual_review(score["farm_id"])`, js: `const r = await fetch("http://localhost:8000/api/terrascore/FARM-001", {\n  headers: { "X-API-Key": "<your-key>" },\n});\nconst { terra_score, risk_level } = await r.json();` }[lang];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <div><h1 className="text-2xl font-semibold tracking-tight text-charcoal-950">API for Lenders & Insurers</h1><p className="mt-1 text-sm text-charcoal-500">One REST call returns a TerraScore, its risk band and the reasons behind it.</p></div>
        <div className="flex gap-2"><Tag><Lock size={11} /> API-key auth (roadmap)</Tag><Tag><Zap size={11} /> ~20 ms p50, local</Tag><a href="/docs" target="_blank" className="btn-secondary text-xs" onClick={(e) => { e.preventDefault(); window.open((process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/docs", "_blank"); }}><BookOpen size={13} /> OpenAPI docs</a></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Example: score a farm" subtitle="GET /api/terrascore/FARM-001" icon={Code2} action={<button onClick={() => copy(sample)} className="btn-secondary text-xs">{copied ? <Check size={13} /> : <Copy size={13} />} Copy JSON</button>}>
          <pre className="max-h-[420px] overflow-auto rounded-xl bg-charcoal-950 p-4 text-[12.5px] leading-relaxed text-emerald-200"><code>{sample || "// loading…"}</code></pre>
        </Card>
        <Card title="Integrate in minutes" subtitle="Drop-in for credit decisioning or underwriting pipelines" icon={KeyRound} action={<Segmented value={lang} onChange={setLang} options={[{ value: "curl", label: "cURL" }, { value: "python", label: "Python" }, { value: "js", label: "JavaScript" }]} />}>
          <pre className="overflow-auto rounded-xl bg-charcoal-950 p-4 text-[12.5px] leading-relaxed text-charcoal-100"><code>{snippet}</code></pre>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 text-xs">
            {[["terra_score", "0–1000, higher = more resilient"], ["risk_level", "5 bands for policy rules"], ["top_risk_factors", "explainability for adverse action"]].map(([k, v]) => <div key={k} className="rounded-lg border border-charcoal-100 p-2.5"><code className="font-semibold text-forest-700">{k}</code><p className="mt-0.5 text-charcoal-500">{v}</p></div>)}
          </div>
          <p className="mt-4 text-[11px] text-charcoal-400">Prototype note: no authentication is enforced in this demo. Real deployments would add API keys, rate limits and audit logging.</p>
        </Card>
      </div>

      <Card title="Interactive API tester" subtitle="Requests hit the live FastAPI backend" icon={Terminal}>
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-1">
            <p className="label mb-2">Endpoints</p>
            {ENDPOINTS.map((e, i) => (
              <button key={e.path} onClick={() => pick(i)} className={cn("flex w-full items-start gap-2 rounded-xl border p-2.5 text-left text-xs transition-all", sel === i ? "border-forest-700 bg-forest-50/70" : "border-transparent hover:border-charcoal-200 hover:bg-charcoal-50")}>
                <span className={cn("mt-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold", e.method === "GET" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>{e.method}</span>
                <span className="min-w-0"><code className="block truncate font-medium text-charcoal-900">{e.path}</code><span className="text-charcoal-500">{e.desc}</span></span>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={method} onChange={(e) => setMethod(e.target.value as "GET" | "POST")} className="rounded-xl border border-charcoal-200 px-3 py-2 font-mono text-xs font-bold"><option>GET</option><option>POST</option></select>
              <input value={path} onChange={(e) => setPath(e.target.value)} className="flex-1 rounded-xl border border-charcoal-200 px-3 py-2 font-mono text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              <button onClick={send} disabled={busy} className="btn-primary">{busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Play size={14} />} Send</button>
            </div>
            {method === "POST" && <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} spellCheck={false} className="w-full rounded-xl border border-charcoal-200 p-3 font-mono text-xs focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder='{"farm_id": "FARM-001"}' />}
            <div className="flex items-center justify-between"><p className="label">Response</p>{status && <span className={cn("badge", status.code === 200 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{status.code || "ERR"} · {status.ms} ms</span>}{out && <button onClick={() => copy(out)} className="btn-ghost text-xs"><Copy size={12} /> Copy</button>}</div>
            <pre className="min-h-[220px] max-h-[460px] overflow-auto rounded-xl bg-charcoal-950 p-4 text-[12.5px] leading-relaxed text-emerald-200"><code>{out || "// Choose an endpoint and click Send"}</code></pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
