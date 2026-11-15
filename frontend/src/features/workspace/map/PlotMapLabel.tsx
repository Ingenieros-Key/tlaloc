"use client";

import { t } from "../strings";
import type { CropId, Rating } from "../types";
import { CropIcon } from "../ui/CropIcon";

export type PlotBestCrop = { readonly crop: CropId; readonly score: number; readonly rating: Rating };
export type PlotReading = { readonly value: string; readonly day: string };

const RATING_TEXT: Readonly<Record<Rating, string>> = {
  good: "text-good",
  fair: "text-fair",
  poor: "text-poor",
};
const RATING_RING: Readonly<Record<Rating, string>> = {
  good: "border-good",
  fair: "border-fair",
  poor: "border-poor",
};

/**
 * The plot's label on the map. Up close: a chip with the best crop's icon, the name and the score
 * (plus, in focus, the day's value in large type). Zoomed out, when the plot is only a few pixels
 * across: a round marker with the crop icon, colored by its rating, and the name and score below.
 * Decorative for screen readers; the Browser and Inspector hold the same facts.
 */
export function PlotMapLabel({
  name,
  best,
  reading,
  compact,
}: {
  readonly name: string;
  /** Null while the outlook runs, or when the plot is outside the data. */
  readonly best: PlotBestCrop | null;
  /** Focus only: the day's value under the plot. */
  readonly reading: PlotReading | null;
  readonly compact: boolean;
}) {
  const cropName = best ? t.common.crops[best.crop] : null;

  if (compact) {
    return (
      <div aria-hidden="true" className="pointer-events-none flex flex-col items-center gap-0.5">
        <span
          className={`grid size-8 place-items-center rounded-full border-2 bg-surface/95 shadow-md shadow-black/40 ${
            best ? RATING_RING[best.rating] : "border-accent"
          }`}
        >
          {best ? (
            <CropIcon crop={best.crop} className={`size-[18px] ${RATING_TEXT[best.rating]}`} />
          ) : (
            <span className="size-2 rounded-full bg-accent" />
          )}
        </span>
        <span className="max-w-48 truncate whitespace-nowrap rounded bg-surface/90 px-1.5 py-px text-[11px] font-medium text-text shadow-sm shadow-black/30">
          {best ? `${name} · ${cropName} ${best.score}` : name}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none flex max-w-72 flex-col items-center gap-0.5 rounded-md border border-line-strong bg-surface/90 px-2 py-1 text-xs font-medium text-text shadow-md shadow-black/30 backdrop-blur-sm"
    >
      <span className="flex max-w-full items-center gap-1.5 whitespace-nowrap">
        {best ? (
          <CropIcon crop={best.crop} className={`size-4 shrink-0 ${RATING_TEXT[best.rating]}`} />
        ) : (
          <span className="size-2 shrink-0 rounded-full bg-accent" />
        )}
        <span className="truncate">{name}</span>
        {best ? (
          <span className={`shrink-0 ${RATING_TEXT[best.rating]}`}>
            · {cropName} {best.score}
          </span>
        ) : null}
      </span>
      {reading ? (
        <span className="whitespace-nowrap font-mono text-base font-medium leading-tight text-text tabular">
          {reading.value}
          <span className="ml-1 font-sans text-[11px] font-normal text-muted">{t.map.plotReading(reading.day)}</span>
        </span>
      ) : null}
    </div>
  );
}
