import type { DailySeries, PowerDate } from "./client";

export type DailySummary = {
  /** Sum of all valid days (for a mm/day parameter: the period total in mm). */
  readonly total: number;
  /** Sum per calendar month, January first. Months without data are 0. */
  readonly monthly: readonly number[];
  /** Days whose value is at least `wetThreshold`. */
  readonly wetDays: number;
  readonly max: { readonly date: PowerDate; readonly value: number } | null;
  /** Days with a value (POWER fill values excluded). */
  readonly validDays: number;
};

/**
 * Totals and extremes of a daily series. Built for accumulating parameters such as precipitation;
 * `wetThreshold` defaults to 1 mm, the usual "rain day" cut-off.
 */
export function summarizeDaily(series: DailySeries, wetThreshold = 1): DailySummary {
  const monthly = Array.from({ length: 12 }, () => 0);
  let total = 0;
  let wetDays = 0;
  let validDays = 0;
  let max: DailySummary["max"] = null;
  for (const [date, value] of Object.entries(series)) {
    if (value === null) continue;
    validDays += 1;
    total += value;
    monthly[Number(date.slice(4, 6)) - 1] += value;
    if (value >= wetThreshold) wetDays += 1;
    if (!max || value > max.value) max = { date, value };
  }
  return { total, monthly, wetDays, max, validDays };
}

/** "20250614" → a Date at local midnight. */
export function parsePowerDate(date: PowerDate): Date {
  return new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)));
}

/** A Date's local calendar day as "YYYYMMDD". */
export function toPowerDate(date: Date): PowerDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Calendar day `days` after (or before, if negative) a "YYYYMMDD" date. */
export function addDays(date: PowerDate, days: number): PowerDate {
  const next = parsePowerDate(date);
  next.setDate(next.getDate() + days);
  return toPowerDate(next);
}

/** Every day from `start` to `end`, inclusive. */
export function dateRange(start: PowerDate, end: PowerDate): PowerDate[] {
  const days: PowerDate[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The part of a series between two dates, inclusive. */
export function sliceSeries(series: DailySeries, start: PowerDate, end: PowerDate): DailySeries {
  return Object.fromEntries(Object.entries(series).filter(([date]) => date >= start && date <= end));
}
