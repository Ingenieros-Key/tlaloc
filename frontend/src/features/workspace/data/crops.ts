import type { CropId, FactorId } from "../types";

/** Inclusive ideal band for one layer, in that layer's units. */
type IdealBand = readonly [number, number];

/** Agronomic profile of a crop: the band where each factor is ideal and how much it matters. */
export type CropProfile = {
  readonly id: CropId;
  readonly ideal: Readonly<Record<FactorId, IdealBand>>;
  /** Relative importance of each factor; sums to 1. */
  readonly weights: Readonly<Record<FactorId, number>>;
};

/** Display and evaluation order of crops. */
export const CROP_ORDER: readonly CropId[] = ["corn", "beans", "sorghum"];

/**
 * Sample crop profiles (plausible, simplified agronomy for El Salvador lowlands and mid-elevations).
 * - Corn: wants steady, ample moisture and fertile, well-drained volcanic soils.
 * - Beans: shorter season, sensitive to waterlogging and fungal disease, so excess rain hurts.
 * - Sorghum: the drought-tolerant option, accepts drier air, lower rainfall and poorer soils.
 * Rainfall carries the highest weight for every crop because it is the main constraint on rain-fed
 * farms. Tuned so each crop is the best match somewhere on the sample grid (roughly corn 65%,
 * beans 23%, sorghum 13% of cells).
 */
export const CROPS: Readonly<Record<CropId, CropProfile>> = {
  // Temperature bands are 12-month mean air temperature (°C): beans prefer the cooler highlands,
  // sorghum the hot lowlands, corn sits in between.
  corn: {
    id: "corn",
    ideal: { temp: [20, 30], humidity: [62, 88], rain: [1650, 2200], soil: [55, 100] },
    weights: { temp: 0.2, humidity: 0.2, rain: 0.32, soil: 0.28 },
  },
  beans: {
    id: "beans",
    ideal: { temp: [17, 26], humidity: [52, 74], rain: [1350, 1800], soil: [45, 90] },
    weights: { temp: 0.25, humidity: 0.2, rain: 0.3, soil: 0.25 },
  },
  sorghum: {
    id: "sorghum",
    ideal: { temp: [24, 34], humidity: [40, 66], rain: [1100, 1550], soil: [25, 100] },
    weights: { temp: 0.15, humidity: 0.25, rain: 0.32, soil: 0.28 },
  },
};

/** Distance outside an ideal band, as a fraction of the layer domain width, at which a factor scores 0. */
export const FACTOR_TOLERANCE = 0.35;

/** Minimum crop score for each rating. */
export const RATING_THRESHOLDS = { good: 70, fair: 45 } as const;
