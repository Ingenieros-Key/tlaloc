"use client";

import { useState } from "react";
import { RATING_THRESHOLDS } from "../data/crops";
import { SEASONS, type SeasonName } from "../data/rotation";
import { t } from "../strings";
import type { MonthScore } from "../types";

const s = t.inspector.monthly;

/** The planting season a calendar month belongs to; null = the dry season (December–April). */
export function seasonOfMonth(month: number): SeasonName | null {
  for (const [name, { first, last }] of Object.entries(SEASONS) as [SeasonName, (typeof SEASONS)[SeasonName]][]) {
    if (month >= first && month <= last) return name;
  }
  return null;
}

/** Season band fills: two tints of the accent for the planting seasons, none for the dry season. */
const BAND: Readonly<Record<SeasonName, string>> = { primera: "fill-accent/10", postrera: "fill-accent/25" };

const W = 280;
const H = 62;
const PAD = { left: 18, right: 2, top: 4, bottom: 13 } as const;

/**
 * A crop's viability month by month across the climate years, each month scored on the 12 months
 * ending with it, over bands for Primera, Postrera and the dry season. Dashed lines mark the
 * Good and Fair thresholds. Months not measured yet run on dashed, through the next 12: their
 * windows fill the unmeasured months with the 5-year monthly averages.
 */
export function MonthlyScoreChart({ crop, months }: { readonly crop: string; readonly months: readonly MonthScore[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (months.length < 2) return null;

  const step = (W - PAD.left - PAD.right) / months.length;
  const x = (i: number) => PAD.left + (i + 0.5) * step;
  const y = (score: number) => PAD.top + (1 - score / 100) * (H - PAD.top - PAD.bottom);
  // The projected line starts at the last measured point, so the two lines join.
  const firstProjected = months.findIndex((m) => m.projected);
  const path = (include: (m: MonthScore, i: number) => boolean) => {
    let d = "";
    months.forEach((m, i) => {
      if (m.score === null || !include(m, i)) {
        d += " ";
        return;
      }
      d += `${d === "" || d.endsWith(" ") ? "M" : "L"}${x(i).toFixed(1)},${y(m.score).toFixed(1)}`;
    });
    return d.trim();
  };
  const measuredPath = path((m) => !m.projected);
  const projectedPath = firstProjected < 0 ? "" : path((m, i) => m.projected || i === firstProjected - 1);

  const scored = months.filter((m): m is MonthScore & { score: number } => m.score !== null && !m.projected);
  const low = scored.reduce((min, m) => (m.score < min.score ? m : min), scored[0]);
  const high = scored.reduce((max, m) => (m.score > max.score ? m : max), scored[0]);
  const last = months.at(-1);
  const end = last?.projected && last.score !== null ? last : null;
  const label = (m: MonthScore) => `${t.rotation.monthShort(m.month)} ${m.year}`;
  const seasonLabel = (month: number) => {
    const name = seasonOfMonth(month);
    return name ? t.rotation.seasons[name] : t.rotation.dry;
  };

  const current = active === null ? null : months[active];
  const readout = current
    ? s.readout(
        label(current),
        current.score === null ? s.noScore : String(current.score),
        seasonLabel(current.month),
        current.projected,
      )
    : low && high
      ? s.range(String(low.score), label(low), String(high.score), label(high))
      : "";

  return (
    <div className="mt-3 border-t border-line pt-2">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted">{s.title}</span>
        <span className="text-[11px] text-muted">{s.basis}</span>
      </div>
      <p aria-live="polite" className="mt-0.5 min-h-4 text-[11px] text-text">
        {readout}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 block w-full"
        role="img"
        aria-label={s.chartLabel(
          crop,
          low ? `${low.score} (${label(low)})` : "",
          high ? `${high.score} (${label(high)})` : "",
          end ? `${end.score} (${label(end)})` : null,
        )}
        onMouseLeave={() => setActive(null)}
      >
        {months.map((m, i) => {
          const name = seasonOfMonth(m.month);
          return name ? (
            <rect
              key={i}
              x={PAD.left + i * step}
              y={PAD.top}
              width={step + 0.2}
              height={H - PAD.top - PAD.bottom}
              className={BAND[name]}
            />
          ) : null;
        })}
        {[RATING_THRESHOLDS.good, RATING_THRESHOLDS.fair].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              className="stroke-line-strong"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text x={PAD.left - 3} y={y(v) + 3} textAnchor="end" className="fill-muted font-mono text-[8px]">
              {v}
            </text>
          </g>
        ))}
        {firstProjected > 0 ? (
          <g>
            <line
              x1={PAD.left + firstProjected * step}
              x2={PAD.left + firstProjected * step}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-muted"
              strokeWidth="1"
            />
            <text
              x={PAD.left + firstProjected * step + 2}
              y={PAD.top + 7}
              className="fill-muted text-[8px]"
            >
              {s.projected}
            </text>
          </g>
        ) : null}
        <path d={measuredPath} fill="none" className="stroke-text" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {projectedPath ? (
          <path
            d={projectedPath}
            fill="none"
            className="stroke-text"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            strokeLinejoin="round"
          />
        ) : null}
        {current && current.score !== null ? (
          <>
            <line x1={x(active!)} x2={x(active!)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-text/40" strokeWidth="1" />
            <circle cx={x(active!)} cy={y(current.score)} r="3" className="fill-text stroke-surface-2" strokeWidth="1.5" />
          </>
        ) : null}
        {months.map((m, i) =>
          m.month === 1 ? (
            <text key={i} x={PAD.left + i * step + 1} y={H - 3} className="fill-muted font-mono text-[8px]">
              {m.year}
            </text>
          ) : null,
        )}
        {/* Hover targets: one column per month. */}
        {months.map((m, i) => (
          <rect
            key={`hit-${i}`}
            x={PAD.left + i * step}
            y={PAD.top}
            width={step}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={() => setActive(i)}
          />
        ))}
      </svg>
    </div>
  );
}

/** Key for the monthly charts' season bands, shown once above the crop cards. */
export function SeasonBandsLegend() {
  return (
    <ul aria-label={s.legendLabel} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="12" height="10">
          <rect width="12" height="10" rx="2" className="fill-accent/10 stroke-line" />
        </svg>
        {t.rotation.seasons.primera}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="12" height="10">
          <rect width="12" height="10" rx="2" className="fill-accent/25 stroke-line" />
        </svg>
        {t.rotation.seasons.postrera}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="12" height="10">
          <rect width="12" height="10" rx="2" className="fill-transparent stroke-line" />
        </svg>
        {t.rotation.dry}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="14" height="10">
          <line x1="0" y1="5" x2="14" y2="5" className="stroke-line-strong" strokeDasharray="2 2" />
        </svg>
        {s.thresholds}
      </li>
      <li className="flex items-center gap-1.5">
        <svg aria-hidden="true" width="14" height="10">
          <line x1="0" y1="5" x2="14" y2="5" className="stroke-text" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
        {s.projectedKey}
      </li>
    </ul>
  );
}
