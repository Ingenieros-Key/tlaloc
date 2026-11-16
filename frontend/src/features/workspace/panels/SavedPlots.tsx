"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useSavedPlots } from "../data/useSavedPlots";
import { IconButton } from "../ui/IconButton";
import { cn } from "@/lib/utils";

/** Account plot switcher, shown under the active plot in the Plots flyout. */
export function SavedPlots() {
  const { signedIn, plots, activeId, select, remove } = useSavedPlots();

  if (!signedIn) {
    return (
      <p className="border-t border-line px-3 py-2 text-xs leading-relaxed text-muted">
        Sign in to save plots to your account and switch between them.
      </p>
    );
  }

  return (
    <div className="mt-1 border-t border-line pt-1">
      <p className="px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted">Your plots</p>
      {plots.length === 0 ? (
        <p className="px-3 pb-2 text-xs text-muted">Draw a plot — it saves here automatically.</p>
      ) : (
        <ul className="px-1.5 pb-1">
          {plots.map((p) => {
            const active = p.plotId === activeId;
            return (
              <li key={p.plotId} className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => !active && select(p)}
                  aria-current={active}
                  className={cn(
                    "flex min-h-9 max-lg:min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors duration-150",
                    active ? "bg-accent/10 font-medium text-accent" : "cursor-pointer hover:bg-surface-3",
                  )}
                >
                  <MapPin aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                </button>
                <IconButton icon={Trash2} label="Delete plot" size="sm" onClick={() => remove(p.plotId)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
