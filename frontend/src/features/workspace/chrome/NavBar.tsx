"use client";

import { House, Minus, Navigation2, Plus } from "lucide-react";
import { t } from "../strings";
import { useMapController, useWorkspace } from "../store";
import { IconButton } from "../ui/IconButton";

const s = t.chrome.nav;

/** Fusion-style bottom navigation bar: zoom, reset north (live compass), home and zoom readout. */
export function NavBar() {
  const { view } = useWorkspace();
  const controller = useMapController();

  return (
    <div
      role="group"
      aria-label={s.label}
      className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line bg-surface/95 p-1 shadow-lg shadow-black/40 backdrop-blur"
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
      <Divider />
      <span aria-hidden="true" className="tabular min-w-14 px-2 text-center font-mono text-xs text-muted">
        {s.zoomReadout(view.zoom)}
      </span>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-line" />;
}
