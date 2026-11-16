import type { DisplayKey, FactorId } from "../types";

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
  /** Where each factor's value comes from, on its NASA badge. */
  sourceHints: {
    rain: (years: string) => `NASA POWER: average annual rainfall at this plot, ${years}`,
    temp: (years: string) => `NASA POWER: average air temperature at this plot, ${years}`,
    humidity: (years: string) => `NASA POWER: average relative humidity at this plot, ${years}`,
    elevation: () => "NASA SRTM: mean height of the hexagons this plot covers",
  } satisfies Record<FactorId, (years: string) => string>,
  /** The crop's score month by month across the climate years (rolling 12 months). */
  monthly: {
    title: "Month by month",
    basis: "Each on its last 12 months",
    readout: (month: string, score: string, season: string, projected: boolean) =>
      `${month}: ${score} · ${season}${projected ? " · projected" : ""}`,
    noScore: "no score",
    range: (low: string, lowMonth: string, high: string, highMonth: string) =>
      `Measured: lowest ${low} (${lowMonth}), highest ${high} (${highMonth})`,
    chartLabel: (crop: string, low: string, high: string, end: string | null) =>
      `${crop} score each month, on the 12 months before it. Lowest measured ${low}, highest ${high}.` +
      (end ? ` Projected from the 5-year monthly averages to ${end}.` : ""),
    projected: "Projected",
    projectedKey: "Projected (5-year monthly averages)",
    legendLabel: "Monthly chart key",
    thresholds: "Good 70 · Fair 45",
  },
  /** The crop scored on each year behind the average. */
  byYear: "Each year",
  byYearLabel: (crop: string) => `${crop} score in each of the last years`,
  yearScore: (year: number, score: number, rating: string) => `${year}: ${score} of 100, ${rating}`,
  yearRange: (first: number, last: number) => (first === last ? `${first}` : `${first}–${last}`),
  /** Email-reminder toggle shown next to the rotation and irrigation results. */
  reminder: {
    label: "Remind me by email",
  },
  outlookHeading: "Planting outlook",
  loadingOutlook: "Analyzing plot",
  outside: "This plot is outside the data coverage. Draw inside El Salvador's outline.",
  missing: (factors: string) =>
    `Not enough NASA data to score this plot: no ${factors}. Try Analyze again in a moment.`,
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
  announceOutside: "Analysis complete. This plot is outside the data coverage.",
  announceMissing: "Analysis incomplete. NASA data for this plot is missing.",
  /** The irrigation plan card and its calendar. */
  irrigation: {
    heading: "Irrigation plan",
    note: "Heuristic estimate from NASA climate — calibrate before use.",
    needData: "Waiting for this plot's climate to plan irrigation.",
    rainfed: "Rainfall is meeting this crop's water needs right now — no irrigation required.",
    volume: "Water per watering",
    frequency: "Frequency",
    duration: "Run time",
    target: "Target soil moisture",
    liters: (value: string) => `${value} L`,
    minutes: (value: string) => `${value} min`,
    moistureBand: (low: number, high: number) => `${low}–${high}%`,
    timesPerDay: (times: number) => (times === 1 ? "once a day" : `${times}× a day`),
    daysPerWeek: (days: number) =>
      days >= 7 ? "every day" : days === 1 ? "1 day a week" : `${days} days a week`,
    frequencyValue: (timesLabel: string, daysLabel: string) => `${timesLabel}, ${daysLabel}`,
    summary: (liters: string, freq: string, minutes: string) =>
      `Apply about ${liters} L per watering, ${freq} (~${minutes} min each).`,
    calendar: {
      open: "Irrigation calendar",
      close: "Hide calendar",
      viewLabel: "Calendar view",
      views: { day: "Day", week: "Week", month: "Month" },
      water: "Water",
      rest: "Rest",
      none: "No irrigation scheduled.",
      today: "Today",
      event: (time: string, liters: string) => `${time} · ${liters} L`,
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const,
    },
  },
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
      timeline: "Timeline",
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
      timeline: "Day, playback and daily values above the navigation bar",
      navBar: "Zoom, compass and Go to at the bottom",
      legends: "Color scales in the Browser",
      limiting: "What holds each crop back",
    } satisfies Record<DisplayKey, string>,
  },
} as const;
