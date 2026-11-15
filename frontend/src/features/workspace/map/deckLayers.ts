import type { Layer } from "@deck.gl/core";
import { HeatmapLayer, type HeatmapLayerProps } from "@deck.gl/aggregation-layers";
import { PathLayer, PolygonLayer, type PathLayerProps, type PolygonLayerProps } from "@deck.gl/layers";
import { LAYERS, MUTED_CELL, rampColor } from "../layers";
import type { DataField, DataStyle, DisplaySettings, FieldCell, LayerId, LayerSettings, Rgba } from "../types";
import { COUNTRY_RINGS } from "./geo";
import { CELL_HIGHLIGHT, CELL_STROKE, OUTLINE_COLOR } from "./theme";

/** deck.gl layer id of the active data layer (used to filter hover picks). */
export const DATA_LAYER_ID = "tl-data";
const OUTLINE_LAYER_ID = "tl-country-outline";

type LngLat = [number, number];

const COUNTRY_PATHS: readonly LngLat[][] = COUNTRY_RINGS.map((ring) =>
  ring.map(([lng, lat]): LngLat => [lng, lat]),
);

const TRANSPARENT: Rgba = [0, 0, 0, 0];

/** `beforeId` is read by @deck.gl/maplibre in interleaved mode but is not part of core LayerProps. */
type Interleaved = { readonly beforeId?: string };

type DeckLayerInput = {
  /** Values of the active layer on its grid, or null while nothing is loaded. */
  readonly field: DataField | null;
  readonly activeLayer: LayerId | null;
  readonly layerSettings: Readonly<Record<LayerId, LayerSettings>>;
  readonly style: DataStyle;
  /** Current map zoom; sizes the heatmap kernel to the grid spacing. */
  readonly zoom: number;
  /** MapLibre layer the deck layers are inserted beneath (undefined = top of the style). */
  readonly beforeId: string | undefined;
  /** Display card switches that affect the deck layers. */
  readonly display: Pick<DisplaySettings, "data" | "borders" | "outline">;
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

function fillColor(id: LayerId, settings: LayerSettings, values: Float32Array) {
  const def = LAYERS[id];
  const alpha = Math.round(255 * settings.opacity);
  const muted = withOpacity(MUTED_CELL, settings.opacity);
  const [lo, hi] = settings.range;
  return (_cell: FieldCell, { index }: { index: number }): Rgba => {
    const value = values[index];
    if (Number.isNaN(value)) return TRANSPARENT;
    if (value < lo || value > hi) return muted;
    const [r, g, b, a] = rampColor(def, value);
    return [r, g, b, Math.round((a * alpha) / 255)];
  };
}

/** Side of the heatmap's weights texture, in texels (see `weightsTextureSize` below). */
const HEATMAP_TEXTURE_SIZE = 256;

/** Centre-to-centre spacing of the 3.5 km hexagon grid, in metres. */
const GRID_SPACING_M = 3500 * Math.sqrt(3);
/** Latitude used to convert metres to pixels; the middle of El Salvador. */
const GRID_LAT = 13.7;

/**
 * Heatmap kernel radius: a few grid spacings at the current zoom, so neighbouring samples blend into
 * a continuous surface. deck.gl caps it at 100 px, so samples separate when zoomed in very close.
 */
function heatmapRadius(zoom: number): number {
  const metresPerPixel = (40_075_016.686 * Math.cos((GRID_LAT * Math.PI) / 180)) / (512 * 2 ** zoom);
  return Math.round(Math.min(100, Math.max(12, (GRID_SPACING_M / metresPerPixel) * 2.5)));
}

/**
 * Builds the interleaved deck.gl layers: the active layer as hexagons or a heatmap, then the
 * country outline. Geometry stays the same between days; only `field.values` changes.
 */
export function buildDeckLayers({
  field,
  activeLayer,
  layerSettings,
  style,
  zoom,
  beforeId,
  display,
}: DeckLayerInput): Layer[] {
  const layers: Layer[] = [];

  if (activeLayer && field && display.data) {
    const settings = layerSettings[activeLayer];
    const { cells, values, version } = field;

    if (style === "heatmap") {
      const def = LAYERS[activeLayer];
      // MEAN: each pixel shows the kernel-weighted average rainfall, in the layer's own units.
      // Typed as a plain object: deck.gl 9.4's HeatmapLayerProps don't line up with its constructor
      // (their onHover types conflict), so the props are checked field by field instead.
      const heatProps = {
        id: `${DATA_LAYER_ID}-heatmap`,
        beforeId,
        data: cells,
        getPosition: (cell: FieldCell): [number, number] => [cell.center[0], cell.center[1]],
        getWeight: (_cell: FieldCell, { index }: { index: number }) => {
          const value = values[index];
          return Number.isNaN(value) ? 0 : value;
        },
        aggregation: "MEAN" as const,
        colorDomain: [def.domain[0], def.domain[1]] as [number, number],
        colorRange: def.ramp.map((c) => [c[0], c[1], c[2], c[3]] as [number, number, number, number]),
        radiusPixels: heatmapRadius(zoom),
        debounceTimeout: 100,
        // deck.gl's default 2048² float texture is redrawn and scanned for its maximum on every
        // weight update (each playback frame) and radius change (each zoom step): ~300 ms of GPU
        // work per update, which made heatmap playback run at ~3 fps and zooming stutter. The data
        // only spans El Salvador (~6 km sample spacing), so 256² (~1 km per texel) looks the same.
        weightsTextureSize: HEATMAP_TEXTURE_SIZE,
        opacity: settings.opacity,
        pickable: false,
        updateTriggers: { getWeight: [version] },
      } satisfies Partial<HeatmapLayerProps<FieldCell>> & Interleaved;
      layers.push(new HeatmapLayer<FieldCell>(heatProps));
    } else {
      const dataProps: PolygonLayerProps<FieldCell> & Interleaved = {
        id: DATA_LAYER_ID,
        beforeId,
        data: cells,
        getPolygon: (cell) => cell.polygon,
        filled: true,
        stroked: display.borders,
        extruded: false,
        getFillColor: fillColor(activeLayer, settings, values),
        getLineColor: withOpacity(CELL_STROKE, settings.opacity),
        lineWidthUnits: "pixels",
        getLineWidth: 0.5,
        lineWidthMinPixels: 0.5,
        pickable: true,
        autoHighlight: true,
        highlightColor: [...CELL_HIGHLIGHT],
        updateTriggers: {
          getFillColor: [activeLayer, version, settings.opacity, settings.range[0], settings.range[1]],
          getLineColor: [settings.opacity],
        },
      };
      layers.push(new PolygonLayer<FieldCell>(dataProps));
    }
  }

  if (!display.outline) return layers;

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
