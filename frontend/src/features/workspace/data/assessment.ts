import { bbox, booleanPointInPolygon, centroid } from "@turf/turf";
import { FACTOR_ORDER, LAYERS, SAMPLE_LAYER_ORDER } from "../layers";
import type { Position } from "geojson";
import type {
  CropId,
  FactorId,
  FactorSource,
  Assessment,
  CropAssessment,
  FactorScore,
  GridCell,
  PlotFeature,
  Rating,
} from "../types";
import { CROPS, CROP_ORDER, FACTOR_TOLERANCE, RATING_THRESHOLDS, type CropProfile } from "./crops";

function sampleCells(plot: PlotFeature, grid: readonly GridCell[]): readonly GridCell[] {
  const [minX, minY, maxX, maxY] = bbox(plot);
  const inside = grid.filter(({ center: [lng, lat] }) => {
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) return false;
    return booleanPointInPolygon([lng, lat], plot);
  });
  if (inside.length > 0) return inside;

  return cellUnder(centroid(plot).geometry.coordinates, grid);
}

/**
 * The drawn hexagon containing a point, so a plot smaller than a cell reads the cell it visibly sits
 * on (and a plot off the drawn grid is reported as outside the coverage).
 */
function cellUnder([lng, lat]: Position, grid: readonly GridCell[]): readonly GridCell[] {
  const hit = grid.find(({ polygon }) => {
    const xs = polygon.map(([x]) => x);
    const ys = polygon.map(([, y]) => y);
    if (lng < Math.min(...xs) || lng > Math.max(...xs) || lat < Math.min(...ys) || lat > Math.max(...ys)) {
      return false;
    }
    return booleanPointInPolygon([lng, lat], {
      type: "Polygon",
      coordinates: [polygon.map(([x, y]) => [x, y])],
    });
  });
  return hit ? [hit] : [];
}

function scoreFactor(
  layer: FactorId,
  value: number,
  crop: CropProfile,
  source: FactorSource,
): FactorScore {
  const [lo, hi] = crop.ideal[layer];
  const [dMin, dMax] = LAYERS[layer].domain;
  const tolerance = (dMax - dMin) * FACTOR_TOLERANCE;
  const position = value < lo ? "below" : value > hi ? "above" : "within";
  const gap = position === "below" ? lo - value : position === "above" ? value - hi : 0;
  const score =
    position === "within" ? 100 : Math.min(99, Math.round(100 * Math.max(0, 1 - gap / tolerance)));
  return { layer, value, score, position, source };
}

function rate(score: number): Rating {
  if (score >= RATING_THRESHOLDS.good) return "good";
  if (score >= RATING_THRESHOLDS.fair) return "fair";
  return "poor";
}

function assessCrop(
  crop: CropProfile,
  values: Readonly<Partial<Record<FactorId, number>>>,
  sources: Readonly<Partial<Record<FactorId, FactorSource>>>,
): CropAssessment {
  const present = FACTOR_ORDER.filter((id) => values[id] !== undefined);
  const factors = present.map((id) => scoreFactor(id, values[id] as number, crop, sources[id] ?? "sample"));
  // Weights are renormalised over the factors that have a value (temperature has no sample fallback).
  const weightSum = present.reduce((sum, id) => sum + crop.weights[id], 0);
  const weighted = factors.reduce((sum, f) => sum + (f.score * crop.weights[f.layer]) / weightSum, 0);
  const lowest = factors.reduce((min, f) => (f.score < min.score ? f : min));
  const ceiling = lowest.score < 100 ? 99 : 100;
  const score = Math.max(0, Math.min(ceiling, Math.round(weighted)));
  return {
    crop: crop.id,
    score,
    rating: rate(score),
    factors,
    limiting: lowest.score < 100 ? lowest.layer : null,
  };
}

/** One crop's outlook from factor values (the Crop score view runs this for every cell). */
export function scoreCrop(
  crop: CropId,
  values: Readonly<Partial<Record<FactorId, number>>>,
  sources: Readonly<Partial<Record<FactorId, FactorSource>>> = {},
): CropAssessment {
  return assessCrop(CROPS[crop], values, sources);
}

/**
 * Scores each crop for the plot from the mean values of the grid cells it covers. `measured`
 * replaces sample values with NASA POWER ones where available (temperature, humidity, rainfall).
 */
export function computeAssessment(
  plot: PlotFeature,
  grid: readonly GridCell[],
  measured: Partial<Record<FactorId, number>> = {},
): Assessment {
  const cells = sampleCells(plot, grid);
  if (cells.length === 0) return { kind: "outside" };

  const values: Partial<Record<FactorId, number>> = {};
  const sources: Partial<Record<FactorId, FactorSource>> = {};
  for (const layer of SAMPLE_LAYER_ORDER) {
    values[layer] = cells.reduce((sum, cell) => sum + cell.values[layer], 0) / cells.length;
    sources[layer] = "sample";
  }
  for (const id of FACTOR_ORDER) {
    const value = measured[id];
    if (value === undefined) continue;
    values[id] = value;
    sources[id] = "nasa";
  }

  return {
    kind: "ok",
    cellsSampled: cells.length,
    crops: CROP_ORDER.map((id) => assessCrop(CROPS[id], values, sources)),
  };
}
