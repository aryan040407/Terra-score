import test from "node:test";
import assert from "node:assert/strict";

import { parseScenarioInput } from "./scenarioParser.ts";

const expectChange = (text: string, expected: { rainfall?: number; temperature?: number; soil?: number }, expectedWarnings: string[] = []) => {
  const parsed = parseScenarioInput(text);

  if (expected.rainfall !== undefined) {
    assert.equal(parsed.rainfall_change_pct, expected.rainfall);
  }

  if (expected.temperature !== undefined) {
    assert.equal(parsed.temperature_change_c, expected.temperature);
  }

  if (expected.soil !== undefined) {
    assert.equal(parsed.soil_moisture_change_pct, expected.soil);
  }

  if (expectedWarnings.length > 0) {
    const joined = [...parsed.warnings, ...parsed.summary].join(" ");
    for (const warning of expectedWarnings) {
      assert.match(joined, new RegExp(warning.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
  }
};

test("rainfall drops 30%", () => {
  expectChange("What if rainfall drops by 30%?", { rainfall: -30 });
});

test("rainfall decreases 30%", () => {
  expectChange("What if rainfall decreases by 30%?", { rainfall: -30 });
});

test("rainfall falls 30%", () => {
  expectChange("What happens if rainfall falls 30%?", { rainfall: -30 });
});

test("rainfall increases 20%", () => {
  expectChange("Rainfall increases by 20%", { rainfall: 20 });
});

test("rain decreases 25%", () => {
  expectChange("What if rain decreases by 25%?", { rainfall: -25 });
});

test("precipitation drops 15%", () => {
  expectChange("What if precipitation drops 15%?", { rainfall: -15 });
});

test("temperature rises 2°C", () => {
  expectChange("What if temperature rises 2°C?", { temperature: 2 });
});

test("temperature increases by 2 degrees", () => {
  expectChange("What if temperature increases by 2 degrees?", { temperature: 2 });
});

test("temperature falls 3°C", () => {
  expectChange("What if temperature drops by 3°C?", { temperature: -3 });
});

test("soil moisture drops 15%", () => {
  expectChange("What if soil moisture decreases by 15%?", { soil: -15 });
});

test("rainfall + temperature combined", () => {
  expectChange("What if rainfall drops 20% and temperature rises 2°C?", { rainfall: -20, temperature: 2 });
});

test("rainfall + temperature + soil moisture", () => {
  expectChange("Rainfall falls 30%, temperature increases by 2 degrees and soil moisture drops 10%", { rainfall: -30, temperature: 2, soil: -10 });
});

test("explicit supported location", () => {
  const parsed = parseScenarioInput("What if rainfall in Ludhiana drops 30%?");
  assert.equal(parsed.rainfall_change_pct, -30);
  assert.equal(parsed.regionHint, "Ludhiana, Punjab");
});

test("unsupported location", () => {
  const parsed = parseScenarioInput("What if rainfall drops 30% in Delhi?");
  assert.equal(parsed.rainfall_change_pct, -30);
  assert.ok(parsed.warnings.some((warning) => /region|demo geography|unsupported/i.test(warning)));
});

test("missing numeric adjustment", () => {
  const parsed = parseScenarioInput("What if rainfall changes?");
  assert.equal(parsed.rainfall_change_pct, 0);
  assert.ok(parsed.warnings.some((warning) => /how much should rainfall change/i.test(warning)));
});

test("empty input", () => {
  const parsed = parseScenarioInput("   ");
  assert.equal(parsed.rainfall_change_pct, 0);
  assert.ok(parsed.warnings.some((warning) => /add a climate change note|climate change note/i.test(warning)));
});

test("price-only scenario", () => {
  const parsed = parseScenarioInput("What if wheat prices fall by 20%?");
  assert.equal(parsed.rainfall_change_pct, 0);
  assert.equal(parsed.temperature_change_c, 0);
  assert.ok(parsed.warnings.some((warning) => /price|economic scenario|not part of the trained climate model/i.test(warning)));
});
