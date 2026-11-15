/** UI strings for the browser area. Owned by the browser module; add keys freely. */
export const browser = {
  title: "Browser",
  plots: "Plots",
  plotName: "Plot 1",
  focusPlotHint: "Zoom the map to this plot",
  noPlot: "No plot yet",
  drawSquare: "Draw a square",
  layers: "Layers",
  showLayer: (layer: string) => `Show ${layer}`,
  /** Screen-reader note on a layer row: expanding it also changes what the map shows. */
  rowHint: "Also shows this layer on the map and hides the others.",
  legend: "Legend",
  opacity: "Opacity",
  percent: (value: number) => `${value}%`,
  valueRange: "Value range",
  rangeHint: "Cells outside the range are greyed out.",
  minimumOf: (layer: string) => `Minimum ${layer}`,
  maximumOf: (layer: string) => `Maximum ${layer}`,
  rangeReadout: (min: string, max: string, unit: string) => `${min} – ${max} ${unit}`,
  reset: "Reset",
  resetLayer: (layer: string) => `Reset ${layer} opacity and range`,
} as const;
