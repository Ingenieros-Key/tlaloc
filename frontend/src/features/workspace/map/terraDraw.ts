import type { Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { PlotFeature, Tool } from "../types";
import { fromMercator, screenAxes, toMercator } from "./geo";
import { ACCENT_HEX, BG_HEX, CREAM_HEX } from "./theme";

/** Prefix of terra-draw's MapLibre source and layer ids ("td-polygon", "td-point", ...). */
export const TD_PREFIX = "td";

const SQUARE_MODE = "square";
const SELECT_MODE = "select";
const STATIC_MODE = "static";

type LngLat = [number, number];

/**
 * The two remaining corners of a rectangle dragged from `start` to `end`, with its sides along the
 * screen's axes for a map rotated by `bearing` degrees (0 = north up gives the usual lng/lat box).
 * Built on the ground plane, so tilting the map (pitch) never skews it into a trapezoid.
 */
export function screenAlignedCorners(start: LngLat, end: LngLat, bearing: number): [LngLat, LngLat] {
  const [right, up] = screenAxes(bearing);
  const s = toMercator(start);
  const e = toMercator(end);
  const d: LngLat = [e[0] - s[0], e[1] - s[1]];
  const u = d[0] * right[0] + d[1] * right[1];
  const v = d[0] * up[0] + d[1] * up[1];
  return [
    fromMercator([s[0] + u * right[0], s[1] + u * right[1]]),
    fromMercator([s[0] + v * up[0], s[1] + v * up[1]]),
  ];
}

/** terra-draw internals the screen-aligned rectangle relies on (terra-draw 1.39). */
type RectangleInternals = {
  startPosition?: LngLat;
  currentRectangleId?: string | number;
  showCoordinatePoints: boolean;
  mutateFeature: {
    updatePolygon(args: {
      featureId: string | number;
      coordinateMutations: { type: "update"; index: number; coordinate: LngLat }[];
      propertyMutations: Record<string, unknown>;
      context: Record<string, unknown>;
    }): { geometry: { coordinates: LngLat[][] } } | null;
  };
  coordinatePoints: {
    createOrUpdate(args: { featureId: string | number; featureCoordinates: LngLat[][] }): void;
  };
  updateRectangle: (end: LngLat, updateType: string) => unknown;
};

/**
 * Rectangle mode whose sides follow the screen, not lines of longitude and latitude, so an area
 * drawn on a rotated map keeps its base parallel to the bottom of the screen. Replaces terra-draw's
 * private `updateRectangle` with the same mutation, computing corners 1 and 3 in the rotated frame.
 * Revisit if terra-draw changes that method (checked against 1.39).
 */
class ScreenAlignedRectangleMode extends TerraDrawRectangleMode {
  constructor(options: ConstructorParameters<typeof TerraDrawRectangleMode>[0], getBearing: () => number) {
    super(options);
    const mode = this as unknown as RectangleInternals;
    mode.updateRectangle = (end, updateType) => {
      if (!mode.startPosition || mode.currentRectangleId === undefined) return undefined;
      const finish = updateType === "finish";
      const [corner1, corner3] = screenAlignedCorners(mode.startPosition, end, getBearing());
      const updated = mode.mutateFeature.updatePolygon({
        featureId: mode.currentRectangleId,
        coordinateMutations: [
          { type: "update", index: 1, coordinate: corner1 },
          { type: "update", index: 2, coordinate: end },
          { type: "update", index: 3, coordinate: corner3 },
        ],
        propertyMutations: finish ? { currentlyDrawing: undefined } : {},
        context: finish ? { updateType, action: "draw" } : { updateType },
      });
      if (updated && mode.showCoordinatePoints) {
        mode.coordinatePoints.createOrUpdate({
          featureId: mode.currentRectangleId,
          featureCoordinates: updated.geometry.coordinates,
        });
      }
      return updated;
    };
  }
}

const TOOL_MODES: Readonly<Record<Tool, string>> = {
  pan: STATIC_MODE,
  square: SQUARE_MODE,
  edit: SELECT_MODE,
};

/**
 * Creates (but does not start) a terra-draw instance on the map with the plot modes: a rectangle
 * mode named "square", a select mode that can drag and resize it, and the built-in "static" mode.
 * Modes are per-instance, so a fresh instance is built after every style swap.
 */
export function createTerraDraw(map: MapLibreMap): TerraDraw {
  return new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map, prefixId: TD_PREFIX }),
    modes: [
      new ScreenAlignedRectangleMode({
        modeName: SQUARE_MODE,
        drawInteraction: "click-move-or-drag",
        styles: {
          fillColor: ACCENT_HEX,
          fillOpacity: 0.12,
          outlineColor: ACCENT_HEX,
          outlineOpacity: 1,
          outlineWidth: 2,
        },
      }, () => map.getBearing()),
      new TerraDrawSelectMode({
        modeName: SELECT_MODE,
        flags: {
          [SQUARE_MODE]: {
            feature: { draggable: true, coordinates: { resizable: "opposite" } },
          },
        },
        keyEvents: { deselect: "Escape", delete: null, rotate: null, scale: null },
        styles: {
          selectedPolygonColor: ACCENT_HEX,
          selectedPolygonFillOpacity: 0.18,
          selectedPolygonOutlineColor: ACCENT_HEX,
          selectedPolygonOutlineOpacity: 1,
          selectedPolygonOutlineWidth: 2,
          selectionPointColor: CREAM_HEX,
          selectionPointOpacity: 1,
          selectionPointWidth: 5,
          selectionPointOutlineColor: BG_HEX,
          selectionPointOutlineOpacity: 1,
          selectionPointOutlineWidth: 2,
        },
      }),
    ],
  });
}

