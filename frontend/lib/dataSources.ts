export type SourceEntry = {
  name: string;
  organization: string;
  category: "Weather & climate" | "Agriculture" | "Soil & land" | "Research context";
  purpose: string;
  usage: string;
  officialUrl: string;
  status: "Reference source" | "Current demo dataset" | "Derived output";
  note: string;
};

export const dataInventory = [
  {
    dataset: "Farm records",
    purpose: "Core agricultural context for each farm",
    fields: ["farm_id", "farmer_name", "district", "state", "crop_type", "farm_area", "soil_health", "irrigation_status"],
    source: "Repository-generated synthetic farm dataset",
    classification: "Historical / synthetic",
    whereUsed: ["Farm dashboard", "Regional summaries", "Portfolio exposure", "Scenario inputs"],
  },
  {
    dataset: "Historical weather",
    purpose: "Rainfall, temperature and moisture context used to characterise seasonal risk",
    fields: ["month", "farm_id", "temperature", "precipitation", "humidity", "soil_moisture", "drought_index"],
    source: "Repository-generated historical weather archive",
    classification: "Historical / synthetic",
    whereUsed: ["Trend charts", "Weather risk context", "Model feature engineering", "What-if comparisons"],
  },
  {
    dataset: "Live weather provider",
    purpose: "Current weather snapshot for scenario input and user-facing context",
    fields: ["temperature_2m", "precipitation", "rain", "relative_humidity_2m", "weather_code"],
    source: "Open-Meteo weather API",
    classification: "Live / external input",
    whereUsed: ["Farmer live weather card", "Scenario context", "Meteorological overlays"],
  },
  {
    dataset: "Model output",
    purpose: "TerraScore risk probability and explainability output",
    fields: ["risk_probability", "terra_score", "risk_level", "confidence", "top_risk_factors"],
    source: "Random Forest classifier trained in the repository",
    classification: "Derived ML output",
    whereUsed: ["All role dashboards", "Model insights", "Decision signals", "Regional risk summaries"],
  },
] as const;

export const researchSources: SourceEntry[] = [
  {
    name: "NASA POWER",
    organization: "NASA Langley Research Center / POWER Project",
    category: "Weather & climate",
    purpose: "Climate and meteorological data for weather, temperature, precipitation and climatological context.",
    usage: "Reference source for climate-risk framing and seasonal conditions; not a hard dependency for the demo pipeline.",
    officialUrl: "https://power.larc.nasa.gov/",
    status: "Reference source",
    note: "Useful as an authoritative weather/climate reference source for regional climate context.",
  },
  {
    name: "FAOSTAT",
    organization: "Food and Agriculture Organization of the United Nations",
    category: "Agriculture",
    purpose: "Agricultural statistics and production context for crops, yields and food-system monitoring.",
    usage: "Useful for agricultural context and yield-risk framing; the current demo still relies on repository-generated farm data.",
    officialUrl: "https://www.fao.org/faostat/en/",
    status: "Reference source",
    note: "A strong reference for agricultural production context and crop statistics.",
  },
  {
    name: "India Open Government Data Platform",
    organization: "Government of India",
    category: "Agriculture",
    purpose: "Publicly available agricultural and district-level government datasets for regional context.",
    usage: "Useful for regional agriculture and climate policy context; no direct API dependency is required for the app to operate.",
    officialUrl: "https://www.data.gov.in/",
    status: "Reference source",
    note: "Useful for district or agricultural policy context when paired with internal demo data.",
  },
  {
    name: "ISRIC SoilGrids",
    organization: "ISRIC — World Soil Information",
    category: "Soil & land",
    purpose: "Global soil property information including texture, moisture and soil condition indicators.",
    usage: "Reference source for soil and land-quality context. TerraScore currently uses repository-owned soil features rather than a live SoilGrids dependency.",
    officialUrl: "https://soilgrids.org/",
    status: "Reference source",
    note: "Good for soil-attribute research context and methodology framing.",
  },
  {
    name: "India Meteorological Department (IMD)",
    organization: "Government of India",
    category: "Weather & climate",
    purpose: "Official weather, rainfall and climate monitoring data for India.",
    usage: "Useful as an authoritative weather-reference source; the demo remains resilient without a direct IMD API dependency.",
    officialUrl: "https://mausam.imd.gov.in/",
    status: "Reference source",
    note: "An authoritative reference for rainfall and weather context in the Indian agricultural setting.",
  },
];

export const methodologySteps = [
  {
    title: "Data ingestion",
    description: "Farm records, historical weather, and scenario inputs are loaded into the app from the repository data layer and the live weather adapter.",
  },
  {
    title: "Feature engineering",
    description: "The model derives plant stress, rainfall volatility, drought exposure, soil moisture, and yield-risk indicators before prediction.",
  },
  {
    title: "Crop-failure prediction",
    description: "A trained Random Forest estimates the probability of a significant yield loss using the engineered agricultural and climate features.",
  },
  {
    title: "Risk scoring",
    description: "That probability is converted into a 0–1000 TerraScore, with explicit risk bands and confidence values returned to the user.",
  },
  {
    title: "Explainability",
    description: "Top risk and resilience drivers are surfaced so users can understand why a score moved up or down.",
  },
  {
    title: "Decision signal",
    description: "The score is consumed by the farmer, lender and government views as a decision-support signal rather than a financial rating.",
  },
] as const;

export const dataLineage = [
  "Weather",
  "Agriculture",
  "Soil / climate indicators",
  "Feature engineering",
  "Random Forest model",
  "TerraScore",
  "Decision layer",
] as const;
