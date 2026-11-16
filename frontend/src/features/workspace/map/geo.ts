import type { Position } from "geojson";
import type { LngLatBoundsLike, PaddingOptions } from "maplibre-gl";
import { EL_SALVADOR } from "../data/outline";
import type { PlotFeature } from "../types";

/** El Salvador outline rings (outer ring first), [lng, lat]. geoBoundaries / OSM, CC BY-SA 2.0. */
export const COUNTRY_RINGS: readonly Position[][] = EL_SALVADOR.geometry.coordinates;

function ringsBounds(rings: readonly (readonly Position[])[]): LngLatBoundsLike {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export const COUNTRY_BOUNDS: LngLatBoundsLike = ringsBounds(COUNTRY_RINGS);

const METRES_PER_DEGREE = 111_320;
/** terra-draw rejects coordinates with more than 9 decimals; 6 is about 0.1 m. */
const COORD_DECIMALS = 6;

function roundCoord(value: number): number {
  return Number(value.toFixed(COORD_DECIMALS));
}


/** Web Mercator in radians: where the map's rotation is a plain 2D rotation. [lng, lat] ↔ [x, y] */
export function toMercator([lng, lat]: readonly [number, number]): [number, number] {
  const phi = (lat * Math.PI) / 180;
  return [(lng * Math.PI) / 180, Math.log(Math.tan(Math.PI / 4 + phi / 2))];
}
export function fromMercator([x, y]: readonly [number, number]): [number, number] {
  return [(x * 180) / Math.PI, ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI];
}

/** Unit vectors (east, north) of the screen's right and up directions for a map bearing in degrees. */
export function screenAxes(bearing: number): [[number, number], [number, number]] {
  const b = (bearing * Math.PI) / 180;
  return [
    [Math.cos(b), -Math.sin(b)],
    [Math.sin(b), Math.cos(b)],
  ];
}

/** An axis-aligned square plot of `sideM` metres centred on `[lng, lat]`. */
export function squareAround(
  [lng, lat]: readonly [number, number],
  sideM: number,
  /** Map bearing in degrees: the square's sides follow the screen, as drawn squares do. */
  bearing = 0,
): PlotFeature {
  const dLng = sideM / 2 / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  // Mercator is conformal, so half the side is the same distance on both axes there.
  const half = (dLng * Math.PI) / 180;
  const [right, up] = screenAxes(bearing);
  const center = toMercator([lng, lat]);
  const corner = (a: number, b: number): [number, number] => {
    const [x, y] = fromMercator([
      center[0] + a * half * right[0] + b * half * up[0],
      center[1] + a * half * right[1] + b * half * up[1],
    ]);
    return [roundCoord(x), roundCoord(y)];
  };
  const first = corner(-1, -1);
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[first, corner(1, -1), corner(1, 1), corner(-1, 1), first]],
    },
  };
}

export function plotBounds(plot: PlotFeature): LngLatBoundsLike {
  return ringsBounds(plot.geometry.coordinates);
}

export const PITCH_3D = 30;
export const MAX_PITCH = 60;
export const PLOT_MAX_ZOOM = 15;
/** "Go to coordinates" zooms in to at least this level (roads and towns readable). */
export const GOTO_MIN_ZOOM = 12;
/** "Go to" flight: pulls out to this zoom (the whole globe) over the point, then dives in. */
export const GOTO_PEAK_ZOOM = 1.5;
export const GOTO_OUT_MS = 1800;
export const GOTO_IN_MS = 3200;

/**
 * Opening shot: the whole globe, turned to show the Americas, before the camera flies to El
 * Salvador. Skipped (the map opens on the country) when the user prefers reduced motion.
 */
export const INTRO_CENTER: [number, number] = [-80, 12];
export const INTRO_ZOOM = 1.2;
export const INTRO_FLIGHT_MS = 4500;
/** Short beat on the globe once its tiles are in, so the flight reads as a zoom-in, not a glitch. */
export const INTRO_HOLD_MS = 400;

const LG_QUERY = "(min-width: 1024px)";
const GAP = 24;
/** Inset of the floating panels from the canvas edge (Tailwind lg:left-3 / lg:right-3). */
const PANEL_INSET = 12;
/** Gap between the tool rail and the flyout beside it (the dock's lg:left adds it to the rail). */
const RAIL_GAP = 8;
const NAV_BAR_CLEARANCE = 80;
const MIN_VIEWPORT = 120;

function cssPx(name: string, fallback: number): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Camera padding that keeps fitted content clear of the floating chrome: the tool rail and, when
 * open, its flyout on the left, the Inspector on the right (lg+ only; below lg both panels are
 * off-canvas drawers) and the nav bar at the bottom. Falls back to a small padding, still clear of
 * the rail, when the canvas is too small for the full insets.
 */
export function cameraPadding(container: HTMLElement, inspector = true, browser = true): PaddingOptions {
  const rail = cssPx("--tl-rail-w", 54);
  const small: PaddingOptions = { top: GAP, right: GAP, bottom: NAV_BAR_CLEARANCE, left: rail + GAP };
  if (!window.matchMedia(LG_QUERY).matches) return small;
  const left = PANEL_INSET + rail + (browser ? RAIL_GAP + cssPx("--tl-browser-w", 272) : 0) + GAP;
  // The Inspector is only on screen with Display open or a plot in focus (see inspectorVisible).
  const right = inspector ? PANEL_INSET + cssPx("--tl-inspector-w", 328) + GAP : GAP;
  const fitsX = container.clientWidth - left - right >= MIN_VIEWPORT;
  const fitsY = container.clientHeight - GAP - NAV_BAR_CLEARANCE >= MIN_VIEWPORT;
  return fitsX && fitsY ? { top: GAP, right, bottom: NAV_BAR_CLEARANCE, left } : small;
}

/** Animation duration that collapses to 0 (a jump) when the user prefers reduced motion. */
export function motionMs(ms: number): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
}
