import type { AnyLayerId, FactorId, LayerDef, LayerId, LayerSettings, Rgba, SampleLayerId, ViewMode } from "./types";

/** Sample-grid layers, in the order the crop assessment lists its factors. */
export const SAMPLE_LAYER_ORDER: readonly SampleLayerId[] = ["humidity", "rain", "soil"];

/** Layers listed in the Browser and drawable on the map, in Browser order. */
export const LAYER_ORDER: readonly LayerId[] = ["precip", "temp", "humidity", "moisture"];

/** Crop outlook factors, in the order its cards list them. */
export const FACTOR_ORDER: readonly FactorId[] = ["temp", "humidity", "rain", "soil"];

/** Layers whose values come from a live API instead of the sample grid (all Browser layers). */
export function isLiveLayer(id: AnyLayerId): id is LayerId {
  return (LAYER_ORDER as readonly string[]).includes(id);
}

/**
 * Layer definitions. The sample ones are no longer drawn, but still give the crop outlook its
 * domains, units and labels.
 */
export const LAYERS: Readonly<Record<AnyLayerId, LayerDef>> = {
  // NASA POWER RH2M, daily (and the outlook's 12-month mean). Sand → teal, so it never reads as
  // rainfall's blue-violet. Dry-season days sit in the 50s, rainy-season days near 90.
  humidity: {
    id: "humidity",
    domain: [40, 100],
    unit: "%",
    precision: 0,
    ramp: [
      [214, 196, 150, 110],
      [120, 190, 170, 180],
      [40, 150, 160, 225],
      [20, 90, 120, 255],
    ],
  },
  // NASA POWER T2M, daily mean air temperature (the outlook uses its 12-month mean). Highlands
  // around 18 °C, the coast above 30 °C. Pale yellow → deep red.
  temp: {
    id: "temp",
    domain: [15, 35],
    unit: "°C",
    precision: 1,
    ramp: [
      [255, 237, 160, 120],
      [254, 178, 76, 190],
      [240, 59, 32, 225],
      [150, 20, 45, 255],
    ],
  },
  // NASA POWER GWETROOT: root-zone soil wetness, 0 (dry) to 1 (saturated), shown as a percentage.
  // Brown → green → teal.
  moisture: {
    id: "moisture",
    domain: [0, 100],
    unit: "%",
    precision: 0,
    ramp: [
      [166, 97, 26, 170],
      [223, 194, 125, 190],
      [128, 205, 193, 220],
      [1, 133, 113, 255],
    ],
  },
  rain: {
    id: "rain",
    domain: [1200, 2400],
    unit: "mm/yr",
    precision: 0,
    ramp: [
      [8, 58, 66, 255],
      [10, 114, 104, 255],
      [31, 200, 180, 255],
      [214, 246, 236, 255],
    ],
  },
  // NASA POWER PRECTOTCORR for one day. Dry cells stay faint (but visible, so the layer still reads
  // as on) and rain events stand out on either basemap; heavy rainy-season days reach 40-60 mm.
  precip: {
    id: "precip",
    domain: [0, 40],
    unit: "mm",
    precision: 1,
    ramp: [
      [120, 200, 240, 72],
      [64, 160, 222, 170],
      [30, 100, 220, 225],
      [96, 64, 204, 255],
    ],
  },
  soil: {
    id: "soil",
    domain: [0, 100],
    unit: "index",
    precision: 0,
    ramp: [
      [228, 87, 46, 255],
      [246, 185, 59, 255],
      [93, 187, 99, 255],
    ],
  },
};

/** Opacity every layer starts with and returns to on reset. */
export const DEFAULT_LAYER_OPACITY = 0.7;

/** Settings a layer starts with and returns to on reset: default opacity, full domain. */
export function defaultLayerSettings(layer: LayerId): LayerSettings {
  return { opacity: DEFAULT_LAYER_OPACITY, range: LAYERS[layer].domain };
}

/** Color for cells whose value falls outside the user's range filter. */
export const MUTED_CELL: Rgba = [158, 176, 204, 28];

/** A value scale: what `rampColor` and `rampGradient` need of a layer. */
export type ColorScale = Pick<LayerDef, "domain" | "ramp">;

/** View modes, in the order the Browser lists them. */
export const VIEW_MODES: readonly ViewMode[] = ["single", "compare", "blend", "columns", "score"];

/** Modes that draw the active layer together with a second one. */
export function isTwoLayerMode(mode: ViewMode): boolean {
  return mode === "compare" || mode === "blend" || mode === "columns";
}

/**
 * Where each layer's values turn from low to mid and from mid to high in the Blend view. Fixed, so
 * a class means the same thing every day: under 1 mm is a dry day and over 10 mm a wet one; the
 * highlands sit under 22 °C and the coast over 28 °C; dry-season air is under 60 % and rainy-season
 * air over 80 %; soil under 40 % is dry and over 70 % wet.
 */
export const LAYER_BREAKS: Readonly<Record<LayerId, readonly [number, number]>> = {
  precip: [1, 10],
  temp: [22, 28],
  humidity: [60, 80],
  moisture: [40, 70],
};

/** 0 = low, 1 = mid, 2 = high, by the layer's Blend breaks. */
export function valueClass(layer: LayerId, value: number): 0 | 1 | 2 {
  const [low, high] = LAYER_BREAKS[layer];
  return value < low ? 0 : value <= high ? 1 : 2;
}

/**
 * Blend colors: `BLEND_COLORS[second][first]`, each index a class (low, mid, high). The first layer
 * runs grey to blue, the second grey to orange, and the classes also differ in lightness so they
 * do not rely on hue alone.
 */
export const BLEND_COLORS: readonly (readonly Rgba[])[] = [
  [
    [217, 217, 217, 235],
    [169, 207, 224, 235],
    [79, 159, 208, 235],
  ],
  [
    [242, 210, 122, 235],
    [184, 176, 143, 235],
    [63, 127, 154, 235],
  ],
  [
    [232, 89, 26, 235],
    [181, 86, 60, 235],
    [122, 74, 156, 235],
  ],
];

/** Crop score, 0 to 100: dark rust (poor) through amber (fair) to light green (good). */
export const SCORE_SCALE: ColorScale = {
  domain: [0, 100],
  ramp: [
    [122, 59, 46, 235],
    [217, 164, 65, 235],
    [155, 226, 143, 240],
  ],
};

/** Linear interpolation across a layer ramp. `value` is clamped to the domain. */
export function rampColor(layer: ColorScale, value: number): Rgba {
  const [min, max] = layer.domain;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const stops = layer.ramp;
  const scaled = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    Math.round(a[3] + (b[3] - a[3]) * f),
  ];
}

/** CSS linear-gradient for legends, left → right = domain min → max. */
export function rampGradient(layer: ColorScale): string {
  const parts = layer.ramp.map(
    (c, i) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${(c[3] / 255).toFixed(2)}) ${Math.round((i / (layer.ramp.length - 1)) * 100)}%`,
  );
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function formatValue(layer: LayerDef, value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: layer.precision,
    minimumFractionDigits: layer.precision,
  });
}
