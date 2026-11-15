"use client";

import { useWorkspace } from "../store";
import { t } from "../strings";
import type { AnalysisState, CropAssessment } from "../types";

/**
 * Screen-reader announcement of the assessment lifecycle. Rendered outside the panel docks so it
 * still speaks while the Inspector drawer is closed (it is `visibility: hidden` below lg).
 */
export function AnalysisAnnouncer() {
  const { plot, analysis } = useWorkspace();
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement(plot !== null, analysis)}
    </p>
  );
}

function bestCrops(crops: readonly CropAssessment[]): readonly CropAssessment[] {
  const top = Math.max(...crops.map((crop) => crop.score));
  return crops.filter((crop) => crop.score === top);
}

function announcement(hasPlot: boolean, analysis: AnalysisState): string {
  if (!hasPlot) return "";
  if (analysis.status === "running") return t.inspector.announceRunning;
  if (analysis.status !== "done") return "";
  if (analysis.result.kind === "outside") return t.inspector.announceOutside;
  if (analysis.result.kind === "missing") return t.inspector.announceMissing;
  const best = bestCrops(analysis.result.crops);
  const first = best[0];
  if (!first) return "";
  const names = best.map((crop) => t.common.crops[crop.crop]);
  return t.inspector.announceDone(names, t.common.ratings[first.rating], first.score);
}
