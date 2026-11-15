/**
 * Crop viability model: how suitable a place is for each crop from four values (elevation,
 * 12-month mean air temperature, annual rainfall and 12-month mean relative humidity). Each value
 * gets an aptitude from 0 to 1 on a trapezoid (0 outside the absolute limits, 1 inside the optimum
 * band, linear in between), and the index is the weighted sum × 100.
 *
 * A direct translation of the team's Python model (one script per crop). It is pure TypeScript
 * with no browser or React code, so the same module can run in a Lambda later.
 *
 * Provenance of the ranges (from the model's own notes): temperature and annual rainfall follow
 * FAO ECOCROP; elevation is a local reference (CENTA for sorghum) or an exploratory approximation;
 * relative humidity is an exploratory assumption for every crop. None are all validated for El
 * Salvador yet.
 */
import type { CropId } from "../types";

/** The model's inputs, in the units the ranges use: m, °C, mm per year, %. */
export type ViabilityVariable = "elevation" | "temp" | "rain" | "humidity";

export type ViabilityInputs = Readonly<Record<ViabilityVariable, number>>;

/** Order the model and its cards list the variables in. */
export const VIABILITY_VARIABLES: readonly ViabilityVariable[] = ["elevation", "temp", "rain", "humidity"];

/**
 * How a value maps to an aptitude.
 * - "trapezoid": [minimum, optimum low, optimum high, maximum]. At or beyond the limits → 0.
 * - "fromSeaLevel": optimal from 0 m up to `optMax`, falling to 0 at `max`; below 0 m → 0. Used
 *   for elevation where the optimum starts at sea level (sorghum, sugarcane).
 */
export type AptitudeCurve =
  | { readonly kind: "trapezoid"; readonly range: readonly [number, number, number, number] }
  | { readonly kind: "fromSeaLevel"; readonly optMax: number; readonly max: number };

export type CropModel = {
  readonly curves: Readonly<Record<ViabilityVariable, AptitudeCurve>>;
  /** Sum to 1. */
  readonly weights: Readonly<Record<ViabilityVariable, number>>;
};

const trapezoid = (min: number, optMin: number, optMax: number, max: number): AptitudeCurve => ({
  kind: "trapezoid",
  range: [min, optMin, optMax, max],
});

/** Every crop weighs the variables the same way: rainfall first, then temperature. */
const WEIGHTS: CropModel["weights"] = { elevation: 0.15, temp: 0.3, rain: 0.35, humidity: 0.2 };

export const CROP_MODELS: Readonly<Record<CropId, CropModel>> = {
  // Maíz. Elevation: illustrative local approximation. Humidity: exploratory.
  corn: {
    curves: {
      elevation: trapezoid(0, 100, 600, 2500),
      temp: trapezoid(10, 18, 33, 47),
      rain: trapezoid(400, 600, 1200, 1800),
      humidity: trapezoid(30, 60, 80, 95),
    },
    weights: WEIGHTS,
  },
  // Frijol rojo. Elevation: local favourable band, approximate outer limits. Humidity: local
  // favourable band, exploratory outer limits.
  beans: {
    curves: {
      elevation: trapezoid(200, 400, 700, 1500),
      temp: trapezoid(7, 16, 25, 32),
      rain: trapezoid(300, 500, 2000, 4300),
      humidity: trapezoid(50, 70, 80, 95),
    },
    weights: WEIGHTS,
  },
  // Sorgo. Elevation: CENTA, 0–500 m favourable. Humidity: illustrative, pending validation.
  sorghum: {
    curves: {
      elevation: { kind: "fromSeaLevel", optMax: 500, max: 1000 },
      temp: trapezoid(8, 22, 35, 40),
      rain: trapezoid(300, 400, 600, 700),
      humidity: trapezoid(45, 60, 80, 95),
    },
    weights: WEIGHTS,
  },
  // Caña de azúcar. Elevation: exploratory, 0–1,000 m favourable, 1,600 m limit. Humidity:
  // exploratory.
  sugarcane: {
    curves: {
      elevation: { kind: "fromSeaLevel", optMax: 1000, max: 1600 },
      temp: trapezoid(15, 24, 37, 41),
      rain: trapezoid(1000, 1500, 2000, 5000),
      humidity: trapezoid(40, 65, 85, 100),
    },
    weights: WEIGHTS,
  },
};

/** Aptitude of one value, 0 to 1; NaN when the value is missing. */
export function aptitude(value: number, curve: AptitudeCurve): number {
  if (!Number.isFinite(value)) return NaN;
  if (curve.kind === "fromSeaLevel") {
    if (value < 0 || value >= curve.max) return 0;
    if (value <= curve.optMax) return 1;
    return (curve.max - value) / (curve.max - curve.optMax);
  }
  const [min, optMin, optMax, max] = curve.range;
  if (value <= min || value >= max) return 0;
  if (value >= optMin && value <= optMax) return 1;
  if (value < optMin) return (value - min) / (optMin - min);
  return (max - value) / (max - optMax);
}

/** Where a value sits against a curve's optimum band. */
export function optimumPosition(value: number, curve: AptitudeCurve): "below" | "within" | "above" {
  const [low, high] = curve.kind === "fromSeaLevel" ? [0, curve.optMax] : [curve.range[1], curve.range[2]];
  return value < low ? "below" : value > high ? "above" : "within";
}

export type Viability = {
  /** 0 to 100, unrounded; null when any input is missing (the model needs all four). */
  readonly index: number | null;
  /** Each variable's aptitude, 0 to 1 (NaN when its value is missing). */
  readonly aptitudes: Readonly<Record<ViabilityVariable, number>>;
};

/** The viability of `crop` for one place. */
export function viability(crop: CropId, inputs: Partial<ViabilityInputs>): Viability {
  const model = CROP_MODELS[crop];
  const aptitudes = Object.fromEntries(
    VIABILITY_VARIABLES.map((v) => [v, aptitude(inputs[v] ?? NaN, model.curves[v])]),
  ) as Record<ViabilityVariable, number>;
  if (VIABILITY_VARIABLES.some((v) => Number.isNaN(aptitudes[v]))) return { index: null, aptitudes };
  const index = 100 * VIABILITY_VARIABLES.reduce((sum, v) => sum + model.weights[v] * aptitudes[v], 0);
  return { index, aptitudes };
}
