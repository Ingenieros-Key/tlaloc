import type { AnyLayerId, CropId, LayerId, Rating } from "../types";

/** Shared vocabulary. Owned by the contract; module agents read but do not edit. */
export const common = {
  appName: "Tlaloc",
  sampleData: "Sample data",
  sampleDataHint:
    "The precipitation layer is live NASA POWER data. Crop outlook scores still use simulated humidity, rainfall and soil values for demonstration.",
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
