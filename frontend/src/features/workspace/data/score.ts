import { FACTOR_ORDER } from "../layers";
import type { CropId, FactorId, FieldCell } from "../types";
import { scoreCrop } from "./assessment";
import { getSampleGrid } from "./sample-grid";

/** The factors behind the score, one value per hexagon (NaN = no data). */
export type ScoreClimate = Readonly<Record<FactorId, Float32Array>>;

/** A crop's outlook for every hexagon of the grid. Arrays are indexed like `cells`. */
export type ScoreField = {
  readonly crop: CropId;
  readonly cells: readonly FieldCell[];
  /** 0 to 100; NaN where a value is missing. */
  readonly scores: Float32Array;
  /** The factor holding each cell back, or null when every factor is in its optimum band. */
  readonly limiting: readonly (FactorId | null)[];
  /** What went into each cell's score. */
  readonly values: ScoreClimate;
  /** Changes with every new field, so deck.gl knows to recolor. */
  readonly version: number;
};

let version = 0;

/**
 * Scores `crop` for every hexagon with the same viability model as a plot's outlook: temperature,
 * rainfall and humidity from NASA POWER (12-month values) and elevation from NASA SRTM. A cell
 * missing any of them gets no score, as the model needs all four.
 */
export function buildScoreField(values: ScoreClimate, crop: CropId): ScoreField {
  const grid = getSampleGrid();
  const scores = new Float32Array(grid.length);
  const limiting: (FactorId | null)[] = [];
  grid.forEach((_, i) => {
    const cell = Object.fromEntries(FACTOR_ORDER.map((id) => [id, values[id][i]])) as Record<FactorId, number>;
    const result = scoreCrop(crop, cell);
    scores[i] = result ? result.score : NaN;
    limiting.push(result ? result.limiting : null);
  });
  version += 1;
  return {
    crop,
    cells: grid.map(({ id, polygon, center }) => ({ id, polygon, center })),
    scores,
    limiting,
    values,
    version,
  };
}
