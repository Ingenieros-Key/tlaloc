"use client";

import type { PowerDate } from "@/lib/nasa-power";
import { Pause, Play } from "lucide-react";
import { useId, useState, type CSSProperties, type FormEvent } from "react";
import {
  MAX_RANGE_DAYS,
  POWER_FIRST_DAY,
  PRECIP_PRESETS,
  expectedLatestDay,
  presetRange,
  windowDays,
  type PrecipWindow,
} from "../data/precip";
import {
  PRECIP_SPEEDS,
  lastDay,
  precipDayIndex,
  useWorkspace,
  useWorkspaceDispatch,
  type PrecipMode,
  type PrecipSpeed,
} from "../store";
import { t } from "../strings";
import { Badge } from "../ui/Badge";
import { IconButton } from "../ui/IconButton";
import { Segmented } from "../ui/Segmented";
import { formatDay } from "./format";
import styles from "./sliders.module.css";

type FillStyle = CSSProperties & { readonly "--pct": number };

const MODES: readonly PrecipMode[] = ["latest", "range"];

/** "20261112" ↔ "2026-11-12" (the value format of `<input type="date">`). */
function toIso(date: PowerDate): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}
function fromIso(value: string): PowerDate {
  return value.replaceAll("-", "");
}

/**
 * What the precipitation layer shows: the newest published day (default), or a timeframe the user
 * picks (a quick preset or custom dates) that can be scrubbed and played day by day.
 */
export function PrecipTimeline() {
  const { precipMode } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const s = t.browser.precip;

  return (
    <div className="space-y-3">
      <Segmented<PrecipMode>
        label={s.modeLabel}
        value={precipMode}
        options={MODES.map((mode) => ({ value: mode, label: s.modes[mode] }))}
        onChange={(mode) => dispatch({ type: "setPrecipMode", mode })}
      />
      {precipMode === "latest" ? <LatestDay /> : <Timeframe />}
    </div>
  );
}

function LatestDay() {
  const { precip } = useWorkspace();
  const s = t.browser.precip;
  if (precip.status !== "ready") return null;
  const date = precip.frames.dates[lastDay(precip)];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{s.day}</span>
        <span className="flex items-center gap-1.5">
          <Badge tone="accent" className="px-1 py-0 text-[10px]">
            {s.latest}
          </Badge>
          <span className="font-mono text-xs text-text tabular">{date ? formatDay(date) : "–"}</span>
        </span>
      </div>
      <p className="text-[11px] leading-snug text-muted">{s.latestHint}</p>
    </div>
  );
}

function Timeframe() {
  const { precipRange } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const s = t.browser.precip;
  const setRange = (range: PrecipWindow) => dispatch({ type: "setPrecipRange", range });

  return (
    <div className="space-y-3">
      <div role="group" aria-label={s.presetsLabel} className="flex flex-wrap gap-1">
        {PRECIP_PRESETS.map((days) => {
          const preset = presetRange(days);
          const selected = preset.start === precipRange.start && preset.end === precipRange.end;
          return (
            <button
              key={days}
              type="button"
              aria-pressed={selected}
              aria-label={s.presetLabel(days)}
              onClick={() => setRange(preset)}
              className={`h-7 max-lg:h-11 min-w-10 cursor-pointer rounded-md border px-2 font-mono text-xs transition-colors duration-150 ${
                selected
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-muted hover:border-line-strong hover:text-text"
              }`}
            >
              {s.presetShort(days)}
            </button>
          );
        })}
      </div>
      {/* Keyed by the range so the draft resets whenever a preset (or Apply) changes it. */}
      <RangeForm key={`${precipRange.start}-${precipRange.end}`} range={precipRange} onApply={setRange} />
      <Player />
    </div>
  );
}

/**
 * Custom From/To dates. Edits stay a draft until Apply, so typing a date digit by digit never fires
 * a request per keystroke.
 */
