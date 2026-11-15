import { bbox, booleanPointInPolygon, centroid } from "@turf/turf";
import { LAYERS, SAMPLE_LAYER_ORDER } from "../layers";
import type { Position } from "geojson";
import type {
  Assessment,
  CropAssessment,
  FactorScore,
  GridCell,
  SampleLayerId,
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

function scoreFactor(layer: SampleLayerId, value: number, crop: CropProfile): FactorScore {
  const [lo, hi] = crop.ideal[layer];
  const [dMin, dMax] = LAYERS[layer].domain;
  const tolerance = (dMax - dMin) * FACTOR_TOLERANCE;
  const position = value < lo ? "below" : value > hi ? "above" : "within";
  const gap = position === "below" ? lo - value : position === "above" ? value - hi : 0;
  const score =
    position === "within" ? 100 : Math.min(99, Math.round(100 * Math.max(0, 1 - gap / tolerance)));
  return { layer, value, score, position };
}

function rate(score: number): Rating {
  if (score >= RATING_THRESHOLDS.good) return "good";
  if (score >= RATING_THRESHOLDS.fair) return "fair";
  return "poor";
}

function assessCrop(crop: CropProfile, means: Readonly<Record<SampleLayerId, number>>): CropAssessment {
  const factors = SAMPLE_LAYER_ORDER.map((layer) => scoreFactor(layer, means[layer], crop));
  const weighted = factors.reduce((sum, f) => sum + f.score * crop.weights[f.layer], 0);
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

/** Scores each crop for the plot from the mean SAMPLE values of the grid cells it covers. */
export function computeAssessment(plot: PlotFeature, grid: readonly GridCell[]): Assessment {
  const cells = sampleCells(plot, grid);
  if (cells.length === 0) return { kind: "outside" };

  const means = Object.fromEntries(
    SAMPLE_LAYER_ORDER.map((layer) => [
      layer,
      cells.reduce((sum, cell) => sum + cell.values[layer], 0) / cells.length,
    ]),
  ) as Record<SampleLayerId, number>;

  return {
    kind: "ok",
    cellsSampled: cells.length,
    crops: CROP_ORDER.map((id) => assessCrop(CROPS[id], means)),
  };
}
