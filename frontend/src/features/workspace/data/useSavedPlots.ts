"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace, useWorkspaceDispatch, useMapController } from "../store";
import { useAuthProfile } from "@/lib/auth";
import { listPlots, createPlot, updatePlot, deletePlot, type PlotRecord } from "@/lib/plots-api";
import type { PlotFeature } from "../types";
import type { Planting, Priority } from "./rotation";

/**
 * Account-persisted land plots on top of the single active plot. Signed-in users get their drawn
 * plot auto-saved, a list to switch between plots (loads + flies to the chosen one), rename and
 * delete. Guests keep the local single-plot behaviour untouched.
 */
export function useSavedPlots() {
  const { status } = useAuthProfile();
  const signedIn = status === "in";
  const { plot, plotName, planting, priority, plotSummary } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const { get } = useMapController();

  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setPlots([]);
      return;
    }
    try {
      setPlots(await listPlots());
    } catch {
      /* API may be unavailable; the switcher simply shows nothing. */
    }
  }, [signedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // A fresh draw (plot set with no active record) creates one; edits to the active plot update it.
  useEffect(() => {
    if (!signedIn || !plot) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const input = { name: plotName, geometry: plot.geometry, planting, priority };
      try {
        if (activeId) {
          const rec = await updatePlot(activeId, input);
          setPlots((ps) => ps.map((p) => (p.plotId === rec.plotId ? rec : p)));
        } else {
          const rec = await createPlot(input);
          setActiveId(rec.plotId);
          setPlots((ps) => [...ps, rec]);
        }
      } catch {
        /* ignore transient save failures */
      }
    }, 900);
    return () => window.clearTimeout(saveTimer.current);
  }, [signedIn, plot, plotName, planting, priority, activeId]);

  useEffect(() => {
    if (!plot) setActiveId(null);
  }, [plot]);

  const select = useCallback(
    (rec: PlotRecord) => {
      const feature = { type: "Feature", properties: {}, geometry: rec.geometry } as PlotFeature;
      dispatch({ type: "setPlot", plot: feature });
      dispatch({ type: "setPlotName", name: rec.name });
      dispatch({ type: "setPlanting", planting: (rec.planting as Planting | null) ?? null });
      if (rec.priority) dispatch({ type: "setPriority", priority: rec.priority as Priority });
      dispatch({ type: "setFocus", focus: true });
      setActiveId(rec.plotId);
      requestAnimationFrame(() => get()?.focusPlot());
    },
    [dispatch, get],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await deletePlot(id);
      } catch {
        /* ignore */
      }
      setPlots((ps) => ps.filter((p) => p.plotId !== id));
      if (activeId === id) dispatch({ type: "clearPlot" });
    },
    [activeId, dispatch],
  );

  return { signedIn, plots, activeId, select, remove, hasPlot: plotSummary !== null };
}
