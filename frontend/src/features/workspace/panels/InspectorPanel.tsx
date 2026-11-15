"use client";

import { MapPinOff, SquareDashed } from "lucide-react";
import type { ReactNode } from "react";
import { focusMapCanvas } from "../map/focus";
import { usePanelCollapse, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { AnalysisState, CropAssessment, PlotSummary } from "../types";
import { Panel } from "../ui/Panel";
import { CropCard } from "./CropCard";
import { DisplayPanel } from "./DisplayPanel";
import { formatCentroid, formatHectares, formatSquareMeters } from "./format";

/** Right "Inspector" panel: plot facts and the per-crop planting outlook for the drawn square. */
export function InspectorPanel() {
  const { plotSummary, analysis, inspectorView } = useWorkspace();
  const showDisplay = inspectorView === "display";
  const title = showDisplay ? t.inspector.display.title : t.inspector.title;
  const collapse = usePanelCollapse("inspector", title);

  if (showDisplay) {
    return (
      <Panel title={title} labelledBy="inspector-title" collapse={collapse}>
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
        <Section id="inspector-plot" heading={t.inspector.plotHeading}>
          {plotSummary ? <PlotFacts summary={plotSummary} analysis={analysis} /> : <EmptyPlot />}
        </Section>
        {plotSummary ? (
          <Section id="inspector-outlook" heading={t.inspector.outlookHeading}>
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
  children,
}: {
  readonly id: string;
  readonly heading: string;
  readonly children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className="px-3 py-3">
      <h3 id={headingId} className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {heading}
      </h3>
      {children}
    </section>
  );
}

function EmptyPlot() {
  const dispatch = useWorkspaceDispatch();
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-6 text-center">
      <SquareDashed aria-hidden="true" strokeWidth={1.5} className="size-8 text-muted" />
      <p className="text-[13px] text-muted">{t.inspector.emptyPlot}</p>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: "setTool", tool: "square" });
          dispatch({ type: "setPanel", panel: "inspector", open: false });
          focusMapCanvas();
        }}
        className="inline-flex h-10 cursor-pointer items-center rounded-md bg-accent px-4 text-[13px] font-semibold text-on-accent transition-colors duration-150 hover:bg-accent/85"
      >
        {t.inspector.drawSquare}
      </button>
    </div>
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
