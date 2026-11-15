"use client";

import { Check, X } from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import {
  CROP_COLORS,
  SEASONS,
  buildPlan,
  planMetrics,
  seasonOfSowing,
  startChoices,
  type RotationCrop,
  type RotationPlan,
  type RotationStep,
  type Season,
} from "../data/rotation";
import { useRotation } from "../hooks/useRotation";
import { cropName, seasonLabel } from "../panels/rotationFormat";
import { browserVisible, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";

const s = t.rotation.lanes;

type Steps = Extract<RotationPlan, { kind: "plan" }>["steps"];

/**
 * One column of the axis: a sowing season, or the rest between two (the dry season, or the wait
 * before the first sowing). Columns are not to scale: a season gets the room its crop's name
 * needs, a rest less, and the months inside each share it evenly.
 */
type Segment = {
  /** Its first month and how many months it holds, as serials (see `serial`). */
  readonly first: number;
  readonly months: number;
  readonly season: Season | null;
};

/** A bar on the axis: a crop, the farmer's own last planting, or a rest. */
type Block = {
  /** The segment it starts in, and how many segments it spans. */
  readonly start: number;
  readonly span: number;
  readonly kind: "crop" | "planted" | "rest";
  readonly crop?: RotationCrop;
  readonly label: string;
};

/** Relative widths of a season column and a rest column, and the least a unit may be. */
const SEASON_WEIGHT = 1;
const REST_WEIGHT = 0.7;
const UNIT_MIN_PX = 52;

/** Months since year 0, so seasons in different years line up on one axis. */
function serial(year: number, month: number): number {
  return year * 12 + (month - 1);
}

/** How far back a last planting may end and still be drawn at the start of the axis. */
const PLANTED_WITHIN_MONTHS = 6;

/** Rows share these columns: the plan's name, the month axis, then its ratings and the pick. */
const ROW = "grid grid-cols-[132px_minmax(0,1fr)_212px] items-center gap-x-3";
/** Width of everything in a row but the axis: the two fixed columns and the gaps between the three. */
const ROW_FIXED_PX = 132 + 212 + 2 * 12;
const METRICS = "grid grid-cols-[44px_64px_32px_1fr] items-center gap-x-2";

/** The axis from `from` to the end of the last season: each season a column, each gap a rest. */
function segmentsFor(from: number, seasons: readonly Season[]): Segment[] {
  const out: Segment[] = [];
  let cursor = from;
  for (const season of seasons) {
    const first = serial(season.year, SEASONS[season.name].first);
    const last = serial(season.year, SEASONS[season.name].last);
    if (first > cursor) out.push({ first: cursor, months: first - cursor, season: null });
    const start = Math.max(first, cursor);
    out.push({ first: start, months: last - start + 1, season });
    cursor = last + 1;
  }
  return out;
}

function blocksFor(steps: Steps, segments: readonly Segment[], planted: RotationCrop | null): Block[] {
  const blocks: Block[] = [];
  let caneFrom: number | null = null;
  segments.forEach((segment, i) => {
    if (caneFrom !== null) return;
    if (!segment.season) {
      blocks.push({ start: i, span: 1, kind: "rest", label: s.rest });
      return;
    }
    const step = steps.find((candidate) => candidate.season.index === segment.season?.index);
    if (!step) {
      // The only season on the axis that is not a step is the farmer's own last planting.
      if (planted) blocks.push({ start: i, span: 1, kind: "planted", crop: planted, label: cropName(planted) });
      return;
    }
    if (step.crop === "sugarcane") {
      // Cane holds the field from here on, through the dry seasons too.
      caneFrom = i;
      blocks.push({ start: i, span: segments.length - i, kind: "crop", crop: "sugarcane", label: s.cane });
      return;
    }
    blocks.push({ start: i, span: 1, kind: "crop", crop: step.crop, label: cropName(step.crop) });
  });
  return blocks;
}

const LEVEL_TONE = { good: "text-good", poor: "text-poor", mid: "text-text" } as const;

/**
 * Plan lanes: the rotations that start from each of the first season's options (the sheet's 1st,
 * 2nd and 3rd follow-up), side by side on one month axis under the plot's NASA rainfall. Opened by
 * "Compare plans" in the Rotation tab; sits where the timeline is while open. Narrow screens scroll
 * it sideways.
 */
export function RotationLanes() {
  const state = useWorkspace();
  const { planting, priority, rotationStart, rotationSeasons, plotRain, plotName } = state;
  const dispatch = useWorkspaceDispatch();
  const { plan, fits, today } = useRotation();

  const lanes = useMemo(() => {
    if (!planting || !plan || plan.kind !== "plan") return [];
    return Array.from({ length: startChoices(plan) }, (_, start) => {
      const lane = buildPlan({ planting, priority, fits, today, seasons: rotationSeasons, start });
      return lane.kind === "plan" ? lane.steps : [];
    });
  }, [planting, plan, priority, fits, today, rotationSeasons]);

  if (!planting || !plan || plan.kind !== "plan" || lanes.length === 0) return null;

  const seasons = plan.steps.map((step) => step.season);
  const now = serial(today.year, today.month);

  // The farmer's own last planting opens the axis when it ended recently enough to matter.
  let axisStart = now;
  let planted: RotationCrop | null = null;
  const axisSeasons = [...seasons];
  if (planting.crop !== "other" && planting.crop !== "sugarcane" && planting.sowMonth !== null && planting.sowYear !== null) {
    const sown = seasonOfSowing(planting.sowMonth, planting.sowYear);
    const first = serial(sown.season.year, SEASONS[sown.season.name].first);
    const last = serial(sown.season.year, SEASONS[sown.season.name].last);
    if (!sown.offSeason && last >= now - PLANTED_WITHIN_MONTHS && first <= now) {
      axisStart = first;
      planted = planting.crop;
      axisSeasons.unshift(sown.season);
    }
  }
  const segments = segmentsFor(axisStart, axisSeasons);
  const weights = segments.map((segment) => (segment.season ? SEASON_WEIGHT : REST_WEIGHT));
  const units = weights.reduce((sum, w) => sum + w, 0);
  const columns: CSSProperties = {
    gridTemplateColumns: weights.map((w) => `minmax(0, ${w}fr)`).join(" "),
  };
  // Narrower than this the crop names stop fitting, so the dock scrolls sideways instead.
  const minWidth = ROW_FIXED_PX + Math.round(units * UNIT_MIN_PX);
  // Today, as a share of the axis: the columns before it, plus its place inside its own column.
  let todayUnits = 0;
  for (const [i, segment] of segments.entries()) {
    if (now >= segment.first + segment.months) {
      todayUnits += weights[i];
      continue;
    }
    todayUnits += weights[i] * Math.min(1, Math.max(0, (now - segment.first + (today.day - 1) / 30) / segment.months));
    break;
  }
  const todayLeft = `${(todayUnits / units) * 100}%`;

  const rainMax = plotRain ? Math.max(1, ...plotRain) : 1;
  const wettest = plotRain ? plotRain.indexOf(Math.max(...plotRain)) + 1 : 0;
  const driest = plotRain ? plotRain.indexOf(Math.min(...plotRain)) + 1 : 0;

  const margin = browserVisible(state)
    ? "lg:ml-[calc(var(--tl-rail-w)+var(--tl-browser-w)+0.75rem)]"
    : "lg:ml-[calc(var(--tl-rail-w)+0.25rem)]";

  return (
    <section
      aria-label={`${s.title}: ${plotName}`}
      className={`pointer-events-auto mb-2 self-stretch rounded-xl border border-line bg-surface/95 shadow-xl shadow-black/30 backdrop-blur lg:mr-[calc(var(--tl-inspector-w)+0.5rem)] ${margin}`}
    >
      <header className="flex h-10 items-center gap-2 border-b border-line pl-3 pr-1">
        <h2 className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">{s.title}</h2>
        <span className="min-w-0 truncate text-[13px] font-semibold">{plotName}</span>
        <button
          type="button"
          aria-label={s.close}
          title={s.close}
          onClick={() => dispatch({ type: "setLanesOpen", open: false })}
          className="ml-auto inline-flex size-8 max-lg:size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-3 hover:text-text"
        >
          <X aria-hidden="true" strokeWidth={1.75} className="size-4" />
        </button>
      </header>

      <div className="overflow-x-auto px-3 pb-2 pt-2">
        <div className="flex flex-col gap-1 text-xs" style={{ minWidth }}>
          {/* Season names over their months, and the rating column headings. */}
          <div className={ROW}>
            <span />
            <div className="grid items-end" style={columns}>
              {segments.map((segment) =>
                segment.season ? (
                  <span key={segment.first} title={seasonLabel(segment.season)} className="flex min-w-0 flex-col pl-1 leading-tight">
                    <span className="truncate text-[11px] font-medium">{t.rotation.seasons[segment.season.name]}</span>
                    <span className="font-mono text-[11px] text-muted">{segment.season.year}</span>
                  </span>
                ) : (
                  <span key={segment.first} />
                ),
              )}
            </div>
            <div className={`${METRICS} text-[11px] font-medium text-muted`}>
              <span>{s.soil}</span>
              <span>{s.water}</span>
              <span>{s.fit}</span>
              <span />
            </div>
          </div>

          {/* The plot's rainfall, month by month, so the seasons can be read against the rains. */}
          <div className={ROW}>
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{s.rain}</span>
              <span className="text-[11px] text-muted">{plotRain ? s.rainSource : s.rainLoading}</span>
            </div>
            <div
              role="img"
              aria-label={plotRain ? s.rainLabel(t.rotation.month(wettest), t.rotation.month(driest)) : s.rainLoading}
              className="relative grid h-8 border-b border-line"
              style={columns}
            >
              {segments.map((segment) => (
                <span key={segment.first} className="flex h-full items-end gap-px px-px">
                  {Array.from({ length: segment.months }, (_, m) => (
                    <span
                      key={m}
                      className="min-w-0 flex-1 rounded-t-sm bg-[#4aa3e8]"
                      style={{
                        height: plotRain ? `${Math.max(4, (plotRain[(segment.first + m) % 12] / rainMax) * 100)}%` : "4%",
                      }}
                    />
                  ))}
                </span>
              ))}
              <TodayLine left={todayLeft} label />
            </div>
            <span />
          </div>

          {lanes.map((steps, i) => (
            <Lane
              key={i}
              index={i}
              steps={steps}
              blocks={blocksFor(steps, segments, planted)}
              columns={columns}
              todayLeft={todayLeft}
              chosen={i === rotationStart}
              onChoose={() => dispatch({ type: "setRotationStart", start: i })}
            />
          ))}

          <p className="flex flex-wrap gap-x-4 gap-y-0.5 pt-1 text-[11px] text-muted">
            {planted ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-3.5 rounded-sm border border-dashed border-text/60" />
                {s.planted}
              </span>
            ) : null}
            <span>
              {t.rotation.scope} {t.rotation.sampleNote}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function TodayLine({ left, label = false }: { readonly left: string; readonly label?: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-text" style={{ left }}>
      {label ? (
        <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded-sm bg-surface px-1 text-[11px] font-semibold leading-tight">
          {s.today}
        </span>
      ) : null}
    </span>
  );
}

function Lane({
  index,
  steps,
  blocks,
  columns,
  todayLeft,
  chosen,
  onChoose,
}: {
  readonly index: number;
  readonly steps: readonly RotationStep[];
  readonly blocks: readonly Block[];
  readonly columns: CSSProperties;
  readonly todayLeft: string;
  readonly chosen: boolean;
  readonly onChoose: () => void;
}) {
  const first = steps[0];
  const option = first.options[first.choice];
  const metrics = planMetrics(steps);
  const sown = steps.filter((step) => !step.continues).map((step) => cropName(step.crop));
  const summary = s.summary(s.lane(index + 1), new Intl.ListFormat("en-US", { style: "narrow", type: "unit" }).format(sown));
  return (
    <div
      role="group"
      aria-label={summary}
      className={`${ROW} rounded-lg py-1 ${chosen ? "bg-accent/10 ring-1 ring-inset ring-accent/60" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2 pl-1.5">
        <span
          aria-hidden="true"
          className={`grid size-[22px] shrink-0 place-items-center rounded-full font-mono text-[11px] font-medium ${
            chosen ? "bg-accent text-on-accent" : "bg-surface-3 text-text"
          }`}
        >
          {index + 1}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-semibold">{s.startsWith(cropName(first.crop))}</span>
          <span className="truncate text-[11px] text-muted">
            {option.sheetRank === null ? s.byFit : s.sheetRank(option.sheetRank)}
          </span>
        </span>
      </div>

      <div className="relative grid gap-y-0" style={columns}>
        {blocks.map((block) => (
          <LaneBlock key={`${block.kind}-${block.start}`} block={block} />
        ))}
        <TodayLine left={todayLeft} />
      </div>

      <div className={METRICS}>
        <span className={`font-semibold ${LEVEL_TONE[metrics.soil === 3 ? "good" : metrics.soil === 1 ? "poor" : "mid"]}`}>
          {s.levels[metrics.soil]}
        </span>
        <span className={`font-semibold ${LEVEL_TONE[metrics.water === 1 ? "good" : metrics.water === 3 ? "poor" : "mid"]}`}>
          {s.levels[metrics.water]}
        </span>
        <span className="font-mono text-[13px] tabular">{metrics.fit ?? "–"}</span>
        {chosen ? (
          <span className="inline-flex items-center gap-1 font-semibold text-accent">
            <Check aria-hidden="true" strokeWidth={2.5} className="size-3.5" />
            {t.rotation.chosen}
          </span>
        ) : (
          <button
            type="button"
            aria-label={s.choosePlan(index + 1)}
            onClick={onChoose}
            className="h-7 max-lg:h-11 cursor-pointer justify-self-start rounded-md border border-line-strong px-2 font-medium transition-colors duration-150 hover:bg-surface-3"
          >
            {t.rotation.choose}
          </button>
        )}
      </div>
    </div>
  );
}

function LaneBlock({ block }: { readonly block: Block }) {
  const place: CSSProperties = { gridColumn: `${block.start + 1} / span ${block.span}` };
  const base = "mx-px flex h-8 min-w-0 items-center justify-center rounded-md px-0.5 text-[11px] font-semibold";
  if (block.kind === "rest") {
    return (
      <span className={`${base} border border-dashed border-line-strong font-medium text-muted`} style={place}>
        <span className="truncate">{block.label}</span>
      </span>
    );
  }
  if (block.kind === "planted" && block.crop) {
    return (
      <span className={`${base} border border-dashed border-text/60`} style={place} title={block.label}>
        <span className="truncate">{block.label}</span>
      </span>
    );
  }
  // Crop fills are light in both themes, so their labels are always dark.
  return (
    <span
      className={`${base} text-[#0b1033]`}
      style={{ ...place, backgroundColor: block.crop ? CROP_COLORS[block.crop] : undefined }}
      title={block.label}
    >
      <span className="truncate">{block.label}</span>
    </span>
  );
}
