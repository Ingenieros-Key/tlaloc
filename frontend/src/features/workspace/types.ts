import type { Feature, Polygon } from "geojson";

/** Layers drawn from the simulated sample grid; these feed the crop assessment. */
export type SampleLayerId = "humidity" | "rain" | "soil";

/** Daily data layers from NASA POWER. */
export type PowerLayerId = "precip" | "temp" | "humidity" | "moisture";

/** Data layers shown in the Browser and on the map: the daily POWER layers plus static elevation. */
export type LayerId = PowerLayerId | "elevation";

/** What the crop viability model scores: elevation (NASA SRTM) and NASA POWER climate. */
export type FactorId = "elevation" | "temp" | "rain" | "humidity";

/** Any layer with a definition: the visible layers plus the factors behind the crop outlook. */
export type AnyLayerId = SampleLayerId | LayerId | FactorId;

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

/**
 * What the map draws. "single": one layer. "compare": two layers either side of a divider.
 * "blend": two layers as one color from a 3 × 3 matrix. "columns": one layer as height, another as
 * color. "score": the crop outlook for every cell.
 */
export type ViewMode = "single" | "compare" | "blend" | "columns" | "score";

export type Tool = "pan" | "square" | "edit";

/** Things the Display card can show or hide. Order here is display order within each section. */
export type DisplayKey =
  | "data"
  | "borders"
  | "outline"
  | "labels"
  | "tooltips"
  | "pin"
  | "plotLabel"
  | "timeline"
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

export type CropId = "corn" | "beans" | "sorghum" | "sugarcane";

export type Rating = "good" | "fair" | "poor";

export type FactorScore = {
  readonly layer: FactorId;
  /** Mean sampled value over the plot, in layer units. */
  readonly value: number;
  /** 0..100: the viability model's aptitude for this value (100 inside the optimum band). */
  readonly score: number;
  /** Where the value sits relative to the crop's optimum band. */
  readonly position: "below" | "within" | "above";
  /** Where the value came from: NASA (POWER climate, SRTM elevation), or the simulated sample grid. */
  readonly source: FactorSource;
};

export type FactorSource = "nasa" | "sample";

export type CropAssessment = {
  readonly crop: CropId;
  /** 0..100, integer. */
  readonly score: number;
  readonly rating: Rating;
  /** Same order as LAYER_ORDER. */
  readonly factors: readonly FactorScore[];
  /** The factor with the lowest score (null when every factor is within its ideal band). */
  readonly limiting: FactorId | null;
  /**
   * The same crop scored on each year behind the average, oldest first (plot outlook only), to show
   * how steady the fit is. Years missing a value are left out.
   */
  readonly years?: readonly YearScore[];
  /** The crop scored on every month of those years, each on its rolling 12 months (plot outlook only). */
  readonly months?: readonly MonthScore[];
};

export type YearScore = { readonly year: number; readonly score: number; readonly rating: Rating };

/** A month's score on its rolling 12-month climate; null when a value is missing. `month` is 1–12. */
export type MonthScore = { readonly year: number; readonly month: number; readonly score: number | null };

export type Assessment =
  | { readonly kind: "ok"; readonly cellsSampled: number; readonly crops: readonly CropAssessment[] }
  | { readonly kind: "outside" }
  /** NASA had no value for these factors at the plot, and the model needs all four. */
  | { readonly kind: "missing"; readonly missing: readonly FactorId[] };

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
