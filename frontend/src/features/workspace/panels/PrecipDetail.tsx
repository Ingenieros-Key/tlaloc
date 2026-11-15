"use client";

import { addDays, dateRange, summarizeDaily, type DailySeries, type PowerDate } from "@/lib/nasa-power";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { PRECIP_DEFAULT_POINT, PRECIP_PARAMETER, precipPointQuery, type PrecipWindow } from "../data/precip";
import { lastDay, precipDayIndex, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import { formatDay } from "./format";

/** Rounded to ~100 m: closer points fall in the same POWER cell anyway, and it keeps the key stable. */
function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function mm(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mm`;
}

/** Days of context the chart shows around the newest day in "latest" mode. */
const LATEST_CONTEXT_DAYS = 30;

/**
 * Daily precipitation at the pin, else the plot centre, else San Salvador, from the NASA POWER
 * point endpoint: over the chosen timeframe, or the 30 days up to the newest day in "latest" mode.
 * The day shown on the map is highlighted; in a timeframe, clicking a bar moves the map to it.
 */
export function PrecipDetail() {
  const state = useWorkspace();
  const { pin, plotSummary, precip, precipMode } = state;
  const dispatch = useWorkspaceDispatch();
  const dates = precip.status === "ready" ? precip.frames.dates : [];
  const newest = dates[lastDay(precip)] ?? "";
  const latestMode = precipMode === "latest";
  const window: PrecipWindow = latestMode
    ? { start: newest && addDays(newest, -(LATEST_CONTEXT_DAYS - 1)), end: newest }
    : { start: dates[0] ?? "", end: newest };
  const source = pin ? "pin" : plotSummary ? "plot" : "default";
  const target = pin ?? plotSummary?.centroid ?? PRECIP_DEFAULT_POINT;
  // Keeps the previous point's chart (dimmed) while a moved pin loads.
  const query = useQuery({
    ...precipPointQuery([roundCoord(target[0]), roundCoord(target[1])], window),
    enabled: dates.length > 0,
    placeholderData: keepPreviousData,
  });
  if (dates.length === 0) return null;

  const pending = query.isFetching && (query.isPlaceholderData || !query.data);
  const series = query.data?.data.series[PRECIP_PARAMETER] ?? null;
  const day = precipDayIndex(state);

  const days = dateRange(window.start, window.end);
  const place = t.browser.precip.places[source];
  const s = t.browser.precip;

  return (
    <div className="space-y-2 border-t border-line pt-3" aria-busy={pending}>
      <p className="text-xs font-medium text-text">{place}</p>
      {query.isError && !query.isFetching ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="text-poor">{s.pointError}</p>
          <RetryButton onClick={() => void query.refetch()} />
        </div>
      ) : series ? (
        <div className={`space-y-2 transition-opacity duration-200 ${pending ? "opacity-50" : ""}`}>
          <Stats series={series} days={days.length} />
          <DailyBars
            days={days}
            series={series}
            active={dates[day]}
            label={s.chartLabel(place, formatDay(days[0]), formatDay(days[days.length - 1]))}
            onPick={
              latestMode
                ? undefined
                : (i) => dispatch({ type: "setPrecipDay", day: i >= days.length - 1 ? null : i })
            }
          />
          <p className="text-[11px] leading-snug text-muted">{s.source}</p>
        </div>
      ) : (
        <p role="status" className="text-xs text-muted">
          {s.loading}
        </p>
      )}
    </div>
  );
}

function Stats({ series, days }: { readonly series: DailySeries; readonly days: number }) {
  const { total, wetDays, max } = summarizeDaily(series);
  const s = t.browser.precip;
  return (
    <dl className="grid grid-cols-3 gap-2">
      <Stat label={s.total(days)} value={mm(total)} />
      <Stat label={s.wetDays} value={s.days(wetDays)} title={s.wetDaysHint} />
      <Stat label={s.wettest} value={max ? mm(max.value) : "–"} note={max ? formatDay(max.date, true) : undefined} />
    </dl>
  );
}

function Stat({
  label,
  value,
  note,
  title,
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
  readonly title?: string;
}) {
  return (
    <div className="min-w-0" title={title}>
      <dt className="truncate text-[11px] text-muted">{label}</dt>
      <dd className="font-mono text-[13px] text-text tabular">
        {value}
        {note ? <span className="block text-[11px] text-muted">{note}</span> : null}
      </dd>
    </div>
  );
}

/**
 * One thin bar per day on a shared zero baseline; the day on the map is solid. Hovering shows that
 * day's value in the readout and clicking moves the map to it. Screen readers get the list below
 * (the timeline slider is the keyboard route).
 */
function DailyBars({
  days,
  series,
  active,
  label,
  onPick,
}: {
  readonly days: readonly PowerDate[];
  readonly series: DailySeries;
  readonly active: PowerDate | undefined;
  readonly label: string;
  /** Omitted: bars are read-only. */
  readonly onPick?: (index: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const labelId = useId();
  const values = days.map((day) => series[day] ?? null);
  const peak = Math.max(1, ...values.map((v) => v ?? 0));
  const readoutIndex = hovered ?? days.indexOf(active ?? "");
  const readoutDay = days[readoutIndex];
  const readoutValue = values[readoutIndex];
  const dense = days.length > 31;
  const veryDense = days.length > 120;

  return (
    <figure aria-labelledby={labelId}>
      <figcaption id={labelId} className="sr-only">
        {label}
      </figcaption>
      <p aria-hidden="true" className="flex justify-between text-[11px] text-muted">
        <span>{readoutDay ? formatDay(readoutDay, true) : ""}</span>
        <span className="font-mono text-text tabular">
          {readoutDay ? (readoutValue === null ? t.browser.precip.noData : mm(readoutValue)) : ""}
        </span>
      </p>
      <div
        aria-hidden="true"
        className={`mt-1 flex h-14 items-end border-b border-line-strong ${
          veryDense ? "" : dense ? "gap-px" : "gap-0.5"
        }`}
        onMouseLeave={() => setHovered(null)}
      >
        {values.map((value, i) => {
          const isActive = days[i] === active;
          return (
            <div
              key={days[i]}
              className={`flex h-full flex-1 items-end ${onPick ? "cursor-pointer" : ""}`}
              onMouseEnter={() => setHovered(i)}
              onClick={onPick ? () => onPick(i) : undefined}
            >
              <div
                className={`w-full transition-colors duration-150 ${dense ? "rounded-t-[1px]" : "rounded-t-[3px]"} ${
                  isActive ? "bg-accent" : hovered === i ? "bg-accent/80" : "bg-accent/45"
                }`}
                style={{ height: value === null ? 0 : `${Math.max(2, (value / peak) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <ul className="sr-only">
        {days.map((day, i) => {
          const value = values[i];
          return <li key={day}>{`${formatDay(day)}: ${value === null ? t.browser.precip.noData : mm(value)}`}</li>;
        })}
      </ul>
    </figure>
  );
}

export function RetryButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 max-lg:h-11 shrink-0 cursor-pointer items-center rounded-md px-2 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
    >
      {t.browser.precip.retry}
    </button>
  );
}
