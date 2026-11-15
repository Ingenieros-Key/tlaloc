import type { DisplayKey } from "../types";

/** UI strings for the inspector area. Owned by the inspector module; add keys freely. */
export const inspector = {
  title: "Inspector",
  area: "Area",
  centroid: "Centroid",
  cellsSampled: "Cells sampled",
  units: {
    hectares: "ha",
    squareMeters: "m²",
  },
  hemispheres: {
    north: "N",
    south: "S",
    east: "E",
    west: "W",
  },
  coordinate: (degrees: string, hemisphere: string) => `${degrees}° ${hemisphere}`,
  withUnit: (value: string, unit: string) => `${value} ${unit}`,
  nasaSource: "NASA",
  nasaSourceHint: "Measured: NASA POWER rainfall over the last 12 months at this plot",
  outlookHeading: "Planting outlook",
  loadingOutlook: "Analyzing plot",
  outside: "This plot is outside the sample coverage. Draw inside El Salvador's outline.",
  bestMatch: "Best match",
  outOf100: "/100",
  scoreLabel: (score: number) => `Score ${score} out of 100`,
  factorFit: (layer: string) => `${layer} fit`,
  factorFitValue: (score: number) => `${score} of 100`,
  positions: {
    below: "Low",
    within: "Ideal",
    above: "High",
  },
  limitingBelow: (layer: string, crop: string) =>
    `Limiting factor: ${layer} is below the ideal range for ${crop.toLowerCase()}.`,
  limitingAbove: (layer: string, crop: string) =>
    `Limiting factor: ${layer} is above the ideal range for ${crop.toLowerCase()}.`,
  limitingWithin: (layer: string, crop: string) =>
    `Limiting factor: ${layer} is the weakest fit for ${crop.toLowerCase()}.`,
  allWithin: "All factors are within the ideal range.",
  announceRunning: "Analyzing plot…",
  /** Several names when crops tie for the top score. */
  announceDone: (crops: readonly string[], rating: string, score: number) =>
    `Analysis complete. ${crops.length > 1 ? "Best matches" : "Best match"}: ${new Intl.ListFormat("en-US").format(crops)}, ${rating}, ${score} of 100.`,
  announceOutside: "Analysis complete. This plot is outside the sample coverage.",
  display: {
    close: "Close Display",
    title: "Display",
    reset: "Show all",
    resetHint: "Turn every item back on",
    sections: {
      map: "Map",
      overlays: "Overlays",
      panels: "Panels",
    },
    items: {
      data: "Data layer",
      borders: "Cell borders",
      outline: "Country outline",
      labels: "Place labels",
      tooltips: "Cell tooltips",
      pin: "Go to pin",
      plotLabel: "Plot name",
      navBar: "Navigation bar",
      legends: "Legends",
      limiting: "Limiting factors",
    } satisfies Record<DisplayKey, string>,
    descriptions: {
      data: "Hexagons of the active layer",
      borders: "Hairlines between hexagons",
      outline: "El Salvador border",
      labels: "Basemap towns, roads and places",
      tooltips: "Values when hovering a hexagon",
      pin: "Marker placed with Go to",
      plotLabel: "Label with the plot's name on the map",
      navBar: "Zoom, compass and Go to at the bottom",
      legends: "Color scales in the Browser",
      limiting: "What holds each crop back",
    } satisfies Record<DisplayKey, string>,
  },
} as const;
