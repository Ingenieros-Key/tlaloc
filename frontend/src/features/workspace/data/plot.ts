import { area, centroid } from "@turf/turf";
import type { PlotFeature, PlotSummary } from "../types";

/** Area (ha) and centroid ([lng, lat]) of the drawn plot. */
export function summarizePlot(plot: PlotFeature): PlotSummary {
  const [lng, lat] = centroid(plot).geometry.coordinates;
  return { areaHa: area(plot) / 10_000, centroid: [lng, lat] };
}
