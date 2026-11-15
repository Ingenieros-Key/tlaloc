"use client";

import { ArrowLeftRight, Blend, ChartColumn, Hexagon, Sprout, SquareSplitHorizontal, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { CROP_ORDER } from "../data/crops";
import { heightDomain } from "../data/precip";
import {
  BLEND_COLORS,
  LAYERS,
  LAYER_BREAKS,
  LAYER_ORDER,
  SCORE_SCALE,
  isTwoLayerMode,
  rampGradient,
} from "../layers";
import { useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { CropId, LayerId, ViewMode } from "../types";
import { IconButton } from "../ui/IconButton";
import { Segmented } from "../ui/Segmented";
import { Legend, formatLegendEnd } from "./Legend";
import { PrecipTimeline } from "./PrecipTimeline";
import { RetryButton } from "./RetryButton";

const s = t.browser.view;

/** One icon per view mode, shared by the tool rail. */
export const MODE_ICONS: Readonly<Record<ViewMode, LucideIcon>> = {
  single: Hexagon,
  compare: SquareSplitHorizontal,
  blend: Blend,
  columns: ChartColumn,
  score: Sprout,
};

type TwoLayerMode = keyof typeof s.roles;

/**
 * The active view mode's controls, shown in the tool rail's flyout: a line saying what the view
 * does, then, for the views that combine layers, which layers, the timeframe and the legend. The
 * single-layer view lists its layers below this (see `BrowserPanel`).
 */
export function ViewControls() {
  const { viewMode } = useWorkspace();
  return (
    <>
      <p className="px-3 pt-2.5 text-xs leading-snug text-muted">{s.hints[viewMode]}</p>
      {isTwoLayerMode(viewMode) ? <TwoLayerControls mode={viewMode as TwoLayerMode} /> : null}
      {viewMode === "score" ? <ScoreControls /> : null}
    </>
  );
}

/** Compare, Blend and Columns: the two layers and their roles, the timeframe and the legend. */
function TwoLayerControls({ mode }: { readonly mode: TwoLayerMode }) {
  const { activeLayer, secondLayer, layerData, layerDataB, layerSettings, display } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const [firstRole, secondRole] = s.roles[mode];
  if (activeLayer === null) return null;

  const first = LAYERS[activeLayer];
  const second = LAYERS[secondLayer];
  const firstName = t.common.layers[activeLayer];
  const secondName = t.common.layers[secondLayer];
  const loading = layerData.status === "loading" || layerDataB.status === "loading";
  const [heightMin, heightMax] = heightDomain(
    activeLayer,
    first.domain,
    layerData.status === "ready" ? layerData.frames : null,
  );
  const failed = [layerData, layerDataB].filter((data) => data.status === "error");

  return (
    <div className="mt-3 space-y-3 border-t border-line bg-surface-2 px-3 pb-3 pt-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-1">
        <LayerSelect
          label={firstRole}
          value={activeLayer}
          onChange={(layer) => dispatch({ type: "setActiveLayer", layer })}
        />
        <IconButton icon={ArrowLeftRight} label={s.swap} size="sm" onClick={() => dispatch({ type: "swapLayers" })} />
        <LayerSelect
          label={secondRole}
          value={secondLayer}
          onChange={(layer) => dispatch({ type: "setSecondLayer", layer })}
        />
      </div>
      {loading ? (
        <p role="status" className="text-xs text-muted">
          {t.browser.precip.loading}
        </p>
      ) : null}
      {failed.length > 0 ? (
        <div role="alert" className="flex items-start justify-between gap-2 text-xs">
          <p className="text-poor">{t.browser.precip.error}</p>
          <RetryButton
            onClick={() => {
              for (const data of failed) if (data.status === "error") data.retry();
            }}
          />
        </div>
      ) : null}
      <PrecipTimeline />
      {display.legends ? (
        mode === "blend" ? (
          <BlendLegend first={activeLayer} second={secondLayer} />
        ) : mode === "compare" ? (
          <>
            <Legend layer={first} range={layerSettings[activeLayer].range} title={s.legendOf(firstRole, firstName)} />
            <Legend layer={second} range={layerSettings[secondLayer].range} title={s.legendOf(secondRole, secondName)} />
          </>
        ) : (
          <>
            <Legend layer={second} range={layerSettings[secondLayer].range} title={s.legendOf(secondRole, secondName)} />
            <p className="text-xs text-muted">
              {s.height(firstName, formatLegendEnd(first, heightMin), formatLegendEnd(first, heightMax))}
            </p>
          </>
        )
      ) : null}
    </div>
  );
}

/** A labelled native select of the four layers: reliable on touch and with a keyboard. */
function LayerSelect({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: LayerId;
  readonly onChange: (layer: LayerId) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-[11px] text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value as LayerId)}
        className="mt-0.5 h-9 max-lg:h-11 w-full min-w-0 cursor-pointer rounded-md border border-input bg-surface px-1 text-xs text-text"
      >
        {LAYER_ORDER.map((layer) => (
          <option key={layer} value={layer}>
            {t.common.layers[layer]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Blend's 3 × 3 key: the first layer runs left to right, the second bottom to top. The breaks
 * between low, mid and high are written out underneath, so the colors are never the only cue.
 */
function BlendLegend({ first, second }: { readonly first: LayerId; readonly second: LayerId }) {
  const firstName = t.common.layers[first];
  const secondName = t.common.layers[second];
  const breaks = (layer: LayerId) =>
    s.breaks(
      t.common.layers[layer],
      formatLegendEnd(LAYERS[layer], LAYER_BREAKS[layer][0]),
      formatLegendEnd(LAYERS[layer], LAYER_BREAKS[layer][1]),
    );
  return (
    <div>
      <p className="text-xs text-muted">{t.browser.legend}</p>
      <div className="mt-1.5 flex items-stretch gap-1.5">
        <span
          aria-hidden="true"
          className="rotate-180 whitespace-nowrap text-center text-[11px] text-muted [writing-mode:vertical-rl]"
        >
          {s.axis(secondName)}
        </span>
        <div>
          <div
            role="img"
            aria-label={s.blendLabel(firstName, secondName)}
            className="grid w-[120px] grid-cols-3 gap-px overflow-hidden rounded-sm ring-1 ring-line"
          >
            {[2, 1, 0].flatMap((b) =>
              [0, 1, 2].map((a) => {
                const [r, g, bl] = BLEND_COLORS[b][a];
                return <span key={`${b}-${a}`} className="h-7" style={{ backgroundColor: `rgb(${r} ${g} ${bl})` }} />;
              }),
            )}
          </div>
          <p aria-hidden="true" className="mt-1 text-center text-[11px] text-muted">
            {s.axis(firstName)}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted">{breaks(first)}</p>
      <p className="text-[11px] leading-snug text-muted">{breaks(second)}</p>
    </div>
  );
}

/** Crop score: which crop, the state of the 12-month request, and the score ramp. */
function ScoreControls() {
  const { scoreCrop, scoreData, display } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  return (
    <div className="mt-3 space-y-3 border-t border-line bg-surface-2 px-3 pb-3 pt-3">
      <Segmented<CropId>
        label={s.crop}
        value={scoreCrop}
        options={CROP_ORDER.map((crop) => ({ value: crop, label: t.common.crops[crop] }))}
        onChange={(crop) => dispatch({ type: "setScoreCrop", crop })}
      />
      {scoreData.status === "loading" ? (
        <p role="status" className="text-xs text-muted">
          {s.scoreLoading}
        </p>
      ) : null}
      {scoreData.status === "error" ? (
        <div role="alert" className="flex items-start justify-between gap-2 text-xs">
          <p className="text-poor">{t.browser.precip.error}</p>
          <RetryButton onClick={scoreData.retry} />
        </div>
      ) : null}
      {display.legends ? (
        <div>
          <p className="text-xs text-muted">{s.scoreLegend}</p>
          <div
            aria-hidden="true"
            className="mt-1.5 h-2.5 rounded-sm ring-1 ring-inset ring-line"
            style={{ backgroundImage: rampGradient(SCORE_SCALE) }}
          />
          <div className="mt-1 flex justify-between gap-2 text-[11px] text-muted">
            <span>{s.scoreEnds.poor}</span>
            <span>{s.scoreEnds.fair}</span>
            <span>{s.scoreEnds.good}</span>
          </div>
        </div>
      ) : null}
      <p className="text-[11px] leading-snug text-muted">{s.scoreNote}</p>
    </div>
  );
}
