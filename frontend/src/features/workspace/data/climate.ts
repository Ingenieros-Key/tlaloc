import { powerMonthlyPointQuery, powerMonthlyRegionalQuery, type PowerLocation } from "@/lib/nasa-power";
import type { FactorId } from "../types";
import { EL_SALVADOR_BBOX, interpolateToGrid } from "./precip";

/**
 * The climate the viability model scores: the average of the last complete years, from NASA
 * POWER's monthly endpoint, which also returns each year's annual value (month "13"): the annual
 * rainfall total, and the year's mean temperature and relative humidity. Averaging several years
 * describes a place's usual climate rather than one wet or dry year.
 */
export const CLIMATE_YEARS = 5;

export type ClimateFactor = Exclude<FactorId, "elevation">;

export const CLIMATE_FACTORS: readonly ClimateFactor[] = ["rain", "temp", "humidity"];

/** POWER parameter behind each factor. PRECTOTCORR_SUM's annual value is the year's total, in mm. */
export const CLIMATE_PARAMETERS: Readonly<Record<ClimateFactor, string>> = {
  rain: "PRECTOTCORR_SUM",
  temp: "T2M",
  humidity: "RH2M",
};

/** First and last year averaged: the `CLIMATE_YEARS` complete calendar years before this one. */
export type ClimateYears = { readonly first: number; readonly last: number };

export function climateYears(now: Date = new Date()): ClimateYears {
  const last = now.getFullYear() - 1;
  return { first: last - CLIMATE_YEARS + 1, last };
}

function yearList({ first, last }: ClimateYears): readonly number[] {
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** One year's values at a place; a factor POWER has no annual value for is left out. */
export type ClimateYear = { readonly year: number; readonly values: Partial<Record<ClimateFactor, number>> };

export type Climate = {
  /** Each factor's average over the years it has a value for. */
  readonly mean: Partial<Record<ClimateFactor, number>>;
  /** Every year with at least one value, oldest first. */
  readonly years: readonly ClimateYear[];
};

function annualValue(location: PowerLocation, factor: ClimateFactor, year: number): number | null {
  const value = location.series[CLIMATE_PARAMETERS[factor]]?.[`${year}13`];
  return value === undefined || value === null || !Number.isFinite(value) ? null : value;
}

function mean(values: readonly (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length > 0 ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null;
}

/** The climate at a point: each factor averaged over the years, plus the years themselves. */
export function climateAt(location: PowerLocation, range: ClimateYears): Climate {
  const years = yearList(range)
    .map((year): ClimateYear => {
      const values: Partial<Record<ClimateFactor, number>> = {};
      for (const factor of CLIMATE_FACTORS) {
        const value = annualValue(location, factor, year);
        if (value !== null) values[factor] = value;
      }
      return { year, values };
    })
    .filter((year) => Object.keys(year.values).length > 0);
  const averages: Partial<Record<ClimateFactor, number>> = {};
  for (const factor of CLIMATE_FACTORS) {
    const value = mean(years.map((year) => year.values[factor] ?? null));
    if (value !== null) averages[factor] = value;
  }
  return { mean: averages, years };
}

/** One factor's multi-year average on the hexagon grid, from a regional answer (NaN = no data). */
export function climateField(data: readonly PowerLocation[], factor: ClimateFactor, range: ClimateYears): Float32Array {
  const years = yearList(range);
  return interpolateToGrid(
    data,
    data.map((location) => mean(years.map((year) => annualValue(location, factor, year)))),
  );
}

/** The plot's request: every factor's monthly and annual values at the point, for the years. */
export function climatePointQuery([lng, lat]: readonly [number, number], range: ClimateYears) {
  return powerMonthlyPointQuery({
    parameters: CLIMATE_FACTORS.map((f) => CLIMATE_PARAMETERS[f]).sort(),
    longitude: lng,
    latitude: lat,
    start: String(range.first),
    end: String(range.last),
  });
}

/** The Crop score map's request for one factor over El Salvador (regional requests take one). */
export function climateRegionalQuery(factor: ClimateFactor, range: ClimateYears) {
  return powerMonthlyRegionalQuery({
    parameters: [CLIMATE_PARAMETERS[factor]],
    bbox: EL_SALVADOR_BBOX,
    start: String(range.first),
    end: String(range.last),
  });
}
