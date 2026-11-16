import type { AnyLayerId, CropId, LayerId, Rating } from "../types";

/** Shared vocabulary. Owned by the contract; module agents read but do not edit. */
export const common = {
  appName: "Tlaloc",
  sampleData: "Sample data",
  modelNotice: "Exploratory",
  modelNoticeHint:
    "Scores come from the crop viability model: NASA POWER temperature, rainfall and humidity averaged over the last 5 complete years, and NASA SRTM elevation. Temperature and rainfall ranges follow FAO ECOCROP; elevation and humidity ranges are partly exploratory. Not yet validated for El Salvador.",
  layers: {
    humidity: "Humidity",
    rain: "Rainfall",
    precip: "Precipitation",
    temp: "Temperature",
    moisture: "Soil moisture",
    elevation: "Elevation",
    soil: "Soil condition",
  } satisfies Record<AnyLayerId, string>,
  layerDescriptions: {
    precip: "Daily rainfall",
    temp: "Daily mean air temperature",
    humidity: "Daily relative humidity",
    moisture: "Root-zone soil wetness",
    elevation: "Height above sea level",
  } satisfies Record<LayerId, string>,
  crops: {
    corn: "Corn",
    beans: "Beans",
    sorghum: "Sorghum",
    sugarcane: "Sugarcane",
  } satisfies Record<CropId, string>,
  /** For controls too narrow for the full name; the full one is still announced. */
  cropsShort: {
    corn: "Corn",
    beans: "Beans",
    sorghum: "Sorghum",
    sugarcane: "Cane",
  } satisfies Record<CropId, string>,
  ratings: {
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  } satisfies Record<Rating, string>,
} as const;