function RangeForm({
  range,
  onApply,
}: {
  readonly range: PrecipWindow;
  readonly onApply: (range: PrecipWindow) => void;
}) {
  const [start, setStart] = useState(toIso(range.start));
  const [end, setEnd] = useState(toIso(range.end));
  const fromId = useId();
  const toId = useId();
  const errorId = useId();
  const s = t.browser.precip;
  const latest = expectedLatestDay();

  const draft: PrecipWindow = { start: fromIso(start), end: fromIso(end) };
  const error = !start || !end
    ? s.errors.missing
    : draft.start > draft.end
      ? s.errors.order
      : draft.start < POWER_FIRST_DAY || draft.end > latest
        ? s.errors.bounds(formatDay(POWER_FIRST_DAY), formatDay(latest))
        : windowDays(draft) > MAX_RANGE_DAYS
          ? s.errors.tooLong
          : null;
  const changed = draft.start !== range.start || draft.end !== range.end;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!error && changed) onApply(draft);
  };

  const input =
    "h-8 max-lg:h-11 w-full min-w-0 rounded-md border border-line bg-surface px-1.5 font-mono text-xs text-text tabular focus-visible:border-accent";

  return (
    <form onSubmit={submit} noValidate className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="min-w-0">
          <label htmlFor={fromId} className="block text-[11px] text-muted">
            {s.from}
          </label>
          <input
            id={fromId}
            type="date"
            value={start}
            min={toIso(POWER_FIRST_DAY)}
            max={toIso(latest)}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => setStart(e.currentTarget.value)}
            className={input}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={toId} className="block text-[11px] text-muted">
            {s.to}
          </label>
          <input
            id={toId}
            type="date"
            value={end}
            min={toIso(POWER_FIRST_DAY)}
            max={toIso(latest)}
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => setEnd(e.currentTarget.value)}
            className={input}
          />
        </div>
      </div>
      <div className="flex items-start justify-between gap-2">
        <p id={errorId} className="min-w-0 text-[11px] leading-snug text-poor">
          {error && changed ? error : null}
        </p>
        <button
          type="submit"
          disabled={error !== null || !changed}
          className="h-8 max-lg:h-11 shrink-0 cursor-pointer rounded-md bg-accent px-3 text-xs font-medium text-on-accent transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {s.apply}
        </button>
      </div>
    </form>
  );
}

/** Play button and day scrubber over the loaded timeframe. */
function Player() {
  const state = useWorkspace();
  const { precip, precipPlaying, precipSpeed } = state;
  const dispatch = useWorkspaceDispatch();
  const sliderId = useId();
  const s = t.browser.precip;

  if (precip.status === "loading") {
    return (
      <p role="status" className="text-xs text-muted">
        {s.loading}
      </p>
    );
  }
  if (precip.status !== "ready" || precip.frames.dates.length === 0) return null;

  const { dates } = precip.frames;
  const last = lastDay(precip);
  const day = precipDayIndex(state);
  const date = dates[day];
  const style: FillStyle = { "--pct": day / Math.max(1, last) };
  // Short labels ("Nov 12") only when the timeframe stays inside one year.
  const short = dates[0].slice(0, 4) === dates[last].slice(0, 4);

  return (
    <div className="space-y-1" aria-busy={precip.refreshing}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={sliderId} className="text-xs text-muted">
          {precip.refreshing ? s.loadingRange : s.day}
        </label>
        <output
          htmlFor={sliderId}
          aria-live={precipPlaying ? "off" : "polite"}
          className="font-mono text-xs text-text tabular"
        >
          {formatDay(date)}
        </output>
      </div>
      <div className={`flex items-center gap-1 transition-opacity duration-200 ${precip.refreshing ? "opacity-50" : ""}`}>
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
        <div className="min-w-0 flex-1">
          <input
            id={sliderId}
            type="range"
            min={0}
            max={last}
            step={1}
            value={day}
            disabled={precip.refreshing}
            aria-valuetext={formatDay(date)}
            onChange={(e) => {
              const picked = Number(e.currentTarget.value);
              dispatch({ type: "setPrecipDay", day: picked >= last ? null : picked });
            }}
            className={styles.slider}
            style={style}
          />
          <div aria-hidden="true" className="flex justify-between font-mono text-[10px] text-muted tabular">
            <span>{formatDay(dates[0], short)}</span>
            <span>{formatDay(dates[last], short)}</span>
          </div>
        </div>
      </div>
      <div className="pt-1">
        <Segmented<`${PrecipSpeed}`>
          label={s.speed}
          showLabel
          value={`${precipSpeed}`}
          options={PRECIP_SPEEDS.map((speed) => ({ value: `${speed}`, label: s.speedLabel(speed) }))}
          onChange={(value) => dispatch({ type: "setPrecipSpeed", speed: Number(value) as PrecipSpeed })}
        />
      </div>
    </div>
  );
}
