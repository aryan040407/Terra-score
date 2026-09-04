"""Alerts, live-telemetry simulation and What-If scenario engine."""
from __future__ import annotations

import math
import sys
import time

import numpy as np
import pandas as pd

from backend.config import ROOT
from backend.services.data_service import store

sys.path.insert(0, str(ROOT / "ml"))
from predict import predict_risk  # noqa: E402
from feature_engineering import FEATURE_LABELS  # noqa: E402


# ------------------------------------------------------------------ alerts
def generate_alerts(limit: int = 8) -> list[dict]:
    """Derive alerts from the simulated history (last 3 months vs prior 3 months)."""
    farms, hist = store.farms, store.history
    alerts: list[dict] = []
    if hist is None or hist.empty:
        return alerts
    months = sorted(hist["month"].unique())
    recent, prior = months[-3:], months[-6:-3]
    h = hist.merge(farms[["farm_id", "state", "district", "crop_type"]], on="farm_id")
    r, p = h[h["month"].isin(recent)], h[h["month"].isin(prior)]

    def region_delta(col, agg="mean"):
        a = r.groupby("state")[col].agg(agg)
        b = p.groupby("state")[col].agg(agg)
        return (a - b).dropna(), b

    # Rainfall volatility by state: same quarter, year-over-year (avoids monsoon seasonality artefacts)
    if len(months) >= 15:
        yoy = months[-15:-12]
        cur_v = h[h["month"].isin(recent)].groupby("state")["precipitation"].std()
        prev_v = h[h["month"].isin(yoy)].groupby("state")["precipitation"].std()
        pct = ((cur_v - prev_v) / prev_v.replace(0, np.nan) * 100).dropna().sort_values(ascending=False)
        if len(pct) and float(pct.iloc[0]) > 5:
            s, v = pct.index[0], float(pct.iloc[0])
            alerts.append(dict(type="warning", icon="rain", title=f"Rainfall volatility increased {v:.0f}% in {s}.",
                               detail="Std-dev of monthly rainfall, last quarter vs same quarter last year.", region=s))
    # Farms entering high-risk territory
    last_m, prev_m = months[-1], months[-4]
    a = hist[hist["month"] == last_m].set_index("farm_id")["terra_score"]
    b = hist[hist["month"] == prev_m].set_index("farm_id")["terra_score"]
    entered = int(((a < 400) & (b >= 400)).sum())
    exited = int(((a >= 400) & (b < 400)).sum())
    if entered:
        alerts.append(dict(type="warning", icon="alert", title=f"{entered} farms entered high-risk territory.",
                           detail=f"TerraScore fell below 400 between {prev_m} and {last_m}.", region="Portfolio"))
    if exited:
        alerts.append(dict(type="success", icon="trend-up", title=f"{exited} farms recovered above the high-risk threshold.",
                           detail=f"TerraScore rose above 400 between {prev_m} and {last_m}.", region="Portfolio"))
    # Soil moisture change
    d, _ = region_delta("soil_moisture")
    d = d.sort_values()
    if len(d):
        if float(d.iloc[-1]) > 1.0:
            alerts.append(dict(type="success", icon="droplet", title=f"Soil moisture conditions improved in {d.index[-1]}.",
                               detail=f"+{float(d.iloc[-1]):.1f} pts average vs previous quarter.", region=d.index[-1]))
        if float(d.iloc[0]) < -1.0:
            alerts.append(dict(type="warning", icon="droplet", title=f"Soil moisture declining in {d.index[0]}.",
                               detail=f"{float(d.iloc[0]):.1f} pts average vs previous quarter.", region=d.index[0]))
    # Regional TerraScore movement
    d, _ = region_delta("terra_score")
    d = d.sort_values()
    if len(d):
        up_s, up_v = d.index[-1], float(d.iloc[-1])
        dn_s, dn_v = d.index[0], float(d.iloc[0])
        if up_v > 3:
            alerts.append(dict(type="success", icon="trend-up", title=f"Average TerraScore in {up_s} increased by {up_v:.0f} points.",
                               detail="Quarter-on-quarter change in regional average.", region=up_s))
        if dn_v < -3:
            alerts.append(dict(type="warning", icon="trend-down", title=f"Average TerraScore in {dn_s} decreased by {abs(dn_v):.0f} points.",
                               detail="Quarter-on-quarter change in regional average.", region=dn_s))
    # Drought index
    d, _ = region_delta("drought_index")
    d = d.sort_values()
    if len(d) and float(d.iloc[-1]) > 0.02:
        alerts.append(dict(type="warning", icon="sun", title=f"Drought index rising in {d.index[-1]} (+{float(d.iloc[-1]):.2f}).",
                           detail="Elevated water-stress exposure for rain-fed crops.", region=d.index[-1]))
    # Crop-level
    cr = farms.groupby("crop_type")["risk_probability"].mean().sort_values(ascending=False)
    alerts.append(dict(type="info", icon="wheat", title=f"{cr.index[0]} carries the highest average loss probability ({cr.iloc[0] * 100:.0f}%).",
                       detail="Portfolio-wide crop risk ranking from model predictions.", region="Portfolio"))
    now = pd.Timestamp.utcnow()
    for i, a in enumerate(alerts):
        a["id"] = f"ALT-{i + 1:03d}"
        a["timestamp"] = (now - pd.Timedelta(hours=3 * i + 1)).isoformat()
        a["source"] = "Simulated data"
    return alerts[:limit]


