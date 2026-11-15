"use client";

import { useId, useMemo, useState } from "react";
import { CLIMATE_FACTORS, type ClimateFactor } from "../data/climate";
import {
  projectedMonths,
  type ClimateCycles,
  type FactorCycle,
  type YearMonth,
} from "../data/cycles";
import { useWorkspace } from "../store";
import { t } from "../strings";

const s = t.climate;

/** Decimal places per factor: rainfall in whole millimetres, temperature to a tenth. */
const PRECISION: Readonly<Record<ClimateFactor, number>> = {
  rain: 0,
  temp: 1,
  humidity: 0,
};

function format(factor: ClimateFactor, value: number | null): string {
  if (value === null) return s.noValue;
  const digits = PRECISION[factor];
  const number = value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${number} ${s.factors[factor].unit}`;
}

function monthLabel({ year, month }: YearMonth): string {
  return `${t.rotation.monthShort(month)} ${year}`;
}

/**
 * The plot's monthly climate: for rainfall, temperature and humidity, the next 12 months as each
 * month's average over the climate years (the projection), with the range across those years,
 * each year's own line and the last 12 measured months.
 */
export function ClimateTab() {
  const { plotCycles } = useWorkspace();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="px-3 py-3">
      <h3
        id={headingId}
        className="text-[11px] font-semibold uppercase tracking-wider text-muted"
      >
        {s.heading}
      </h3>
      {plotCycles.status === "loading" || plotCycles.status === "none" ? (
        <p role="status" className="mt-2 text-xs text-muted">
          {s.loading}
        </p>
      ) : null}
      {plotCycles.status === "error" ? (
        <p role="alert" className="mt-2 text-xs text-poor">
          {s.error}
        </p>
      ) : null}
      {plotCycles.status === "ready" ? (
        <Cycles cycles={plotCycles.cycles} />
      ) : null}
    </section>
  );
}

function Cycles({ cycles }: { readonly cycles: ClimateCycles }) {
  const { first, last } = cycles.range;
  const months = useMemo(() => projectedMonths(cycles.start), [cycles.start]);
  return (
    <div className="mt-1 space-y-3">
      <p className="text-xs leading-snug text-muted">{s.intro(first, last)}</p>
      <Legend first={first} last={last} />
      {CLIMATE_FACTORS.map((factor) => (
        <CycleChart
          key={factor}
          factor={factor}
          cycle={cycles.factors[factor]}
          months={months}
        />
      ))}
      <p className="text-[11px] text-muted">{s.hint}</p>
    </div>
  );
}

function Legend({
  first,
  last,
}: {
  readonly first: number;
  readonly last: number;
}) {
  return (
    <ul
      aria-label={s.legend.label}
      className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted"
    >
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="16" height="8" className="shrink-0">
          <line
            x1="0"
            y1="4"
            x2="16"
            y2="4"
            className="stroke-accent"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        {s.legend.expected(first, last)}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="16" height="8" className="shrink-0">
          <rect width="16" height="8" rx="2" className="fill-accent/15" />
        </svg>
        {s.legend.range}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="16" height="8" className="shrink-0">
          <line
            x1="0"
            y1="4"
            x2="16"
            y2="4"
            className="stroke-muted/50"
            strokeWidth="1"
          />
        </svg>
        {s.legend.years}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="16" height="8" className="shrink-0">
          <circle cx="8" cy="4" r="3.5" className="fill-text" />
        </svg>
        {s.legend.measured}
      </li>
    </ul>
  );
}

/** A round step (1, 2 or 5 × a power of ten) at or above `raw`. */
function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

const W = 280;
const H = 128;
const PAD = { left: 34, right: 6, top: 14, bottom: 18 } as const;

function CycleChart({
  factor,
  cycle,
  months,
}: {
  readonly factor: ClimateFactor;
  readonly cycle: FactorCycle;
  readonly months: readonly YearMonth[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const name = s.factors[factor];

  // Values in axis order: index i is the i-th month from now.
  const at = (values: readonly (number | null)[]) =>
    months.map(({ month }) => values[month - 1]);
  const mean = at(cycle.mean);
  const min = at(cycle.min);
  const max = at(cycle.max);
  const recent = months.map(({ month }) => cycle.recent[month - 1]);

  const all = [...min, ...max, ...recent.map((r) => r?.value ?? null)].filter(
    (v): v is number => v !== null,
  );
  const high = Math.max(...all);
  const low = Math.min(...all);
  // Rainfall rises from 0; temperature and humidity move in a band, so the axis spans it, padded.
  // Axis ends on round numbers, with the middle tick halfway, so the three labels read cleanly.
  const pad = Math.max((high - low) * 0.12, factor === "temp" ? 0.5 : 2);
  const step = niceStep(factor === "rain" ? high / 4 : (high + pad - (low - pad)) / 4);
  const y0 = factor === "rain" ? 0 : Math.floor((low - pad) / step) * step;
  const y1 = factor === "rain" ? Math.ceil((high * 1.04) / step) * step : Math.ceil((high + pad) / step) * step;

  const x = (i: number) => PAD.left + (i * (W - PAD.left - PAD.right)) / 11;
  const y = (v: number) =>
    PAD.top + (1 - (v - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);
  const line = (values: readonly (number | null)[], from = 0, to = 11) => {
    let d = "";
    for (let i = from; i <= to; i += 1) {
      const v = values[i];
      if (v === null || v === undefined) continue;
      d += `${d ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    }
    return d;
  };
  const bandOk = min.every((v) => v !== null) && max.every((v) => v !== null);
  const band = bandOk
    ? `${line(max)}${min
        .map((v, i) => [i, v] as const)
        .reverse()
        .map(([i, v]) => `L${x(i).toFixed(1)},${y(v as number).toFixed(1)}`)
        .join("")}Z`
    : "";
  // Where the axis crosses into next year: past years' own lines break there.
  const boundary = months.findIndex((m, i) => i > 0 && m.month === 1);
  const ticks = [y0, (y0 + y1) / 2, y1];

  const definedMeans = mean.filter((v): v is number => v !== null);
  const headline =
    factor === "rain"
      ? s.summary.rain(
          format(
            factor,
            definedMeans.reduce((sum, v) => sum + v, 0),
          ),
        )
      : s.summary[factor](
          format(
            factor,
            definedMeans.reduce((sum, v) => sum + v, 0) / definedMeans.length,
          ),
        );
  const wettest =
    factor === "rain" ? months[mean.indexOf(Math.max(...definedMeans))] : null;

  const i = active;
  const readout =
    i === null
      ? wettest
        ? s.wettest(t.rotation.month(wettest.month))
        : null
      : [
          s.readout(
            monthLabel(months[i]),
            format(factor, mean[i]),
            format(factor, min[i]),
            format(factor, max[i]),
          ),
          recent[i]
            ? s.readoutMeasured(
                monthLabel({ year: recent[i].year, month: months[i].month }),
                format(factor, recent[i].value),
              )
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <figure
      aria-labelledby={titleId}
      className="relative rounded-lg border border-line bg-surface-2 p-2.5"
    >
      <figcaption className="flex items-baseline justify-between gap-2">
        <span id={titleId} className="text-xs font-medium text-text">
          {name.title}{" "}
          <span className="font-normal text-muted">· {name.per}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-text tabular">
          {headline}
        </span>
      </figcaption>
      <p
        aria-live="polite"
        className="mt-0.5 min-h-8 text-[11px] leading-4 text-muted"
      >
        {readout}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 block w-full"
        role="img"
        aria-label={s.chartLabel(name.title)}
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              className="stroke-line"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={y(v) + 3}
              textAnchor="end"
              className="fill-muted font-mono text-[9px]"
            >
              {v.toLocaleString("en-US", {
                maximumFractionDigits: PRECISION[factor],
              })}
            </text>
          </g>
        ))}
        {boundary > 0 ? (
          <g>
            <line
              x1={(x(boundary - 1) + x(boundary)) / 2}
              x2={(x(boundary - 1) + x(boundary)) / 2}
              y1={PAD.top - 6}
              y2={H - PAD.bottom}
              className="stroke-line-strong"
              strokeDasharray="2 2"
            />
            <text
              x={(x(boundary - 1) + x(boundary)) / 2 + 3}
              y={PAD.top - 6}
              dominantBaseline="hanging"
              className="fill-muted font-mono text-[9px]"
            >
              {months[boundary].year}
            </text>
          </g>
        ) : null}
        {band ? <path d={band} className="fill-accent/15" /> : null}
        {cycle.years.map((year) => {
          const values = at(year.values);
          const split = boundary > 0 ? boundary : 12;
          return (
            <g
              key={year.year}
              className="stroke-muted/45"
              fill="none"
              strokeWidth="1"
            >
              <path d={line(values, 0, split - 1)} />
              {split < 12 ? <path d={line(values, split, 11)} /> : null}
            </g>
          );
        })}
        <path
          d={line(mean)}
          fill="none"
          className="stroke-accent"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {i !== null ? (
          <line
            x1={x(i)}
            x2={x(i)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            className="stroke-text/40"
            strokeWidth="1"
          />
        ) : null}
        {recent.map((r, k) =>
          r ? (
            <circle
              key={k}
              cx={x(k)}
              cy={y(r.value)}
              r="3.5"
              className="fill-text stroke-surface-2"
              strokeWidth="2"
            />
          ) : null,
        )}
        {months.map((m, k) => (
          <text
            key={k}
            x={x(k)}
            y={H - 4}
            textAnchor="middle"
            className={`font-mono text-[9px] ${k === 0 ? "fill-text font-semibold" : "fill-muted"}`}
          >
            {t.rotation.monthShort(m.month).slice(0, 1)}
          </text>
        ))}
        {/* Hover and keyboard targets: one column per month, wider than the marks. */}
        {months.map((m, k) => (
          <rect
            key={k}
            x={x(k) - (W - PAD.left - PAD.right) / 22}
            y={PAD.top}
            width={(W - PAD.left - PAD.right) / 11}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            tabIndex={0}
            aria-label={monthLabel(m)}
            className="cursor-crosshair outline-none focus-visible:fill-accent/10"
            onMouseEnter={() => setActive(k)}
            onFocus={() => setActive(k)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>
      {/* Tables ignore sr-only's 1px width, so the wrapper is the hidden element. */}
      <div className="sr-only">
        <table>
          <caption>{s.chartLabel(name.title)}</caption>
          <thead>
            <tr>
              <th scope="col">{s.table.month}</th>
              <th scope="col">{s.table.expected}</th>
              <th scope="col">{s.table.range}</th>
              <th scope="col">{s.table.measured}</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, k) => (
              <tr key={k}>
                <th scope="row">{monthLabel(m)}</th>
                <td>{format(factor, mean[k])}</td>
                <td>
                  {format(factor, min[k])} – {format(factor, max[k])}
                </td>
                <td>
                  {recent[k] ? format(factor, recent[k].value) : s.noValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
