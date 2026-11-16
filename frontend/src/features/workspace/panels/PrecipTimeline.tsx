"use client";

import type { PowerDate } from "@/lib/nasa-power";
import { useId, useState, type FormEvent } from "react";
import {
  MAX_RANGE_DAYS,
  POWER_FIRST_DAY,
  PRECIP_PRESETS,
  expectedLatestDay,
  presetRange,
  windowDays,
  type PrecipWindow,
} from "../data/precip";
import { useWorkspace, useWorkspaceDispatch, type PrecipMode } from "../store";
import { t } from "../strings";
import { Segmented } from "../ui/Segmented";
import { formatDay } from "./format";

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
 * picks (a quick preset or custom dates). The day itself, playback and the point chart live in the
 * timeline dock above the nav bar (see `TimelineDock`).
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
      {precipMode === "latest" ? (
        <p className="text-[11px] leading-snug text-muted">{s.latestHint}</p>
      ) : (
        <Timeframe />
      )}
    </div>
  );
}

function Timeframe() {
  const { precipRange } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const s = t.browser.precip;
  const setRange = (range: PrecipWindow) => dispatch({ type: "setPrecipRange", range });
  const selectedPreset =
    PRECIP_PRESETS.map((days) => ({ days, range: presetRange(days) })).find(
      ({ range }) => range.start === precipRange.start && range.end === precipRange.end,
    )?.days ?? "";

  return (
    <div className="space-y-3">
      <Segmented<string>
        label={s.presetsLabel}
        value={`${selectedPreset}`}
        options={PRECIP_PRESETS.map((days) => ({
          value: `${days}`,
          label: s.presetShort(days),
          ariaLabel: s.presetLabel(days),
        }))}
        onChange={(days) => setRange(presetRange(Number(days)))}
      />
      {/* Keyed by the range so the draft resets whenever a preset (or Apply) changes it. */}
      <RangeForm key={`${precipRange.start}-${precipRange.end}`} range={precipRange} onApply={setRange} />
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
    "h-8 max-lg:h-11 w-full min-w-0 rounded-md border border-input bg-surface px-1.5 font-mono text-xs text-text tabular focus-visible:border-accent";

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