# ------------------------------------------------------------- telemetry sim
def telemetry(farm_id: str) -> dict:
    """Deterministic-but-drifting 'live' readings derived from the farm baseline.

    Structure mirrors what a real weather / IoT provider adapter would return,
    so a real source can be plugged into the same shape later.
    """
    farm = store.get_farm(farm_id)
    if farm is None:
        return {}
    t = time.time()
    def wobble(base, amp, period, phase):
        return base + amp * math.sin(t / period + phase) + amp * 0.3 * math.sin(t / (period / 3.7) + phase * 2)
    temp = wobble(farm["temperature"], 0.6, 37, 0.3)
    sm = wobble(farm["soil_moisture"], 1.2, 53, 1.1)
    rain = max(0.0, wobble(farm["precipitation"] / 30, 0.8, 29, 2.0))  # mm/day
    hum = wobble(farm["humidity"], 2.0, 47, 0.7)
    ndvi = max(0.1, min(0.95, wobble(0.35 + 0.5 * farm["soil_health"] / 100, 0.02, 61, 0.2)))
    soil_temp = temp - 2.5 + 0.4 * math.sin(t / 41)
    return {
        "farm_id": farm["farm_id"],
        "timestamp": pd.Timestamp.utcnow().isoformat(),
        "label": "Simulated live telemetry",
        "sources": [
            {"name": "Weather API", "provider": "mock-weather (pluggable)", "status": "streaming", "latency_ms": int(40 + 20 * math.sin(t / 5) + 20)},
            {"name": "Soil Data", "provider": "mock-soil-grid", "status": "streaming", "latency_ms": int(60 + 25 * math.sin(t / 7) + 25)},
            {"name": "Crop / Yield Data", "provider": "mock-agri-registry", "status": "synced", "latency_ms": int(120 + 30 * math.sin(t / 11) + 30)},
            {"name": "IoT Telemetry", "provider": "mock-field-sensors", "status": "streaming", "latency_ms": int(25 + 15 * math.sin(t / 3) + 15)},
        ],
        "readings": {
            "temperature_c": round(temp, 1),
            "soil_moisture_pct": round(sm, 1),
            "precipitation_mm": round(rain, 1),
            "humidity_pct": round(hum, 1),
            "soil_temperature_c": round(soil_temp, 1),
            "ndvi": round(ndvi, 3),
        },
    }


