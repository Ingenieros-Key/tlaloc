"use client";

import { ChevronDown, GitCompareArrows, TriangleAlert } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import {
  PRIORITIES,
  SEASONS,
  startChoices,
  type Planting,
  type Priority,
  type RankedOption,
  type RestStep,
  type RotationStep,
} from "../data/rotation";
import { DRAWER_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import { useRotation } from "../hooks/useRotation";
import { ROTATION_SEASONS, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import { Badge } from "../ui/Badge";
import { CropSwatch } from "../ui/CropSwatch";
import { Segmented } from "../ui/Segmented";
import { PlantingForm } from "./PlantingForm";
import { cropName, plantingSummary, seasonLabel, seasonMonths } from "./rotationFormat";

const s = t.rotation;

const HEADING = "text-[11px] font-semibold uppercase tracking-wider text-muted";

/**
 * The Inspector's Rotation tab. Until the farmer has said what they planted last it shows that
 * form; after that, the last planting, what matters most, and one card per coming season, each
 * with the reasons behind it (the rule sheet, NASA climate fit, the farmer's priority).
 */
export function RotationTab() {
  const { planting, priority, rotationSeasons, lanesOpen } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const drawerLayout = useMediaQuery(DRAWER_QUERY);
  const [editing, setEditing] = useState(false);
  const { plan } = useRotation();

  if (!planting || !plan || editing) {
    return <PlantingForm initial={planting} onDone={() => setEditing(false)} />;
  }

  const long = rotationSeasons > ROTATION_SEASONS.short;
  return (
    <div className="flex flex-col gap-4 px-3 py-3 text-[13px]">
      <section className="flex flex-col gap-1.5">
        <h3 className={HEADING}>{s.lastPlanting}</h3>
        <LastPlanting planting={planting} onEdit={() => setEditing(true)} />
      </section>

      {plan.kind === "ratoon" ? (
        <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3">
          <div className="flex items-center gap-2">
            <CropSwatch crop="sugarcane" />
            <h3 className="font-display text-sm font-semibold">{s.ratoon.title}</h3>
          </div>
          <p className="text-xs text-muted">{s.ratoon.body}</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "setPlanting", planting: { ...planting, renewing: true } })}
            className="h-9 max-lg:h-11 cursor-pointer self-start rounded-md px-2 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
          >
            {s.ratoon.change}
          </button>
        </section>
      ) : (
        <>
          {plan.sameFamilyTwice ? (
            <Notice>{s.sameFamilyTwice(t.common.crops[plan.sameFamilyTwice[0]], t.common.crops[plan.sameFamilyTwice[1]])}</Notice>
          ) : null}

          <section className="flex flex-col gap-1.5">
            <h3 className={HEADING}>{s.priorityLabel}</h3>
            <Segmented<Priority>
              label={s.priorityLabel}
              value={priority}
              options={PRIORITIES.map((value) => ({ value, label: s.priorities[value] }))}
              onChange={(value) => dispatch({ type: "setPriority", priority: value })}
            />
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className={HEADING}>{s.nextSeasons}</h3>
            {plan.noRule ? <p className="text-xs text-muted">{s.noRuleNote}</p> : null}
            <ol className="flex flex-col gap-2">
              {plan.rest ? <RestRow rest={plan.rest} planting={planting} /> : null}
              {plan.steps
                .filter((step) => !step.continues)
                .map((step, i) => (
                  <StepRow
                    key={step.season.index}
                    step={step}
                    first={i === 0}
                    noRule={plan.noRule && i === 0}
                    priority={priority}
                    caneThrough={
                      step.crop === "sugarcane" ? seasonLabel(plan.steps[plan.steps.length - 1].season) : null
                    }
                    onChoose={(start) => dispatch({ type: "setRotationStart", start })}
                  />
                ))}
            </ol>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {startChoices(plan) > 1 ? (
                <button
                  type="button"
                  aria-pressed={lanesOpen}
                  onClick={() => {
                    dispatch({ type: "setLanesOpen", open: !lanesOpen });
                    if (lanesOpen) return;
                    // The lanes need the width: below lg the Inspector steps aside, and at lg the
                    // left flyout closes (the tool rail reopens it).
                    if (drawerLayout) dispatch({ type: "setPanel", panel: "inspector", open: false });
                    else dispatch({ type: "setCollapsed", panel: "browser", collapsed: true });
                  }}
                  className={`inline-flex h-9 max-lg:h-11 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors duration-150 ${
                    lanesOpen ? "border-accent bg-accent/10 text-accent" : "border-line-strong hover:bg-surface-3"
                  }`}
                >
                  <GitCompareArrows aria-hidden="true" strokeWidth={1.75} className="size-4" />
                  {s.compare}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "setRotationSeasons", seasons: long ? ROTATION_SEASONS.short : ROTATION_SEASONS.long })
                }
                className="h-9 max-lg:h-11 cursor-pointer rounded-md px-2 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
              >
                {long ? s.showFewer : s.showLater}
              </button>
            </div>
          </section>
        </>
      )}

      <p className="border-t border-line pt-3 text-[11px] leading-snug text-muted">
        {s.scope} {s.sampleNote}
      </p>
    </div>
  );
}

