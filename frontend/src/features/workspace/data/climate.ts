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

/** One month's rolling 12-month climate: the 12 months ending with it (`month` is 1–12). */
export type ClimateMonth = {
  readonly year: number;
  readonly month: number;
  /**
   * True for a month not measured yet (the current one and later, or one POWER has not published):
   * its window fills every unmeasured month with that calendar month's average over the years.
   */
  readonly projected: boolean;
  /** Rain total, mean temperature and humidity over those 12 months; a factor missing any month is left out. */
  readonly values: Partial<Record<ClimateFactor, number>>;
};

export type Climate = {
  /** Each factor's average over the years it has a value for. */
  readonly mean: Partial<Record<ClimateFactor, number>>;
  /** Every year with at least one value, oldest first. */
  readonly years: readonly ClimateYear[];
  /**
   * Every month from the first averaged year through 11 months after the current one, oldest
   * first, with its rolling 12-month climate (see `ClimateMonth.projected`).
   */
  readonly months: readonly ClimateMonth[];
};

function annualValue(location: PowerLocation, factor: ClimateFactor, year: number): number | null {
  const value = location.series[CLIMATE_PARAMETERS[factor]]?.[`${year}13`];
  return value === undefined || value === null || !Number.isFinite(value) ? null : value;
}

function mean(values: readonly (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length > 0 ? valid.reduce((sum, v) => sum + v, 0) / valid.length : null;
}

/**
 * The climate at a point: each factor averaged over the years, the years themselves, and the
 * rolling months through the next 12 (`now` sets the current month).
 */
export function climateAt(location: PowerLocation, range: ClimateYears, now: Date = new Date()): Climate {
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
  return { mean: averages, years, months: rollingMonths(location, range, now) };
}

function monthValue(location: PowerLocation, factor: ClimateFactor, year: number, month: number): number | null {
  const value = location.series[CLIMATE_PARAMETERS[factor]]?.[`${year}${String(month).padStart(2, "0")}`];
  return value === undefined || value === null || !Number.isFinite(value) ? null : value;
}

/** Each calendar month's average over the averaged years (index 0 = January); null = no year has it. */
function monthlyNormals(location: PowerLocation, factor: ClimateFactor, range: ClimateYears): readonly (number | null)[] {
  return Array.from({ length: 12 }, (_, m) => mean(yearList(range).map((year) => monthValue(location, factor, year, m + 1))));
}

/**
 * Each month scored the way the annual ranges expect: the rainfall total and the mean temperature
 * and humidity of the 12 months ending with it (so January 2021 reads February 2020 to January
 * 2021; the request starts a year early for that). Months run from the first averaged year through
 * 11 months after the current one. A month not measured yet (the current month or later, or one
 * POWER has not published) counts at its calendar month's average over the averaged years, so the
 * projection carries the latest measured months forward and settles on the usual climate once a
 * window holds none of them.
 */
function rollingMonths(location: PowerLocation, range: ClimateYears, now: Date): readonly ClimateMonth[] {
  const current = now.getFullYear() * 12 + now.getMonth();
  const normals = Object.fromEntries(
    CLIMATE_FACTORS.map((factor) => [factor, monthlyNormals(location, factor, range)]),
  ) as Record<ClimateFactor, readonly (number | null)[]>;
  const measured = (factor: ClimateFactor, index: number) =>
    index < current ? monthValue(location, factor, Math.floor(index / 12), (index % 12) + 1) : null;

  const months: ClimateMonth[] = [];
  for (let index = range.first * 12; index <= current + 11; index += 1) {
    const values: Partial<Record<ClimateFactor, number>> = {};
    for (const factor of CLIMATE_FACTORS) {
      const window: number[] = [];
      for (let back = 11; back >= 0; back -= 1) {
        const i = index - back;
        const value = measured(factor, i) ?? (i >= range.first * 12 ? normals[factor][i % 12] : null);
        if (value !== null) window.push(value);
      }
      if (window.length < 12) continue;
      const total = window.reduce((sum, v) => sum + v, 0);
      values[factor] = factor === "rain" ? total : total / 12;
    }
    const projected = CLIMATE_FACTORS.some((factor) => measured(factor, index) === null);
    months.push({ year: Math.floor(index / 12), month: (index % 12) + 1, projected, values });
  }
  return months;
}

/** One factor's multi-year average on the hexagon grid, from a regional answer (NaN = no data). */
export function climateField(data: readonly PowerLocation[], factor: ClimateFactor, range: ClimateYears): Float32Array {
  const years = yearList(range);
  return interpolateToGrid(
    data,
    data.map((location) => mean(years.map((year) => annualValue(location, factor, year)))),
  );
}

/**
 * The plot's request: every factor's monthly and annual values at the point, from the year before
 * the first averaged one (for the first months' rolling windows) through the current one (whose
 * published months are the cycles' most recent values).
 */
export function climatePointQuery([lng, lat]: readonly [number, number], range: ClimateYears) {
  return powerMonthlyPointQuery({
    parameters: CLIMATE_FACTORS.map((f) => CLIMATE_PARAMETERS[f]).sort(),
    longitude: lng,
    latitude: lat,
    start: String(range.first - 1),
    end: String(range.last + 1),
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
