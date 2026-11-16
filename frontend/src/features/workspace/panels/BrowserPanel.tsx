"use client";

import { Pencil, Square } from "lucide-react";
import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { LAYER_ORDER } from "../layers";
import { focusMapCanvas } from "../map/focus";
import { PLOT_NAME_MAX, useMapController, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import { IconButton } from "../ui/IconButton";
import { Panel, PanelGroup } from "../ui/Panel";
import { formatHectares } from "./format";
import { LayerRow } from "./LayerRow";
import { SavedPlots } from "./SavedPlots";
import { ViewControls } from "./ViewGroup";

/**
 * The tool rail's flyout (a drawer below lg): the section its pressed tool belongs to. "Plots"
 * holds the drawn plot; a view mode holds its controls, and the single-layer view adds the NASA
 * POWER layer list (one visible at a time). At lg and up it is only as tall as its content.
 */
export function BrowserPanel() {
  const { viewMode, browserSection } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const plots = browserSection === "plots";
  return (
    <Panel
      title={plots ? t.browser.plots : t.browser.view.modeNames[viewMode]}
      labelledBy="browser-title"
      close={{
        label: t.chrome.closePanel,
        onClose: () => {
          dispatch({ type: "setPanel", panel: "browser", open: false });
          dispatch({ type: "setCollapsed", panel: "browser", collapsed: true });
        },
      }}
      className="lg:flex-[0_1_auto]"
    >
      {plots ? (
        <PlotsGroup />
      ) : (
        <>
          <ViewControls />
          {viewMode === "single" ? (
            <div className="mt-2 border-t border-line">
              <PanelGroup label={t.browser.layers} count={LAYER_ORDER.length}>
                <ul>
                  {LAYER_ORDER.map((id) => (
                    <LayerRow key={id} id={id} />
                  ))}
                </ul>
              </PanelGroup>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}

function PlotsGroup() {
  const { plotSummary, plotName } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const { get } = useMapController();
  const [renaming, setRenaming] = useState(false);
  const renameRef = useRef<HTMLButtonElement>(null);

  const finishRename = (name: string | null) => {
    if (name !== null) dispatch({ type: "setPlotName", name });
    setRenaming(false);
    // Back to the pencil, so keyboard users keep their place.
    requestAnimationFrame(() => renameRef.current?.focus());
  };

  return (
    <div className="py-2">
      {plotSummary ? (
        <ul className="px-1.5">
          <li className="flex items-center gap-0.5">
            {renaming ? (
              <PlotNameInput initial={plotName} onDone={finishRename} />
            ) : (
              <button
                type="button"
                title={t.browser.focusPlotHint}
                onClick={() => {
                  get()?.focusPlot();
                  dispatch({ type: "setFocus", focus: true });
                }}
                onDoubleClick={() => setRenaming(true)}
                className="flex min-h-9 max-lg:min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors duration-150 hover:bg-surface-3"
              >
                <Square aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{plotName}</span>
                <span className="tabular font-mono text-xs text-muted">{formatHectares(plotSummary.areaHa)}</span>
              </button>
            )}
            <IconButton
              ref={renameRef}
              icon={Pencil}
              label={t.browser.renamePlot}
              size="sm"
              pressed={renaming}
              onClick={() => (renaming ? finishRename(null) : setRenaming(true))}
            />
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
      <SavedPlots />
    </div>
  );
}

/**
 * Inline name field for the plot. Enter or leaving the field saves; Escape cancels. A blank name
 * goes back to the default ("Plot 1").
 */
function PlotNameInput({
  initial,
  onDone,
}: {
  readonly initial: string;
  readonly onDone: (name: string | null) => void;
}) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const finish = (name: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(name);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(value);
    } else if (e.key === "Escape") {
      // Keep Escape from also closing drawers or other panels.
      e.preventDefault();
      e.stopPropagation();
      finish(null);
    }
  };
  return (
    <label className="flex min-h-9 max-lg:min-h-11 min-w-0 flex-1 items-center gap-2 px-2">
      <Square aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-accent" />
      <span className="sr-only">{t.browser.plotNameLabel}</span>
      <input
        // Focus and select on open so typing replaces the name straight away.
        ref={(el) => {
          if (el && !done.current && document.activeElement !== el) {
            el.focus();
            el.select();
          }
        }}
        type="text"
        value={value}
        maxLength={PLOT_NAME_MAX}
        title={t.browser.plotNameHint}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        onBlur={(e: FocusEvent<HTMLInputElement>) => finish(e.currentTarget.value)}
        className="h-7 max-lg:h-9 min-w-0 flex-1 rounded-md border border-input bg-surface px-1.5 text-[13px] font-medium text-text"
      />
    </label>
  );
}
