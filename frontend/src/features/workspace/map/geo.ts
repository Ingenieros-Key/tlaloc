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

/** An axis-aligned square plot of `sideM` metres centred on `[lng, lat]`. */
export function squareAround([lng, lat]: readonly [number, number], sideM: number): PlotFeature {
  const dLat = sideM / 2 / METRES_PER_DEGREE;
  const dLng = sideM / 2 / (METRES_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  const west = roundCoord(lng - dLng);
  const east = roundCoord(lng + dLng);
  const south = roundCoord(lat - dLat);
  const north = roundCoord(lat + dLat);
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
  };
}

export function plotBounds(plot: PlotFeature): LngLatBoundsLike {
  return ringsBounds(plot.geometry.coordinates);
}

export const PITCH_3D = 30;
export const MAX_PITCH = 60;
export const PLOT_MAX_ZOOM = 15;

const LG_QUERY = "(min-width: 1024px)";
const GAP = 24;
/** Inset of the floating panels from the canvas edge (Tailwind lg:left-3 / lg:right-3). */
const PANEL_INSET = 12;
const NAV_BAR_CLEARANCE = 80;
const MIN_VIEWPORT = 120;

function cssPx(name: string, fallback: number): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Camera padding that keeps fitted content clear of the floating chrome: Browser panel on the left,
 * Inspector on the right (lg+ only; below lg they are off-canvas drawers) and the nav bar at the
 * bottom. Falls back to a small uniform padding when the canvas is too small for the full insets.
 */
export function cameraPadding(container: HTMLElement): PaddingOptions {
  const small: PaddingOptions = { top: GAP, right: GAP, bottom: NAV_BAR_CLEARANCE, left: GAP };
  if (!window.matchMedia(LG_QUERY).matches) return small;
  const left = PANEL_INSET + cssPx("--tl-browser-w", 272) + GAP;
  const right = PANEL_INSET + cssPx("--tl-inspector-w", 328) + GAP;
  const fitsX = container.clientWidth - left - right >= MIN_VIEWPORT;
  const fitsY = container.clientHeight - GAP - NAV_BAR_CLEARANCE >= MIN_VIEWPORT;
  return fitsX && fitsY ? { top: GAP, right, bottom: NAV_BAR_CLEARANCE, left } : small;
}

/** Animation duration that collapses to 0 (a jump) when the user prefers reduced motion. */
export function motionMs(ms: number): number {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
}
