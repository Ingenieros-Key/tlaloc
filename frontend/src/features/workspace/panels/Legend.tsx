import { rampGradient } from "../layers";
import { t } from "../strings";
import type { LayerDef } from "../types";
import { formatWithUnit } from "./format";

/** Domain ends are round numbers, so they read "0 mm", not "0.0 mm". */
export function formatLegendEnd(layer: LayerDef, value: number): string {
  return Number.isInteger(value) ? t.inspector.withUnit(value.toLocaleString("en-US"), layer.unit) : formatWithUnit(layer, value);
}

/**
 * Color ramp for a layer with numeric min/max labels (the labels, not the gradient, carry the
 * meaning). The part of the ramp outside the active range filter is dimmed, mirroring the map.
 */
export function Legend({
  layer,
  range,
  title = t.browser.legend,
}: {
  readonly layer: LayerDef;
  readonly range: readonly [number, number];
  /** Heading above the ramp; combined views name the layer and its role here. */
  readonly title?: string;
}) {
  const [min, max] = layer.domain;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <p className="text-xs text-muted">{title}</p>
      <div
        aria-hidden="true"
        className="relative mt-1.5 h-2.5 overflow-hidden rounded-sm ring-1 ring-inset ring-line"
        style={{ backgroundImage: rampGradient(layer) }}
      >
        <div className="absolute inset-y-0 left-0 bg-surface/80" style={{ width: `${pct(range[0])}%` }} />
        <div className="absolute inset-y-0 right-0 bg-surface/80" style={{ width: `${100 - pct(range[1])}%` }} />
      </div>
      <div className="mt-1 flex justify-between gap-2 font-mono text-xs text-muted tabular">
        <span>{formatLegendEnd(layer, min)}</span>
        <span>{formatLegendEnd(layer, max)}</span>
      </div>
    </div>
  );
}
