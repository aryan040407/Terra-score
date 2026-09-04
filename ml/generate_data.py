"""
TerraScore — Synthetic agricultural dataset generator.

Generates realistic (but simulated) farm records across Indian states/districts
with crop-, climate- and region-aware distributions, plus a multi-year monthly
history per farm for time-series analytics.

Output:
    data/farms.csv
    data/historical_weather.csv

NOTE: All data is SIMULATED for demonstration purposes.
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd

SEED = 42
N_FARMS = 1500
HISTORY_MONTHS = 60  # 5 years

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")

# ---------------------------------------------------------------------------
# Geography: state -> districts (lat, lon) + climate profile
# ---------------------------------------------------------------------------
STATES = {
    "Punjab": {
        "districts": {"Ludhiana": (30.90, 75.85), "Amritsar": (31.63, 74.87), "Bathinda": (30.21, 74.95), "Patiala": (30.34, 76.39), "Jalandhar": (31.33, 75.58)},
        "crops": {"Wheat": 0.45, "Rice": 0.35, "Maize": 0.08, "Cotton": 0.07, "Mustard": 0.05},
        "temp": 25.0, "rain": 55, "humidity": 58, "irrigation": 0.92, "soil": 72, "drought": 0.22, "flood": 0.18,
    },
    "Haryana": {
        "districts": {"Karnal": (29.69, 76.99), "Hisar": (29.15, 75.72), "Sirsa": (29.53, 75.02), "Rohtak": (28.89, 76.59)},
        "crops": {"Wheat": 0.45, "Rice": 0.25, "Mustard": 0.12, "Cotton": 0.1, "Sugarcane": 0.08},
        "temp": 25.5, "rain": 48, "humidity": 55, "irrigation": 0.85, "soil": 68, "drought": 0.3, "flood": 0.15,
    },
    "Uttar Pradesh": {
        "districts": {"Meerut": (28.98, 77.71), "Lucknow": (26.85, 80.95), "Gorakhpur": (26.76, 83.37), "Agra": (27.18, 78.01), "Varanasi": (25.32, 82.97), "Bareilly": (28.37, 79.43)},
        "crops": {"Wheat": 0.35, "Rice": 0.25, "Sugarcane": 0.2, "Pulses": 0.1, "Mustard": 0.1},
        "temp": 26.5, "rain": 80, "humidity": 62, "irrigation": 0.75, "soil": 64, "drought": 0.3, "flood": 0.35,
    },
    "Maharashtra": {
        "districts": {"Nagpur": (21.15, 79.09), "Nashik": (19.99, 73.79), "Aurangabad": (19.88, 75.34), "Solapur": (17.68, 75.91), "Latur": (18.40, 76.56), "Kolhapur": (16.70, 74.24)},
        "crops": {"Cotton": 0.3, "Sugarcane": 0.2, "Pulses": 0.2, "Maize": 0.15, "Rice": 0.15},
        "temp": 27.5, "rain": 75, "humidity": 55, "irrigation": 0.45, "soil": 58, "drought": 0.5, "flood": 0.2,
    },
    "Madhya Pradesh": {
        "districts": {"Indore": (22.72, 75.86), "Bhopal": (23.26, 77.41), "Jabalpur": (23.18, 79.99), "Gwalior": (26.22, 78.18), "Ujjain": (23.18, 75.78)},
        "crops": {"Wheat": 0.3, "Pulses": 0.3, "Maize": 0.15, "Mustard": 0.1, "Rice": 0.15},
        "temp": 26.0, "rain": 85, "humidity": 55, "irrigation": 0.5, "soil": 60, "drought": 0.42, "flood": 0.22,
    },
    "Rajasthan": {
        "districts": {"Jaipur": (26.91, 75.79), "Jodhpur": (26.24, 73.02), "Kota": (25.21, 75.86), "Bikaner": (28.02, 73.31), "Sri Ganganagar": (29.92, 73.88)},
        "crops": {"Mustard": 0.3, "Wheat": 0.25, "Pulses": 0.25, "Cotton": 0.1, "Maize": 0.1},
        "temp": 28.0, "rain": 32, "humidity": 40, "irrigation": 0.4, "soil": 48, "drought": 0.68, "flood": 0.08,
    },
    "Gujarat": {
        "districts": {"Rajkot": (22.30, 70.80), "Ahmedabad": (23.02, 72.57), "Surat": (21.17, 72.83), "Bhavnagar": (21.76, 72.15)},
        "crops": {"Cotton": 0.4, "Wheat": 0.2, "Pulses": 0.15, "Maize": 0.1, "Sugarcane": 0.15},
        "temp": 28.0, "rain": 60, "humidity": 55, "irrigation": 0.55, "soil": 56, "drought": 0.5, "flood": 0.22,
    },
    "Karnataka": {
        "districts": {"Belagavi": (15.85, 74.50), "Mysuru": (12.30, 76.65), "Dharwad": (15.46, 75.01), "Raichur": (16.21, 77.36), "Mandya": (12.52, 76.90)},
        "crops": {"Rice": 0.25, "Maize": 0.25, "Pulses": 0.2, "Sugarcane": 0.2, "Cotton": 0.1},
        "temp": 26.5, "rain": 85, "humidity": 62, "irrigation": 0.5, "soil": 60, "drought": 0.42, "flood": 0.22,
    },
    "Andhra Pradesh": {
        "districts": {"Guntur": (16.31, 80.44), "Kurnool": (15.83, 78.04), "Anantapur": (14.68, 77.60), "Krishna": (16.55, 80.90)},
        "crops": {"Rice": 0.4, "Cotton": 0.25, "Pulses": 0.2, "Maize": 0.15},
        "temp": 28.5, "rain": 80, "humidity": 65, "irrigation": 0.6, "soil": 60, "drought": 0.45, "flood": 0.35,
    },
    "Telangana": {
        "districts": {"Warangal": (17.98, 79.59), "Nalgonda": (17.05, 79.27), "Nizamabad": (18.67, 78.10), "Khammam": (17.25, 80.15)},
        "crops": {"Rice": 0.4, "Cotton": 0.35, "Maize": 0.15, "Pulses": 0.1},
        "temp": 28.5, "rain": 78, "humidity": 58, "irrigation": 0.6, "soil": 58, "drought": 0.48, "flood": 0.25,
    },
    "West Bengal": {
        "districts": {"Bardhaman": (23.24, 87.86), "Murshidabad": (24.18, 88.27), "Nadia": (23.47, 88.55), "Hooghly": (22.90, 88.39)},
        "crops": {"Rice": 0.6, "Pulses": 0.15, "Mustard": 0.15, "Maize": 0.1},
        "temp": 27.0, "rain": 130, "humidity": 75, "irrigation": 0.65, "soil": 66, "drought": 0.18, "flood": 0.55,
    },
    "Bihar": {
        "districts": {"Patna": (25.59, 85.14), "Muzaffarpur": (26.12, 85.39), "Darbhanga": (26.15, 85.90), "Gaya": (24.79, 85.00)},
        "crops": {"Rice": 0.4, "Wheat": 0.3, "Maize": 0.15, "Pulses": 0.15},
        "temp": 26.5, "rain": 100, "humidity": 70, "irrigation": 0.6, "soil": 62, "drought": 0.28, "flood": 0.58,
    },
    "Tamil Nadu": {
        "districts": {"Thanjavur": (10.79, 79.14), "Coimbatore": (11.02, 76.96), "Madurai": (9.93, 78.12), "Salem": (11.66, 78.15)},
        "crops": {"Rice": 0.45, "Sugarcane": 0.2, "Maize": 0.15, "Pulses": 0.1, "Cotton": 0.1},
        "temp": 29.0, "rain": 80, "humidity": 68, "irrigation": 0.6, "soil": 58, "drought": 0.4, "flood": 0.25,
    },
}

CROPS = {
    # base yield (t/ha), yield std, price (INR/quintal), heat tolerance, water need, pest base
    "Wheat":     {"yield": 4.2, "std": 0.6, "price": 2275, "heat_tol": 0.4, "water": 0.5, "pest": 0.25, "season": "Rabi"},
    "Rice":      {"yield": 3.9, "std": 0.7, "price": 2300, "heat_tol": 0.7, "water": 0.9, "pest": 0.4, "season": "Kharif"},
    "Maize":     {"yield": 3.2, "std": 0.7, "price": 2090, "heat_tol": 0.6, "water": 0.5, "pest": 0.4, "season": "Kharif"},
    "Cotton":    {"yield": 1.8, "std": 0.5, "price": 6620, "heat_tol": 0.8, "water": 0.6, "pest": 0.6, "season": "Kharif"},
    "Sugarcane": {"yield": 72.0, "std": 10.0, "price": 340, "heat_tol": 0.7, "water": 0.95, "pest": 0.35, "season": "Annual"},
    "Pulses":    {"yield": 1.1, "std": 0.3, "price": 6400, "heat_tol": 0.6, "water": 0.3, "pest": 0.45, "season": "Rabi"},
    "Mustard":   {"yield": 1.5, "std": 0.35, "price": 5650, "heat_tol": 0.4, "water": 0.3, "pest": 0.35, "season": "Rabi"},
}

FIRST = ["Rajinder", "Gurpreet", "Harpreet", "Sukhwinder", "Ramesh", "Suresh", "Mahesh", "Anil", "Sunil", "Vijay", "Sanjay", "Manoj",
         "Prakash", "Dinesh", "Ganesh", "Shankar", "Laxman", "Bhagwan", "Narayan", "Kishan", "Mohan", "Sohan", "Raju", "Babu",
         "Savita", "Kamla", "Sunita", "Geeta", "Radha", "Lakshmi", "Meena", "Anita", "Pushpa", "Shanti", "Kavita", "Rekha"]
LAST = ["Singh", "Kaur", "Sharma", "Verma", "Yadav", "Patel", "Kumar", "Reddy", "Naidu", "Rao", "Gowda", "Deshmukh", "Patil",
        "Jadhav", "Choudhary", "Meena", "Jat", "Mondal", "Das", "Ghosh", "Murugan", "Pillai", "Chauhan", "Rathore", "Bishnoi"]


def _pick(rng, weights: dict):
    keys = list(weights.keys())
    p = np.array(list(weights.values()), dtype=float)
    return keys[rng.choice(len(keys), p=p / p.sum())]


def latent_risk(row: dict) -> float:
    """Structural latent risk used to derive *realistic* labels (unknown to the model).

    The ML model must learn this relationship from data — it is NOT used at prediction time.
    """
    crop = CROPS[row["crop_type"]]
    heat_stress = max(0.0, (row["temperature"] - 30) / 8) * (1 - crop["heat_tol"])
    water_gap = max(0.0, crop["water"] - row["precipitation"] / 150.0)
    irrigation_buffer = {"Good": 0.65, "Partial": 0.35, "None": 0.0}[row["irrigation_status"]]
    water_stress = water_gap * (1 - irrigation_buffer)

    z = (
        -1.9
        + 1.9 * row["drought_index"] * (1 - 0.6 * irrigation_buffer)
        + 1.3 * row["flood_risk"]
        + 1.2 * row["pest_risk"]
        + 1.6 * row["weather_volatility"]
        + 1.8 * water_stress
        + 1.4 * heat_stress
        - 1.6 * (row["soil_health"] / 100.0)
        - 0.9 * (row["soil_moisture"] / 100.0)
        + 1.1 * row["yield_variation"]
        + 0.9 * row["previous_loss"]
        - 1.5 * row["climate_resilience"]
        + 0.25 * (1 - min(row["farm_area"], 10) / 10.0)  # smallholders more exposed
    )
    return float(1 / (1 + np.exp(-1.9 * (z + 0.35))))


def generate_farms(rng: np.random.Generator) -> pd.DataFrame:
    rows = []
    state_names = list(STATES.keys())
    # weight bigger agri states slightly more
    state_w = np.array([1.2, 1.0, 1.4, 1.3, 1.1, 1.1, 1.0, 1.0, 0.9, 0.9, 0.9, 0.9, 0.9])
    state_w = state_w / state_w.sum()

    for i in range(N_FARMS):
        state = state_names[rng.choice(len(state_names), p=state_w)]
        sp = STATES[state]
        district = list(sp["districts"].keys())[rng.integers(len(sp["districts"]))]
        lat0, lon0 = sp["districts"][district]
        lat = lat0 + rng.normal(0, 0.18)
        lon = lon0 + rng.normal(0, 0.18)

        crop = _pick(rng, sp["crops"])
        cp = CROPS[crop]

        farm_area = float(np.clip(rng.lognormal(mean=0.9, sigma=0.7), 0.4, 40))  # hectares
        soil_health = float(np.clip(rng.normal(sp["soil"], 11), 20, 98))
        temperature = float(np.clip(rng.normal(sp["temp"], 2.2), 15, 40))
        precipitation = float(np.clip(rng.gamma(shape=4, scale=sp["rain"] / 4), 5, 400))  # mm/month avg
        humidity = float(np.clip(rng.normal(sp["humidity"], 8), 20, 95))
        drought_index = float(np.clip(rng.beta(2, 2) * 0.6 + sp["drought"] * 0.7 - 0.15 + rng.normal(0, 0.05), 0, 1))
        flood_risk = float(np.clip(rng.beta(2, 3) * 0.5 + sp["flood"] * 0.8 - 0.1 + rng.normal(0, 0.05), 0, 1))
        pest_risk = float(np.clip(rng.normal(cp["pest"] + (humidity - 55) / 200, 0.12), 0, 1))
        r = rng.random()
        irrigation_status = "Good" if r < sp["irrigation"] * 0.75 else ("Partial" if r < sp["irrigation"] * 0.75 + 0.2 else "None")
        soil_moisture = float(np.clip(
            22 + 0.12 * precipitation + {"Good": 14, "Partial": 7, "None": 0}[irrigation_status] - 18 * drought_index + rng.normal(0, 5), 8, 90))
        weather_volatility = float(np.clip(rng.beta(2, 4) + 0.25 * drought_index + 0.15 * flood_risk - 0.1, 0, 1))
        yield_variation = float(np.clip(rng.beta(2, 5) + 0.3 * weather_volatility, 0, 1))
        previous_loss = float(np.clip(rng.beta(1.5, 5) + 0.25 * drought_index + 0.2 * flood_risk - 0.1, 0, 1))
        climate_resilience = float(np.clip(
            0.25 + 0.35 * (soil_health / 100) + {"Good": 0.25, "Partial": 0.12, "None": 0}[irrigation_status]
            + 0.06 * min(farm_area, 10) / 10 - 0.2 * weather_volatility + rng.normal(0, 0.06), 0.05, 0.98))
        historical_yield = float(np.clip(rng.normal(cp["yield"] * (0.75 + 0.5 * soil_health / 100), cp["std"]), cp["yield"] * 0.3, cp["yield"] * 1.6))
        expected_yield = float(historical_yield * (1 + rng.normal(0.02, 0.05)))
        crop_price = float(np.clip(rng.normal(cp["price"], cp["price"] * 0.08), cp["price"] * 0.7, cp["price"] * 1.3))
        season = cp["season"]

        row = dict(
            farm_id=f"FARM-{i + 1:03d}" if i < 999 else f"FARM-{i + 1}",
            farmer_name=f"{FIRST[rng.integers(len(FIRST))]} {LAST[rng.integers(len(LAST))]}",
            district=district, state=state,
            latitude=round(lat, 4), longitude=round(lon, 4),
            crop_type=crop, farm_area=round(farm_area, 2),
            soil_health=round(soil_health, 1), soil_moisture=round(soil_moisture, 1),
            temperature=round(temperature, 1), precipitation=round(precipitation, 1), humidity=round(humidity, 1),
            drought_index=round(drought_index, 3), flood_risk=round(flood_risk, 3), pest_risk=round(pest_risk, 3),
            historical_yield=round(historical_yield, 2), expected_yield=round(expected_yield, 2),
            yield_variation=round(yield_variation, 3), season=season, irrigation_status=irrigation_status,
            weather_volatility=round(weather_volatility, 3), crop_price=round(crop_price, 0),
            previous_loss=round(previous_loss, 3), climate_resilience=round(climate_resilience, 3),
        )
        p = latent_risk(row)
        # Observed label: significant yield drop (>=20%) occurred — Bernoulli with latent p + noise
        p_noisy = float(np.clip(p + rng.normal(0, 0.05), 0.01, 0.99))
        row["risk_score"] = round(p_noisy, 4)
        row["crop_failure"] = int(rng.random() < p_noisy)
        rows.append(row)

    df = pd.DataFrame(rows)

    # ---- Curated demo farm FARM-001 (Punjab wheat, good irrigation, moderate volatility) ----
    demo = df.index[0]
    df.loc[demo, ["farm_id", "farmer_name", "district", "state", "latitude", "longitude", "crop_type", "farm_area"]] = \
        ["FARM-001", "Gurpreet Singh", "Ludhiana", "Punjab", 30.9124, 75.8573, "Wheat", 6.5]
    df.loc[demo, ["soil_health", "soil_moisture", "temperature", "precipitation", "humidity"]] = [78.0, 32.0, 24.8, 58.0, 60.0]
    df.loc[demo, ["drought_index", "flood_risk", "pest_risk", "historical_yield", "expected_yield", "yield_variation"]] = \
        [0.52, 0.18, 0.22, 4.6, 4.7, 0.40]
    df.loc[demo, ["season", "irrigation_status", "weather_volatility", "crop_price", "previous_loss", "climate_resilience"]] = \
        ["Rabi", "Good", 0.66, 2275, 0.28, 0.52]
    p = latent_risk(df.loc[demo].to_dict())
    df.loc[demo, "risk_score"] = round(p, 4)
    df.loc[demo, "crop_failure"] = int(p > 0.5)
    return df


def generate_history(rng: np.random.Generator, farms: pd.DataFrame) -> pd.DataFrame:
    """Monthly history per farm for the last HISTORY_MONTHS months (simulated)."""
    months = pd.period_range(end=pd.Timestamp("2026-08-01"), periods=HISTORY_MONTHS, freq="M")
    out = []
    for _, f in farms.iterrows():
        sp = STATES[f["state"]]
        # farm-specific slow drift (climate trend) + seasonality
        drift = rng.normal(0.0, 0.004)
        vol = f["weather_volatility"]
        phase = rng.uniform(0, 2 * np.pi)
        for k, m in enumerate(months):
            mon = m.month
            monsoon = np.exp(-((mon - 7.5) ** 2) / 4.5)  # peaks Jul/Aug
            seasonal_temp = 6 * np.sin((mon - 4) / 12 * 2 * np.pi)
            rain = max(0.0, f["precipitation"] * (0.35 + 2.1 * monsoon) * (1 + rng.normal(0, 0.25 + 0.3 * vol)))
            temp = f["temperature"] + seasonal_temp + rng.normal(0, 0.8 + 1.2 * vol) + drift * k * 2
            sm = np.clip(f["soil_moisture"] + 0.08 * (rain - f["precipitation"]) + rng.normal(0, 3), 5, 95)
            drought = np.clip(f["drought_index"] + 0.15 * np.sin(k / 9 + phase) - 0.002 * (rain - f["precipitation"]) / 10 + rng.normal(0, 0.04), 0, 1)
            risk = np.clip(f["risk_score"] + 0.10 * np.sin(k / 7 + phase) + 0.25 * (drought - f["drought_index"]) - 0.002 * (sm - f["soil_moisture"]) + rng.normal(0, 0.03) + drift * k, 0.02, 0.98)
            yld = max(0.1, f["historical_yield"] * (1 - 0.6 * (risk - f["risk_score"])) * (1 + rng.normal(0, 0.05)))
            out.append(dict(
                farm_id=f["farm_id"], month=str(m), temperature=round(temp, 1), precipitation=round(rain, 1),
                soil_moisture=round(sm, 1), drought_index=round(drought, 3), risk_probability=round(risk, 4),
                terra_score=int(round((1 - risk) * 1000)), yield_t_ha=round(yld, 2),
            ))
    return pd.DataFrame(out)


def main():
    rng = np.random.default_rng(SEED)
    os.makedirs(DATA_DIR, exist_ok=True)
    farms = generate_farms(rng)
    farms.to_csv(os.path.join(DATA_DIR, "farms.csv"), index=False)
    hist = generate_history(rng, farms)
    hist.to_csv(os.path.join(DATA_DIR, "historical_weather.csv"), index=False)
    print(f"farms: {len(farms)} rows -> data/farms.csv")
    print(f"history: {len(hist)} rows -> data/historical_weather.csv")
    print(f"crop failure base rate: {farms['crop_failure'].mean():.3f}")
    print(farms[["state", "crop_type"]].value_counts().head(10))


if __name__ == "__main__":
    main()
