import type { Layer } from "@deck.gl/core";
import { PathLayer, PolygonLayer, type PathLayerProps, type PolygonLayerProps } from "@deck.gl/layers";
import { LAYERS, MUTED_CELL, rampColor } from "../layers";
import type { GridCell, LayerId, LayerSettings, Rgba } from "../types";
import { COUNTRY_RINGS } from "./geo";
import { CELL_HIGHLIGHT, CELL_STROKE, OUTLINE_COLOR } from "./theme";

/** deck.gl layer id of the active sample-data layer (used to filter hover picks). */
export const DATA_LAYER_ID = "tl-data";
const OUTLINE_LAYER_ID = "tl-country-outline";

type LngLat = [number, number];

const COUNTRY_PATHS: readonly LngLat[][] = COUNTRY_RINGS.map((ring) =>
  ring.map(([lng, lat]): LngLat => [lng, lat]),
);

/** `beforeId` is read by @deck.gl/maplibre in interleaved mode but is not part of core LayerProps. */
type Interleaved = { readonly beforeId?: string };

type DeckLayerInput = {
  readonly cells: readonly GridCell[];
  readonly activeLayer: LayerId | null;
  readonly layerSettings: Readonly<Record<LayerId, LayerSettings>>;
  /** MapLibre layer the deck layers are inserted beneath (undefined = top of the style). */
  readonly beforeId: string | undefined;
};

/**
 * MapLibre layer id of the group @deck.gl/maplibre 9.4 creates for a given `beforeId`. Mirrors the
 * library's internal `getMapLibreLayerGroupId`; used only to detect a missing group.
 */
export function deckGroupId(beforeId: string | undefined): string {
  return beforeId ? `deck-maplibre-layer-group-before:${beforeId}` : "deck-maplibre-layer-group-last";
}

function withOpacity([r, g, b, a]: Rgba, opacity: number): Rgba {
  return [r, g, b, Math.round(a * opacity)];
}

function fillColor(id: LayerId, settings: LayerSettings): (cell: GridCell) => Rgba {
  const def = LAYERS[id];
  const alpha = Math.round(255 * settings.opacity);
  const muted = withOpacity(MUTED_CELL, settings.opacity);
  const [lo, hi] = settings.range;
  return (cell) => {
    const value = cell.values[id];
    if (value < lo || value > hi) return muted;
    const [r, g, b] = rampColor(def, value);
    return [r, g, b, alpha];
  };
}

/** Builds the interleaved deck.gl layers: active sample-data hexagons, then the country outline. */
export function buildDeckLayers({ cells, activeLayer, layerSettings, beforeId }: DeckLayerInput): Layer[] {
  const layers: Layer[] = [];

  if (activeLayer) {
    const settings = layerSettings[activeLayer];
    const dataProps: PolygonLayerProps<GridCell> & Interleaved = {
      id: DATA_LAYER_ID,
      beforeId,
      data: cells,
      getPolygon: (cell) => cell.polygon,
      filled: true,
      stroked: true,
      extruded: false,
      getFillColor: fillColor(activeLayer, settings),
      getLineColor: withOpacity(CELL_STROKE, settings.opacity),
      lineWidthUnits: "pixels",
      getLineWidth: 0.5,
      lineWidthMinPixels: 0.5,
      pickable: true,
      autoHighlight: true,
      highlightColor: [...CELL_HIGHLIGHT],
      updateTriggers: {
        getFillColor: [activeLayer, settings.opacity, settings.range[0], settings.range[1]],
        getLineColor: [settings.opacity],
      },
    };
    layers.push(new PolygonLayer<GridCell>(dataProps));
  }

  const outlineProps: PathLayerProps<LngLat[]> & Interleaved = {
    id: OUTLINE_LAYER_ID,
    beforeId,
    data: COUNTRY_PATHS,
    getPath: (ring) => ring,
    getColor: OUTLINE_COLOR,
    widthUnits: "pixels",
    getWidth: 1,
    widthMinPixels: 1,
    pickable: false,
  };
  layers.push(new PathLayer<LngLat[]>(outlineProps));

  return layers;
}
