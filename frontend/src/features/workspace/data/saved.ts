import { CROP_ORDER } from "./crops";
import { PRIORITIES, type Planting, type Priority } from "./rotation";
import type { CropId, PlotFeature } from "../types";

/** What the browser keeps between visits: the plot, its name, and the farmer's answers about it. */
export type SavedPlot = {
  readonly plot: PlotFeature;
  readonly plotName: string;
  readonly planting: Planting | null;
  readonly priority: Priority;
};

const KEY = "tl-plot";
const VERSION = 1;

function isCrop(value: unknown): value is CropId {
  return typeof value === "string" && (CROP_ORDER as readonly string[]).includes(value);
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T | null {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : null;
}

function asPlot(value: unknown): PlotFeature | null {
  const feature = value as { type?: unknown; geometry?: { type?: unknown; coordinates?: unknown } } | null;
  if (feature?.type !== "Feature" || feature.geometry?.type !== "Polygon") return null;
  const ring = (feature.geometry.coordinates as unknown[] | undefined)?.[0];
  const valid =
    Array.isArray(ring) &&
    ring.length >= 4 &&
    ring.every((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  return valid ? { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring as number[][]] } } : null;
}

function asPlanting(value: unknown): Planting | null {
  const raw = value as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return null;
  const crop = isCrop(raw.crop) ? raw.crop : raw.crop === "other" ? "other" : null;
  if (crop === null) return null;
  const month = Number.isInteger(raw.sowMonth) && (raw.sowMonth as number) >= 1 && (raw.sowMonth as number) <= 12;
  const year = Number.isInteger(raw.sowYear);
  // Sugarcane is dated by the years it has stood, and "other" has no sowing at all.
  if (crop !== "other" && crop !== "sugarcane" && !(month && year)) return null;
  return {
    crop,
    sowMonth: month ? (raw.sowMonth as number) : null,
    sowYear: year ? (raw.sowYear as number) : null,
    harvested: raw.harvested === true,
    harvest: oneOf(raw.harvest, ["good", "regular", "poor"]),
    stubble: oneOf(raw.stubble, ["left", "removed", "burned"]),
    earlier: isCrop(raw.earlier) ? raw.earlier : null,
    caneYears: Number.isInteger(raw.caneYears) ? (raw.caneYears as number) : null,
    renewing: raw.renewing === true,
  };
}

/** The saved plot, or null when there is none or it cannot be read (it is then ignored). */
export function readSavedPlot(): SavedPlot | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || raw.v !== VERSION) return null;
    const plot = asPlot(raw.plot);
    if (!plot) return null;
    return {
      plot,
      plotName: typeof raw.plotName === "string" ? raw.plotName : "",
      planting: asPlanting(raw.planting),
      priority: oneOf(raw.priority, PRIORITIES) ?? "soil",
    };
  } catch {
    return null;
  }
}

/** Saves the plot with its answers; null forgets it. Storage being full or blocked is not an error. */
export function writeSavedPlot(saved: SavedPlot | null): void {
  try {
    if (saved) localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...saved }));
    else localStorage.removeItem(KEY);
  } catch {
    // Private windows and full storage: the plot simply is not kept.
  }
}
