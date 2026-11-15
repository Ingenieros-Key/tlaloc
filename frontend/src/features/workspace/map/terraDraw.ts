import type { Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawRectangleMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { PlotFeature, Tool } from "../types";
import { ACCENT_HEX, BG_HEX, CREAM_HEX } from "./theme";

/** Prefix of terra-draw's MapLibre source and layer ids ("td-polygon", "td-point", ...). */
export const TD_PREFIX = "td";

const SQUARE_MODE = "square";
const SELECT_MODE = "select";
const STATIC_MODE = "static";

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
      new TerraDrawRectangleMode({
        modeName: SQUARE_MODE,
        drawInteraction: "click-move-or-drag",
        styles: {
          fillColor: ACCENT_HEX,
          fillOpacity: 0.12,
          outlineColor: ACCENT_HEX,
          outlineOpacity: 1,
          outlineWidth: 2,
        },
      }),
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
