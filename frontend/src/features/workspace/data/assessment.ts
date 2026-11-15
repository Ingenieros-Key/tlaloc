import { bbox, booleanPointInPolygon, centroid } from "@turf/turf";
import type { Position } from "geojson";
import { FACTOR_ORDER } from "../layers";
import type {
  Assessment,
  CropAssessment,
  CropId,
  FactorId,
  FactorScore,
  GridCell,
  PlotFeature,
  Rating,
} from "../types";
import type { Climate } from "./climate";
import { CROP_ORDER, RATING_THRESHOLDS } from "./crops";
import { CROP_MODELS, optimumPosition, viability } from "./viability";

/** Indexes of the grid cells whose centres fall inside the plot, else the one under its centre. */
function sampleCells(plot: PlotFeature, grid: readonly GridCell[]): readonly number[] {
  const [minX, minY, maxX, maxY] = bbox(plot);
  const inside: number[] = [];
  grid.forEach(({ center: [lng, lat] }, i) => {
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) return;
    if (booleanPointInPolygon([lng, lat], plot)) inside.push(i);
  });
  if (inside.length > 0) return inside;
  return cellUnder(centroid(plot).geometry.coordinates, grid);
}

/**
 * The drawn hexagon containing a point, so a plot smaller than a cell reads the cell it visibly sits
 * on (and a plot off the drawn grid is reported as outside the coverage).
 */
function cellUnder([lng, lat]: Position, grid: readonly GridCell[]): readonly number[] {
  const hit = grid.findIndex(({ polygon }) => {
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
  return hit >= 0 ? [hit] : [];
}

function rate(score: number): Rating {
  if (score >= RATING_THRESHOLDS.good) return "good";
  if (score >= RATING_THRESHOLDS.fair) return "fair";
  return "poor";
}

/**
 * One crop's outlook from the viability model (the Crop score view runs this for every cell).
 * Null when a value is missing: the model needs all four.
 */
export function scoreCrop(crop: CropId, values: Readonly<Partial<Record<FactorId, number>>>): CropAssessment | null {
  const { index, aptitudes } = viability(crop, values);
  if (index === null) return null;
  const curves = CROP_MODELS[crop].curves;
  const factors = FACTOR_ORDER.map(
    (id): FactorScore => ({
      layer: id,
      value: values[id] as number,
      score: aptitudes[id] * 100,
      position: optimumPosition(values[id] as number, curves[id]),
      source: "nasa",
    }),
  );
  const lowest = factors.reduce((min, f) => (f.score < min.score ? f : min));
  // A crop held back by any factor never rounds up to a perfect 100.
  const ceiling = lowest.score < 100 ? 99 : 100;
  const score = Math.max(0, Math.min(ceiling, Math.round(index)));
  return { crop, score, rating: rate(score), factors, limiting: lowest.score < 100 ? lowest.layer : null };
}

/**
 * Scores each crop for the plot. Temperature, rainfall and humidity are NASA POWER's averages over
 * the last complete years at the plot (see `climate.ts`); elevation is the mean of the elevation
 * hexagons the plot covers (NASA SRTM). Each crop is also scored on every one of those years.
 */
export function computeAssessment(
  plot: PlotFeature,
  grid: readonly GridCell[],
  climate: Climate | null,
  elevation: Float32Array | null,
): Assessment {
  const cells = sampleCells(plot, grid);
  if (cells.length === 0) return { kind: "outside" };

  let height: number | undefined;
  if (elevation) {
    const heights = cells.map((i) => elevation[i]).filter((h) => Number.isFinite(h));
    if (heights.length > 0) height = heights.reduce((sum, h) => sum + h, 0) / heights.length;
  }
  const values: Partial<Record<FactorId, number>> = { ...climate?.mean, elevation: height };
  const missing = FACTOR_ORDER.filter((id) => values[id] === undefined || !Number.isFinite(values[id]));
  if (missing.length > 0) return { kind: "missing", missing };

  const crops = CROP_ORDER.flatMap((id) => {
    const average = scoreCrop(id, values);
    if (!average) return [];
    const years = (climate?.years ?? []).flatMap((year) => {
      const result = scoreCrop(id, { ...year.values, elevation: height });
      return result ? [{ year: year.year, score: result.score, rating: result.rating }] : [];
    });
    return [{ ...average, years }];
  });
  return { kind: "ok", cellsSampled: cells.length, crops };
}
