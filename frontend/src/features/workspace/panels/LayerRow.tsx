"use client";

import { ChevronDown, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { LAYERS, isLiveLayer } from "../layers";
import { useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { DataStyle, LayerId } from "../types";
import { Badge } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";
import { Segmented } from "../ui/Segmented";
import { isDefaultSettings } from "./format";
import { Legend } from "./Legend";
import { OpacitySlider } from "./OpacitySlider";
import { RetryButton } from "./RetryButton";
import { PrecipTimeline } from "./PrecipTimeline";
import { RangeSlider } from "./RangeSlider";

/**
 * One data layer in the Browser. The eye toggle and the row label both switch the layer on/off
 * (only one layer is visible at a time); the visible layer expands to its legend and display
 * controls.
 */
export function LayerRow({ id }: { readonly id: LayerId }) {
  const { activeLayer, layerSettings, display, layerData, dataStyle } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const layer = LAYERS[id];
  const settings = layerSettings[id];
  const active = activeLayer === id;
  const name = t.common.layers[id];
  const detailsId = `layer-${id}-details`;
  const hintId = `layer-${id}-hint`;
  const optionsId = `layer-${id}-options`;
  const customized = !isDefaultSettings(layer, settings);
  const live = isLiveLayer(id);

  const toggle = () => dispatch({ type: "setActiveLayer", layer: active ? null : id });

  return (
    <li>
      <div
        className={`flex items-center gap-0.5 px-1.5 transition-colors duration-150 ${active ? "bg-surface-2" : ""}`}
      >
        <IconButton
          icon={active ? Eye : EyeOff}
          label={t.browser.showLayer(name)}
          pressed={active}
          size="sm"
          onClick={toggle}
        />
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={active}
          aria-controls={detailsId}
          aria-describedby={hintId}
          onClick={toggle}
          className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-surface-3"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-medium text-text">{name}</span>
              {live ? (
                <span title={t.browser.precip.badgeHint}>
                  <Badge tone="accent" className="px-1 py-0 text-[10px] tracking-wide">
                    {t.browser.precip.badge}
                  </Badge>
                </span>
              ) : null}
            </span>
            <span className="block truncate text-xs text-muted">{t.common.layerDescriptions[id]}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            strokeWidth={1.75}
            className={`size-4 shrink-0 text-muted transition-transform duration-200 ${active ? "rotate-180" : ""}`}
          />
        </button>
        <span id={hintId} hidden>
          {t.browser.rowHint}
        </span>
      </div>
      {/*
        Slides open by animating grid rows 0fr → 1fr (no height measuring). Collapsed details turn
        invisible after the slide, so they leave the tab order without cutting the animation.
      */}
      <div
        id={detailsId}
        className={`grid ${
          active
            ? "grid-rows-[1fr] [transition:grid-template-rows_250ms_cubic-bezier(0.2,0,0,1)]"
            : "invisible grid-rows-[0fr] [transition:grid-template-rows_250ms_cubic-bezier(0.2,0,0,1),visibility_0s_250ms]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-b border-line bg-surface-2 px-3 pb-3 pt-2">
            {live && layerData.status === "loading" ? (
              <p role="status" className="text-xs text-muted">
                {t.browser.precip.loading}
              </p>
            ) : null}
            {live && layerData.status === "error" ? (
              <div role="alert" className="flex items-start justify-between gap-2 text-xs">
                <p className="text-poor">{t.browser.precip.error}</p>
                <RetryButton onClick={layerData.retry} />
              </div>
            ) : null}
            {live ? <PrecipTimeline /> : null}
            <Segmented<DataStyle>
              label={t.browser.style}
              showLabel
              value={dataStyle}
              options={[
                { value: "hexagons", label: t.browser.styles.hexagons },
                { value: "heatmap", label: t.browser.styles.heatmap },
              ]}
              onChange={(style) => dispatch({ type: "setDataStyle", style })}
            />
            {display.legends ? <Legend layer={layer} range={settings.range} /> : null}
            {/* Display options: opacity and the value filter, folded away by default. */}
            <div className="border-t border-line pt-1">
              <button
                type="button"
                aria-expanded={optionsOpen}
                aria-controls={optionsId}
                onClick={() => setOptionsOpen((open) => !open)}
                className="flex min-h-9 max-lg:min-h-11 w-full cursor-pointer items-center gap-2 rounded-md text-left text-xs"
              >
                <span className="font-medium text-text">{t.browser.displayOptions}</span>
                <span className="ml-auto truncate text-muted">
                  {customized ? t.browser.displayOptionsCustomized : t.browser.displayOptionsHint}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={`size-4 shrink-0 text-muted transition-transform duration-200 ${optionsOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                id={optionsId}
                className={`grid ${
                  optionsOpen
                    ? "grid-rows-[1fr] [transition:grid-template-rows_200ms_cubic-bezier(0.2,0,0,1)]"
                    : "invisible grid-rows-[0fr] [transition:grid-template-rows_200ms_cubic-bezier(0.2,0,0,1),visibility_0s_200ms]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-3 pt-2">
                    <OpacitySlider
                      opacity={settings.opacity}
                      onChange={(opacity) => dispatch({ type: "setLayerOpacity", layer: id, opacity })}
                    />
                    {dataStyle === "hexagons" ? (
                      <RangeSlider
                        layer={layer}
                        range={settings.range}
                        onChange={(range) => dispatch({ type: "setLayerRange", layer: id, range })}
                      />
                    ) : null}
                    {customized ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          aria-label={t.browser.resetLayer(name)}
                          onClick={() => {
                            dispatch({ type: "resetLayer", layer: id });
                            triggerRef.current?.focus();
                          }}
                          className="inline-flex h-9 max-lg:h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
                        >
                          <RotateCcw aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                          {t.browser.reset}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
