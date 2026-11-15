import type { CropId } from "../types";

/** Display and evaluation order of crops. The viability model behind them is `viability.ts`. */
export const CROP_ORDER: readonly CropId[] = ["corn", "beans", "sorghum", "sugarcane"];

/** Minimum crop score for each rating. */
export const RATING_THRESHOLDS = { good: 70, fair: 45 } as const;
