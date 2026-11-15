import type { Feature, Polygon } from "geojson";

/** Data layers the user can inspect. Order here is display order in the Browser. */
export type LayerId = "humidity" | "rain" | "soil";

export type Rgba = readonly [number, number, number, number];

export type LayerDef = {
  readonly id: LayerId;
  /** Physical domain of the sample values: [min, max]. */
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
  readonly values: Readonly<Record<LayerId, number>>;
};

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
  readonly layer: LayerId;
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
  readonly limiting: LayerId | null;
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
