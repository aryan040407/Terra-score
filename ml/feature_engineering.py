"""Feature engineering shared by training and inference."""
from __future__ import annotations

import numpy as np
import pandas as pd

NUMERIC_FEATURES = [
    "temperature", "precipitation", "soil_health", "soil_moisture", "humidity",
    "drought_index", "flood_risk", "pest_risk", "historical_yield", "yield_variation",
    "weather_volatility", "crop_price", "previous_loss", "climate_resilience", "farm_area",
]
CATEGORICAL_FEATURES = ["crop_type", "season", "irrigation_status"]
CROPS = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Pulses", "Mustard"]
SEASONS = ["Rabi", "Kharif", "Annual"]
IRRIGATION_MAP = {"None": 0, "Partial": 1, "Good": 2}

# Human-readable labels for explanations
FEATURE_LABELS = {
    "temperature": "Temperature",
    "precipitation": "Rainfall",
    "soil_health": "Soil health",
    "soil_moisture": "Soil moisture",
    "humidity": "Humidity",
    "drought_index": "Drought index",
    "flood_risk": "Flood risk",
    "pest_risk": "Pest risk",
    "historical_yield": "Historical yield",
    "yield_variation": "Yield variability",
    "weather_volatility": "Rainfall / weather volatility",
    "crop_price": "Crop price",
    "previous_loss": "Previous loss history",
    "climate_resilience": "Climate resilience",
    "farm_area": "Farm size",
    "irrigation_level": "Irrigation",
    "water_stress": "Water stress (crop need vs rainfall)",
    "heat_stress": "Heat stress",
    "crop_type": "Crop type",
    "season": "Season",
}

# Direction: +1 means higher value => higher risk, -1 means higher value => lower risk
FEATURE_DIRECTION = {
    "temperature": 1, "precipitation": -1, "soil_health": -1, "soil_moisture": -1, "humidity": 1,
    "drought_index": 1, "flood_risk": 1, "pest_risk": 1, "historical_yield": -1, "yield_variation": 1,
    "weather_volatility": 1, "crop_price": -1, "previous_loss": 1, "climate_resilience": -1,
    "farm_area": -1, "irrigation_level": -1, "water_stress": 1, "heat_stress": 1,
}

CROP_WATER_NEED = {"Wheat": 0.5, "Rice": 0.9, "Maize": 0.5, "Cotton": 0.6, "Sugarcane": 0.95, "Pulses": 0.3, "Mustard": 0.3}
CROP_HEAT_TOL = {"Wheat": 0.4, "Rice": 0.7, "Maize": 0.6, "Cotton": 0.8, "Sugarcane": 0.7, "Pulses": 0.6, "Mustard": 0.4}


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Transform raw farm records into the model feature matrix."""
    X = pd.DataFrame(index=df.index)
    for c in NUMERIC_FEATURES:
        X[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    X["irrigation_level"] = df["irrigation_status"].map(IRRIGATION_MAP).fillna(1).astype(float)

    water_need = df["crop_type"].map(CROP_WATER_NEED).fillna(0.5)
    heat_tol = df["crop_type"].map(CROP_HEAT_TOL).fillna(0.6)
    X["water_stress"] = np.clip(water_need - X["precipitation"] / 150.0, 0, None)
    X["heat_stress"] = np.clip((X["temperature"] - 30) / 8, 0, None) * (1 - heat_tol)

    for crop in CROPS:
        X[f"crop_{crop}"] = (df["crop_type"] == crop).astype(float)
    for s in SEASONS:
        X[f"season_{s}"] = (df["season"] == s).astype(float)
    return X


def feature_columns() -> list[str]:
    dummy = pd.DataFrame([{**{c: 0.0 for c in NUMERIC_FEATURES}, "crop_type": "Wheat", "season": "Rabi", "irrigation_status": "Good"}])
    return list(build_features(dummy).columns)


def group_feature(col: str) -> str:
    """Map one-hot columns back to their parent feature for explanations."""
    if col.startswith("crop_"):
        return "crop_type"
    if col.startswith("season_"):
        return "season"
    return col
