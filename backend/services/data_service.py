"""
Data layer: loads synthetic farm + history data into SQLite (zero-config) and
scores every farm ONCE at startup with the trained model. All reads afterwards
are served from in-memory pandas frames / the SQLite cache.

Swap `load_farms()` for a PostgreSQL query later without touching the routes.
"""
from __future__ import annotations

import sqlite3
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

from backend.config import DATA_DIR, DB_PATH, ROOT

sys.path.insert(0, str(ROOT / "ml"))
from predict import predict_risk, predict_batch, risk_level, score_from_probability, load_model  # noqa: E402


class DataStore:
    def __init__(self) -> None:
        self.farms: pd.DataFrame | None = None
        self.history: pd.DataFrame | None = None
        self.loaded_at: float | None = None
        self.model_meta: dict | None = None
        self.errors: list[str] = []

    # ------------------------------------------------------------------ load
    def load(self) -> None:
        t0 = time.time()
        farms_path = DATA_DIR / "farms.csv"
        hist_path = DATA_DIR / "historical_weather.csv"
        if not farms_path.exists():
            raise FileNotFoundError(f"{farms_path} missing — run `python ml/generate_data.py`")
        farms = pd.read_csv(farms_path)
        _, meta, _ = load_model()
        self.model_meta = meta

        # Score every farm once with the trained model
        probs = predict_batch(farms)
        farms["risk_probability"] = np.round(probs, 4)
        farms["terra_score"] = [score_from_probability(p) for p in probs]
        farms["risk_level"] = [risk_level(s) for s in farms["terra_score"]]
        farms["predicted_yield"] = np.round(farms["expected_yield"] * (1 - 0.45 * farms["risk_probability"]), 2)
        farms["predicted_yield_loss_pct"] = np.round(45 * farms["risk_probability"], 1)
        self.farms = farms

        if hist_path.exists():
            self.history = pd.read_csv(hist_path)
        else:
            self.history = pd.DataFrame()

        # Persist to SQLite as a queryable cache (demonstrates DB layer; PostgreSQL-swappable)
        try:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(DB_PATH) as con:
                farms.to_sql("farms", con, if_exists="replace", index=False)
                if len(self.history):
                    self.history.to_sql("farm_history", con, if_exists="replace", index=False)
                con.execute("CREATE INDEX IF NOT EXISTS idx_hist_farm ON farm_history(farm_id)")
        except Exception as e:  # DB failure must not break the demo
            self.errors.append(f"sqlite cache unavailable: {e}")

        self.loaded_at = time.time()
        print(f"[TerraScore] loaded {len(farms)} farms, {len(self.history)} history rows, scored in {time.time() - t0:.2f}s")

    # ----------------------------------------------------------------- reads
    def ready(self) -> bool:
        return self.farms is not None

    def get_farm(self, farm_id: str) -> dict | None:
        if self.farms is None:
            return None
        m = self.farms[self.farms["farm_id"].str.upper() == farm_id.upper()]
        if m.empty:
            return None
        return _clean(m.iloc[0].to_dict())

    def list_farms(self, state=None, crop=None, risk_level_=None, district=None, search=None, limit=100, offset=0):
        df = self.farms
        if state:
            df = df[df["state"] == state]
        if crop:
            df = df[df["crop_type"] == crop]
        if district:
            df = df[df["district"] == district]
        if risk_level_:
            df = df[df["risk_level"] == risk_level_]
        if search:
            s = search.lower()
            df = df[df["farm_id"].str.lower().str.contains(s) | df["farmer_name"].str.lower().str.contains(s)
                    | df["district"].str.lower().str.contains(s)]
        total = len(df)
        cols = ["farm_id", "farmer_name", "district", "state", "latitude", "longitude", "crop_type", "farm_area",
                "terra_score", "risk_level", "risk_probability", "predicted_yield_loss_pct", "irrigation_status", "soil_health"]
        items = [_clean(r) for r in df[cols].iloc[offset: offset + limit].to_dict(orient="records")]
        return {"total": total, "items": items, "limit": limit, "offset": offset}

    def farm_history(self, farm_id: str, months: int = 12) -> list[dict]:
        if self.history is None or self.history.empty:
            return []
        h = self.history[self.history["farm_id"].str.upper() == farm_id.upper()].sort_values("month")
        return [_clean(r) for r in h.tail(months).to_dict(orient="records")]

    def score_farm(self, farm_id: str) -> dict | None:
        farm = self.get_farm(farm_id)
        if farm is None:
            return None
        return predict_risk(farm)

    # ---------------------------------------------------------------- aggregates
    def portfolio_summary(self, view: str = "farmer") -> dict:
        df = self.farms
        hist = self.history
        high = df[df["terra_score"] < 400]
        # trend: compare mean terra_score of last 3 months vs 3 months prior (from simulated history)
        trend = 0.0
        trend_series = []
        if hist is not None and not hist.empty:
            m = hist.groupby("month")["terra_score"].mean().sort_index()
            trend_series = [{"month": k, "avg_terra_score": round(float(v), 1)} for k, v in m.tail(24).items()]
            if len(m) >= 6:
                trend = float(m.tail(3).mean() - m.iloc[-6:-3].mean())
        dist = df["risk_level"].value_counts().to_dict()
        levels = ["Very Low Risk", "Low Risk", "Moderate Risk", "High Risk", "Critical Risk"]
        summary = {
            "total_farms": int(len(df)),
            "average_terra_score": round(float(df["terra_score"].mean()), 1),
            "median_terra_score": int(df["terra_score"].median()),
            "high_risk_farms": int(len(high)),
            "high_risk_pct": round(100 * len(high) / len(df), 1),
            "predicted_yield_loss_pct": round(float(df["predicted_yield_loss_pct"].mean()), 1),
            "avg_risk_probability": round(float(df["risk_probability"].mean()), 4),
            "climate_risk_trend_points": round(trend, 1),
            "risk_distribution": [{"level": l, "count": int(dist.get(l, 0))} for l in levels],
            "trend_series": trend_series,
            "total_area_ha": round(float(df["farm_area"].sum()), 1),
            "states": int(df["state"].nunique()),
            "districts": int(df["district"].nunique()),
            "crops": int(df["crop_type"].nunique()),
            "data_source": "Simulated / synthetic demo data",
            "last_updated": pd.Timestamp.utcnow().isoformat(),
        }
        # Lender view: exposure ≈ area × price × expected yield (notional, INR)
        notional = (df["farm_area"] * df["expected_yield"] * 10 * df["crop_price"])  # t/ha -> quintals
        df2 = df.assign(notional=notional, expected_loss=notional * df["risk_probability"] * 0.45)
        by_state = df2.groupby("state").agg(farms=("farm_id", "count"), avg_terra_score=("terra_score", "mean"),
                                            exposure=("notional", "sum"), expected_loss=("expected_loss", "sum"),
                                            high_risk=("terra_score", lambda s: int((s < 400).sum()))).reset_index()
        by_crop = df2.groupby("crop_type").agg(farms=("farm_id", "count"), avg_terra_score=("terra_score", "mean"),
                                               avg_risk=("risk_probability", "mean"), exposure=("notional", "sum"),
                                               expected_loss=("expected_loss", "sum"),
                                               loss_probability=("risk_probability", "mean")).reset_index()
        summary["lender"] = {
            "portfolio_exposure_inr": round(float(notional.sum()), 0),
            "expected_loss_inr": round(float(df2["expected_loss"].sum()), 0),
            "expected_loss_ratio_pct": round(100 * float(df2["expected_loss"].sum() / notional.sum()), 2),
            "regional_exposure": [_clean(r) for r in by_state.sort_values("exposure", ascending=False).round(1).to_dict(orient="records")],
            "high_risk_farms": [_clean(r) for r in df.sort_values("terra_score").head(10)[
                ["farm_id", "farmer_name", "district", "state", "crop_type", "terra_score", "risk_level", "predicted_yield_loss_pct"]].to_dict(orient="records")],
        }
        # Insurer view: loss probability, claims proxy from previous_loss
        claims_proxy = df[df["previous_loss"] > 0.4]
        summary["insurer"] = {
            "avg_loss_probability": round(float(df["risk_probability"].mean()), 4),
            "farms_loss_prob_over_50": int((df["risk_probability"] > 0.5).sum()),
            "historical_claims_proxy": int(len(claims_proxy)),
            "historical_claims_rate_pct": round(100 * len(claims_proxy) / len(df), 1),
            "crop_risk": [_clean(r) for r in by_crop.sort_values("avg_risk", ascending=False).round(3).to_dict(orient="records")],
            "climate_exposure": {
                "drought_exposed": int((df["drought_index"] > 0.5).sum()),
                "flood_exposed": int((df["flood_risk"] > 0.5).sum()),
                "pest_exposed": int((df["pest_risk"] > 0.5).sum()),
                "heat_exposed": int((df["temperature"] > 30).sum()),
            },
            "segments": [
                {"segment": "Preferred (≥800)", "farms": int((df["terra_score"] >= 800).sum())},
                {"segment": "Standard (600–799)", "farms": int(((df["terra_score"] >= 600) & (df["terra_score"] < 800)).sum())},
                {"segment": "Sub-standard (400–599)", "farms": int(((df["terra_score"] >= 400) & (df["terra_score"] < 600)).sum())},
                {"segment": "High-risk (200–399)", "farms": int(((df["terra_score"] >= 200) & (df["terra_score"] < 400)).sum())},
                {"segment": "Decline / Review (<200)", "farms": int((df["terra_score"] < 200).sum())},
            ],
        }
        return summary

    def regions(self, state=None, crop=None, risk_level_=None) -> list[dict]:
        df = self.farms
        if state:
            df = df[df["state"] == state]
        if crop:
            df = df[df["crop_type"] == crop]
        g = df.groupby(["state", "district"])
        rows = []
        for (st, d), grp in g:
            avg_score = float(grp["terra_score"].mean())
            lvl = risk_level(int(round(avg_score)))
            if risk_level_ and lvl != risk_level_:
                continue
            rows.append({
                "state": st, "district": d,
                "latitude": round(float(grp["latitude"].mean()), 4),
                "longitude": round(float(grp["longitude"].mean()), 4),
                "farms": int(len(grp)),
                "average_terra_score": round(avg_score, 1),
                "risk_level": lvl,
                "average_risk_probability": round(float(grp["risk_probability"].mean()), 4),
                "dominant_crop": grp["crop_type"].mode().iloc[0],
                "predicted_yield_loss_pct": round(float(grp["predicted_yield_loss_pct"].mean()), 1),
                "high_risk_farms": int((grp["terra_score"] < 400).sum()),
                "avg_drought_index": round(float(grp["drought_index"].mean()), 3),
                "avg_soil_moisture": round(float(grp["soil_moisture"].mean()), 1),
                "avg_rainfall": round(float(grp["precipitation"].mean()), 1),
                "irrigation_good_pct": round(100 * float((grp["irrigation_status"] == "Good").mean()), 1),
                "crop_mix": {k: int(v) for k, v in grp["crop_type"].value_counts().items()},
            })
        return rows

    def filters(self) -> dict:
        df = self.farms
        return {
            "states": sorted(df["state"].unique().tolist()),
            "districts": sorted(df["district"].unique().tolist()),
            "crops": sorted(df["crop_type"].unique().tolist()),
            "risk_levels": ["Very Low Risk", "Low Risk", "Moderate Risk", "High Risk", "Critical Risk"],
        }


def _clean(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        if isinstance(v, (np.integer,)):
            out[k] = int(v)
        elif isinstance(v, (np.floating,)):
            out[k] = None if np.isnan(v) else float(v)
        elif isinstance(v, float) and np.isnan(v):
            out[k] = None
        else:
            out[k] = v
    return out


store = DataStore()
