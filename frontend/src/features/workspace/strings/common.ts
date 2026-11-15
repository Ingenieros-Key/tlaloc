import type { AnyLayerId, CropId, LayerId, Rating } from "../types";

/** Shared vocabulary. Owned by the contract; module agents read but do not edit. */
export const common = {
  appName: "Tlaloc",
  sampleData: "Sample data",
  sampleDataHint:
    "Temperature, humidity and rainfall in the crop outlook are NASA POWER data: the last 12 months at your plot (marked NASA). Soil condition is still simulated for demonstration.",
  partlySample: "Partly sample",
  layers: {
    humidity: "Humidity",
    rain: "Rainfall",
    precip: "Precipitation",
    temp: "Temperature",
    moisture: "Soil moisture",
    soil: "Soil condition",
  } satisfies Record<AnyLayerId, string>,
  layerDescriptions: {
    precip: "Daily rainfall",
    temp: "Daily mean air temperature",
    humidity: "Daily relative humidity",
    moisture: "Root-zone soil wetness",
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
