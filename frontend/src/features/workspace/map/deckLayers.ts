import type { Layer } from "@deck.gl/core";
import { HeatmapLayer, type HeatmapLayerProps } from "@deck.gl/aggregation-layers";
import { bbox, featureCollection, intersect, polygon as turfPolygon } from "@turf/turf";
import {
  PathLayer,
  PolygonLayer,
  SolidPolygonLayer,
  type PathLayerProps,
  type PolygonLayerProps,
} from "@deck.gl/layers";
import { BLEND_COLORS, LAYERS, MUTED_CELL, SCORE_SCALE, rampColor, valueClass } from "../layers";
import type {
  DataField,
  DataStyle,
  DisplaySettings,
  FieldCell,
  LayerId,
  LayerSettings,
  Rgba,
  ViewMode,
} from "../types";
import { COUNTRY_RINGS } from "./geo";
import { CELL_HIGHLIGHT, CELL_STROKE, CELL_STROKE_DARK, OUTLINE_COLOR } from "./theme";

/** deck.gl layer id of the active data layer (used to filter hover picks). */
export const DATA_LAYER_ID = "tl-data";
/** Compare: the second layer's side of the divider. */
export const DATA_LAYER_B_ID = "tl-data-b";

/** Columns: height on screen of a cell at the top of the height layer's domain, in pixels. */
const COLUMN_MAX_PX = 72;
const COLUMN_ALPHA = 235;
const OUTLINE_LAYER_ID = "tl-country-outline";

type LngLat = [number, number];

const COUNTRY_PATHS: readonly LngLat[][] = COUNTRY_RINGS.map((ring) =>
  ring.map(([lng, lat]): LngLat => [lng, lat]),
);

const TRANSPARENT: Rgba = [0, 0, 0, 0];
/** Blend colors are drawn as designed at the default layer opacity and fade below it. */
const DEFAULT_OPACITY = 0.7;

const DIM_LAYER_ID = "tl-focus-dim";
/** Whole-world ring (Web Mercator limits) that the focus dim cuts the plot out of. */
const WORLD_RING: LngLat[] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];
/** Focus dim over everything outside the plot: --tl-bg on dark maps, navy tint on light ones. */
const DIM_DARK: Rgba = [5, 11, 22, 150];
const DIM_LIGHT: Rgba = [11, 16, 51, 80];

type RingFeature = { readonly polygon: readonly (readonly LngLat[])[] };

/** A grid cell cut to the plot's outline; `index` points back into the field's values. */
type ClippedCell = { readonly polygon: LngLat[][]; readonly index: number };

let clipCache: { cells: readonly FieldCell[]; key: string; result: ClippedCell[] } | null = null;

/**
 * The cells under the plot, each cut to the plot's outline. A plot is usually far smaller than a
 * cell (3.5 km hexagons, ~55 km NASA grid), so this is typically one piece of one hexagon. Cut on
 * the CPU: deck.gl's GPU mask does not run in interleaved MapLibre mode. Cached per plot and grid.
 */
function clipCellsToRing(cells: readonly FieldCell[], ring: readonly LngLat[]): ClippedCell[] {
  const key = JSON.stringify(ring);
  if (clipCache && clipCache.cells === cells && clipCache.key === key) return clipCache.result;
  const plot = turfPolygon([ring.map(([lng, lat]) => [lng, lat])]);
  const [minX, minY, maxX, maxY] = bbox(plot);
  const result: ClippedCell[] = [];
  cells.forEach((cell, index) => {
    const xs = cell.polygon.map(([x]) => x);
    const ys = cell.polygon.map(([, y]) => y);
    if (Math.max(...xs) < minX || Math.min(...xs) > maxX || Math.max(...ys) < minY || Math.min(...ys) > maxY) {
      return;
    }
    const piece = intersect(featureCollection([turfPolygon([cell.polygon.map(([x, y]) => [x, y])]), plot]));
    if (!piece) return;
    const polygons = piece.geometry.type === "Polygon" ? [piece.geometry.coordinates] : piece.geometry.coordinates;
    for (const rings of polygons) {
      result.push({ polygon: rings.map((r) => r.map(([x, y]): LngLat => [x, y])), index });
    }
  });
  clipCache = { cells, key, result };
  return result;
}

let wholeCache: { cells: readonly FieldCell[]; result: ClippedCell[] } | null = null;

