import { FACTOR_ORDER } from "../layers";
import type { CropId, FactorId, FieldCell } from "../types";
import { scoreCrop } from "./assessment";
import { getSampleGrid } from "./sample-grid";

/** The measured factors behind the score, one value per hexagon (NaN = no data). */
export type ScoreClimate = Readonly<Record<Exclude<FactorId, "soil">, Float32Array>>;

/** A crop's outlook for every hexagon of the grid. Arrays are indexed like `cells`. */
export type ScoreField = {
  readonly crop: CropId;
  readonly cells: readonly FieldCell[];
  /** 0 to 100; NaN where NASA POWER has no data. */
  readonly scores: Float32Array;
  /** The factor holding each cell back, or null when every factor is in its ideal range. */
  readonly limiting: readonly (FactorId | null)[];
  /** What went into each cell's score. Soil condition comes from the simulated sample grid. */
  readonly values: Readonly<Record<FactorId, Float32Array>>;
  /** Changes with every new field, so deck.gl knows to recolor. */
  readonly version: number;
};

let version = 0;

/**
 * Scores `crop` for every hexagon with the same rules as a plot's outlook: temperature, humidity
 * and rainfall from NASA POWER (12-month values), soil condition from the sample grid. A factor
 * with no data is left out of that cell's score; a cell with no NASA data at all gets none.
 */
export function buildScoreField(climate: ScoreClimate, crop: CropId): ScoreField {
  const grid = getSampleGrid();
  const scores = new Float32Array(grid.length);
  const soil = new Float32Array(grid.length);
  const limiting: (FactorId | null)[] = [];
  grid.forEach((cell, i) => {
    soil[i] = cell.values.soil;
    const values: Partial<Record<FactorId, number>> = { soil: cell.values.soil };
    let measured = 0;
    for (const id of FACTOR_ORDER) {
      if (id === "soil") continue;
      const value = climate[id][i];
      if (Number.isNaN(value)) continue;
      values[id] = value;
      measured += 1;
    }
    if (measured === 0) {
      scores[i] = NaN;
      limiting.push(null);
      return;
    }
    const result = scoreCrop(crop, values);
    scores[i] = result.score;
    limiting.push(result.limiting);
  });
  version += 1;
  return {
    crop,
    cells: grid.map(({ id, polygon, center }) => ({ id, polygon, center })),
    scores,
    limiting,
    values: { ...climate, soil },
    version,
  };
}
