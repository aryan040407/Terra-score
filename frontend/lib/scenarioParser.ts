export type IrrigationStatus = "None" | "Partial" | "Good";

export type ParsedScenario = {
  rainfall_change_pct: number;
  temperature_change_c: number;
  soil_moisture_change_pct: number;
  irrigation_status?: IrrigationStatus;
  drought_index?: number;
  pest_risk?: number;
  regionHint?: string;
  summary: string[];
  warnings: string[];
};

type RegionHint = {
  id: string;
  displayName: string;
  district: string;
  state: string;
};

import { DEMO_REGIONS } from "./demoRegions";

const REGION_HINTS: RegionHint[] = DEMO_REGIONS.map((region) => ({
  id: region.id,
  displayName: region.displayName,
  district: region.district,
  state: region.state,
}));

function normalizeInput(raw: string): string {
  return (raw ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u00b0|°/g, " degrees ")
    .replace(/°c/gi, " degrees c")
    .replace(/\bpercent(?:age)?\b/gi, "%")
    .replace(/%/g, " % ")
    .replace(/\bplus\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScaledDelta(text: string, metricAliases: string[], decreaseWords: RegExp[], increaseWords: RegExp[]): number {
  const normalized = normalizeInput(text);
  const metricPattern = metricAliases
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  const decreasePattern = decreaseWords.map((pattern) => pattern.source).join("|");
  const increasePattern = increaseWords.map((pattern) => pattern.source).join("|");

  const metrics = metricAliases
    .map((alias) => ({ alias, index: normalized.indexOf(alias) }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);

  for (const metric of metrics) {
    const start = metric.index;
    const end = normalized.length;
    const nextMetricIndex = metricAliases
      .map((alias) => normalized.indexOf(alias, start + metric.alias.length))
      .filter((index) => index > start)
      .sort((a, b) => a - b)[0];

    if (typeof nextMetricIndex === "number" && nextMetricIndex > start) {
      const window = normalized.slice(start, nextMetricIndex);
      const localPatterns = [
        new RegExp(`(?:${metricPattern})[\\s\\S]{0,80}(?:${decreasePattern})[\\s\\S]{0,25}?([-+]?\\d+(?:\\.\\d+)?)\\s*(?:%|percent|percentage)`, "i"),
        new RegExp(`(?:${metricPattern})[\\s\\S]{0,80}(?:${increasePattern})[\\s\\S]{0,25}?([-+]?\\d+(?:\\.\\d+)?)\\s*(?:%|percent|percentage)`, "i"),
        new RegExp(`(?:${metricPattern})[\\s\\S]{0,80}(?:by\\s+)?([-+]?\\d+(?:\\.\\d+)?)\\s*(?:%|percent|percentage)`, "i"),
      ];

      for (const pattern of localPatterns) {
        const match = window.match(pattern);
        if (!match) continue;
        const value = Number(match[1]);
        if (!Number.isFinite(value)) continue;
        const localLower = window.toLowerCase();
        const hasDecrease = decreaseWords.some((word) => word.test(localLower));
        const hasIncrease = increaseWords.some((word) => word.test(localLower));
        if (hasDecrease && !hasIncrease) return -Math.abs(value);
        if (hasIncrease && !hasDecrease) return Math.abs(value);
        return Number(value.toFixed(2));
      }
    }

    const window = normalized.slice(start);
    const localPatterns = [
      new RegExp(`(?:${metricPattern})[\\s\\S]{0,80}(?:${decreasePattern})[\\s\\S]{0,25}?([-+]?\\d+(?:\\.\\d+)?)\\s*(?:%|percent|percentage)`, "i"),
      new RegExp(`(?:${metricPattern})[\\s\\S]{0,80}(?:${increasePattern})[\\s\\S]{0,25}?([-+]?\\d+(?:\\.\\d+)?)\\s*(?:%|percent|percentage)`, "i"),
      new RegExp(`(?:${metricPattern})[\\s\\S]{0,80}(?:by\\s+)?([-+]?\\d+(?:\\.\\d+)?)\\s*(?:%|percent|percentage)`, "i"),
    ];

    for (const pattern of localPatterns) {
      const match = window.match(pattern);
      if (!match) continue;
      const value = Number(match[1]);
      if (!Number.isFinite(value)) continue;
      const localLower = window.toLowerCase();
      const hasDecrease = decreaseWords.some((word) => word.test(localLower));
      const hasIncrease = increaseWords.some((word) => word.test(localLower));
      if (hasDecrease && !hasIncrease) return -Math.abs(value);
      if (hasIncrease && !hasDecrease) return Math.abs(value);
      return Number(value.toFixed(2));
    }
  }

  return 0;
}

function parseTemperatureDelta(text: string): number {
  const normalized = normalizeInput(text);
  const metricPattern = /(temperature|temp)/i;
  const metricIndex = normalized.search(metricPattern);
  if (metricIndex === -1) return 0;

  const nextMetricIndex = ["temperature", "temp", "rainfall", "rain", "precipitation", "soil moisture", "moisture"]
    .map((alias) => normalized.indexOf(alias, metricIndex + 1))
    .filter((index) => index > metricIndex)
    .sort((a, b) => a - b)[0];
  const window = nextMetricIndex !== undefined ? normalized.slice(metricIndex, nextMetricIndex) : normalized.slice(metricIndex);

  const patterns = [
    /(temperature|temp)[\s\S]{0,80}(?:drops?|decreases?|declines?|falls?|goes\s+down|lower(?:s)?)[\s\S]{0,25}?([-+]?\d+(?:\.\d+)?)\s*(?:degrees?|deg|c)?/i,
    /(temperature|temp)[\s\S]{0,80}(?:rises?|increases?|goes\s+up|higher|up)[\s\S]{0,25}?([-+]?\d+(?:\.\d+)?)\s*(?:degrees?|deg|c)?/i,
    /(temperature|temp)[\s\S]{0,80}(?:by\s+)?([-+]?\d+(?:\.\d+)?)\s*(?:degrees?|deg|c)/i,
  ];

  for (const pattern of patterns) {
    const match = window.match(pattern);
    if (!match) continue;
    const value = Number(match[match.length - 1]);
    if (!Number.isFinite(value)) continue;
    const lower = window.toLowerCase();
    const hasDecrease = /(drops?|decreases?|declines?|falls?|goes\s+down|lower(?:s)?)/i.test(lower);
    const hasIncrease = /(rises?|increases?|goes\s+up|higher|up)/i.test(lower);
    if (hasDecrease && !hasIncrease) return -Math.abs(value);
    if (hasIncrease && !hasDecrease) return Math.abs(value);
    return Number(value.toFixed(2));
  }

  return 0;
}

function parseRainfallDelta(text: string): number {
  return parseScaledDelta(
    text,
    ["rainfall", "rain", "precipitation"],
    [/drops?/, /decreases?/, /declines?/, /falls?/, /reduces?/, /lower(?:s)?/, /less/],
    [/increases?/, /rises?/, /grows?/, /up/, /higher/, /more/],
  );
}

function parseSoilMoistureDelta(text: string): number {
  return parseScaledDelta(
    text,
    ["soil moisture", "soil moisture level", "moisture"],
    [/drops?/, /decreases?/, /declines?/, /falls?/, /reduces?/, /lower(?:s)?/, /less/],
    [/increases?/, /rises?/, /grows?/, /up/, /higher/, /more/],
  );
}

function parseDrought(text: string): number | undefined {
  const patterns = [
    /drought\s*(?:index|level)?[\s\S]{0,30}(?:rises?|increases?|goes\s+up|to|is|becomes?|at)[\s\S]{0,20}([-+]?\d+(?:\.\d+)?)/i,
    /drought\s*(?:up|down|increase|decrease|rise|drop)?\s*(?:by\s+)?([-+]?\d+(?:\.\d+)?)/i,
  ];
  const match = patterns.map((pattern) => normalizeInput(text).match(pattern)).find(Boolean);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : undefined;
}

function parsePest(text: string): number | undefined {
  const patterns = [
    /pest(?:\s+risk)?[\s\S]{0,30}(?:rises?|increases?|goes\s+up|to|is|becomes?|at)[\s\S]{0,20}([-+]?\d+(?:\.\d+)?)/i,
    /pest(?:\s+risk)?\s*(?:up|down|increase|decrease|rise|drop)?\s*(?:by\s+)?([-+]?\d+(?:\.\d+)?)/i,
  ];
  const match = patterns.map((pattern) => normalizeInput(text).match(pattern)).find(Boolean);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : undefined;
}

function parseIrrigation(text: string): IrrigationStatus | undefined {
  const lower = normalizeInput(text);
  if (/(irrigation|watering)\s+(?:switch(?:es)?\s+to\s+|set\s+to\s+|is\s+)?(none|partial|good)/i.test(lower)) {
    const match = lower.match(/(?:irrigation|watering)\s+(?:switch(?:es)?\s+to\s+|set\s+to\s+|is\s+)?(none|partial|good)/i);
    if (match) {
      const value = match[1].toLowerCase();
      if (value === "none") return "None";
      if (value === "partial") return "Partial";
      if (value === "good") return "Good";
    }
  }
  if (/(good|improved)\s+irrigation/i.test(lower)) return "Good";
  if (/(partial|limited)\s+irrigation/i.test(lower)) return "Partial";
  if (/(no|none)\s+irrigation/i.test(lower)) return "None";
  return undefined;
}

function detectRegionHint(text: string): { region?: RegionHint; warnings: string[] } {
  const normalized = normalizeInput(text);
  const region = REGION_HINTS.find((entry) => {
    const haystack = `${entry.displayName} ${entry.district} ${entry.state}`.toLowerCase();
    return normalized.includes(haystack) || normalized.includes(entry.district.toLowerCase()) || normalized.includes(entry.state.toLowerCase());
  });

  if (region) return { region, warnings: [] };

  const inMatch = normalized.match(/\b(?:in|at|for)\s+([a-z][a-z\s-]{1,30})(?:\?|\.|,|\s+and\s+|$)/i);
  if (inMatch) {
    const candidate = inMatch[1].trim();
    const known = DEMO_REGIONS.some((entry) => {
      const values = [entry.displayName, entry.district, entry.state].map((part) => part.toLowerCase());
      return values.some((part) => candidate.includes(part));
    });

    if (candidate && !known && !/(rain|temperature|temp|soil|moisture|precipitation|weather|climate)/i.test(candidate)) {
      return {
        region: undefined,
        warnings: [`The region "${candidate}" is not in the current demo geography. The active demo region will stay selected instead.`],
      };
    }
  }

  return { region: undefined, warnings: [] };
}

function detectCropHint(text: string): string | undefined {
  const normalized = normalizeInput(text);
  const knownCrops = DEMO_REGIONS.map((region) => region.primaryCrop.toLowerCase());
  return knownCrops.find((crop) => normalized.includes(crop));
}

export function parseScenarioInput(text: string): ParsedScenario {
  const normalized = (text ?? "").trim();
  const scenario: ParsedScenario = {
    rainfall_change_pct: 0,
    temperature_change_c: 0,
    soil_moisture_change_pct: 0,
    summary: [],
    warnings: [],
  };

  if (!normalized) {
    scenario.warnings.push("Add a climate change note such as ‘rainfall drops 20% and temperature rises 2°C’." );
    return scenario;
  }

  const climateClauses = normalized
    .split(/(?:\s+(?:and|&|but)\s+|[;,])/i)
    .map((part) => part.trim())
    .filter(Boolean);

  const clauseResults = climateClauses.length ? climateClauses : [normalized];

  for (const clause of clauseResults) {
    const rainDelta = parseRainfallDelta(clause);
    if (rainDelta !== 0) {
      scenario.rainfall_change_pct = Number((scenario.rainfall_change_pct + rainDelta).toFixed(2));
      scenario.summary.push(`Rainfall ${rainDelta < 0 ? "−" : "+"}${Math.abs(rainDelta).toFixed(0)}%`);
    }

    const tempDelta = parseTemperatureDelta(clause);
    if (tempDelta !== 0) {
      scenario.temperature_change_c = Number((scenario.temperature_change_c + tempDelta).toFixed(2));
      scenario.summary.push(`Temperature ${tempDelta < 0 ? "−" : "+"}${Math.abs(tempDelta).toFixed(1)}°C`);
    }

    const soilDelta = parseSoilMoistureDelta(clause);
    if (soilDelta !== 0) {
      scenario.soil_moisture_change_pct = Number((scenario.soil_moisture_change_pct + soilDelta).toFixed(2));
      scenario.summary.push(`Soil moisture ${soilDelta < 0 ? "−" : "+"}${Math.abs(soilDelta).toFixed(0)}%`);
    }
  }

  const irrigation = parseIrrigation(normalized);
  if (irrigation) {
    scenario.irrigation_status = irrigation;
    scenario.summary.push(`Irrigation ${irrigation}`);
  }

  const drought = parseDrought(normalized);
  if (drought !== undefined) {
    scenario.drought_index = drought;
    scenario.summary.push(`Drought index ${drought.toFixed(2)}`);
  }

  const pest = parsePest(normalized);
  if (pest !== undefined) {
    scenario.pest_risk = pest;
    scenario.summary.push(`Pest risk ${pest.toFixed(2)}`);
  }

  const regionSignal = detectRegionHint(normalized);
  if (regionSignal.region) {
    scenario.regionHint = regionSignal.region.displayName;
  }
  scenario.warnings.push(...regionSignal.warnings);

  const normalizedLower = normalizeInput(normalized);
  const priceMention = /(price|prices|commodity|market|wheat prices|crop price)/i.test(normalizedLower);
  const climateMention = /(rainfall|rain|precipitation|temperature|temp|soil moisture|moisture)/i.test(normalizedLower);
  const missingAdjustment = climateMention && /(change|changes|variation|fluctuate|fluctuates|shift|shifts)/i.test(normalizedLower) && !/(\d|%|°|degrees|degree)/i.test(normalizedLower);

  if (scenario.summary.length === 0) {
    if (missingAdjustment) {
      scenario.warnings.push("How much should rainfall change?");
    } else if (priceMention) {
      scenario.warnings.push("This is an economic scenario; pricing is not part of the trained climate model and will not change the TerraScore prediction.");
    } else {
      scenario.warnings.push("I couldn’t match a climate adjustment in that sentence. Try something like: ‘rainfall drops 20% and temperature rises 2°C’." );
    }
  }

  const cropHint = detectCropHint(normalizedLower);
  if (cropHint && /for\s+/.test(normalizedLower)) {
    scenario.warnings.push(`Crop note detected: ${cropHint}. The selected demo region crop will remain the default unless the dataset supports an explicit override.`);
  }

  return scenario;
}

export function supportedRegionHints(): RegionHint[] {
  return [...REGION_HINTS];
}
