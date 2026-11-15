import type { AnyLayerId, CropId, LayerId, Rating } from "../types";

/** Shared vocabulary. Owned by the contract; module agents read but do not edit. */
export const common = {
  appName: "Tlaloc",
  sampleData: "Sample data",
  sampleDataHint:
    "Rainfall in the crop outlook is NASA POWER data: the last 12 months at your plot (marked NASA). Humidity and soil condition are still simulated for demonstration.",
  partlySample: "Partly sample",
  layers: {
    humidity: "Humidity",
    rain: "Rainfall",
    precip: "Precipitation",
    soil: "Soil condition",
  } satisfies Record<AnyLayerId, string>,
  layerDescriptions: {
    precip: "NASA POWER, daily",
  } satisfies Record<LayerId, string>,
  crops: {
    corn: "Corn",
    beans: "Beans",
    sorghum: "Sorghum",
  } satisfies Record<CropId, string>,
  ratings: {
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  } satisfies Record<Rating, string>,
} as const;
