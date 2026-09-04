# TerraScore — Architecture

```
┌──────────────┐   /api/* (Next rewrites)   ┌───────────────┐   in-memory    ┌───────────────────┐
│  Browser     │ ─────────────────────────▶ │ Next.js 14    │ ─────────────▶ │ FastAPI (uvicorn) │
│  React UI    │ ◀───────────────────────── │ (SSR + proxy) │ ◀───────────── │  routes/api.py    │
└──────────────┘                            └───────────────┘                └────────┬──────────┘
                                                                                      │ loads once
                                                    ┌─────────────────────────────────┴───────────────┐
                                                    │ services/data_service.py  (DataStore)            │
                                                    │  farms.csv → pandas → predict_batch → SQLite     │
                                                    │ services/insight_service.py (alerts, telemetry,  │
                                                    │  what-if)                                        │
                                                    └─────────────────────────────────┬───────────────┘
                                                                                      │
                                                    ┌─────────────────────────────────┴───────────────┐
                                                    │ ml/predict.py  ← saved_model/*.joblib + metadata │
                                                    │ ml/feature_engineering.py (shared train/infer)   │
                                                    └──────────────────────────────────────────────────┘
```

## Request flows
* **Dashboard load**: `/api/summary`, `/api/farms/FARM-001`, `/api/risk-trends/FARM-001`, `/api/model/explanation`, `/api/regions`, `/api/alerts` — cached client-side (30–300 s) by `useApi`.
* **Live telemetry**: `/api/telemetry/{id}` polled every 4 s; values are deterministic sinusoidal drift around the farm baseline (labelled *Simulated live telemetry*).
* **What-If**: `POST /api/what-if` → baseline `predict_risk(farm)` + scenario `predict_risk(modified farm)` → deltas.

## Pluggability
`insight_service.telemetry()` and the data loader return provider-shaped payloads (`sources[]`, `readings{}`) so real Weather / Soil / IoT adapters can replace the mock ones without UI changes. `DataStore.load()` is the single place to swap CSV for PostgreSQL.

## Performance
* Model + metadata loaded once (`functools.lru_cache`); all 1,500 farms scored at startup (~1 s).
* Per-request inference ≈ 10–25 ms (single-row RF + tree agreement for confidence).
* Frontend: static prerender, code-split map (Leaflet client-only), memoised chart data.
