"use client";

import { useId, useState } from "react";
import { formatValue } from "../layers";
import { t } from "../strings";
import type { LayerDef } from "../types";
import { formatWithUnit, rangeStep } from "./format";
import styles from "./sliders.module.css";

/**
 * Dual-thumb value-range filter built from two overlaid native range inputs, so each thumb keeps
 * native keyboard support (arrows, Page Up/Down, Home/End). Thumbs never cross: min ≤ max − step.
 * The thumb used last stays on top, so a thumb pushed against the other can always be dragged back.
 */
export function RangeSlider({
  layer,
  range,
  onChange,
}: {
  readonly layer: LayerDef;
  readonly range: readonly [number, number];
  readonly onChange: (range: readonly [number, number]) => void;
}) {
  const labelId = useId();
  const hintId = useId();
  const name = t.common.layers[layer.id];
  const step = rangeStep(layer);
  const [domainMin, domainMax] = layer.domain;
  const [lo, hi] = range;
  const span = domainMax - domainMin;
  const pct = (v: number) => ((v - domainMin) / span) * 100;
  const snap = (v: number) => Number(v.toFixed(layer.precision));
  const [top, setTop] = useState<"min" | "max">("max");
  const minOnTop = top === "min";

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hintId}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span id={labelId} className="text-muted">
          {t.browser.valueRange}
        </span>
        <span className="tabular font-mono text-text">
          {t.browser.rangeReadout(formatValue(layer, lo), formatValue(layer, hi), layer.unit)}
        </span>
      </div>
      <div className="relative h-7 max-lg:h-11">
        <div
          aria-hidden="true"
          className="absolute inset-x-3.5 top-1/2 max-lg:inset-x-[22px] h-1 -translate-y-1/2 rounded-full bg-line-strong"
        >
          <div
            className="absolute inset-y-0 rounded-full bg-accent"
            style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
          />
        </div>
        <input
          type="range"
          min={domainMin}
          max={domainMax}
          step={step}
          value={lo}
          aria-label={t.browser.minimumOf(name)}
          aria-valuetext={formatWithUnit(layer, lo)}
          onPointerDown={() => setTop("min")}
          onFocus={() => setTop("min")}
          onChange={(e) => {
            setTop("min");
            onChange([snap(Math.min(Number(e.currentTarget.value), hi - step)), hi]);
          }}
          className={styles.dualInput}
          style={{ zIndex: minOnTop ? 2 : 1 }}
        />
        <input
          type="range"
          min={domainMin}
          max={domainMax}
          step={step}
          value={hi}
          aria-label={t.browser.maximumOf(name)}
          aria-valuetext={formatWithUnit(layer, hi)}
          onPointerDown={() => setTop("max")}
          onFocus={() => setTop("max")}
          onChange={(e) => {
            setTop("max");
            onChange([lo, snap(Math.max(Number(e.currentTarget.value), lo + step))]);
          }}
          className={styles.dualInput}
          style={{ zIndex: minOnTop ? 1 : 2 }}
        />
      </div>
      <p id={hintId} className="text-xs text-muted">
        {t.browser.rangeHint}
      </p>
    </div>
  );
}
