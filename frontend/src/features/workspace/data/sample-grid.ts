import { bbox, booleanPointInPolygon, hexGrid } from "@turf/turf";
import { LAYERS, LAYER_ORDER } from "../layers";
import type { GridCell, LayerId } from "../types";
import { EL_SALVADOR } from "./outline";

/** Hexagon side length of the sample grid, in kilometers. */
const CELL_SIDE_KM = 3.5;

type LngLat = readonly [number, number];

const VOLCANIC_CHAIN: readonly LngLat[] = [
  [-89.85, 13.88],
  [-89.55, 13.85],
  [-89.22, 13.74],
  [-88.85, 13.64],
  [-88.55, 13.52],
  [-88.27, 13.44],
  [-87.95, 13.4],
];

const NORTHERN_HIGHLANDS: readonly LngLat[] = [
  [-89.8, 14.02],
  [-89.45, 14.14],
  [-89.1, 14.26],
  [-88.75, 14.12],
  [-88.5, 14.0],
];

const DRY_CORE: LngLat = [-88.05, 13.62];

const COAST_LAT: readonly LngLat[] = [
  [-90.15, 13.65],
  [-89.8, 13.45],
  [-89.4, 13.38],
  [-88.8, 13.14],
  [-88.2, 13.08],
  [-87.85, 13.25],
  [-87.65, 13.35],
];

function hash(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Two-octave value noise in [0, 1]; `scale` is the feature size in degrees. */
function fbm(lng: number, lat: number, scale: number, seed: number): number {
  const x = lng / scale;
  const y = lat / scale;
  return (valueNoise(x, y, seed) * 2 + valueNoise(x * 2.1, y * 2.1, seed + 17)) / 3;
}

function gaussian(d: number, sigma: number): number {
  return Math.exp(-(d * d) / (2 * sigma * sigma));
}

function sigmoid(x: number, edge: number, width: number): number {
  return 1 / (1 + Math.exp(-(x - edge) / width));
}

function distanceToPolyline(lng: number, lat: number, line: readonly LngLat[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i];
    const [bx, by] = line[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((lng - ax) * dx + (lat - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(lng - (ax + t * dx), lat - (ay + t * dy)));
  }
  return best;
}

function interpolate(x: number, table: readonly LngLat[]): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [x0, y0] = table[i];
    const [x1, y1] = table[i + 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return table[table.length - 1][1];
}

function rawFields(lng: number, lat: number): Record<LayerId, number> {
  const inland = Math.max(0, lat - interpolate(lng, COAST_LAT));
  const chain = gaussian(distanceToPolyline(lng, lat, VOLCANIC_CHAIN), 0.09);
  const north = gaussian(distanceToPolyline(lng, lat, NORTHERN_HIGHLANDS), 0.12);
  const east = sigmoid(lng, -88.4, 0.12);
  const west = sigmoid(-lng, 89.5, 0.15);
  const northEast = east * sigmoid(lat, 13.7, 0.08);
  const dryCore = gaussian(Math.hypot(lng - DRY_CORE[0], lat - DRY_CORE[1]), 0.18);

  const humidity =
    1 -
    0.75 * smooth(Math.min(1, inland / 0.7)) -
    0.3 * east -
    0.2 * northEast -
    0.3 * dryCore +
    0.25 * fbm(lng, lat, 0.3, 11);

  const rain =
    0.55 * chain +
    0.6 * north +
    0.3 * west -
    0.9 * east -
    0.35 * dryCore +
    0.3 * fbm(lng, lat, 0.25, 23);

  const soil =
    0.9 * chain +
    0.4 * gaussian(inland - 0.15, 0.12) -
    0.45 * northEast -
    0.35 * sigmoid(lat, 14.15, 0.05) +
    0.6 * fbm(lng, lat, 0.12, 37);

  return { humidity, rain, soil };
}

function buildGrid(): readonly GridCell[] {
  const hexes = hexGrid(bbox(EL_SALVADOR), CELL_SIDE_KM, { units: "kilometers" });
  const kept: { polygon: LngLat[]; center: LngLat; raw: Record<LayerId, number> }[] = [];

  for (const hex of hexes.features) {
    const ring = hex.geometry.coordinates[0];
    const vertices = ring.slice(0, -1);
    const center: LngLat = [
      vertices.reduce((s, p) => s + p[0], 0) / vertices.length,
      vertices.reduce((s, p) => s + p[1], 0) / vertices.length,
    ];
    if (!booleanPointInPolygon([center[0], center[1]], EL_SALVADOR)) continue;
    kept.push({
      polygon: ring.map(([lng, lat]) => [lng, lat] as const),
      center,
      raw: rawFields(center[0], center[1]),
    });
  }

  const ranges = Object.fromEntries(
    LAYER_ORDER.map((id) => {
      const vals = kept.map((c) => c.raw[id]);
      return [id, [Math.min(...vals), Math.max(...vals)] as const];
    }),
  ) as Record<LayerId, readonly [number, number]>;

  const scale = (id: LayerId, raw: number): number => {
    const [rMin, rMax] = ranges[id];
    const [dMin, dMax] = LAYERS[id].domain;
    const margin = (dMax - dMin) * 0.03;
    const t = rMax > rMin ? (raw - rMin) / (rMax - rMin) : 0.5;
    const v = dMin + margin + t * (dMax - dMin - 2 * margin);
    const factor = 10 ** LAYERS[id].precision;
    return Math.round(Math.min(dMax, Math.max(dMin, v)) * factor) / factor;
  };

  return kept.map((c, id) => ({
    id,
    polygon: c.polygon,
    center: c.center,
    values: {
      humidity: scale("humidity", c.raw.humidity),
      rain: scale("rain", c.raw.rain),
      soil: scale("soil", c.raw.soil),
    },
  }));
}

let cache: readonly GridCell[] | null = null;

/** Deterministic SAMPLE hex grid clipped to El Salvador, computed once per session. */
export function getSampleGrid(): readonly GridCell[] {
  cache ??= buildGrid();
  return cache;
}