/** Every cell as an uncut piece, so whole grids and plot cut-outs draw through the same layer. */
function wholeCells(cells: readonly FieldCell[]): ClippedCell[] {
  if (wholeCache && wholeCache.cells === cells) return wholeCache.result;
  const result = cells.map((cell, index) => ({
    polygon: [cell.polygon.map(([x, y]): LngLat => [x, y])],
    index,
  }));
  wholeCache = { cells, result };
  return result;
}

/**
 * Compare's divider on the ground: the vertical screen line through `a` (top) and `b` (bottom),
 * and a point on its left. A straight screen line stays straight on the ground at any bearing or
 * tilt, so cells can be cut against it in map coordinates.
 */
export type SplitLine = { readonly a: LngLat; readonly b: LngLat; readonly left: LngLat };

/** The part of a closed convex ring where `distance` is not negative (Sutherland-Hodgman). */
function clipRing(ring: readonly LngLat[], distance: (p: LngLat) => number): LngLat[] | null {
  const out: LngLat[] = [];
  for (let i = 0; i < ring.length - 1; i += 1) {
    const p = ring[i];
    const q = ring[i + 1];
    const dp = distance(p);
    const dq = distance(q);
    if (dp >= 0) out.push(p);
    if (dp >= 0 !== dq >= 0) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  if (out.length < 3) return null;
  out.push(out[0]);
  return out;
}

/**
 * Pieces on each side of the divider. A piece the line crosses is cut in two; cells and plot
 * cut-outs are convex, so one pass per side is exact.
 */
function splitPieces(
  pieces: readonly ClippedCell[],
  { a, b, left }: SplitLine,
): { left: ClippedCell[]; right: ClippedCell[] } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const cross = (p: LngLat) => dx * (p[1] - a[1]) - dy * (p[0] - a[0]);
  const sign = cross(left) >= 0 ? 1 : -1;
  const leftward = (p: LngLat) => sign * cross(p);
  const rightward = (p: LngLat) => -leftward(p);
  const result = { left: [] as ClippedCell[], right: [] as ClippedCell[] };
  for (const piece of pieces) {
    const ring = piece.polygon[0];
    let min = Infinity;
    let max = -Infinity;
    for (const p of ring) {
      const d = leftward(p);
      if (d < min) min = d;
      if (d > max) max = d;
    }
    if (min >= 0) result.left.push(piece);
    else if (max <= 0) result.right.push(piece);
    else {
      const l = clipRing(ring, leftward);
      const r = clipRing(ring, rightward);
      if (l) result.left.push({ polygon: [l], index: piece.index });
      if (r) result.right.push({ polygon: [r], index: piece.index });
    }
  }
  return result;
}

/** `beforeId` is read by @deck.gl/maplibre in interleaved mode but is not part of core LayerProps. */
type Interleaved = { readonly beforeId?: string };

