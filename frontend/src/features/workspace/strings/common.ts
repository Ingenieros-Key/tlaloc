import type { CropId, LayerId, Rating } from "../types";

/** Shared vocabulary. Owned by the contract; module agents read but do not edit. */
export const common = {
  appName: "Tlaloc",
  sampleData: "Sample data",
  sampleDataHint: "Values are simulated for demonstration. No real NASA data is connected yet.",
  layers: {
    humidity: "Humidity",
    rain: "Rainfall",
    soil: "Soil condition",
  } satisfies Record<LayerId, string>,
  layerDescriptions: {
    humidity: "Mean relative humidity",
    rain: "Annual precipitation",
    soil: "Composite soil health index",
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
