import type { Alert, DemoData, FarmDetail, FarmList, ModelExplanation, RegionsResponse, Scoring, Summary, Telemetry, WeatherResponse, WhatIfRequest, WhatIfResponse, HistoryPoint } from "./types";

// Browser always uses relative /api (proxied by Next.js rewrites to FastAPI).
const BASE = typeof window === "undefined" ? (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") : "";

export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
  } catch {
    throw new ApiError(0, "Unable to load TerraScore data right now. Please verify the backend service is running.");
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* ignore */ }
    throw new ApiError(res.status, msg || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  health: () => request<{ status: string; model_loaded: boolean; farms_loaded: number; model_type: string }>("/api/health"),
  farms: (f: { state?: string; crop?: string; risk_level?: string; search?: string; limit?: number; offset?: number } = {}) => request<FarmList>(`/api/farms${qs(f)}`),
  farm: (id: string) => request<FarmDetail>(`/api/farms/${encodeURIComponent(id)}`),
  terrascore: (id: string) => request<Record<string, unknown>>(`/api/terrascore/${encodeURIComponent(id)}`),
  trends: (id: string, months: number) => request<{ series: HistoryPoint[] }>(`/api/risk-trends/${encodeURIComponent(id)}?months=${months}`),
  regions: (f: { state?: string; crop?: string; risk_level?: string } = {}) => request<RegionsResponse>(`/api/regions${qs(f)}`),
  summary: () => request<Summary>("/api/summary"),
  alerts: (limit = 8) => request<{ alerts: Alert[] }>(`/api/alerts?limit=${limit}`),
  weather: (latitude: number, longitude: number) => request<WeatherResponse>(`/api/weather?latitude=${latitude}&longitude=${longitude}`),
  telemetry: (id: string) => request<Telemetry>(`/api/telemetry/${encodeURIComponent(id)}`),
  model: () => request<ModelExplanation>("/api/model/explanation"),
  demo: () => request<DemoData>("/api/demo-data"),
  whatIf: (body: WhatIfRequest) => request<WhatIfResponse>("/api/what-if", { method: "POST", body: JSON.stringify(body) }),
  predict: (body: Record<string, unknown>) => request<Scoring>("/api/predict", { method: "POST", body: JSON.stringify(body) }),
  raw: (method: string, path: string, body?: string) => request<unknown>(path, { method, body: body && method !== "GET" ? body : undefined }),
};