type DeckLayerInput = {
  /** Values of the active layer on its grid, or null while nothing is loaded. */
  readonly field: DataField | null;
  /** Values of the second layer on the same grid (two-layer views), or null. */
  readonly fieldB: DataField | null;
  /** Crop scores per cell (score view), or null. */
  readonly score: DataField | null;
  readonly mode: ViewMode;
  readonly secondLayer: LayerId;
  /** Compare: where the divider is. Null draws only the active layer. */
  readonly split: SplitLine | null;
  /** Columns: the active layer's values at no height and at full height. */
  readonly heightDomain: readonly [number, number];
  readonly activeLayer: LayerId | null;
  readonly layerSettings: Readonly<Record<LayerId, LayerSettings>>;
  readonly style: DataStyle;
  /** Current map zoom; sizes the heatmap kernel to the grid spacing. */
  readonly zoom: number;
  /** Basemap brightness, so the hexagon hairlines stay visible on the dark map. */
  readonly theme: "light" | "dark";
  /** Focus plot: the plot's ring. Data is clipped to it and everything outside is dimmed. */
  readonly focusRing: readonly LngLat[] | null;
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

/** Fill for a cell from its value. `valueIndex` maps a drawn object to its slot in `values`. */
function fillColor<T>(
  id: LayerId,
  settings: LayerSettings,
  values: Float32Array,
  valueIndex: (object: T, index: number) => number,
) {
  const def = LAYERS[id];
  const alpha = Math.round(255 * settings.opacity);
  const muted = withOpacity(MUTED_CELL, settings.opacity);
  const [lo, hi] = settings.range;
  return (object: T, { index }: { index: number }): Rgba => {
    const value = values[valueIndex(object, index)];
    if (Number.isNaN(value)) return TRANSPARENT;
    if (value < lo || value > hi) return muted;
    const [r, g, b, a] = rampColor(def, value);
    return [r, g, b, Math.round((a * alpha) / 255)];
  };
}

/** Metres per screen pixel at the grid's latitude. */
function metresPerPixel(zoom: number): number {
  return (40_075_016.686 * Math.cos((GRID_LAT * Math.PI) / 180)) / (512 * 2 ** zoom);
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
  return Math.round(Math.min(100, Math.max(12, (GRID_SPACING_M / metresPerPixel(zoom)) * 2.5)));
}

type PieceLayerInput = {
  readonly id: string;
  readonly beforeId: string | undefined;
  readonly pieces: readonly ClippedCell[];
  readonly getFillColor: (piece: ClippedCell) => Rgba;
  /** Everything the fill depends on, so deck.gl recolors only when it changes. */
  readonly fillKey: readonly unknown[];
  readonly opacity: number;
  readonly theme: "light" | "dark";
  readonly borders: boolean;
  /** Columns: each piece's height as 0 to 1, and the height of 1 in metres. */
  readonly height?: { readonly get: (piece: ClippedCell) => number; readonly scale: number; readonly key: readonly unknown[] };
};

/** Cells or cut pieces of cells, filled by `getFillColor`; flat, or extruded when `height` is set. */
function pieceLayer({ id, beforeId, pieces, getFillColor, fillKey, opacity, theme, borders, height }: PieceLayerInput) {
  const props: PolygonLayerProps<ClippedCell> & Interleaved = {
    id,
    beforeId,
    data: pieces,
    getPolygon: (piece) => piece.polygon,
    filled: true,
    stroked: borders && !height,
    extruded: height !== undefined,
    getElevation: height ? height.get : 0,
    elevationScale: height ? height.scale : 1,
    getFillColor,
    getLineColor: withOpacity(theme === "dark" ? CELL_STROKE_DARK : CELL_STROKE, opacity),
    lineWidthUnits: "pixels",
    getLineWidth: 0.5,
    lineWidthMinPixels: 0.5,
    pickable: true,
    autoHighlight: true,
    highlightColor: [...CELL_HIGHLIGHT],
    updateTriggers: {
      getFillColor: fillKey,
      getElevation: height ? height.key : [],
      getLineColor: [opacity, theme],
    },
  };
  return new PolygonLayer<ClippedCell>(props);
}

/**
 * Builds the interleaved deck.gl layers: the active layer as hexagons or a heatmap, then the
 * country outline. Geometry stays the same between days; only `field.values` changes.
 */
export function buildDeckLayers({
  field,
  fieldB,
  score,
  mode,
  secondLayer,
  split,
  heightDomain,
  activeLayer,
  layerSettings,
  style,
  zoom,
  theme,
  focusRing,
  beforeId,
  display,
}: DeckLayerInput): Layer[] {
  const layers: Layer[] = [];

  if (focusRing) {
    layers.push(
      new SolidPolygonLayer<RingFeature>({
        id: DIM_LAYER_ID,
        beforeId,
        data: [{ polygon: [WORLD_RING, focusRing.map(([lng, lat]): LngLat => [lng, lat])] }],
        getPolygon: (f) => f.polygon.map((ring) => ring.map(([lng, lat]): LngLat => [lng, lat])),
        getFillColor: theme === "dark" ? DIM_DARK : DIM_LIGHT,
        pickable: false,
        updateTriggers: { getFillColor: [theme], getPolygon: [focusRing] },
      } as ConstructorParameters<typeof SolidPolygonLayer<RingFeature>>[0] & Interleaved),
    );
  }

  const pieceTheme = { beforeId, theme, borders: display.borders };
  /** What a combined view draws: the cells under the plot in focus, else the whole grid. */
  const piecesOf = (cells: readonly FieldCell[]) => (focusRing ? clipCellsToRing(cells, focusRing) : wholeCells(cells));
  const ringKey = focusRing ? JSON.stringify(focusRing) : "";

  if (mode === "score") {
    if (score && display.data) {
      const { cells, values, version } = score;
      layers.push(
        pieceLayer({
          ...pieceTheme,
          id: DATA_LAYER_ID,
          pieces: piecesOf(cells),
          getFillColor: (piece) => {
            const value = values[piece.index];
            return Number.isNaN(value) ? TRANSPARENT : rampColor(SCORE_SCALE, value);
          },
          fillKey: [version, ringKey],
          opacity: 1,
        }),
      );
    }
  } else if (mode !== "single" && activeLayer && field && fieldB && display.data) {
    const settings = layerSettings[activeLayer];
    const settingsB = layerSettings[secondLayer];
    const { cells, values, version } = field;
    const valuesB = fieldB.values;
    const pieces = piecesOf(cells);
    const fillA = fillColor<ClippedCell>(activeLayer, settings, values, (piece) => piece.index);
    const fillB = fillColor<ClippedCell>(secondLayer, settingsB, valuesB, (piece) => piece.index);
    const keyA = [activeLayer, version, settings.opacity, settings.range[0], settings.range[1], ringKey];
    const keyB = [secondLayer, fieldB.version, settingsB.opacity, settingsB.range[0], settingsB.range[1], ringKey];

    if (mode === "compare") {
      const sides = split ? splitPieces(pieces, split) : { left: pieces, right: [] };
      layers.push(
        pieceLayer({
          ...pieceTheme,
          id: DATA_LAYER_ID,
          pieces: sides.left,
          getFillColor: (piece) => fillA(piece, { index: 0 }),
          fillKey: keyA,
          opacity: settings.opacity,
        }),
        pieceLayer({
          ...pieceTheme,
          id: DATA_LAYER_B_ID,
          pieces: sides.right,
          getFillColor: (piece) => fillB(piece, { index: 0 }),
          fillKey: keyB,
          opacity: settingsB.opacity,
        }),
      );
    } else if (mode === "blend") {
      const alpha = settings.opacity / DEFAULT_OPACITY;
      layers.push(
        pieceLayer({
          ...pieceTheme,
          id: DATA_LAYER_ID,
          pieces,
          getFillColor: (piece) => {
            const a = values[piece.index];
            const b = valuesB[piece.index];
            if (Number.isNaN(a) || Number.isNaN(b)) return TRANSPARENT;
            return withOpacity(BLEND_COLORS[valueClass(secondLayer, b)][valueClass(activeLayer, a)], Math.min(1, alpha));
          },
          fillKey: [...keyA, ...keyB],
          opacity: settings.opacity,
        }),
      );
    } else {
      // Columns: the active layer is the height, the second layer the color.
      const [lo, hi] = heightDomain;
      layers.push(
        pieceLayer({
          ...pieceTheme,
          id: DATA_LAYER_ID,
          pieces,
          // Solid sides and tops: see-through columns show the ones behind them.
          getFillColor: (piece) => {
            const color = fillB(piece, { index: 0 });
            return color[3] === 0 ? color : [color[0], color[1], color[2], COLUMN_ALPHA];
          },
          fillKey: keyB,
          opacity: settingsB.opacity,
          height: {
            get: (piece) => {
              const value = values[piece.index];
              return Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
            },
            scale: COLUMN_MAX_PX * metresPerPixel(zoom),
            key: [activeLayer, version, ringKey, lo, hi],
          },
        }),
      );
    }
  } else if (mode === "single" && activeLayer && field && display.data) {
    const settings = layerSettings[activeLayer];
    const { cells, values, version } = field;

    if (focusRing) {
      // Focus: only the data under the plot, cut to its outline, in either style (inside a plot
      // the heatmap would be flat anyway).
      const focusProps: PolygonLayerProps<ClippedCell> & Interleaved = {
        id: DATA_LAYER_ID,
        beforeId,
        data: clipCellsToRing(cells, focusRing),
        getPolygon: (cell) => cell.polygon,
        filled: true,
        stroked: display.borders,
        getFillColor: fillColor<ClippedCell>(activeLayer, settings, values, (cell) => cell.index),
        getLineColor: withOpacity(theme === "dark" ? CELL_STROKE_DARK : CELL_STROKE, settings.opacity),
        lineWidthUnits: "pixels",
        getLineWidth: 0.5,
        lineWidthMinPixels: 0.5,
        pickable: true,
        updateTriggers: {
          getFillColor: [activeLayer, version, settings.opacity, settings.range[0], settings.range[1]],
          getLineColor: [settings.opacity, theme],
        },
      };
      layers.push(new PolygonLayer<ClippedCell>(focusProps));
    } else if (style === "heatmap") {
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
        getFillColor: fillColor<FieldCell>(activeLayer, settings, values, (_cell, index) => index),
        getLineColor: withOpacity(theme === "dark" ? CELL_STROKE_DARK : CELL_STROKE, settings.opacity),
        lineWidthUnits: "pixels",
        getLineWidth: 0.5,
        lineWidthMinPixels: 0.5,
        pickable: true,
        autoHighlight: true,
        highlightColor: [...CELL_HIGHLIGHT],
        updateTriggers: {
          getFillColor: [activeLayer, version, settings.opacity, settings.range[0], settings.range[1]],
          getLineColor: [settings.opacity, theme],
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
