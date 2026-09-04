"""
TerraScore — inference + explainability.

Loads the saved model ONCE and exposes:
    predict_risk(record: dict) -> dict  (risk_probability, terra_score, risk_level, confidence, factors)

TerraScore formula (documented):
    risk_probability = P(significant crop loss)  from the trained classifier
    TerraScore       = round((1 - risk_probability) * 1000), clamped to [0, 1000]

Risk levels:
    0–199   Critical Risk
    200–399 High Risk
    400–599 Moderate Risk
    600–799 Low Risk
    800–1000 Very Low Risk

Confidence:
    Agreement among the individual trees of the forest (1 - normalised std of
    per-tree probabilities), blended with distance from the 0.5 decision
    boundary. Reported as 0–1.

Local explanation (per farm):
    contribution_i = global_importance_i * direction_i * z_i
    where z_i is the farm's standardised feature value against the training
    distribution. Positive contribution => pushes risk UP, negative => protective.
    This is a fast, model-derived approximation (importance-weighted deviation).
    If SHAP is installed, TreeExplainer values are used instead.
"""
from __future__ import annotations

import json
import os
import sys
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from feature_engineering import build_features, group_feature, FEATURE_LABELS, FEATURE_DIRECTION  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(ROOT, "ml", "saved_model")

try:  # optional
    import shap  # type: ignore
    _HAS_SHAP = True
except Exception:  # pragma: no cover
    shap = None
    _HAS_SHAP = False


def risk_level(score: int) -> str:
    if score < 200:
        return "Critical Risk"
    if score < 400:
        return "High Risk"
    if score < 600:
        return "Moderate Risk"
    if score < 800:
        return "Low Risk"
    return "Very Low Risk"


def score_from_probability(p: float) -> int:
    return int(max(0, min(1000, round((1 - float(p)) * 1000))))


@lru_cache(maxsize=1)
def load_model():
    model = joblib.load(os.path.join(MODEL_DIR, "terrascore_model.joblib"))
    with open(os.path.join(MODEL_DIR, "model_metadata.json")) as f:
        meta = json.load(f)
    explainer = None
    if _HAS_SHAP:
        try:
            explainer = shap.TreeExplainer(model)
        except Exception:
            explainer = None
    return model, meta, explainer


def _confidence(model, X: pd.DataFrame, p: float) -> float:
    if hasattr(model, "estimators_"):
        per_tree = np.array([t.predict_proba(X.values)[:, 1][0] for t in model.estimators_])
        agreement = 1 - min(per_tree.std() / 0.5, 1.0)
    else:
        agreement = 0.8
    margin = abs(p - 0.5) * 2  # 0 at boundary, 1 at extremes
    return float(round(np.clip(0.55 + 0.30 * agreement + 0.15 * margin, 0.5, 0.99), 3))


def _local_contributions(model, meta, explainer, X: pd.DataFrame) -> dict[str, float]:
    cols = list(X.columns)
    if explainer is not None:
        try:
            sv = explainer.shap_values(X)
            sv = sv[1] if isinstance(sv, list) else sv
            sv = np.array(sv).reshape(-1)[: len(cols)]
            out: dict[str, float] = {}
            for c, v in zip(cols, sv):
                g = group_feature(c)
                out[g] = out.get(g, 0.0) + float(v)
            return out
        except Exception:
            pass
    # importance-weighted standardised deviation
    imp = dict(zip(cols, getattr(model, "feature_importances_", np.ones(len(cols)) / len(cols))))
    ref = meta["reference_stats"]
    out = {}
    for c in cols:
        z = (float(X[c].iloc[0]) - ref[c]["mean"]) / (ref[c]["std"] or 1.0)
        z = float(np.clip(z, -3, 3))
        g = group_feature(c)
        direction = FEATURE_DIRECTION.get(g, 0)
        if g in ("crop_type", "season"):
            # one-hot: use signed importance only for the active category, treat as neutral
            continue
        out[g] = out.get(g, 0.0) + imp[c] * direction * z
    return out


