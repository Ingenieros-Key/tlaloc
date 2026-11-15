/** UI strings for the map area. Owned by the map module; add keys freely. */
export const map = {
  regionLabel: "Map of El Salvador",
  canvasLabel:
    "Interactive map. Arrow keys pan, plus and minus zoom. With the Square tool selected, press Enter to place a plot at the map centre.",
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
  tooltip: {
    outsideRange: "Outside filter range",
    powerSource: (day: string) => `NASA POWER · ${day}, smoothed`,
  },
} as const;
