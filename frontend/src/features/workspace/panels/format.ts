import { DEFAULT_LAYER_OPACITY, formatValue } from "../layers";
import { t } from "../strings";
import type { LayerDef, LayerSettings } from "../types";

const M2_PER_HA = 10_000;

/** "12.4 ha" — one decimal, en-US grouping. */
export function formatHectares(areaHa: number): string {
  const value = areaHa.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return t.inspector.withUnit(value, t.inspector.units.hectares);
}

/** "8,420 m²" — whole square metres. */
export function formatSquareMeters(areaHa: number): string {
  const value = Math.round(areaHa * M2_PER_HA).toLocaleString("en-US");
  return t.inspector.withUnit(value, t.inspector.units.squareMeters);
}

/** "13.7012° N, 88.9010° W" from a [lng, lat] pair. */
export function formatCentroid([lng, lat]: readonly [number, number]): string {
  const { north, south, east, west } = t.inspector.hemispheres;
  const deg = (v: number) =>
    Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const latText = t.inspector.coordinate(deg(lat), lat >= 0 ? north : south);
  const lngText = t.inspector.coordinate(deg(lng), lng >= 0 ? east : west);
  return `${latText}, ${lngText}`;
}

/** Layer value with its unit, e.g. "1,850 mm/yr". */
export function formatWithUnit(layer: LayerDef, value: number): string {
  return t.inspector.withUnit(formatValue(layer, value), layer.unit);
}

/**
 * Slider step for a layer: a 1/2/5 × 10^k value near 1% of the domain width, never finer than the
 * layer's display precision (humidity 1, rainfall 10, soil 1).
 */
export function rangeStep(layer: LayerDef): number {
  const [min, max] = layer.domain;
  const raw = (max - min) / 100;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
  return Math.max(10 ** -layer.precision, nice * magnitude);
}

/** True when opacity and range match what the store sets on load / reset. */
export function isDefaultSettings(layer: LayerDef, settings: LayerSettings): boolean {
  return (
    settings.opacity === DEFAULT_LAYER_OPACITY &&
    settings.range[0] === layer.domain[0] &&
    settings.range[1] === layer.domain[1]
  );
}
