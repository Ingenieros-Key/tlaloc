import { CircleCheck, TriangleAlert } from "lucide-react";
import { RATING_THRESHOLDS } from "../data/crops";
import { LAYERS } from "../layers";
import { useWorkspace } from "../store";
import { t } from "../strings";
import type { CropAssessment, FactorScore } from "../types";
import { Badge } from "../ui/Badge";
import { formatWithUnit } from "./format";

function barColor(score: number): string {
  if (score >= RATING_THRESHOLDS.good) return "bg-good";
  if (score >= RATING_THRESHOLDS.fair) return "bg-fair";
  return "bg-poor";
}

const RATING_TEXT = { good: "text-good", fair: "text-fair", poor: "text-poor" } as const;

function limitingSentence(assessment: CropAssessment): string {
  const factor = assessment.factors.find((f) => f.layer === assessment.limiting);
  if (!factor) return t.inspector.allWithin;
  const layer = t.common.layers[factor.layer];
  const crop = t.common.crops[assessment.crop];
  switch (factor.position) {
    case "below":
      return t.inspector.limitingBelow(layer, crop);
    case "above":
      return t.inspector.limitingAbove(layer, crop);
    case "within":
      return t.inspector.limitingWithin(layer, crop);
  }
}

/** Planting-outlook card for one crop: score, rating, per-factor fit and the limiting factor. */
export function CropCard({
  assessment,
  best = false,
}: {
  readonly assessment: CropAssessment;
  /** Highest-scoring crop for the plot (every crop tied for the top score is marked). */
  readonly best?: boolean;
}) {
  const showLimiting = useWorkspace().display.limiting;
  const nameId = `crop-${assessment.crop}-title`;
  const allWithin = assessment.limiting === null;
  const LimitIcon = allWithin ? CircleCheck : TriangleAlert;

  return (
    <article
      aria-labelledby={nameId}
      className={`rounded-lg border bg-surface-2 p-3 ${best ? "border-accent/50" : "border-line"}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 id={nameId} className="font-display text-sm font-semibold text-text">
              {t.common.crops[assessment.crop]}
            </h4>
            {best ? <Badge tone="accent">{t.inspector.bestMatch}</Badge> : null}
          </div>
          <Badge tone={assessment.rating}>{t.common.ratings[assessment.rating]}</Badge>
        </div>
        <p className="flex shrink-0 items-baseline gap-0.5">
          <span aria-hidden="true" className="font-display text-[28px] font-semibold leading-none text-text tabular">
            {assessment.score}
          </span>
          <span aria-hidden="true" className="font-mono text-xs text-muted">
            {t.inspector.outOf100}
          </span>
          <span className="sr-only">{t.inspector.scoreLabel(assessment.score)}</span>
        </p>
      </header>
      <ul className="mt-3 space-y-2">
        {assessment.factors.map((factor) => (
          <FactorRow key={factor.layer} factor={factor} years={yearsLabel(assessment)} />
        ))}
      </ul>
      {assessment.years && assessment.years.length > 1 ? <YearRow assessment={assessment} /> : null}
      {showLimiting ? (
        <p className="mt-3 flex items-start gap-1.5 border-t border-line pt-2 text-xs text-muted">
          <LimitIcon
            aria-hidden="true"
            strokeWidth={1.75}
            className={`mt-px size-3.5 shrink-0 ${allWithin ? "text-good" : "text-fair"}`}
          />
          <span>{limitingSentence(assessment)}</span>
        </p>
      ) : null}
    </article>
  );
}

/** The years behind the climate average, e.g. "2021–2025". */
function yearsLabel(assessment: CropAssessment): string {
  const years = assessment.years ?? [];
  if (years.length === 0) return "";
  return t.inspector.yearRange(years[0].year, years[years.length - 1].year);
}

/** The crop scored on each year behind the average: how steady the fit is from year to year. */
function YearRow({ assessment }: { readonly assessment: CropAssessment }) {
  const years = assessment.years ?? [];
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-xs">
      <span className="shrink-0 text-muted">{t.inspector.byYear}</span>
      <ul aria-label={t.inspector.byYearLabel(t.common.crops[assessment.crop])} className="ml-auto flex gap-1">
        {years.map(({ year, score, rating }) => (
          <li
            key={year}
            title={t.inspector.yearScore(year, score, t.common.ratings[rating])}
            className="flex flex-col items-center rounded bg-surface px-1.5 py-0.5 leading-tight ring-1 ring-inset ring-line"
          >
            <span aria-hidden="true" className="font-mono text-[10px] text-muted tabular">
              {String(year).slice(2)}
            </span>
            <span aria-hidden="true" className={`font-mono font-medium tabular ${RATING_TEXT[rating]}`}>
              {score}
            </span>
            <span className="sr-only">{t.inspector.yearScore(year, score, t.common.ratings[rating])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FactorRow({ factor, years }: { readonly factor: FactorScore; readonly years: string }) {
  const name = t.common.layers[factor.layer];
  const score = Math.round(factor.score);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-muted">{name}</span>
          {factor.source === "nasa" ? (
            <span
              title={t.inspector.sourceHints[factor.layer](years)}
              className="shrink-0 rounded px-1 text-[11px] font-medium leading-4 text-accent ring-1 ring-inset ring-accent/40"
            >
              {t.inspector.nasaSource}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 whitespace-nowrap">
          <span className="font-mono text-text tabular">{formatWithUnit(LAYERS[factor.layer], factor.value)}</span>
          <span className={`ml-1.5 font-medium ${factor.position === "within" ? "text-good" : "text-fair"}`}>
            {t.inspector.positions[factor.position]}
          </span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={t.inspector.factorFit(name)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={t.inspector.factorFitValue(score)}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div className={`h-full rounded-full ${barColor(score)}`} style={{ width: `${score}%` }} />
      </div>
    </li>
  );
}
