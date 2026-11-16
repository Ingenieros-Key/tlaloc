import type { PowerLocation } from "@/lib/nasa-power";
import { CLIMATE_FACTORS, CLIMATE_PARAMETERS, type ClimateFactor, type ClimateYears } from "./climate";

/**
 * Monthly climate cycles at a place, from the same NASA POWER monthly request as the outlook's
 * 5-year average: every month of the averaged years, each calendar month's average and range
 * across them (the "normal"), and the most recent measured value of each calendar month.
 *
 * The normal is what the app projects: for the next 12 months, each month's expected value is its
 * average over the averaged years, and its range is the uncertainty. It is not a forecast.
 */

/** A month of a year; `month` is 1–12. */
export type YearMonth = { readonly year: number; readonly month: number };

export type FactorCycle = {
  /** Each averaged year's 12 monthly values (index 0 = January); null where POWER has none. */
  readonly years: readonly { readonly year: number; readonly values: readonly (number | null)[] }[];
  /** Per calendar month across those years: average, lowest and highest (null = no year has it). */
  readonly mean: readonly (number | null)[];
  readonly min: readonly (number | null)[];
  readonly max: readonly (number | null)[];
  /**
   * The last measured value of each calendar month before the current one (index 0 = January):
   * this year's for months already past, last year's for the rest. Null where not published yet.
   */
  readonly recent: readonly ({ readonly year: number; readonly value: number } | null)[];
};

export type ClimateCycles = {
  readonly range: ClimateYears;
  /** The current month: where the 12 projected months start. */
  readonly start: YearMonth;
  readonly factors: Readonly<Record<ClimateFactor, FactorCycle>>;
};

function monthValue(location: PowerLocation, factor: ClimateFactor, year: number, month: number): number | null {
  const value = location.series[CLIMATE_PARAMETERS[factor]]?.[`${year}${String(month).padStart(2, "0")}`];
  return value === undefined || value === null || !Number.isFinite(value) ? null : value;
}

function cycleOf(location: PowerLocation, factor: ClimateFactor, range: ClimateYears, start: YearMonth): FactorCycle {
  const years: { year: number; values: (number | null)[] }[] = [];
  for (let year = range.first; year <= range.last; year += 1) {
    years.push({ year, values: Array.from({ length: 12 }, (_, m) => monthValue(location, factor, year, m + 1)) });
  }
  const column = (m: number) => years.map((y) => y.values[m]).filter((v): v is number => v !== null);
  const mean = Array.from({ length: 12 }, (_, m) => {
    const values = column(m);
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  });
  const min = Array.from({ length: 12 }, (_, m) => (column(m).length > 0 ? Math.min(...column(m)) : null));
  const max = Array.from({ length: 12 }, (_, m) => (column(m).length > 0 ? Math.max(...column(m)) : null));
  const recent = Array.from({ length: 12 }, (_, m) => {
    // The current month is not over yet, so its last complete occurrence is a year ago.
    const year = m + 1 < start.month ? start.year : start.year - 1;
    const value = monthValue(location, factor, year, m + 1);
    return value === null ? null : { year, value };
  });
  return { years, mean, min, max, recent };
}

/** The cycles of every factor at a point; `location` must cover the averaged years and the current one. */
export function climateCycles(location: PowerLocation, range: ClimateYears, now: Date = new Date()): ClimateCycles {
  const start = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const factors = Object.fromEntries(
    CLIMATE_FACTORS.map((factor) => [factor, cycleOf(location, factor, range, start)]),
  ) as Record<ClimateFactor, FactorCycle>;
  return { range, start, factors };
}

/** The 12 months from `start` on, in order (crossing into next year). */
export function projectedMonths(start: YearMonth): readonly YearMonth[] {
  return Array.from({ length: 12 }, (_, i) => {
    const index = start.month - 1 + i;
    return { year: start.year + Math.floor(index / 12), month: (index % 12) + 1 };
  });
}

/** A factor's measured value for one month, from the averaged years or the latest ones; null if none. */
export function measuredValue(cycle: FactorCycle, { year, month }: YearMonth): number | null {
  const fromYears = cycle.years.find((y) => y.year === year)?.values[month - 1];
  if (fromYears !== undefined) return fromYears;
  const recent = cycle.recent[month - 1];
  return recent && recent.year === year ? recent.value : null;
}

/**
 * A month predicted by linear regression over the same calendar month in past years: the averaged
 * years plus its latest measured value when that is newer (this year's, for a month already past).
 * The least-squares line through (year, value) is read at the target year, then kept within the
 * lowest and highest value that month has had, so a steep trend over few years cannot run to zero
 * or past any month seen. Keeps the season (a December stays dry); null without data.
 */
export function trendForecast(cycle: FactorCycle, { year, month }: YearMonth): number | null {
  const points = cycle.years.flatMap((y) => {
    const value = y.values[month - 1];
    return value === null ? [] : [{ x: y.year, y: value }];
  });
  const recent = cycle.recent[month - 1];
  if (recent && !points.some((p) => p.x === recent.year)) points.push({ x: recent.year, y: recent.value });
  if (points.length === 0) return null;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const spread = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  const slope = spread === 0 ? 0 : points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0) / spread;
  const low = Math.min(...points.map((p) => p.y));
  const high = Math.max(...points.map((p) => p.y));
  return Math.min(high, Math.max(low, meanY + slope * (year - meanX)));
}

/** A month counts as wet from this much usual rainfall (mm). */
export const WET_MONTH_MM = 100;

/** El Salvador's usual rainy season, used before a plot's own rainfall is known: May–October. */
const RAINY_MONTHS = [5, 6, 7, 8, 9, 10];

export type SeasonNow = {
  readonly wet: boolean;
  /** The month the season usually turns (1–12), or null if it never does. */
  readonly turns: number | null;
  /** This month's usual rainfall at the plot (mm), or null when going by the calendar. */
  readonly usual: number | null;
};

/**
 * Whether the current month is usually wet or dry: from the plot's monthly rainfall averages when
 * known (`rainMean`, index 0 = January), else from El Salvador's usual May–October rains.
 */
export function seasonNow(rainMean: readonly (number | null)[] | null, month: number): SeasonNow {
  const isWet = (m: number) => {
    const value = rainMean?.[m - 1];
    return rainMean && value !== null && value !== undefined ? value >= WET_MONTH_MM : RAINY_MONTHS.includes(m);
  };
  const wet = isWet(month);
  let turns: number | null = null;
  for (let i = 1; i < 12; i += 1) {
    const m = ((month - 1 + i) % 12) + 1;
    if (isWet(m) !== wet) {
      turns = m;
      break;
    }
  }
  return { wet, turns, usual: rainMean?.[month - 1] ?? null };
}
