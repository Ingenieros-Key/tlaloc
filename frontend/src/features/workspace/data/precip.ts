import {
  POWER_LAG_DAYS,
  addDays,
  parsePowerDate,
  powerPointQuery,
  powerRegionalQuery,
  toPowerDate,
  type PowerDate,
  type PowerLocation,
} from "@/lib/nasa-power";
import type { FieldCell } from "../types";
import { getSampleGrid } from "./sample-grid";

/** Live precipitation layer: NASA POWER corrected precipitation, mm per day. */
export const PRECIP_PARAMETER = "PRECTOTCORR";

/** Quick timeframes, in days, each ending at the newest day. */
export const PRECIP_PRESETS = [7, 30, 90, 365] as const;
export const DEFAULT_PRESET_DAYS = 30;

/** Longest custom timeframe: a year keeps the request and the animation manageable. */
export const MAX_RANGE_DAYS = 366;

/** First day of POWER's daily record. */
export const POWER_FIRST_DAY: PowerDate = "19810101";

/** Days "Latest" asks for, so a publishing delay longer than assumed still finds a day with data. */
const LATEST_LOOKBACK_DAYS = 7;

/** Data older than this never changes, so its cache entries never need refreshing. */
const SETTLED_AFTER_DAYS = 60;

/** Where the detail chart looks when there is no pin or plot: San Salvador. [lng, lat] */
export const PRECIP_DEFAULT_POINT: readonly [number, number] = [-89.2182, 13.6929];

/** Covers El Salvador with a margin. POWER regional queries need at least 2° on each axis. */
const EL_SALVADOR_BBOX = { west: -90.25, south: 12.75, east: -87.5, north: 14.75 } as const;

type LngLat = readonly [number, number];

export type PrecipWindow = { readonly start: PowerDate; readonly end: PowerDate };

/** Newest day POWER should have published: today minus its usual lag. */
export function expectedLatestDay(now: Date = new Date()): PowerDate {
  return addDays(toPowerDate(now), -POWER_LAG_DAYS);
}

/** What "Latest" fetches: a short window ending at the expected newest day. */
export function latestWindow(now: Date = new Date()): PrecipWindow {
  const end = expectedLatestDay(now);
  return { start: addDays(end, -(LATEST_LOOKBACK_DAYS - 1)), end };
}

/** The `days` days ending at the expected newest day. */
export function presetRange(days: number, now: Date = new Date()): PrecipWindow {
  const end = expectedLatestDay(now);
  return { start: addDays(end, -(days - 1)), end };
}

/** Days in a window, both ends included. */
export function windowDays({ start, end }: PrecipWindow): number {
  return Math.round((parsePowerDate(end).getTime() - parsePowerDate(start).getTime()) / 86_400_000) + 1;
}

/** Daily precipitation on the workspace hexagon grid. */
export type PrecipFrames = {
  /** One per frame, oldest first. The last is the newest day with data. */
  readonly dates: readonly PowerDate[];
  /** Hexagon outlines shared by every frame (3.5 km cells clipped to El Salvador). */
  readonly hexes: readonly FieldCell[];
  /** `values[day][hex]` in mm; NaN where no POWER cell around the hexagon has data that day. */
  readonly values: readonly Float32Array[];
};

type Weight = readonly [point: number, weight: number];

/** Index pair around `v` on a sorted axis and the fraction between them; clamped at the ends. */
function bracket(axis: readonly number[], v: number): readonly [number, number, number] {
  const last = axis.length - 1;
  if (v <= axis[0]) return [0, 0, 0];
  if (v >= axis[last]) return [last, last, 0];
  let i = 0;
  while (axis[i + 1] < v) i += 1;
  return [i, i + 1, (v - axis[i]) / (axis[i + 1] - axis[i])];
}

/**
 * Bilinear weights from POWER's regular grid of cell centres to each target point. Targets beyond
 * the outermost centres take the edge values.
 */
function bilinearWeights(grid: readonly LngLat[], targets: readonly LngLat[]): readonly Weight[][] {
  const lngs = [...new Set(grid.map(([lng]) => lng))].sort((a, b) => a - b);
  const lats = [...new Set(grid.map(([, lat]) => lat))].sort((a, b) => a - b);
  const index = new Map(grid.map(([lng, lat], i) => [`${lngs.indexOf(lng)},${lats.indexOf(lat)}`, i]));
  return targets.map(([lng, lat]) => {
    const [x0, x1, fx] = bracket(lngs, lng);
    const [y0, y1, fy] = bracket(lats, lat);
    const corners: readonly [number, number, number][] = [
      [x0, y0, (1 - fx) * (1 - fy)],
      [x1, y0, fx * (1 - fy)],
      [x0, y1, (1 - fx) * fy],
      [x1, y1, fx * fy],
    ];
    return corners.flatMap(([x, y, w]): Weight[] => {
      const point = index.get(`${x},${y}`);
      return point === undefined || w === 0 ? [] : [[point, w]];
    });
  });
}

/** POWER regional request behind the map: every grid cell over El Salvador for the window. */
export function precipRegionalQuery(window: PrecipWindow) {
  const options = powerRegionalQuery({ parameters: [PRECIP_PARAMETER], bbox: EL_SALVADOR_BBOX, ...window });
  const settled = window.end < addDays(toPowerDate(new Date()), -SETTLED_AFTER_DAYS);
  return settled ? { ...options, staleTime: Infinity } : options;
}

/** POWER point request behind the detail chart (the cell containing the point). */
export function precipPointQuery([lng, lat]: LngLat, window: PrecipWindow) {
  return powerPointQuery({ parameters: [PRECIP_PARAMETER], longitude: lng, latitude: lat, ...window });
}

/**
 * Daily precipitation on the hexagon grid, from a regional POWER answer. POWER's native
 * grid is MERRA-2 / GEOS-IT at 0.5° × 0.625° (about 55 × 68 km, ~20 cells over the country), so each
 * hexagon is interpolated bilinearly from the surrounding cell centres: smoother, but no more
 * detailed than the source. Trailing days nobody has published yet (a lag longer than assumed) are
 * dropped.
 */
export function buildPrecipFrames(data: readonly PowerLocation[]): PrecipFrames {
  const series = data.map((location) => location.series[PRECIP_PARAMETER] ?? {});
  // POWER answers with every day of the request (fill values included), so its keys are the dates.
  const dates = Object.keys(series[0] ?? {}).sort();
  while (dates.length > 0 && series.every((s) => s[dates[dates.length - 1]] == null)) dates.pop();

  const grid = getSampleGrid();
  const weights = bilinearWeights(
    data.map((location): LngLat => [location.longitude, location.latitude]),
    grid.map((cell) => cell.center),
  );
  const values = dates.map((date) => {
    const day = series.map((s) => s[date] ?? null);
    const frame = new Float32Array(grid.length);
    weights.forEach((hexWeights, h) => {
      let sum = 0;
      let total = 0;
      for (const [point, w] of hexWeights) {
        const value = day[point];
        if (value === null) continue;
        sum += value * w;
        total += w;
      }
      frame[h] = total > 0 ? sum / total : NaN;
    });
    return frame;
  });

  return { dates, hexes: grid.map(({ id, polygon, center }) => ({ id, polygon, center })), values };
}
