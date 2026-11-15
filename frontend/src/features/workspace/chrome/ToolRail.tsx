"use client";

import { Square, type LucideIcon } from "lucide-react";
import { DRAWER_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { VIEW_MODES } from "../layers";
import { MODE_ICONS } from "../panels/ViewGroup";
import { useWorkspace, useWorkspaceDispatch, type BrowserSection } from "../store";
import { t } from "../strings";
import type { ViewMode } from "../types";

const s = t.chrome.rail;

/**
 * Left tool rail: one icon per tool, each opening its own flyout beside the rail (a drawer below
 * lg). Plots first, then the five view modes, led by the Crop score. Pressing a view mode switches the map to it and
 * opens its controls; pressing the tool that is already open closes the flyout, leaving the map
 * to itself. The active view mode stays marked while its flyout is closed.
 */
export function ToolRail({ inert }: { readonly inert: boolean }) {
  const { viewMode, browserSection, panels, collapsed, plotSummary } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const drawer = useMediaQuery(DRAWER_QUERY);
  const open = drawer ? panels.browser : !collapsed.browser;

  const setOpen = (next: boolean) => {
    if (drawer) {
      dispatch({ type: "setPanel", panel: "browser", open: next });
      if (next) dispatch({ type: "setPanel", panel: "inspector", open: false });
    } else {
      dispatch({ type: "setCollapsed", panel: "browser", collapsed: !next });
    }
  };
  const show = (section: BrowserSection) => {
    if (open && browserSection === section) {
      setOpen(false);
      return;
    }
    dispatch({ type: "setBrowserSection", section });
    setOpen(true);
  };
  const pickMode = (mode: ViewMode) => {
    if (mode === viewMode) {
      show("tool");
      return;
    }
    dispatch({ type: "setViewMode", mode });
    dispatch({ type: "setBrowserSection", section: "tool" });
    setOpen(true);
  };

  const plotsOpen = open && browserSection === "plots";
  const toolOpen = open && browserSection === "tool";

  return (
    <div
      role="toolbar"
      aria-label={s.label}
      aria-orientation="vertical"
      inert={inert}
      className="pointer-events-auto absolute left-2 top-2 z-20 flex flex-col gap-0.5 rounded-lg border border-line bg-surface/95 p-1 shadow-lg shadow-black/40 backdrop-blur lg:left-3 lg:top-3"
    >
      <RailButton
        icon={Square}
        label={s.plots}
        highlighted={plotsOpen}
        expanded={plotsOpen}
        controls={browserSection === "plots"}
        badge={plotSummary !== null}
        onClick={() => show("plots")}
      />
      <span aria-hidden="true" className="mx-1.5 my-0.5 h-px shrink-0 bg-line" />
      {VIEW_MODES.map((mode) => (
        <RailButton
          key={mode}
          icon={MODE_ICONS[mode]}
          label={t.browser.view.modeNames[mode]}
          highlighted={mode === viewMode}
          pressed={mode === viewMode}
          expanded={mode === viewMode && toolOpen}
          controls={mode === viewMode && browserSection === "tool"}
          onClick={() => pickMode(mode)}
        />
      ))}
    </div>
  );
}

/**
 * A rail tool. `pressed` marks the view mode in use (aria-pressed); `expanded` says its flyout is
 * open, shown as a notch on the side facing the flyout, so the state never rests on color alone.
 */
function RailButton({
  icon: Icon,
  label,
  highlighted,
  pressed,
  expanded,
  controls,
  badge = false,
  onClick,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly highlighted: boolean;
  readonly pressed?: boolean;
  readonly expanded: boolean;
  /** This tool's section is the one the flyout holds, open or not (focus returns here on close). */
  readonly controls: boolean;
  /** A dot in the corner: this tool holds something (a drawn plot). */
  readonly badge?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls ? "dock-browser" : undefined}
      onClick={onClick}
      className={`relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 ${
        highlighted
          ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
          : "text-muted hover:bg-surface-3 hover:text-text"
      }`}
    >
      <Icon aria-hidden="true" strokeWidth={1.75} className="size-5" />
      {expanded ? (
        <span aria-hidden="true" className="absolute -right-1 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
      ) : null}
      {badge ? <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /> : null}
    </button>
  );
}
