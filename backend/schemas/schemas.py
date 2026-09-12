from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


class FactorItem(BaseModel):
    feature: str
    label: str
    contribution: float
    value: float
    description: str


class PredictRequest(BaseModel):
    """Raw farm attributes for an ad-hoc prediction."""
    crop_type: Literal["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Pulses", "Mustard"] = "Wheat"
    season: Literal["Rabi", "Kharif", "Annual"] = "Rabi"
    irrigation_status: Literal["None", "Partial", "Good"] = "Good"
    farm_area: float = Field(3.0, ge=0.1, le=500)
    soil_health: float = Field(65, ge=0, le=100)
    soil_moisture: float = Field(40, ge=0, le=100)
    temperature: float = Field(26, ge=-5, le=55)
    precipitation: float = Field(70, ge=0, le=1000)
    humidity: float = Field(60, ge=0, le=100)
    drought_index: float = Field(0.3, ge=0, le=1)
    flood_risk: float = Field(0.2, ge=0, le=1)
    pest_risk: float = Field(0.3, ge=0, le=1)
    historical_yield: float = Field(3.5, ge=0)
    expected_yield: Optional[float] = Field(None, ge=0)
    yield_variation: float = Field(0.25, ge=0, le=1)
    weather_volatility: float = Field(0.35, ge=0, le=1)
    crop_price: float = Field(2200, ge=0)
    previous_loss: float = Field(0.15, ge=0, le=1)
    climate_resilience: float = Field(0.55, ge=0, le=1)


class PredictResponse(BaseModel):
    terra_score: int
    risk_level: str
    risk_probability: float
    confidence: float
    expected_yield: float
    predicted_yield: float
    predicted_yield_loss_pct: float
    top_risk_factors: list[FactorItem]
    positive_resilience_factors: list[FactorItem]
    explanation_method: str
    model_version: str
    model_type: str


class WhatIfRequest(BaseModel):
    """Scenario deltas applied on top of a baseline farm."""
    farm_id: str = "FARM-001"
    rainfall_change_pct: float = Field(0, ge=-80, le=80, description="% change in precipitation")
    temperature_change_c: float = Field(0, ge=-5, le=8, description="°C change in temperature")
    soil_moisture_change_pct: float = Field(0, ge=-60, le=60, description="% change in soil moisture")
    irrigation_status: Optional[Literal["None", "Partial", "Good"]] = None
    drought_index: Optional[float] = Field(None, ge=0, le=1, description="absolute override")
    pest_risk: Optional[float] = Field(None, ge=0, le=1, description="absolute override")


class ChangedFactor(BaseModel):
    feature: str
    label: str
    baseline: float
    scenario: float
    delta: float
    direction: str


class WhatIfResponse(BaseModel):
    farm_id: str
    baseline_terra_score: int
    new_terra_score: int
    change: int
    baseline_risk_level: str
    new_risk_level: str
    baseline_risk_probability: float
    new_risk_probability: float
    predicted_yield_impact_pct: float
    baseline_predicted_yield: float
    new_predicted_yield: float
    confidence: float
    scenario_summary: list[str]
    top_changed_factors: list[ChangedFactor]
    top_risk_factors: list[FactorItem]
    positive_resilience_factors: list[FactorItem]


class CopilotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    role: Literal["farmer", "lender", "government"] = "farmer"
    farm_id: Optional[str] = None
    location: Optional[str] = None


class CopilotGrounding(BaseModel):
    farm_id: Optional[str]
    location: Optional[str]
    terra_score: Optional[int] = None
    risk_level: Optional[str] = None
    weather: dict
    top_risk_factors: list[str]


class CopilotResponse(BaseModel):
    provider: str
    answer: str
    role: str
    grounding: CopilotGrounding
