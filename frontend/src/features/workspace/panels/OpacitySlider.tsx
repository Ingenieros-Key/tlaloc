"use client";

import { useId, type CSSProperties } from "react";
import { t } from "../strings";
import styles from "./sliders.module.css";

type FillStyle = CSSProperties & { readonly "--pct": number };

/** Labelled 0–100% opacity slider (step 5) with a live numeric readout. */
export function OpacitySlider({
  opacity,
  onChange,
}: {
  /** 0..1 */
  readonly opacity: number;
  readonly onChange: (opacity: number) => void;
}) {
  const id = useId();
  const pct = Math.round(opacity * 100);
  const readout = t.browser.percent(pct);
  const style: FillStyle = { "--pct": pct / 100 };

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="text-muted">
          {t.browser.opacity}
        </label>
        <output htmlFor={id} className="tabular font-mono text-text">
          {readout}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.currentTarget.value) / 100)}
        className={styles.slider}
        style={style}
      />
    </div>
  );
}
