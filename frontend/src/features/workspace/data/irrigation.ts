import type { CropId } from "../types";
import { CROP_MODELS } from "./viability";

/**
 * Irrigation planner: turns the plot's area and its NASA climate (mean air temperature, annual
 * rainfall, relative humidity) into a watering plan for one crop — how much water per irrigation,
 * how often, roughly how long, and the soil-moisture band to aim for.
 *
 * ponytail: every number below is a first-pass agronomic heuristic, not a validated FAO-56 water
 * balance. The base crop water use (ETc), the rainfall efficiency, the flow rate and the hot/dry
 * thresholds are all tunables — calibrate against local extension data before anyone waters a real
 * field by it. 1 mm of water over 1 ha = 10,000 L is the one hard fact here.
 */

/** 1 mm of depth over 1 hectare, in litres. */
const L_PER_MM_HA = 10_000;

/** Days in a week; the plan is quoted per week. */
const DAYS_PER_WEEK = 7;

/**
 * Peak crop water use (ETc) in mm/day at the reference temperature, per crop. ponytail: typical
 * mid-season FAO ballpark figures; tune per variety and season.
 */
export const CROP_BASE_ETC_MM_PER_DAY: Readonly<Record<CropId, number>> = {
  corn: 5.5,
  beans: 4.5,
  sorghum: 5.0,
  sugarcane: 6.5,
};

/** Air temperature the base ETc is quoted at; warmer lifts demand, cooler lowers it. */
const REFERENCE_TEMP_C = 25;

/** ETc change per °C away from the reference, clamped by the bounds below. ponytail: tunable. */
const ETC_TEMP_SLOPE = 0.03;
const ETC_TEMP_MIN = 0.6;
const ETC_TEMP_MAX = 1.5;

/** Share of rainfall that actually reaches the root zone (the rest runs off or drains). ponytail. */
const RAINFALL_EFFICIENCY = 0.7;

/** Above this mean air temperature a dry plot is split into two daily waterings. ponytail. */
const HOT_TEMP_C = 30;
/** Below this effective rainfall (mm/day) the plot counts as "dry" for the split above. ponytail. */
const DRY_RAIN_MM_PER_DAY = 1;

/**
 * Nominal system delivery, in litres per minute per hectare, used only to turn a volume into an
 * approximate run time. ponytail: a drip/sprinkler system's real flow depends on the hardware —
 * expose this knob and set it from the installed kit.
 */
export const FLOW_L_PER_MIN_PER_HA = 250;

export type IrrigationPlan = {
  /** Net irrigation depth the crop needs each day after effective rainfall (mm/day). */
  readonly needMmPerDay: number;
  /** Total litres the whole plot needs per day. */
  readonly litersPerDay: number;
  /** Litres delivered in a single watering event. */
  readonly litersPerIrrigation: number;
  /** Watering events per watering day (1, or 2 when hot and dry). */
  readonly timesPerDay: number;
  /** Watering days in a week (0 when rainfall already covers demand). */
  readonly daysPerWeek: number;
  /** Approximate run time of one watering event at the nominal flow rate. */
  readonly minutesPerIrrigation: number;
  /** Soil-moisture band to aim for, from the crop's humidity optimum: [low, high] %. */
  readonly targetSoilMoisturePct: readonly [number, number];
  /** Rainfall alone meets demand: no irrigation needed right now. */
  readonly rainfed: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The crop's humidity optimum band [optMin, optMax], reused as the target soil-moisture band. */
function targetSoilMoisture(crop: CropId): readonly [number, number] {
  const curve = CROP_MODELS[crop].curves.humidity;
  return curve.kind === "trapezoid" ? [curve.range[1], curve.range[2]] : [0, curve.optMax];
}

/**
 * Build an irrigation plan from the plot's area and climate. `rainfallMmPerYear` is the plot's
 * average annual rainfall (NASA POWER); `soilMoisturePct` is optional and only tightens the summary
 * — the band to aim for comes from the crop model.
 */
export function computeIrrigation({
  areaHa,
  crop,
  tempC,
  rainfallMmPerYear,
}: {
  readonly areaHa: number;
  readonly crop: CropId;
  readonly tempC: number;
  readonly rainfallMmPerYear: number;
  /** Measured root-zone moisture, if the plot has it; unused by the band but kept for callers. */
  readonly soilMoisturePct?: number;
}): IrrigationPlan {
  const tempFactor = clamp(1 + ETC_TEMP_SLOPE * (tempC - REFERENCE_TEMP_C), ETC_TEMP_MIN, ETC_TEMP_MAX);
  const etc = CROP_BASE_ETC_MM_PER_DAY[crop] * tempFactor;

  const effectiveRainMmPerDay = (RAINFALL_EFFICIENCY * rainfallMmPerYear) / 365;
  const needMmPerDay = Math.max(0, etc - effectiveRainMmPerDay);
  const rainfed = needMmPerDay <= 0;

  const timesPerDay = tempC >= HOT_TEMP_C && effectiveRainMmPerDay < DRY_RAIN_MM_PER_DAY ? 2 : 1;
  // Wetter plots need fewer watering days: scale the week by the share of demand left to irrigate.
  const daysPerWeek = rainfed ? 0 : clamp(Math.round((needMmPerDay / etc) * DAYS_PER_WEEK), 1, DAYS_PER_WEEK);

  const litersPerDay = needMmPerDay * areaHa * L_PER_MM_HA;
  const weeklyLiters = litersPerDay * DAYS_PER_WEEK;
  const events = daysPerWeek * timesPerDay;
  const litersPerIrrigation = events > 0 ? weeklyLiters / events : 0;

  const flowLPerMin = FLOW_L_PER_MIN_PER_HA * areaHa;
  const minutesPerIrrigation = flowLPerMin > 0 ? litersPerIrrigation / flowLPerMin : 0;

  return {
    needMmPerDay,
    litersPerDay,
    litersPerIrrigation,
    timesPerDay,
    daysPerWeek,
    minutesPerIrrigation,
    targetSoilMoisturePct: targetSoilMoisture(crop),
    rainfed,
  };
}

/**
 * Which weekdays to water, as booleans indexed 0 (Mon) … 6 (Sun), spreading `daysPerWeek` events
 * as evenly as possible across the week (Bresenham-style).
 */
export function wateringWeekdays(daysPerWeek: number): readonly boolean[] {
  return Array.from(
    { length: DAYS_PER_WEEK },
    (_, i) =>
      Math.floor(((i + 1) * daysPerWeek) / DAYS_PER_WEEK) > Math.floor((i * daysPerWeek) / DAYS_PER_WEEK),
  );
}

/** Clock times (minutes from midnight) for a watering day: one at dawn, a second at dusk when split. */
export function wateringTimes(timesPerDay: number): readonly number[] {
  return timesPerDay >= 2 ? [6 * 60, 17 * 60] : [6 * 60];
}
