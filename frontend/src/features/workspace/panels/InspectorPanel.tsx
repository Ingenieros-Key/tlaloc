"use client";

import { MapPinOff } from "lucide-react";
import type { ReactNode } from "react";
import { usePanelCollapse, useWorkspace, useWorkspaceDispatch } from "../store";
import { SampleDataNotice } from "../chrome/SampleDataNotice";
import { t } from "../strings";
import type { AnalysisState, CropAssessment, PlotSummary } from "../types";
import { Panel } from "../ui/Panel";
import { CropCard } from "./CropCard";
import { DisplayPanel } from "./DisplayPanel";
import { formatCentroid, formatHectares, formatSquareMeters } from "./format";

/**
 * Right "Inspector" panel: the open toolbox (Display), or plot facts and the per-crop planting
 * outlook for the plot in focus. Not rendered when it has neither (see `inspectorVisible`).
 */
export function InspectorPanel() {
  const { plotSummary, plotName, analysis, inspectorView } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const showDisplay = inspectorView === "display";
  const title = showDisplay ? t.inspector.display.title : t.inspector.title;
  const collapse = usePanelCollapse("inspector", title);

  if (showDisplay) {
    return (
      <Panel
        title={title}
        labelledBy="inspector-title"
        collapse={collapse}
        close={{
          label: t.inspector.display.close,
          onClose: () => {
            dispatch({ type: "setInspectorView", view: "results" });
            // The card may disappear with it; hand focus back to the button that opened it.
            document.querySelector<HTMLElement>('[data-roving="display"]')?.focus();
          },
        }}
      >
        <DisplayPanel />
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      labelledBy="inspector-title"
      collapse={collapse}
    >
      <div className="divide-y divide-line">
        <Section id="inspector-plot" heading={plotName}>
          {plotSummary ? <PlotFacts summary={plotSummary} analysis={analysis} /> : null}
        </Section>
        {plotSummary ? (
          <Section id="inspector-outlook" heading={t.inspector.outlookHeading} aside={<SampleDataNotice align="end" />}>
            <Outlook analysis={analysis} />
          </Section>
        ) : null}
      </div>
    </Panel>
  );
}

function Section({
  id,
  heading,
  aside,
  children,
}: {
  readonly id: string;
  readonly heading: string;
  /** Shown at the end of the heading row (e.g. the sample-data notice). */
  readonly aside?: ReactNode;
  readonly children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {heading}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function PlotFacts({
  summary,
  analysis,
}: {
  readonly summary: PlotSummary;
  readonly analysis: AnalysisState;
}) {
  const cells =
    analysis.status === "done" && analysis.result.kind === "ok" ? analysis.result.cellsSampled : null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      <dt className="text-muted">{t.inspector.area}</dt>
      <dd className="text-right font-mono tabular">
        {formatHectares(summary.areaHa)}
        {summary.areaHa < 1 ? (
          <span className="block text-xs text-muted">{formatSquareMeters(summary.areaHa)}</span>
        ) : null}
      </dd>
      <dt className="text-muted">{t.inspector.centroid}</dt>
      <dd className="text-right font-mono tabular">{formatCentroid(summary.centroid)}</dd>
      {cells !== null ? (
        <>
          <dt className="text-muted">{t.inspector.cellsSampled}</dt>
          <dd className="text-right font-mono tabular">{cells.toLocaleString("en-US")}</dd>
        </>
      ) : null}
    </dl>
  );
}

function sortByScore(crops: readonly CropAssessment[]): CropAssessment[] {
  return [...crops].sort((a, b) => b.score - a.score);
}

function Outlook({ analysis }: { readonly analysis: AnalysisState }) {
  if (analysis.status === "running") {
    return (
      <div aria-busy="true" className="space-y-2">
        <span className="sr-only">{t.inspector.loadingOutlook}</span>
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden="true" className="animate-pulse rounded-lg border border-line bg-surface-2 p-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3.5 w-20 rounded bg-surface-3" />
                <div className="h-4 w-12 rounded bg-surface-3" />
              </div>
              <div className="h-7 w-12 rounded bg-surface-3" />
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-1.5 rounded-full bg-surface-3" />
              <div className="h-1.5 rounded-full bg-surface-3" />
              <div className="h-1.5 rounded-full bg-surface-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (analysis.status !== "done") return null;

  if (analysis.result.kind === "outside") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-fair/40 bg-fair/10 p-3 text-[13px] text-text">
        <MapPinOff aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-fair" />
        <p>{t.inspector.outside}</p>
      </div>
    );
  }

  const crops = sortByScore(analysis.result.crops);
  const top = crops[0]?.score;
  return (
    <ol className="space-y-2">
      {crops.map((crop) => (
        <li key={crop.crop}>
          <CropCard assessment={crop} best={crop.score === top} />
        </li>
      ))}
    </ol>
  );
}
