# TerraScore

TerraScore turns localized agricultural and climate signals into an explainable 0–1000 climate-risk score for farmers, lenders and government users.

> TerraScore is a prototype decision-support system using simulated data. It is not a credit score, insurance underwriting decision, or financial advice.

## Core architecture

- Frontend: Next.js + TypeScript + Tailwind
- Backend: FastAPI
- Model: scikit-learn Random Forest
- Data layer: project-owned CSV data + live Open-Meteo weather scenario inputs

## Datasets in this repository

### 1) Farm dataset
- File: `data/farms.csv`
- Purpose: Farm-level metadata, crop, soil, irrigation and risk context
- Fields used: `farm_id`, `farmer_name`, `district`, `state`, `latitude`, `longitude`, `crop_type`, `farm_area`, `soil_health`, `irrigation_status`, `expected_yield`, `crop_price`, `previous_loss`, `soil_moisture`, `drought_index`, `flood_risk`, `pest_risk`, `temperature`, `precipitation`
- Status: Historical / synthetic demo data

### 2) Historical weather dataset
- File: `data/historical_weather.csv`
- Purpose: Seasonal weather history used for trend analysis, volatility and climate context
- Fields used: `farm_id`, `month`, `temperature`, `precipitation`, `humidity`, `soil_moisture`, `drought_index`
- Status: Historical / synthetic demo data

### 3) Live weather input
- Source: Open-Meteo API
- Purpose: Current weather snapshot passed to the farmer scenario UI and simulator context
- Status: Optional live input; app continues without it

### 4) Model output
- Path: `ml/saved_model/model_metadata.json`
- Purpose: Random Forest predictions, TerraScore, confidence and feature importance
- Status: Derived ML output from repository training data

## Research and reference sources

These are used as research/reference context, not hard dependencies for the core app:

- NASA POWER — climate and weather context
- FAOSTAT — agricultural production and crop context
- India Open Government Data Platform — public state/district and agricultural context
- ISRIC SoilGrids — soil-related context and reference methodology
- IMD — official India weather and rainfall reference context

## Demo safety and limitations

- The project uses synthetic data for training and validation.
- The app intentionally does not depend on external source availability for core scoring flows.
- Live weather and reference-source pages are informational and fail-safe.
- TerraScore is a decision-support tool, not a credit score or financial underwriting model.

## Local run

```bash
cd frontend
npm install
npm run dev
```

```bash
cd .
.venv\Scripts\python.exe -m pytest backend/tests -q
```

## Files to know

- `backend/services/data_service.py` — repository data loading and aggregate summaries
- `backend/services/weather_service.py` — live weather adapter (Open-Meteo)
- `backend/routes/api.py` — FastAPI route contract
- `ml/train.py` — synthetic data generation and model training
- `ml/predict.py` — prediction and explainability logic
- `frontend/app/(app)/data-sources/page.tsx` — data and research page