# -------------------------------------------------------------- what-if
def run_what_if(req) -> dict | None:
    farm = store.get_farm(req.farm_id)
    if farm is None:
        return None
    base = predict_risk(farm)
    scenario = dict(farm)
    summary: list[str] = []

    if req.rainfall_change_pct:
        scenario["precipitation"] = max(0.0, farm["precipitation"] * (1 + req.rainfall_change_pct / 100))
        summary.append(f"Rainfall {'↓' if req.rainfall_change_pct < 0 else '↑'} {abs(req.rainfall_change_pct):.0f}%")
    if req.temperature_change_c:
        scenario["temperature"] = farm["temperature"] + req.temperature_change_c
        summary.append(f"Temperature {'↑' if req.temperature_change_c > 0 else '↓'} {abs(req.temperature_change_c):.1f}°C")
    if req.soil_moisture_change_pct:
        scenario["soil_moisture"] = float(np.clip(farm["soil_moisture"] * (1 + req.soil_moisture_change_pct / 100), 0, 100))
        summary.append(f"Soil moisture {'↓' if req.soil_moisture_change_pct < 0 else '↑'} {abs(req.soil_moisture_change_pct):.0f}%")
    if req.irrigation_status and req.irrigation_status != farm["irrigation_status"]:
        scenario["irrigation_status"] = req.irrigation_status
        summary.append(f"Irrigation {farm['irrigation_status']} → {req.irrigation_status}")
    if req.drought_index is not None and abs(req.drought_index - farm["drought_index"]) > 1e-6:
        scenario["drought_index"] = req.drought_index
        summary.append(f"Drought index {farm['drought_index']:.2f} → {req.drought_index:.2f}")
    if req.pest_risk is not None and abs(req.pest_risk - farm["pest_risk"]) > 1e-6:
        scenario["pest_risk"] = req.pest_risk
        summary.append(f"Pest risk {farm['pest_risk']:.2f} → {req.pest_risk:.2f}")

    # Secondary (physically-motivated) coupling: less rain / more heat lowers soil moisture & raises drought stress
    if req.rainfall_change_pct and not req.soil_moisture_change_pct:
        scenario["soil_moisture"] = float(np.clip(scenario["soil_moisture"] * (1 + 0.35 * req.rainfall_change_pct / 100), 0, 100))
    if req.rainfall_change_pct < 0 and req.drought_index is None:
        scenario["drought_index"] = float(np.clip(scenario["drought_index"] + 0.004 * abs(req.rainfall_change_pct), 0, 1))
    if req.temperature_change_c > 0 and req.drought_index is None:
        scenario["drought_index"] = float(np.clip(scenario["drought_index"] + 0.03 * req.temperature_change_c, 0, 1))
    if req.rainfall_change_pct > 20:
        scenario["flood_risk"] = float(np.clip(scenario["flood_risk"] + 0.005 * (req.rainfall_change_pct - 20), 0, 1))

    new = predict_risk(scenario)
    changed = []
    for k in ["precipitation", "temperature", "soil_moisture", "drought_index", "pest_risk", "flood_risk"]:
        if abs(scenario[k] - farm[k]) > 1e-6:
            changed.append({"feature": k, "label": FEATURE_LABELS.get(k, k), "baseline": round(farm[k], 3),
                            "scenario": round(scenario[k], 3), "delta": round(scenario[k] - farm[k], 3),
                            "direction": "up" if scenario[k] > farm[k] else "down"})
    if scenario["irrigation_status"] != farm["irrigation_status"]:
        m = {"None": 0, "Partial": 1, "Good": 2}
        changed.append({"feature": "irrigation_level", "label": "Irrigation", "baseline": m[farm["irrigation_status"]],
                        "scenario": m[scenario["irrigation_status"]], "delta": m[scenario["irrigation_status"]] - m[farm["irrigation_status"]],
                        "direction": "up" if m[scenario["irrigation_status"]] > m[farm["irrigation_status"]] else "down"})

    yield_impact = 0.0
    if base["predicted_yield"]:
        yield_impact = (new["predicted_yield"] - base["predicted_yield"]) / base["predicted_yield"] * 100
    return {
        "farm_id": farm["farm_id"],
        "baseline_terra_score": base["terra_score"],
        "new_terra_score": new["terra_score"],
        "change": new["terra_score"] - base["terra_score"],
        "baseline_risk_level": base["risk_level"],
        "new_risk_level": new["risk_level"],
        "baseline_risk_probability": base["risk_probability"],
        "new_risk_probability": new["risk_probability"],
        "predicted_yield_impact_pct": round(yield_impact, 1),
        "baseline_predicted_yield": base["predicted_yield"],
        "new_predicted_yield": new["predicted_yield"],
        "confidence": new["confidence"],
        "scenario_summary": summary or ["No changes — baseline scenario"],
        "top_changed_factors": changed,
        "top_risk_factors": new["top_risk_factors"],
        "positive_resilience_factors": new["positive_resilience_factors"],
    }
