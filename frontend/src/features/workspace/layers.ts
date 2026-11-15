import type { LayerDef, LayerId, LayerSettings, Rgba } from "./types";

export const LAYER_ORDER: readonly LayerId[] = ["humidity", "rain", "soil"];

/** Sample-data layer definitions. Ramps are tuned for the dark basemap. */
export const LAYERS: Readonly<Record<LayerId, LayerDef>> = {
  humidity: {
    id: "humidity",
    domain: [40, 95],
    unit: "%",
    precision: 0,
    ramp: [
      [30, 42, 120, 255],
      [43, 58, 158, 255],
      [60, 120, 216, 255],
      [126, 196, 255, 255],
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
export const MUTED_CELL: Rgba = [154, 163, 199, 28];

/** Linear interpolation across a layer ramp. `value` is clamped to the domain. */
export function rampColor(layer: LayerDef, value: number): Rgba {
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
export function rampGradient(layer: LayerDef): string {
  const parts = layer.ramp.map(
    (c, i) => `rgb(${c[0]} ${c[1]} ${c[2]}) ${Math.round((i / (layer.ramp.length - 1)) * 100)}%`,
  );
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

export function formatValue(layer: LayerDef, value: number): string {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: layer.precision,
    minimumFractionDigits: layer.precision,
  });
}
