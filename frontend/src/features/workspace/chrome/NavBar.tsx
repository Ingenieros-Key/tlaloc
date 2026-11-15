"use client";

import { ChartNoAxesColumn, House, Minus, Navigation2, Plus } from "lucide-react";
import { t } from "../strings";
import { useMapController, useWorkspace, useWorkspaceDispatch } from "../store";
import { IconButton } from "../ui/IconButton";
import { GoToCoordinates } from "./GoToCoordinates";

const s = t.chrome.nav;

/**
 * Fusion-style bottom navigation bar: zoom, reset north (live compass), home, go to coordinates, the
 * timeline's show/hide toggle and zoom readout. `relative` anchors the coordinates popover above
 * the bar.
 */
export function NavBar() {
  const { view, display, layerData } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const controller = useMapController();
  // The timeline only exists while a layer's days are loaded (never in the Crop score view).
  const hasTimeline = layerData.status === "ready";

  return (
    <div
      role="group"
      aria-label={s.label}
      className="pointer-events-auto relative flex items-center gap-0.5 rounded-lg border border-line bg-surface/95 p-1 shadow-lg shadow-black/40 backdrop-blur"
    >
      <IconButton icon={Plus} label={s.zoomIn} onClick={() => controller.get()?.zoomIn()} />
      <IconButton icon={Minus} label={s.zoomOut} onClick={() => controller.get()?.zoomOut()} />
      <Divider />
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
        icon={ChartNoAxesColumn}
        label={hasTimeline ? s.timeline : s.timelineUnavailable}
        pressed={hasTimeline && display.timeline}
        disabled={!hasTimeline}
        onClick={() => dispatch({ type: "setDisplay", key: "timeline", visible: !display.timeline })}
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
