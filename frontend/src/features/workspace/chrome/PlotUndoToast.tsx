"use client";

import { Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { Planting } from "../data/rotation";
import type { PlotFeature } from "../types";

const s = t.chrome.undo;

/** How long the undo offer stays up after a plot is deleted. */
const UNDO_WINDOW_MS = 8_000;

type Kept = { readonly plot: PlotFeature | null; readonly planting: Planting | null };

/**
 * Short-lived "Plot deleted · Undo" offer shown whenever the plot is cleared. Undo also brings back
 * the farmer's last planting, which is deleted with the plot.
 */
export function PlotUndoToast() {
  const { plot, planting } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const [previous, setPrevious] = useState<Kept>({ plot, planting });
  const [deleted, setDeleted] = useState<Kept | null>(null);

  if (plot !== previous.plot || planting !== previous.planting) {
    setPrevious({ plot, planting });
    if (plot !== previous.plot) setDeleted(plot === null && previous.plot ? previous : null);
  }

  useEffect(() => {
    if (!deleted) return;
    const timer = window.setTimeout(() => setDeleted(null), UNDO_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [deleted]);

  return (
    <div role="status" className="pointer-events-auto">
      {deleted ? (
        <div className="mb-2 flex items-center gap-1 rounded-lg border border-line-strong bg-surface-2 py-1 pl-3 pr-1 text-sm text-text shadow-lg shadow-black/40">
          <span>{s.deleted}</span>
          <button
            type="button"
            onClick={() => {
              if (deleted.plot) dispatch({ type: "setPlot", plot: deleted.plot });
              if (deleted.planting) dispatch({ type: "setPlanting", planting: deleted.planting });
              setDeleted(null);
            }}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2 font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
          >
            <Undo2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {s.undo}
          </button>
        </div>
      ) : null}
    </div>
  );
}
