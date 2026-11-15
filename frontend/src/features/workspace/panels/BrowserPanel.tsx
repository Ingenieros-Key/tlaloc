"use client";

import { Square } from "lucide-react";
import { LAYER_ORDER } from "../layers";
import { focusMapCanvas } from "../map/focus";
import { useMapController, usePanelCollapse, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import { Panel, PanelGroup } from "../ui/Panel";
import { formatHectares } from "./format";
import { LayerRow } from "./LayerRow";

/** Left "Browser" panel: the drawn plot and the sample data layers (one visible at a time). */
export function BrowserPanel() {
  const collapse = usePanelCollapse("browser", t.browser.title);
  return (
    <Panel
      title={t.browser.title}
      labelledBy="browser-title"
      collapse={collapse}
      className="h-full"
    >
      <PlotsGroup />
      <PanelGroup label={t.browser.layers} count={LAYER_ORDER.length}>
        <ul>
          {LAYER_ORDER.map((id) => (
            <LayerRow key={id} id={id} />
          ))}
        </ul>
      </PanelGroup>
    </Panel>
  );
}

function PlotsGroup() {
  const { plotSummary } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const { get } = useMapController();

  return (
    <PanelGroup label={t.browser.plots} count={plotSummary ? 1 : 0}>
      {plotSummary ? (
        <ul className="px-1.5">
          <li>
            <button
              type="button"
              title={t.browser.focusPlotHint}
              onClick={() => get()?.focusPlot()}
              className="flex min-h-9 max-lg:min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors duration-150 hover:bg-surface-3"
            >
              <Square aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.browser.plotName}</span>
              <span className="tabular font-mono text-xs text-muted">{formatHectares(plotSummary.areaHa)}</span>
            </button>
          </li>
        </ul>
      ) : (
        <div className="flex items-center justify-between gap-2 pl-3 pr-1.5">
          <p className="text-[13px] text-muted">{t.browser.noPlot}</p>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "setTool", tool: "square" });
              dispatch({ type: "setPanel", panel: "browser", open: false });
              focusMapCanvas();
            }}
            className="inline-flex h-9 max-lg:h-11 cursor-pointer items-center rounded-md px-2 text-[13px] font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
          >
            {t.browser.drawSquare}
          </button>
        </div>
      )}
    </PanelGroup>
  );
}
