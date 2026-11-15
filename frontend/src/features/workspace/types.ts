import type { Feature, Polygon } from "geojson";

/** Layers drawn from the simulated sample grid; these feed the crop assessment. */
export type SampleLayerId = "humidity" | "rain" | "soil";

/** Data layers shown in the Browser and on the map. All live NASA POWER data. */
export type LayerId = "precip";

/** Any layer with a definition: the visible layers plus the sample factors behind the crop outlook. */
export type AnyLayerId = SampleLayerId | LayerId;

export type Rgba = readonly [number, number, number, number];

export type LayerDef = {
  readonly id: AnyLayerId;
  /** Physical domain of the values: [min, max]. */
  readonly domain: readonly [number, number];
  readonly unit: string;
  /** Decimal places when formatting values. */
  readonly precision: number;
  /** Color stops from domain min → max, evenly spaced. 3–5 stops. */
  readonly ramp: readonly Rgba[];
};

export type LayerSettings = {
  /** 0..1 */
  readonly opacity: number;
  /** Inclusive visible value range inside the layer domain. Cells outside are muted. */
  readonly range: readonly [number, number];
};

/** One hexagon of the sample grid. Values are within each LayerDef.domain. */
export type GridCell = {
  readonly id: number;
  /** Closed ring, [lng, lat][] — first point repeated at end. */
  readonly polygon: readonly (readonly [number, number])[];
  readonly center: readonly [number, number];
  readonly values: Readonly<Record<SampleLayerId, number>>;
};

/** One cell of the drawn data grid. Geometry only; values come from a `DataField`. */
export type FieldCell = {
  readonly id: number;
  /** Closed ring, [lng, lat][]. */
  readonly polygon: readonly (readonly [number, number])[];
  readonly center: readonly [number, number];
};

/**
 * Values to draw on a fixed set of cells: `values[i]` belongs to `cells[i]`, NaN = no data.
 * `version` changes whenever the values do, so deck.gl only recomputes colors, never geometry.
 */
export type DataField = {
  readonly cells: readonly FieldCell[];
  readonly values: Float32Array;
  readonly version: number;
};

/** How the active layer is drawn. */
export type DataStyle = "hexagons" | "heatmap";

export type Tool = "pan" | "square" | "edit";

/** Things the Display card can show or hide. Order here is display order within each section. */
export type DisplayKey =
  | "data"
  | "borders"
  | "outline"
  | "labels"
  | "tooltips"
  | "pin"
  | "navBar"
  | "legends"
  | "limiting";

export type DisplaySettings = Readonly<Record<DisplayKey, boolean>>;

/** What the right-hand card shows: the plot's results, or the Display switches. */
export type InspectorView = "results" | "display";

export type Basemap = "map" | "satellite";

export type PlotFeature = Feature<Polygon>;

export type PlotSummary = {
  readonly areaHa: number;
  /** [lng, lat] */
  readonly centroid: readonly [number, number];
};

export type CropId = "corn" | "beans" | "sorghum";

export type Rating = "good" | "fair" | "poor";

export type FactorScore = {
  readonly layer: SampleLayerId;
  /** Mean sampled value over the plot, in layer units. */
  readonly value: number;
  /** 0..100: how close the value is to the crop's ideal band. */
  readonly score: number;
  /** Where the value sits relative to the crop's ideal band. */
  readonly position: "below" | "within" | "above";
};

export type CropAssessment = {
  readonly crop: CropId;
  /** 0..100, integer. */
  readonly score: number;
  readonly rating: Rating;
  /** Same order as LAYER_ORDER. */
  readonly factors: readonly FactorScore[];
  /** The factor with the lowest score (null when every factor is within its ideal band). */
  readonly limiting: SampleLayerId | null;
};

export type Assessment =
  | { readonly kind: "ok"; readonly cellsSampled: number; readonly crops: readonly CropAssessment[] }
  | { readonly kind: "outside" };

export type AnalysisState =
  | { readonly status: "idle" }
  | { readonly status: "running" }
  | { readonly status: "done"; readonly result: Assessment };

export type ViewState = {
  readonly bearing: number;
  readonly pitch: number;
  readonly zoom: number;
};

/** Imperative camera API the map registers so chrome (nav bar, ribbon) can drive it. */
export type MapController = {
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;
  readonly resetNorth: () => void;
  /** Fly back to the initial El Salvador view. */
  readonly resetView: () => void;
  /** Fit the camera to the current plot, if any. */
  readonly focusPlot: () => void;
  /** Fly to a point ([lng, lat]), zooming in to at least street-level detail. */
  readonly goTo: (lngLat: readonly [number, number]) => void;
};
