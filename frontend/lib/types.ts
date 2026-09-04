export type RiskLevel = "Very Low Risk" | "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk";

export interface Factor { feature: string; label: string; contribution: number; value: number; description: string }

export interface Scoring {
  terra_score: number; risk_level: RiskLevel; risk_probability: number; confidence: number;
  expected_yield: number; predicted_yield: number; predicted_yield_loss_pct: number;
  top_risk_factors: Factor[]; positive_resilience_factors: Factor[];
  explanation_method: string; model_version: string; model_type: string;
}

export interface Farm {
  farm_id: string; farmer_name: string; district: string; state: string; latitude: number; longitude: number;
  crop_type: string; farm_area: number; soil_health: number; soil_moisture: number; temperature: number;
  precipitation: number; humidity: number; drought_index: number; flood_risk: number; pest_risk: number;
  historical_yield: number; expected_yield: number; yield_variation: number; season: string;
  irrigation_status: "None" | "Partial" | "Good"; weather_volatility: number; crop_price: number;
  previous_loss: number; climate_resilience: number; risk_score: number;
  terra_score: number; risk_level: RiskLevel; risk_probability: number; predicted_yield: number; predicted_yield_loss_pct: number;
}

export type FarmListItem = Pick<Farm, "farm_id" | "farmer_name" | "district" | "state" | "latitude" | "longitude" | "crop_type" | "farm_area" | "terra_score" | "risk_level" | "risk_probability" | "predicted_yield_loss_pct" | "irrigation_status" | "soil_health">;

export interface FarmList { total: number; items: FarmListItem[]; limit: number; offset: number }
export interface FarmDetail { farm: Farm; scoring: Scoring; history_preview: HistoryPoint[] }

export interface HistoryPoint {
  farm_id: string; month: string; temperature: number; precipitation: number; soil_moisture: number;
  drought_index: number; risk_probability: number; terra_score: number; yield_t_ha: number;
}

export interface Region {
  state: string; district: string; latitude: number; longitude: number; farms: number; average_terra_score: number;
  risk_level: RiskLevel; average_risk_probability: number; dominant_crop: string; predicted_yield_loss_pct: number;
  high_risk_farms: number; avg_drought_index: number; avg_soil_moisture: number; avg_rainfall: number;
  irrigation_good_pct: number; crop_mix: Record<string, number>;
}
export interface Filters { states: string[]; districts: string[]; crops: string[]; risk_levels: RiskLevel[] }
export interface RegionsResponse { regions: Region[]; filters: Filters }

export interface Summary {
  total_farms: number; average_terra_score: number; median_terra_score: number; high_risk_farms: number; high_risk_pct: number;
  predicted_yield_loss_pct: number; avg_risk_probability: number; climate_risk_trend_points: number;
  risk_distribution: { level: RiskLevel; count: number }[]; trend_series: { month: string; avg_terra_score: number }[];
  total_area_ha: number; states: number; districts: number; crops: number; last_updated: string;
  lender: {
    portfolio_exposure_inr: number; expected_loss_inr: number; expected_loss_ratio_pct: number;
    regional_exposure: { state: string; farms: number; avg_terra_score: number; exposure: number; expected_loss: number; high_risk: number }[];
    high_risk_farms: { farm_id: string; farmer_name: string; district: string; state: string; crop_type: string; terra_score: number; risk_level: RiskLevel; predicted_yield_loss_pct: number }[];
  };
  insurer: {
    avg_loss_probability: number; farms_loss_prob_over_50: number; historical_claims_proxy: number; historical_claims_rate_pct: number;
    crop_risk: { crop_type: string; farms: number; avg_terra_score: number; avg_risk: number; exposure: number; expected_loss: number; loss_probability: number }[];
    climate_exposure: { drought_exposed: number; flood_exposed: number; pest_exposed: number; heat_exposed: number };
    segments: { segment: string; farms: number }[];
  };
}

export interface Alert { id: string; type: "warning" | "success" | "info"; icon: string; title: string; detail: string; region: string; timestamp: string }

export interface Telemetry {
  farm_id: string; timestamp: string; label: string;
  sources: { name: string; provider: string; status: string; latency_ms: number }[];
  readings: { temperature_c: number; soil_moisture_pct: number; precipitation_mm: number; humidity_pct: number; soil_temperature_c: number; ndvi: number };
}

export interface WhatIfRequest {
  farm_id: string; rainfall_change_pct: number; temperature_change_c: number; soil_moisture_change_pct: number;
  irrigation_status?: "None" | "Partial" | "Good"; drought_index?: number; pest_risk?: number;
}
export interface WhatIfResponse {
  farm_id: string; baseline_terra_score: number; new_terra_score: number; change: number; baseline_risk_level: RiskLevel; new_risk_level: RiskLevel;
  baseline_risk_probability: number; new_risk_probability: number; predicted_yield_impact_pct: number; baseline_predicted_yield: number;
  new_predicted_yield: number; confidence: number; scenario_summary: string[];
  top_changed_factors: { feature: string; label: string; baseline: number; scenario: number; delta: number; direction: "up" | "down" }[];
  top_risk_factors: Factor[]; positive_resilience_factors: Factor[];
}

export interface ModelExplanation {
  model_type: string; model_version: string; trained_at: string; target: string; training_samples: number; test_samples: number;
  n_features: number; feature_columns: string[]; grouped_feature_count: number; positive_rate: number;
  metrics: { accuracy: number; precision: number; recall: number; f1: number; roc_auc: number; brier: number; cv_roc_auc_mean: number; cv_roc_auc_std: number };
  model_comparison: { model: string; accuracy: number; f1: number; roc_auc: number; brier: number; cv_roc_auc_mean: number }[];
  feature_importance: { feature: string; label: string; importance: number }[];
  permutation_importance: { feature: string; label: string; importance: number }[];
  hyperparameters: Record<string, unknown>; how_it_works: string[]; score_formula: string; risk_bands: { range: string; level: string }[];
  training_seconds: number; explanation_label: string;
}

export interface DemoData { demo_farm_id: string; farm: Farm; scoring: Scoring; trends: HistoryPoint[]; telemetry: Telemetry; summary: Summary; alerts: Alert[]; suggested_scenario: WhatIfRequest }