function LastPlanting({ planting, onEdit }: { readonly planting: Planting; readonly onEdit: () => void }) {
  const { title, detail } = plantingSummary(planting);
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 py-2 pl-2.5 pr-1">
      {planting.crop === "other" ? null : <CropSwatch crop={planting.crop} />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {detail ? <p className="text-xs text-muted">{detail}</p> : null}
      </div>
      <button
        type="button"
        aria-label={`${s.edit}: ${s.lastPlanting}`}
        onClick={onEdit}
        className="h-9 max-lg:h-11 cursor-pointer rounded-md px-2 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
      >
        {s.edit}
      </button>
    </div>
  );
}

function Notice({ children }: { readonly children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-fair/40 bg-fair/10 p-2.5 text-xs text-text">
      <TriangleAlert aria-hidden="true" strokeWidth={1.75} className="mt-px size-4 shrink-0 text-fair" />
      <span>{children}</span>
    </p>
  );
}

/** The season a row belongs to: name, year and months, in a narrow column beside its card. */
function When({ title, sub, mono }: { readonly title: string; readonly sub?: string; readonly mono?: string }) {
  return (
    <div className="flex w-[68px] shrink-0 flex-col pt-2">
      <span className="font-semibold">{title}</span>
      {sub ? <span className="text-[11px] text-muted">{sub}</span> : null}
      {mono ? <span className="font-mono text-[11px] text-muted">{mono}</span> : null}
    </div>
  );
}

function RestRow({ rest, planting }: { readonly rest: RestStep; readonly planting: Planting }) {
  const until = s.month(SEASONS[rest.until.name].first);
  return (
    <li className="flex gap-2.5">
      <When title={s.now} sub={s.restUntil(until)} />
      <div className="min-w-0 flex-1 rounded-lg border border-dashed border-line-strong px-2.5 py-2">
        <p className="font-semibold">{s.rest}</p>
        <p className="text-xs text-muted">
          {rest.standing && planting.crop !== "other" ? `${s.restNotes.standing(t.common.crops[planting.crop])} ` : ""}
          {s.restNotes[rest.stubble ?? "unknown"]}
        </p>
      </div>
    </li>
  );
}

function rankLabel(option: RankedOption): string {
  return option.sheetRank === null ? s.byFit : s.rank(option.sheetRank);
}

function Reason({ source, warn = false, children }: { readonly source: string; readonly warn?: boolean; readonly children: ReactNode }) {
  return (
    <p className={`text-xs ${warn ? "text-fair" : "text-muted"}`}>
      <span className="font-medium text-text">{source}</span> · {children}
    </p>
  );
}

