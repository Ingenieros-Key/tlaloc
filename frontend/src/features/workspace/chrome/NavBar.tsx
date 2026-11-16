"use client";

import { ChartNoAxesColumn, GitCompareArrows, House, Layers, Minus, Navigation2, Plus } from "lucide-react";
import { DRAWER_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { t } from "../strings";
import { lanesVisible, useMapController, useWorkspace, useWorkspaceDispatch } from "../store";
import { IconButton } from "../ui/IconButton";
import { GoToCoordinates } from "./GoToCoordinates";

const s = t.chrome.nav;

/**
 * Fusion-style bottom navigation bar: zoom, reset north (live compass), home, go to coordinates, the
 * data layer's, the timeline's and the rotation plans' show/hide toggles and zoom readout. `relative` anchors the coordinates popover above
 * the bar.
 */
export function NavBar() {
  const state = useWorkspace();
  const { view, display, timelineData, activeLayer, viewMode, plot, planting } = state;
  const dispatch = useWorkspaceDispatch();
  const drawerLayout = useMediaQuery(DRAWER_QUERY);
  const controller = useMapController();
  // The timeline only exists while a layer's days are loaded (never for elevation alone or the Crop score).
  const hasTimeline = timelineData.status === "ready" && timelineData.frames.dates.length > 0;
  // Something to hide: a layer is on, or the Crop score view (which draws without one).
  const hasData = activeLayer !== null || viewMode === "score";
  // The rotation plans need a plot and the farmer's last planting (asked in the Rotation tab).
  const hasPlans = plot !== null && planting !== null;
  const plansShown = lanesVisible(state);
  const togglePlans = () => {
    if (plansShown) {
      dispatch({ type: "setLanesOpen", open: false });
      return;
    }
    // The plans belong to the plot's Rotation tab: bring the plot into focus on that tab first.
    dispatch({ type: "setFocus", focus: true });
    dispatch({ type: "setInspectorView", view: "results" });
    dispatch({ type: "setInspectorTab", tab: "rotation" });
    dispatch({ type: "setLanesOpen", open: true });
    // As from the Rotation tab: below lg the Inspector steps aside, at lg the left flyout closes.
    if (drawerLayout) dispatch({ type: "setPanel", panel: "inspector", open: false });
    else dispatch({ type: "setCollapsed", panel: "browser", collapsed: true });
  };

  return (
    <div
      role="group"
      aria-label={s.label}
      className="pointer-events-auto relative flex items-center gap-0.5 rounded-lg border border-line bg-surface/95 p-1 shadow-lg shadow-black/40 backdrop-blur"
    >
      {/* Phones zoom with a pinch, so they drop these buttons to fit the bar. */}
      <span className="flex items-center gap-0.5 max-sm:hidden">
        <IconButton icon={Plus} label={s.zoomIn} onClick={() => controller.get()?.zoomIn()} />
        <IconButton icon={Minus} label={s.zoomOut} onClick={() => controller.get()?.zoomOut()} />
        <Divider />
      </span>
      <button
        type="button"
        aria-label={s.resetNorth}
        title={s.resetNorth}
        onClick={() => controller.get()?.resetNorth()}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-3 hover:text-text"
      >
        <Navigation2
          aria-hidden="true"
          className="size-5 text-accent transition-transform duration-150 ease-out"
          strokeWidth={1.75}
          style={{ transform: `rotate(${-view.bearing}deg)` }}
        />
      </button>
      <IconButton icon={House} label={s.home} onClick={() => controller.get()?.resetView()} />
      <GoToCoordinates />
      <Divider />
      <IconButton
        icon={Layers}
        label={hasData ? s.dataLayer : s.dataLayerUnavailable}
        pressed={hasData && display.data}
        disabled={!hasData}
        onClick={() => dispatch({ type: "setDisplay", key: "data", visible: !display.data })}
      />
      <IconButton
        icon={ChartNoAxesColumn}
        label={hasTimeline ? s.timeline : s.timelineUnavailable}
        pressed={hasTimeline && display.timeline}
        disabled={!hasTimeline}
        onClick={() => dispatch({ type: "setDisplay", key: "timeline", visible: !display.timeline })}
      />
      <IconButton
        icon={GitCompareArrows}
        label={hasPlans ? s.plans : s.plansUnavailable}
        pressed={plansShown}
        disabled={!hasPlans}
        onClick={togglePlans}
      />
      {/* The readout is the one thing here that is not a control, so phones drop it to fit the bar. */}
      <span aria-hidden="true" className="flex items-center max-sm:hidden">
        <Divider />
        <span className="tabular min-w-14 px-2 text-center font-mono text-xs text-muted">
          {s.zoomReadout(view.zoom)}
        </span>
      </span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-line" />;
}
