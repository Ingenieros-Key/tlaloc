"use client";

import { ChevronDown, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useRef } from "react";
import { LAYERS } from "../layers";
import { useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { LayerId } from "../types";
import { IconButton } from "../ui/IconButton";
import { isDefaultSettings } from "./format";
import { Legend } from "./Legend";
import { OpacitySlider } from "./OpacitySlider";
import { RangeSlider } from "./RangeSlider";

/**
 * One data layer in the Browser. The eye toggle and the row label both switch the layer on/off
 * (only one layer is visible at a time); the visible layer expands to its legend and display
 * controls.
 */
export function LayerRow({ id }: { readonly id: LayerId }) {
  const { activeLayer, layerSettings } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const layer = LAYERS[id];
  const settings = layerSettings[id];
  const active = activeLayer === id;
  const name = t.common.layers[id];
  const detailsId = `layer-${id}-details`;
  const hintId = `layer-${id}-hint`;
  const customized = !isDefaultSettings(layer, settings);

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
            <span className="block truncate text-[13px] font-medium text-text">{name}</span>
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
      <div
        id={detailsId}
        hidden={!active}
        className="space-y-3 border-b border-line bg-surface-2 px-3 pb-3 pt-2"
      >
        <Legend layer={layer} range={settings.range} />
        <OpacitySlider
          opacity={settings.opacity}
          onChange={(opacity) => dispatch({ type: "setLayerOpacity", layer: id, opacity })}
        />
        <RangeSlider
          layer={layer}
          range={settings.range}
          onChange={(range) => dispatch({ type: "setLayerRange", layer: id, range })}
        />
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
    </li>
  );
}
