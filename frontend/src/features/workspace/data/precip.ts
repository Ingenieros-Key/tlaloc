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
import type { FieldCell, LayerId, PowerLayerId } from "../types";
import { getSampleGrid } from "./sample-grid";

/** NASA POWER corrected precipitation, mm per day. */
export const PRECIP_PARAMETER = "PRECTOTCORR";
/** Daily mean and maximum air temperature at 2 m, °C. */
export const TEMP_PARAMETER = "T2M";
export const TEMP_MAX_PARAMETER = "T2M_MAX";
/** Relative humidity at 2 m, %. */
export const HUMIDITY_PARAMETER = "RH2M";
/** Root-zone soil wetness, 0–1. */
export const MOISTURE_PARAMETER = "GWETROOT";

/**
 * How each Browser layer maps to NASA POWER: its parameter, whether a period adds its days up
 * (rainfall) or averages them (everything else), and a factor applied to every value (soil
 * wetness 0–1 is shown as a percentage).
 */
export const LAYER_SOURCES: Readonly<
  Record<PowerLayerId, { readonly parameter: string; readonly aggregate: "sum" | "mean"; readonly scale: number }>
> = {
  precip: { parameter: PRECIP_PARAMETER, aggregate: "sum", scale: 1 },
  temp: { parameter: TEMP_PARAMETER, aggregate: "mean", scale: 1 },
  humidity: { parameter: HUMIDITY_PARAMETER, aggregate: "mean", scale: 1 },
  moisture: { parameter: MOISTURE_PARAMETER, aggregate: "mean", scale: 100 },
};

/** A day hotter than this (daily maximum, °C) counts as a heat-stress day for corn and beans. */
export const HOT_DAY_C = 35;

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
export const EL_SALVADOR_BBOX = { west: -90.25, south: 12.75, east: -87.5, north: 14.75 } as const;

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

/**
 * A layer's values on the workspace hexagon grid: one frame per day, or for elevation a single
 * static frame with no dates (which is what hides the timeline).
 */
export type PrecipFrames = {
  /** One per frame, oldest first. The last is the newest day with data. Empty for elevation. */
  readonly dates: readonly PowerDate[];
  /** Hexagon outlines shared by every frame (3.5 km cells clipped to El Salvador). */
  readonly hexes: readonly FieldCell[];
  /** `values[day][hex]` in mm; NaN where no POWER cell around the hexagon has data that day. */
  readonly values: readonly Float32Array[];
};

/** Rainfall columns never scale to less than this, so a nearly dry timeframe does not tower. */
const MIN_RAIN_HEIGHT_MM = 5;

const heightDomains = new WeakMap<PrecipFrames, readonly [number, number]>();

/**
 * The values that map to no height and to full height in the Columns view. Rainfall runs from 0 to
 * the wettest cell of the loaded timeframe: against the layer's fixed 0 to 40 mm, an ordinary day
 * of a few millimetres would be flat. Because it spans the whole timeframe, heights stay comparable
 * from day to day while it plays. Every other layer uses its own domain.
 */
export function heightDomain(
  layer: LayerId,
  domain: readonly [number, number],
  frames: PrecipFrames | null,
): readonly [number, number] {
  if (layer === "elevation" || LAYER_SOURCES[layer].aggregate !== "sum" || !frames) return domain;
  const cached = heightDomains.get(frames);
  if (cached) return cached;
  let max = MIN_RAIN_HEIGHT_MM;
  for (const frame of frames.values) for (const value of frame) if (value > max) max = value;
  const result = [0, Math.min(domain[1], Math.ceil(max))] as const;
  heightDomains.set(frames, result);
  return result;
}

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

/** POWER regional request behind a map layer: every grid cell over El Salvador for the window. */
export function layerRegionalQuery(layer: PowerLayerId, window: PrecipWindow) {
  const parameter = LAYER_SOURCES[layer].parameter;
  const options = powerRegionalQuery({ parameters: [parameter], bbox: EL_SALVADOR_BBOX, ...window });
  const settled = window.end < addDays(toPowerDate(new Date()), -SETTLED_AFTER_DAYS);
  return settled ? { ...options, staleTime: Infinity } : options;
}

/** POWER point request for one or more parameters at a point (the cell containing it). */
export function pointQuery([lng, lat]: LngLat, window: PrecipWindow, parameters: readonly string[]) {
  return powerPointQuery({ parameters: [...parameters].sort(), longitude: lng, latitude: lat, ...window });
}

/**
 * One value per POWER grid point (null = no data) interpolated onto the hexagon grid, bilinearly
 * like the daily frames. NaN where no surrounding point has a value.
 */
export function interpolateToGrid(
  data: readonly PowerLocation[],
  pointValues: readonly (number | null)[],
): Float32Array {
  const grid = getSampleGrid();
  const weights = bilinearWeights(
    data.map((location): LngLat => [location.longitude, location.latitude]),
    grid.map((cell) => cell.center),
  );
  const out = new Float32Array(grid.length);
  weights.forEach((hexWeights, h) => {
    let sum = 0;
    let total = 0;
    for (const [point, w] of hexWeights) {
      const value = pointValues[point];
      if (value === null || value === undefined) continue;
      sum += value * w;
      total += w;
    }
    out[h] = total > 0 ? sum / total : NaN;
  });
  return out;
}

/**
 * A layer's daily values on the hexagon grid, from a regional POWER answer. POWER's native
 * grid is MERRA-2 / GEOS-IT at 0.5° × 0.625° (about 55 × 68 km, ~20 cells over the country), so each
 * hexagon is interpolated bilinearly from the surrounding cell centres: smoother, but no more
 * detailed than the source. Trailing days nobody has published yet (a lag longer than assumed) are
 * dropped.
 */
export function buildLayerFrames(data: readonly PowerLocation[], layer: PowerLayerId): PrecipFrames {
  const { parameter, scale } = LAYER_SOURCES[layer];
  const series = data.map((location) => location.series[parameter] ?? {});
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
        sum += value * scale * w;
        total += w;
      }
      frame[h] = total > 0 ? sum / total : NaN;
    });
    return frame;
  });

  return { dates, hexes: grid.map(({ id, polygon, center }) => ({ id, polygon, center })), values };
}
