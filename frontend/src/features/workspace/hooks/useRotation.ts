"use client";

import { useMemo, useState } from "react";
import { buildPlan, type Fits, type RotationPlan, type Today } from "../data/rotation";
import { useWorkspace } from "../store";

/** Today's date, read once: the rotation's seasons do not move while the page is open. */
export type RotationToday = Today & { readonly day: number };

/**
 * The plot's rotation: the plan built from the farmer's last planting, their priority and the
 * NASA climate fits of the planting outlook. `plan` is null until the last planting is known.
 */
export function useRotation(): { readonly plan: RotationPlan | null; readonly fits: Fits; readonly today: RotationToday } {
  const { planting, priority, analysis, rotationStart, rotationSeasons } = useWorkspace();
  const [today] = useState<RotationToday>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  });
  const fits = useMemo<Fits>(() => {
    if (analysis.status !== "done" || analysis.result.kind !== "ok") return {};
    return Object.fromEntries(analysis.result.crops.map((c) => [c.crop, { score: c.score, rating: c.rating }]));
  }, [analysis]);
  const plan = useMemo(
    () => (planting ? buildPlan({ planting, priority, fits, today, seasons: rotationSeasons, start: rotationStart }) : null),
    [planting, priority, fits, today, rotationSeasons, rotationStart],
  );
  return { plan, fits, today };
}
