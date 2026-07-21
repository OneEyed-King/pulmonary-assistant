import type { Observation } from "./fhir-types";
import { findByCode, sortByDate, LOINC } from "./observations";

export type Severity = "stable" | "attention" | "significant";
export type Direction = "up" | "down" | "flat";

export interface MetricComparison {
  key: string;
  label: string;
  unit: string;
  previous?: number;
  current?: number;
  previousDate?: string;
  currentDate?: string;
  direction: Direction;
  severity: Severity;
  referenceText?: string;
  good: "higher" | "lower";
}

interface MetricConfig {
  key: string;
  label: string;
  codes: string[];
  unit: string;
  good: "higher" | "lower";
  badBelow?: number;
  badAbove?: number;
  referenceText?: string;
}

const METRICS: MetricConfig[] = [
  { key: "fev1", label: "FEV1", codes: LOINC.FEV1, unit: "L", good: "higher" },
  { key: "fvc", label: "FVC", codes: LOINC.FVC, unit: "L", good: "higher" },
  {
    key: "fev1fvc",
    label: "FEV1/FVC",
    codes: LOINC.FEV1_FVC,
    unit: "%",
    good: "higher",
    badBelow: 70,
    referenceText: "Ref ≥ 70%",
  },
  { key: "pef", label: "Peak Expiratory Flow", codes: LOINC.PEF, unit: "L/min", good: "higher" },
  { key: "act", label: "ACT Score", codes: LOINC.ACT_SCORE, unit: "", good: "higher", badBelow: 20, referenceText: "Ref ≥ 20" },
  { key: "spo2", label: "SpO₂", codes: LOINC.SPO2, unit: "%", good: "higher", badBelow: 92, referenceText: "Ref ≥ 92%" },
  {
    key: "eos",
    label: "Eosinophils",
    codes: LOINC.EOSINOPHILS,
    unit: "/uL",
    good: "lower",
    badAbove: 500,
    referenceText: "Ref < 500/uL",
  },
  { key: "ige", label: "Total IgE", codes: LOINC.IGE, unit: "IU/mL", good: "lower", badAbove: 200, referenceText: "Ref < 200 IU/mL" },
  { key: "crp", label: "CRP", codes: LOINC.CRP, unit: "mg/L", good: "lower", badAbove: 10, referenceText: "Ref < 10 mg/L" },
];

function classify(config: MetricConfig, prev?: number, curr?: number): { direction: Direction; severity: Severity } {
  let direction: Direction = "flat";
  let severity: Severity = "stable";

  if (prev !== undefined && curr !== undefined) {
    const delta = curr - prev;
    direction = delta > 0.001 ? "up" : delta < -0.001 ? "down" : "flat";
    const pctChange = prev !== 0 ? (Math.abs(delta) / Math.abs(prev)) * 100 : 0;
    const worsening = config.good === "higher" ? delta < 0 : delta > 0;
    if (worsening) {
      if (pctChange >= 15) severity = "significant";
      else if (pctChange >= 5) severity = "attention";
    }
  }

  if (curr !== undefined) {
    if (config.badBelow !== undefined && curr < config.badBelow) severity = "significant";
    if (config.badAbove !== undefined && curr > config.badAbove) severity = "significant";
  }

  return { direction, severity };
}

/** Computes current-vs-previous comparisons for every key pulmonary metric with recorded data. */
export function computeMetricComparisons(observations: Observation[]): MetricComparison[] {
  const results: MetricComparison[] = [];

  for (const config of METRICS) {
    const points = sortByDate(findByCode(observations, config.codes)).filter(
      (o) => o.valueQuantity?.value !== undefined
    );
    if (points.length === 0) continue;

    const curr = points[points.length - 1];
    const prev = points.length > 1 ? points[points.length - 2] : undefined;

    const { direction, severity } = classify(config, prev?.valueQuantity?.value, curr.valueQuantity?.value);

    results.push({
      key: config.key,
      label: config.label,
      unit: config.unit,
      previous: prev?.valueQuantity?.value,
      current: curr.valueQuantity?.value,
      previousDate: prev?.effectiveDateTime,
      currentDate: curr.effectiveDateTime,
      direction,
      severity,
      referenceText: config.referenceText,
      good: config.good,
    });
  }

  return results;
}

export function severityDotColor(severity: Severity): string {
  switch (severity) {
    case "significant":
      return "#e11d48"; // rose-600 — softer than a pure red, still reads as urgent
    case "attention":
      return "#d97706"; // amber-600
    default:
      return "#059669"; // emerald-600
  }
}
