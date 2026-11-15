"use client";

import { addDays, dateRange, summarizeDaily, type PowerDate } from "@/lib/nasa-power";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import { useId, useState, type CSSProperties } from "react";
import { PRECIP_DEFAULT_POINT, PRECIP_PARAMETER, precipPointQuery, type PrecipWindow } from "../data/precip";
import { formatDay } from "../panels/format";
import { RetryButton } from "../panels/RetryButton";
import styles from "../panels/sliders.module.css";
import {
  PRECIP_SPEEDS,
  lastDay,
  precipDayIndex,
  useWorkspace,
  useWorkspaceDispatch,
  type PrecipSpeed,
} from "../store";
import { t } from "../strings";
import { Badge } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";

type FillStyle = CSSProperties & { readonly "--pct": number };

/** Days of context shown up to the newest day in "latest" mode. */
const LATEST_CONTEXT_DAYS = 30;

/** Rounded to ~100 m: closer points fall in the same POWER cell anyway, and it keeps the key stable. */
function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function mm(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mm`;
}

/**
 * Timeline for the precipitation layer, docked above the nav bar: the day on the map, playback and
 * speed (timeframe mode), and the daily totals at the pin (else the plot centre, else San Salvador)
 * drawn as bars behind the scrubber, with the period total and wettest day underneath.
 */
export function TimelineDock() {
  const state = useWorkspace();
  const { activeLayer, precip, precipMode, precipPlaying, precipSpeed, pin, plotSummary } = state;
  const dispatch = useWorkspaceDispatch();
  const [hovered, setHovered] = useState<number | null>(null);
  const sliderId = useId();
  const speedId = useId();

  const dates = precip.status === "ready" ? precip.frames.dates : [];
  const last = lastDay(precip);
  const newest = dates[last] ?? "";
  const latestMode = precipMode === "latest";
  const window: PrecipWindow = latestMode
    ? { start: newest && addDays(newest, -(LATEST_CONTEXT_DAYS - 1)), end: newest }
    : { start: dates[0] ?? "", end: newest };
  const target = pin ?? plotSummary?.centroid ?? PRECIP_DEFAULT_POINT;
  const point = useQuery({
    ...precipPointQuery([roundCoord(target[0]), roundCoord(target[1])], window),
    enabled: activeLayer === "precip" && dates.length > 0,
    // Keeps the previous point's bars while a moved pin loads.
    placeholderData: keepPreviousData,
  });

  if (activeLayer !== "precip" || precip.status !== "ready" || dates.length === 0) return null;

  const s = t.browser.precip;
  const day = precipDayIndex(state);
  const date = dates[day];
  const days = dateRange(window.start, window.end);
  const series = point.data?.data.series[PRECIP_PARAMETER] ?? null;
  const values = days.map((d) => series?.[d] ?? null);
  const peak = Math.max(1, ...values.map((v) => v ?? 0));
  const place = t.browser.precip.places[pin ? "pin" : plotSummary ? "plot" : "default"];
  const summary = series ? summarizeDaily(series) : null;
  const short = days[0].slice(0, 4) === days[days.length - 1].slice(0, 4);
  const pendingPoint = point.isFetching && (point.isPlaceholderData || !point.data);
  const style: FillStyle = { "--pct": day / Math.max(1, last) };
  const pick = (i: number) => dispatch({ type: "setPrecipDay", day: i >= last ? null : i });

  let caption: string;
  if (hovered !== null && days[hovered]) {
    const value = values[hovered];
    caption = `${formatDay(days[hovered])} · ${value === null ? s.noData : mm(value)}`;
  } else if (summary) {
    const wettest = summary.max ? ` · ${s.wettestShort(formatDay(summary.max.date, true))}` : "";
    caption = `${place} · ${s.total(days.length)} ${mm(summary.total)}${wettest}`;
  } else {
    caption = place;
  }

  return (
    <section
      aria-label={s.dockLabel}
      aria-busy={precip.refreshing || pendingPoint}
      className="pointer-events-auto mb-2 w-full max-w-[600px] rounded-xl border border-line bg-surface/95 px-3 pb-2 pt-2.5 shadow-xl shadow-black/30 backdrop-blur"
    >
      <div className="flex items-center gap-2">
        {latestMode ? (
          <span title={s.latestHint}>
            <Badge tone="accent">{s.latest}</Badge>
          </span>
        ) : (
          <>
            <IconButton
              icon={precipPlaying ? Pause : Play}
              label={precipPlaying ? s.pause : s.play(dates.length)}
              pressed={precipPlaying}
              size="sm"
              disabled={precip.refreshing}
              // From the last day, playback restarts at the beginning of the timeframe.
              onClick={() =>
                dispatch({ type: "setPrecipPlaying", playing: !precipPlaying, from: day >= last ? 0 : day })
              }
            />
            <label htmlFor={speedId} className="sr-only">
              {s.speed}
            </label>
            <select
              id={speedId}
              value={precipSpeed}
              onChange={(e) =>
                dispatch({ type: "setPrecipSpeed", speed: Number(e.currentTarget.value) as PrecipSpeed })
              }
              className="h-8 max-lg:h-11 cursor-pointer rounded-md border border-input bg-surface px-1.5 font-mono text-xs text-text"
            >
              {PRECIP_SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {s.speedLabel(speed)}
                </option>
              ))}
            </select>
          </>
        )}
        <span className="ml-auto text-xs text-muted">{precip.refreshing ? s.loadingRange : s.day}</span>
        <output
          htmlFor={latestMode ? undefined : sliderId}
          aria-live={precipPlaying ? "off" : "polite"}
          className="font-mono text-[13px] font-medium text-text tabular"
        >
          {formatDay(date)}
        </output>
      </div>

      {/* Daily totals at the point, aligned with the scrubber's thumb travel. */}
      <div
        aria-hidden="true"
        className={`mt-2 flex h-8 items-end gap-px border-b border-line transition-opacity duration-200 ${
          latestMode ? "" : "px-[14px] max-lg:px-[22px]"
        } ${pendingPoint || precip.refreshing ? "opacity-50" : ""}`}
        onMouseLeave={() => setHovered(null)}
      >
        {values.map((value, i) => {
          const isActive = days[i] === date;
          return (
            <div
              key={days[i]}
              className={`flex h-full min-w-0 flex-1 items-end ${latestMode ? "" : "cursor-pointer"}`}
              onMouseEnter={() => setHovered(i)}
              onClick={latestMode ? undefined : () => pick(i)}
            >
              <div
                className={`w-full rounded-t-[1px] transition-colors duration-150 ${
                  isActive ? "bg-accent" : hovered === i ? "bg-accent/70" : "bg-accent/35"
                }`}
                style={{ height: value === null ? 0 : `${Math.max(3, (value / peak) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>

      {latestMode ? null : (
        <>
          <label htmlFor={sliderId} className="sr-only">
            {s.day}
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={last}
            step={1}
            value={day}
            disabled={precip.refreshing}
            aria-valuetext={formatDay(date)}
            onChange={(e) => pick(Number(e.currentTarget.value))}
            className={`${styles.slider} -mt-[14px] max-lg:-mt-[22px]`}
            style={style}
          />
        </>
      )}

      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="shrink-0 font-mono tabular">{formatDay(days[0], short)}</span>
        {point.isError && !point.isFetching ? (
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-poor">{s.pointError}</span>
            <RetryButton onClick={() => void point.refetch()} />
          </span>
        ) : (
          <span className="min-w-0 truncate text-center">{caption}</span>
        )}
        <span className="shrink-0 font-mono tabular">{formatDay(days[days.length - 1], short)}</span>
      </div>

      <ul className="sr-only" aria-label={s.chartLabel(place, formatDay(days[0]), formatDay(days[days.length - 1]))}>
        {days.map((d: PowerDate, i) => {
          const value = values[i];
          return <li key={d}>{`${formatDay(d)}: ${value === null ? s.noData : mm(value)}`}</li>;
        })}
      </ul>
    </section>
  );
}
