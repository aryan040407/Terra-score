from __future__ import annotations

import time
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from backend.schemas.schemas import PredictRequest, PredictResponse, WhatIfRequest, WhatIfResponse
from backend.services.data_service import store
from backend.services import insight_service
from backend.services.weather_service import get_weather_for_coordinates
from predict import predict_risk  # ml/ is on sys.path via data_service

router = APIRouter(prefix="/api", tags=["terrascore"])
START = time.time()


def _require_ready():
    if not store.ready():
        raise HTTPException(status_code=503, detail="Data/model not loaded yet. Try again in a moment.")


@router.get("/health")
def health():
    return {
        "status": "ok" if store.ready() else "starting",
        "model_loaded": store.model_meta is not None,
        "model_type": (store.model_meta or {}).get("model_type"),
        "model_version": (store.model_meta or {}).get("model_version"),
        "farms_loaded": int(len(store.farms)) if store.ready() else 0,
        "uptime_seconds": round(time.time() - START, 1),
        "warnings": store.errors,
        "data_source": "Simulated / synthetic demo data",
    }


@router.get("/farms")
def farms(state: Optional[str] = None, crop: Optional[str] = None, district: Optional[str] = None,
          risk_level: Optional[str] = None, search: Optional[str] = None,
          limit: int = Query(100, ge=1, le=2000), offset: int = Query(0, ge=0)):
    _require_ready()
    return store.list_farms(state, crop, risk_level, district, search, limit, offset)


@router.get("/farms/{farm_id}")
def farm_detail(farm_id: str):
    _require_ready()
    farm = store.get_farm(farm_id)
    if farm is None:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    try:
        scoring = predict_risk(farm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction failed: {e}")
    return {"farm": farm, "scoring": scoring, "history_preview": store.farm_history(farm_id, 12),
            "data_source": "Simulated / synthetic demo data"}


@router.get("/terrascore/{farm_id}")
def terrascore(farm_id: str):
    """Compact, partner-facing score payload (what a lender/insurer would consume)."""
    _require_ready()
    farm = store.get_farm(farm_id)
    if farm is None:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    s = predict_risk(farm, top_k=3)
    return {
        "farm_id": farm["farm_id"],
        "terra_score": s["terra_score"],
        "risk_level": s["risk_level"],
        "risk_probability": s["risk_probability"],
        "confidence": s["confidence"],
        "crop": farm["crop_type"],
        "district": farm["district"],
        "state": farm["state"],
        "farm_area_ha": farm["farm_area"],
        "predicted_yield_loss_pct": s["predicted_yield_loss_pct"],
        "top_risk_factors": [f["label"] for f in s["top_risk_factors"]],
        "resilience_factors": [f["label"] for f in s["positive_resilience_factors"]],
        "model_version": s["model_version"],
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "disclaimer": "Prototype decision-support signal on simulated data. Not a credit score, underwriting decision or financial advice.",
    }


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    _require_ready()
    rec = req.model_dump()
    if rec.get("expected_yield") is None:
        rec["expected_yield"] = rec["historical_yield"]
    try:
        return predict_risk(rec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML prediction failed: {e}")


@router.post("/what-if", response_model=WhatIfResponse)
def what_if(req: WhatIfRequest):
    _require_ready()
    try:
        res = insight_service.run_what_if(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario simulation failed: {e}")
    if res is None:
        raise HTTPException(status_code=404, detail=f"Farm '{req.farm_id}' not found")
    return res


@router.get("/regions")
def regions(state: Optional[str] = None, crop: Optional[str] = None, risk_level: Optional[str] = None):
    _require_ready()
    return {"regions": store.regions(state, crop, risk_level), "filters": store.filters(),
            "data_source": "Simulated / synthetic demo data"}


@router.get("/risk-trends/{farm_id}")
def risk_trends(farm_id: str, months: int = Query(12, ge=1, le=60)):
    _require_ready()
    if store.get_farm(farm_id) is None:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    return {"farm_id": farm_id.upper(), "months": months, "series": store.farm_history(farm_id, months),
            "label": "Simulated historical data"}


@router.get("/model/explanation")
def model_explanation():
    _require_ready()
    meta = dict(store.model_meta or {})
    meta.pop("reference_stats", None)
    meta["how_it_works"] = [
        "Weather + Soil + Crop + Location", "Data Processing & Feature Engineering", "ML Prediction (Random Forest)",
        "Risk Probability", "TerraScore 0–1000", "Financial Decision Support",
    ]
    meta["score_formula"] = "TerraScore = round((1 - risk_probability) × 1000), clamped to [0, 1000]. Higher = lower risk."
    meta["risk_bands"] = [
        {"range": "800–1000", "level": "Very Low Risk"}, {"range": "600–799", "level": "Low Risk"},
        {"range": "400–599", "level": "Moderate Risk"}, {"range": "200–399", "level": "High Risk"},
        {"range": "0–199", "level": "Critical Risk"},
    ]
    meta["explanation_label"] = "Model-derived feature importance"
    return meta


@router.get("/summary")
def summary(view: str = "farmer"):
    _require_ready()
    return store.portfolio_summary(view)


@router.get("/alerts")
def alerts(limit: int = Query(8, ge=1, le=20)):
    _require_ready()
    return {"alerts": insight_service.generate_alerts(limit), "label": "Generated from simulated data"}


@router.get("/weather")
def weather(latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180)):
    """Return current weather for a coordinate pair. This is a scenario input, not a direct prediction."""
    try:
        data = get_weather_for_coordinates(latitude, longitude)
        return {
            "latitude": data["latitude"],
            "longitude": data["longitude"],
            "temperature": data["temperature"],
            "precipitation": data["precipitation"],
            "rain": data["rain"],
            "humidity": data["humidity"],
            "weather_code": data["weather_code"],
            "weather_condition": data["weather_condition"],
            "timestamp": data["timestamp"],
            "source": data["source"],
            "data_type": data["data_type"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Live weather unavailable — showing historical/model data. {type(exc).__name__}")


@router.get("/telemetry/{farm_id}")
def telemetry(farm_id: str):
    _require_ready()
    t = insight_service.telemetry(farm_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    return t


@router.get("/demo-data")
def demo_data():
    """Preconfigured demo scenario: FARM-001 with score, trends, telemetry and portfolio summary."""
    _require_ready()
    farm_id = "FARM-001"
    farm = store.get_farm(farm_id)
    return {
        "demo_farm_id": farm_id,
        "farm": farm,
        "scoring": predict_risk(farm),
        "trends": store.farm_history(farm_id, 12),
        "telemetry": insight_service.telemetry(farm_id),
        "summary": store.portfolio_summary(),
        "alerts": insight_service.generate_alerts(6),
        "suggested_scenario": {"farm_id": farm_id, "rainfall_change_pct": -20, "temperature_change_c": 2, "soil_moisture_change_pct": -15},
        "data_source": "Simulated / synthetic demo data",
    }