/** Switches terra-draw to the mode for a ribbon tool; "edit" also selects the plot. */
export function applyTool(draw: TerraDraw, tool: Tool, plotId: string | number | null): void {
  if (tool === "edit" && plotId !== null && draw.hasFeature(plotId)) {
    if (draw.getMode() !== SELECT_MODE) draw.setMode(SELECT_MODE);
    draw.selectFeature(plotId, SELECT_MODE);
    return;
  }
  const mode = TOOL_MODES[tool];
  if (draw.getMode() !== mode) draw.setMode(mode);
}

/** Whether a store feature is a drawn plot (and not a selection handle or other guidance feature). */
export function isPlotFeature(feature: GeoJSONStoreFeatures): boolean {
  return feature.properties.mode === SQUARE_MODE && feature.geometry.type === "Polygon";
}

/** True when a terra-draw finish event is the completion of a newly drawn rectangle. */
export function isNewPlot(context: { readonly mode: string; readonly action: string }): boolean {
  return context.mode === SQUARE_MODE && context.action === "draw";
}

/** A clean GeoJSON copy of a terra-draw plot (no store ids or internal properties). */
export function toPlotFeature(feature: GeoJSONStoreFeatures): PlotFeature | null {
  if (feature.geometry.type !== "Polygon") return null;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: feature.geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lng, lat])),
    },
  };
}

/** Adds the plot back into a (started) terra-draw store; returns its new id, or null if rejected. */
export function addPlot(draw: TerraDraw, plot: PlotFeature): string | number | null {
  const id = draw.getFeatureId();
  const [result] = draw.addFeatures([
    {
      id,
      type: "Feature",
      properties: { mode: SQUARE_MODE },
      geometry: {
        type: "Polygon",
        coordinates: plot.geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lng, lat])),
      },
    },
  ]);
  return result?.valid ? id : null;
}

/** Stops terra-draw, tolerating a style that was already torn down underneath it. */
export function stopTerraDraw(draw: TerraDraw): void {
  try {
    draw.stop();
  } catch {
    // The map style was replaced or removed first; its layers are already gone.
  }
}