function StepRow({
  step,
  first,
  noRule,
  priority,
  caneThrough,
  onChoose,
}: {
  readonly step: RotationStep;
  /** The coming season: the only one whose crop the farmer picks here. */
  readonly first: boolean;
  readonly noRule: boolean;
  readonly priority: Priority;
  /** Sugarcane: the last season shown, which it still occupies. */
  readonly caneThrough: string | null;
  readonly onChoose: (start: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const option = step.options[step.choice];
  const others = step.options.map((o, i) => ({ o, i })).filter(({ i }) => i !== step.choice);
  const name = cropName(step.crop);
  return (
    <li className="flex gap-2.5">
      <When title={s.seasons[step.season.name]} sub={String(step.season.year)} mono={seasonMonths(step.season.name)} />
      <article
        className={`flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border bg-surface-2 px-2.5 py-2 ${
          first ? "border-accent/60" : "border-line"
        }`}
      >
        <header className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <CropSwatch crop={step.crop} />
          <h4 className="font-display text-sm font-semibold">{name}</h4>
          <Badge tone={option.sheetRank === 1 || option.moved ? "accent" : "neutral"}>{rankLabel(option)}</Badge>
          {option.fit ? (
            <p className="ml-auto flex items-baseline gap-1">
              <span aria-hidden="true" className="font-mono text-sm tabular">
                {option.fit.score}
              </span>
              <span aria-hidden="true" className="text-[11px] text-muted">
                {s.fit}
              </span>
              <span className="sr-only">{s.fitLabel(option.fit.score, t.common.ratings[option.fit.rating])}</span>
            </p>
          ) : null}
        </header>
        {noRule ? <Reason source={s.reasons.rule}>{s.reasons.noRule}</Reason> : null}
        {option.condition ? <Reason source={s.reasons.rule}>{s.conditions[option.condition]}</Reason> : null}
        {option.fit ? (
          <Reason source={s.reasons.nasa} warn={option.fit.rating === "poor"}>
            {option.fit.rating === "poor" ? s.reasons.fitPoor : s.reasons.fit(t.common.ratings[option.fit.rating])}
          </Reason>
        ) : null}
        {option.moved === "priority" && option.sheetRank !== null ? (
          <Reason source={s.reasons.you}>{s.reasons.moved(priority, s.rank(option.sheetRank))}</Reason>
        ) : null}
        {option.moved === "fit" ? <Reason source={s.reasons.nasa}>{s.reasons.levelFit}</Reason> : null}
        {step.poorRepeat ? <Reason source={s.reasons.you} warn>{s.reasons.poorRepeat(name)}</Reason> : null}
        {caneThrough ? <p className="text-xs text-muted">{s.caneContinues(caneThrough)}</p> : null}

        {others.length > 0 ? (
          <>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen(!open)}
              className="-ml-1 inline-flex h-7 max-lg:h-11 cursor-pointer items-center gap-1 self-start rounded-md px-1 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10"
            >
              {open ? s.hideOptions : s.otherOptions(others.length)}
              <ChevronDown
                aria-hidden="true"
                strokeWidth={2}
                className={`size-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              />
            </button>
            <ul id={listId} hidden={!open} className="flex flex-col gap-2 border-t border-line pt-2">
              {others.map(({ o, i }) => (
                <li key={o.crop} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <CropSwatch crop={o.crop} className="size-2.5" />
                    <span className="font-medium">{cropName(o.crop)}</span>
                    <Badge>{rankLabel(o)}</Badge>
                    {o.fit ? (
                      <span className="ml-auto font-mono text-xs tabular" title={s.fitLabel(o.fit.score, t.common.ratings[o.fit.rating])}>
                        {o.fit.score}
                      </span>
                    ) : null}
                  </div>
                  {o.condition ? <p className="text-xs text-muted">{s.conditions[o.condition]}</p> : null}
                  {first ? (
                    <button
                      type="button"
                      aria-label={s.chooseCrop(cropName(o.crop))}
                      onClick={() => {
                        onChoose(i);
                        setOpen(false);
                      }}
                      className="h-8 max-lg:h-11 cursor-pointer self-start rounded-md border border-line-strong px-2.5 text-xs font-medium transition-colors duration-150 hover:bg-surface-3"
                    >
                      {s.choose}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </article>
    </li>
  );
}
