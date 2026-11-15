"use client";

import { CloudRain, Sun } from "lucide-react";
import { useState } from "react";
import { seasonNow } from "../data/cycles";
import { precipDayIndex, useWorkspace } from "../store";
import { t } from "../strings";

const s = t.map.season;

/**
 * A small card at the top of the map: is it the wet or the dry season, and when it usually turns.
 * It follows the timeline's day (so it changes as the timeline plays), else the current month.
 * Uses the plot's 5-year monthly rainfall when a plot is drawn, else El Salvador's usual
 * May–October rains.
 */
export function SeasonCard() {
  const state = useWorkspace();
  const { plotCycles, timelineData } = state;
  const [today] = useState(() => new Date().getMonth() + 1);
  const day = timelineData.status === "ready" ? timelineData.frames.dates[precipDayIndex(state)] : undefined;
  const month = day ? Number(day.slice(4, 6)) : today;
  const rain = plotCycles.status === "ready" ? plotCycles.cycles.factors.rain.mean : null;
  const { wet, turns, usual } = seasonNow(rain, month);
  const Icon = wet ? CloudRain : Sun;
  const detail = [
    usual !== null ? s.usual(t.rotation.month(month), Math.round(usual).toLocaleString("en-US")) : s.country(t.rotation.month(month)),
    turns !== null ? (wet ? s.ends(t.rotation.month(turns)) : s.returns(t.rotation.month(turns))) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="status"
      title={rain ? s.hintPlot : s.hintCountry}
      className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-line bg-surface/95 py-1.5 pl-2 pr-3 shadow-lg shadow-black/30 backdrop-blur"
    >
      <span
        aria-hidden="true"
        className={`grid size-8 shrink-0 place-items-center rounded-md ${wet ? "bg-accent/15 text-accent" : "bg-fair/15 text-fair"}`}
      >
        <Icon className="size-4.5" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[13px] font-semibold text-text">{wet ? s.wet : s.dry}</span>
        <span className="truncate text-[11px] text-muted">{detail}</span>
      </span>
    </div>
  );
}
