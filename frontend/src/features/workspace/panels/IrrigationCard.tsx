"use client";

import { CalendarDays, Droplets } from "lucide-react";
import { useState } from "react";
import { computeIrrigation, type IrrigationPlan } from "../data/irrigation";
import { useWorkspace } from "../store";
import { t } from "../strings";
import type { AnalysisState, CropId } from "../types";
import { IrrigationCalendar } from "./IrrigationCalendar";

const s = t.inspector.irrigation;

/** The plot's mean NASA climate, read off any crop's factor rows (they share the plot's values). */
function plotClimate(analysis: AnalysisState): { readonly tempC: number; readonly rainfallMmPerYear: number; readonly humidityPct: number } | null {
  if (analysis.status !== "done" || analysis.result.kind !== "ok") return null;
  const factors = analysis.result.crops[0]?.factors;
  if (!factors) return null;
  const value = (layer: string) => factors.find((f) => f.layer === layer)?.value;
  const tempC = value("temp");
  const rainfallMmPerYear = value("rain");
  const humidityPct = value("humidity");
  if (tempC === undefined || rainfallMmPerYear === undefined || humidityPct === undefined) return null;
  return { tempC, rainfallMmPerYear, humidityPct };
}

const liters = (value: number) => s.liters(Math.round(value).toLocaleString("en-US"));
const minutes = (value: number) => s.minutes(Math.max(1, Math.round(value)).toLocaleString("en-US"));

/**
 * Inspector card with the irrigation plan for the plot's selected crop: volume, frequency, run
 * time and the soil-moisture band to aim for, plus a toggle that opens a read-only calendar.
 * Renders nothing until there is a plot, a real crop and the plot's climate.
 */
export function IrrigationCard() {
  const { plotSummary, planting, analysis } = useWorkspace();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const crop = planting?.crop;
  if (!plotSummary || !crop || crop === "other") return null;
  const climate = plotClimate(analysis);
  if (!climate) return <Waiting />;

  const plan = computeIrrigation({ areaHa: plotSummary.areaHa, crop: crop as CropId, ...climate, soilMoisturePct: climate.humidityPct });
  return (
    <article aria-labelledby="irrigation-heading" className="rounded-lg border border-line bg-surface-2 p-3">
      <header className="mb-2 flex items-center gap-1.5">
        <Droplets aria-hidden="true" strokeWidth={1.75} className="size-4 text-accent" />
        <h4 id="irrigation-heading" className="font-display text-sm font-semibold text-text">
          {s.heading}
        </h4>
      </header>
      {plan.rainfed ? <Rainfed plan={plan} /> : <Plan plan={plan} />}
      {!plan.rainfed ? (
        <>
          <button
            type="button"
            aria-expanded={calendarOpen}
            onClick={() => setCalendarOpen((open) => !open)}
            className="mt-3 inline-flex h-9 max-lg:h-11 cursor-pointer items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-xs font-semibold transition-colors duration-150 hover:bg-surface-3"
          >
            <CalendarDays aria-hidden="true" strokeWidth={1.75} className="size-4" />
            {calendarOpen ? s.calendar.close : s.calendar.open}
          </button>
          {calendarOpen ? <IrrigationCalendar plan={plan} /> : null}
        </>
      ) : null}
      <p className="mt-3 border-t border-line pt-2 text-[11px] leading-snug text-muted">{s.note}</p>
    </article>
  );
}

function Waiting() {
  return (
    <article aria-labelledby="irrigation-heading" className="rounded-lg border border-line bg-surface-2 p-3">
      <header className="mb-2 flex items-center gap-1.5">
        <Droplets aria-hidden="true" strokeWidth={1.75} className="size-4 text-muted" />
        <h4 id="irrigation-heading" className="font-display text-sm font-semibold text-text">
          {s.heading}
        </h4>
      </header>
      <p className="text-xs text-muted">{s.needData}</p>
    </article>
  );
}

function Rainfed({ plan }: { readonly plan: IrrigationPlan }) {
  const [low, high] = plan.targetSoilMoisturePct;
  return (
    <div className="space-y-2 text-[13px]">
      <p className="text-xs text-text">{s.rainfed}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted">{s.target}</dt>
        <dd className="text-right font-mono tabular">{s.moistureBand(Math.round(low), Math.round(high))}</dd>
      </dl>
    </div>
  );
}

function Plan({ plan }: { readonly plan: IrrigationPlan }) {
  const [low, high] = plan.targetSoilMoisturePct;
  const freq = s.frequencyValue(s.timesPerDay(plan.timesPerDay), s.daysPerWeek(plan.daysPerWeek));
  return (
    <div className="space-y-2.5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        <dt className="text-muted">{s.volume}</dt>
        <dd className="text-right font-mono tabular">{liters(plan.litersPerIrrigation)}</dd>
        <dt className="text-muted">{s.frequency}</dt>
        <dd className="text-right tabular">{freq}</dd>
        <dt className="text-muted">{s.duration}</dt>
        <dd className="text-right font-mono tabular">{minutes(plan.minutesPerIrrigation)}</dd>
        <dt className="text-muted">{s.target}</dt>
        <dd className="text-right font-mono tabular">{s.moistureBand(Math.round(low), Math.round(high))}</dd>
      </dl>
      <p className="text-xs text-muted">{s.summary(Math.round(plan.litersPerIrrigation).toLocaleString("en-US"), freq, Math.max(1, Math.round(plan.minutesPerIrrigation)).toLocaleString("en-US"))}</p>
    </div>
  );
}