def _describe(feature: str, value, contribution: float) -> str:
    lbl = FEATURE_LABELS.get(feature, feature)
    up = contribution > 0
    v = value
    if feature == "precipitation":
        return f"{'Low' if up else 'Adequate'} rainfall ({v:.0f} mm/month)"
    if feature == "temperature":
        return f"{'Elevated' if up else 'Favourable'} temperature ({v:.1f}°C)"
    if feature == "soil_moisture":
        return f"{'Low' if up else 'Healthy'} soil moisture ({v:.0f}%)"
    if feature == "soil_health":
        return f"{'Weak' if up else 'Strong'} soil health ({v:.0f}/100)"
    if feature == "irrigation_level":
        return f"{'Limited' if up else 'Stable'} irrigation ({['None', 'Partial', 'Good'][int(v)]})"
    if feature == "drought_index":
        return f"{'Rising' if up else 'Low'} drought index ({v:.2f})"
    if feature == "weather_volatility":
        return f"{'High' if up else 'Low'} rainfall volatility ({v:.2f})"
    if feature == "historical_yield":
        return f"{'Below-average' if up else 'Good'} historical yield ({v:.2f} t/ha)"
    if feature == "climate_resilience":
        return f"{'Low' if up else 'Strong'} climate resilience ({v:.2f})"
    if feature == "previous_loss":
        return f"{'Recent' if up else 'Minimal'} loss history ({v:.2f})"
    if feature in ("pest_risk", "flood_risk", "yield_variation", "water_stress", "heat_stress", "humidity"):
        return f"{'High' if up else 'Low'} {lbl.lower()} ({v:.2f})"
    if feature == "farm_area":
        return f"{'Small' if up else 'Larger'} farm size ({v:.1f} ha)"
    if feature == "crop_price":
        return f"{'Weak' if up else 'Supportive'} crop price (₹{v:.0f}/q)"
    return f"{lbl}: {v}"


def predict_risk(record: dict, top_k: int = 5) -> dict:
    """Predict risk for a single farm record (dict with raw feature fields)."""
    model, meta, explainer = load_model()
    df = pd.DataFrame([record])
    X = build_features(df)[meta["feature_columns"]]
    p = float(model.predict_proba(X)[:, 1][0])
    score = score_from_probability(p)
    conf = _confidence(model, X, p)

    contrib = _local_contributions(model, meta, explainer, X)
    values = {c: float(X[c].iloc[0]) for c in X.columns}
    total_abs = sum(abs(v) for v in contrib.values()) or 1.0
    items = [
        {
            "feature": k,
            "label": FEATURE_LABELS.get(k, k),
            "contribution": round(v / total_abs, 4),
            "value": round(values.get(k, 0.0), 3),
            "description": _describe(k, values.get(k, 0.0), v),
        }
        for k, v in contrib.items()
    ]
    risk_factors = sorted([i for i in items if i["contribution"] > 0], key=lambda i: -i["contribution"])[:top_k]
    protective = sorted([i for i in items if i["contribution"] < 0], key=lambda i: i["contribution"])[:top_k]
    for i in protective:
        i["contribution"] = abs(i["contribution"])

    # predicted yield = expected yield adjusted by risk (simple, documented heuristic)
    expected = float(record.get("expected_yield", record.get("historical_yield", 0)) or 0)
    predicted_yield = expected * (1 - 0.45 * p)

    return {
        "risk_probability": round(p, 4),
        "terra_score": score,
        "risk_level": risk_level(score),
        "confidence": conf,
        "expected_yield": round(expected, 2),
        "predicted_yield": round(predicted_yield, 2),
        "predicted_yield_loss_pct": round(45 * p, 1),
        "top_risk_factors": risk_factors,
        "positive_resilience_factors": protective,
        "explanation_method": "SHAP TreeExplainer" if explainer is not None else "Model-derived feature importance × standardised deviation",
        "model_version": meta["model_version"],
        "model_type": meta["model_type"],
    }


def predict_batch(df: pd.DataFrame) -> np.ndarray:
    """Vectorised probability prediction for many farms."""
    model, meta, _ = load_model()
    X = build_features(df)[meta["feature_columns"]]
    return model.predict_proba(X)[:, 1]


if __name__ == "__main__":
    farms = pd.read_csv(os.path.join(ROOT, "data", "farms.csv"))
    rec = farms.iloc[0].to_dict()
    print(json.dumps(predict_risk(rec), indent=2))
