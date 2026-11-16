/** UI strings for the map area. Owned by the map module; add keys freely. */
export const map = {
  regionLabel: "Map of El Salvador",
  canvasLabel:
    "Interactive map. Arrow keys pan, Shift plus arrow keys rotate and tilt, plus and minus zoom. With the Area tool selected, press Enter to place a plot at the map centre.",
  loading: "Loading map…",
  notices: {
    tiles: {
      title: "Some map tiles could not load",
      body: "The basemap may be incomplete. Data layers still work.",
    },
    style: {
      title: "The basemap could not load",
      body: "Showing a plain background instead. Data layers, drawing and analysis still work.",
    },
    slow: {
      title: "The map is taking a long time to load",
      body: "Check your connection, or reload the page to try again.",
    },
    webgl: {
      title: "This browser can't display the map",
      body: "The map needs WebGL2. The panels still work, but plots can't be drawn.",
    },
  },
  dismissError: "Dismiss map notice",
  switchingBasemap: "Loading basemap…",
  attribution: {
    boundary: "Boundary: geoBoundaries, © OpenStreetMap contributors",
    gibs: "Imagery: NASA GIBS / ESDIS",
  },
  dryDay: (max: string) => `No rain this day · max ${max} mm`,
  plotReading: (day: string) => `on ${day}`,
  /** The wet/dry season card at the top of the map. */
  season: {
    wet: "Rainy season",
    dry: "Dry season",
    usual: (month: string, mm: string) => `${month}: ${mm} mm usual`,
    country: (month: string) => `${month} in El Salvador`,
    ends: (month: string) => `rains ease in ${month}`,
    returns: (month: string) => `rains return in ${month}`,
    hintPlot: "From this plot's 2021–2025 monthly rainfall. A month with 100 mm or more counts as wet.",
    hintCountry: "El Salvador's usual rainy season, May to October. Draw a plot to use its own rainfall.",
  },
  tooltip: {
    outsideRange: "Outside filter range",
    powerSource: (day: string) => `NASA POWER · ${day}, smoothed`,
    elevationSource: "NASA SRTM · mean per hexagon",
  },
  compare: {
    divider: (left: string, right: string) => `Divider between ${left} (left) and ${right} (right)`,
    dividerHint: "Drag, or use the arrow keys, to move the divider",
  },
  /** Blend view classes, low to high. */
  classes: ["Low", "Mid", "High"],
  score: {
    title: (crop: string) => `${crop} outlook`,
    outOf100: "/100",
    limitedBy: (factor: string) => `Held back by ${factor.toLowerCase()}`,
    allWithin: "Every factor is in its ideal range",
    source: "Crop viability model: NASA POWER, average of the last 5 complete years, and NASA SRTM elevation.",
  },
} as const;
