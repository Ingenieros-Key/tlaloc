"use client";

import { Check } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CROP_ORDER } from "../data/crops";
import { seasonOfSowing, type HarvestResult, type LastCrop, type Planting, type StubbleUse } from "../data/rotation";
import { useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { CropId } from "../types";
import { CropSwatch } from "../ui/CropSwatch";
import { Segmented } from "../ui/Segmented";

const s = t.rotation.form;

/** Years offered for the sowing date: this year and the three before it. */
const YEARS_BACK = 3;
const CANE_YEARS = [1, 2, 3, 4, 5, 6] as const;

const FIELD =
  "h-10 max-lg:h-11 w-full cursor-pointer rounded-md border border-input bg-surface-2 px-2 text-[13px] text-text";

type YesNo = "yes" | "no";

/**
 * "Last planting": where the farmer is in their cycle. Three answers are required (crop, sowing
 * month and year, harvested or not); the rest is optional. Sugarcane is dated by the years it has
 * stood and asks whether the field is being renewed, since the sheet's rules wait for that.
 * "Something else, or nothing" needs no further answers.
 */
export function PlantingForm({
  initial,
  onDone,
}: {
  readonly initial: Planting | null;
  /** Called after saving, and on Cancel (offered only when there is a planting to go back to). */
  readonly onDone: () => void;
}) {
  const { plotName } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const [thisYear] = useState(() => new Date().getFullYear());
  const [crop, setCrop] = useState<LastCrop | null>(initial?.crop ?? null);
  const [month, setMonth] = useState<number | null>(initial?.sowMonth ?? null);
  const [year, setYear] = useState<number>(initial?.sowYear ?? thisYear);
  const [harvested, setHarvested] = useState<YesNo | "">(initial && initial.crop !== "other" ? (initial.harvested ? "yes" : "no") : "");
  const [harvest, setHarvest] = useState<HarvestResult | "">(initial?.harvest ?? "");
  const [stubble, setStubble] = useState<StubbleUse | "">(initial?.stubble ?? "");
  const [earlier, setEarlier] = useState<CropId | "">(initial?.earlier ?? "");
  const [caneYears, setCaneYears] = useState<number>(initial?.caneYears ?? 1);
  const [renewing, setRenewing] = useState<YesNo | "">(initial?.crop === "sugarcane" ? (initial.renewing ? "yes" : "no") : "");
  const [tried, setTried] = useState(false);
  const monthId = useId();
  const yearId = useId();
  const earlierId = useId();
  const caneId = useId();
  const errorId = useId();

  const cane = crop === "sugarcane";
  const other = crop === "other";
  const dated = crop !== null && !cane && !other;
  const errors = {
    crop: crop === null,
    month: dated && month === null,
    harvested: dated && harvested === "",
    renewing: cane && renewing === "",
  };
  const invalid = errors.crop || errors.month || errors.harvested || errors.renewing;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (invalid || crop === null) return;
    dispatch({
      type: "setPlanting",
      planting: {
        crop,
        sowMonth: dated ? month : null,
        sowYear: dated ? year : null,
        harvested: dated ? harvested === "yes" : true,
        harvest: other || harvest === "" ? null : harvest,
        stubble: other || stubble === "" ? null : stubble,
        earlier: other || earlier === "" ? null : earlier,
        caneYears: cane ? caneYears : null,
        renewing: cane && renewing === "yes",
      },
    });
    onDone();
  };

  const sown = dated && month !== null ? seasonOfSowing(month, year) : null;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4 px-3 py-3 text-[13px]">
      <p className="text-xs text-muted">{s.intro(plotName)}</p>

      <fieldset className="min-w-0">
        <legend className="mb-1.5 font-semibold">{s.crop}</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {CROP_ORDER.map((id) => (
            <CropOption key={id} selected={crop === id} onSelect={() => setCrop(id)}>
              <CropSwatch crop={id} />
              {t.common.crops[id]}
            </CropOption>
          ))}
          <CropOption selected={other} onSelect={() => setCrop("other")} className="col-span-2">
            {s.other}
          </CropOption>
        </div>
        {tried && errors.crop ? <FieldError id={errorId}>{s.errors.crop}</FieldError> : null}
        {other ? <p className="mt-1.5 text-xs text-muted">{s.otherNote}</p> : null}
      </fieldset>

      {dated ? (
        <>
          <div>
            <p className="mb-1.5 font-semibold">{s.sown}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex flex-col gap-1">
                <label htmlFor={monthId} className="text-xs text-muted">
                  {s.month}
                </label>
                <select
                  id={monthId}
                  value={month ?? ""}
                  aria-invalid={tried && errors.month}
                  onChange={(e) => setMonth(e.target.value === "" ? null : Number(e.target.value))}
                  className={FIELD}
                >
                  <option value="">{s.chooseMonth}</option>
                  {t.rotation.months.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={yearId} className="text-xs text-muted">
                  {s.year}
                </label>
                <select id={yearId} value={year} onChange={(e) => setYear(Number(e.target.value))} className={FIELD}>
                  {Array.from({ length: YEARS_BACK + 1 }, (_, i) => thisYear - i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {tried && errors.month ? <FieldError>{s.errors.month}</FieldError> : null}
            {sown ? (
              <p className="mt-1.5 text-xs text-muted">
                {sown.offSeason ? s.offSeasonHint : s.seasonHint(t.rotation.seasons[sown.season.name])}
              </p>
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 font-semibold">{s.harvested}</p>
            <Segmented<YesNo>
              label={s.harvested}
              value={harvested}
              options={[
                { value: "yes", label: s.harvestedOptions.yes },
                { value: "no", label: s.harvestedOptions.no },
              ]}
              onChange={setHarvested}
            />
            {tried && errors.harvested ? <FieldError>{s.errors.harvested}</FieldError> : null}
          </div>
        </>
      ) : null}

      {cane ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={caneId} className="font-semibold">
              {s.caneYears}
            </label>
            <select id={caneId} value={caneYears} onChange={(e) => setCaneYears(Number(e.target.value))} className={FIELD}>
              {CANE_YEARS.map((n) => (
                <option key={n} value={n}>
                  {s.caneYear(n)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1.5 font-semibold">{s.renewing}</p>
            <Segmented<YesNo>
              label={s.renewing}
              value={renewing}
              options={[
                { value: "yes", label: s.renewingOptions.yes },
                { value: "no", label: s.renewingOptions.no },
              ]}
              onChange={setRenewing}
            />
            {tried && errors.renewing ? <FieldError>{s.errors.renewing}</FieldError> : null}
          </div>
        </>
      ) : null}

      {crop !== null && !other ? (
        <>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span>{s.optional}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </div>
          <div>
            <p className="mb-1.5 font-semibold">{s.harvest}</p>
            <Segmented<HarvestResult>
              label={s.harvest}
              value={harvest}
              options={(["good", "regular", "poor"] as const).map((value) => ({ value, label: s.harvestOptions[value] }))}
              onChange={setHarvest}
            />
          </div>
          <div>
            <p className="mb-1.5 font-semibold">{s.stubble}</p>
            <Segmented<StubbleUse>
              label={s.stubble}
              value={stubble}
              options={(["left", "removed", "burned"] as const).map((value) => ({ value, label: s.stubbleOptions[value] }))}
              onChange={setStubble}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={earlierId} className="font-semibold">
              {s.earlier}
            </label>
            <select
              id={earlierId}
              value={earlier}
              onChange={(e) => setEarlier(e.target.value as CropId | "")}
              className={FIELD}
            >
              <option value="">{s.earlierNone}</option>
              {CROP_ORDER.map((id) => (
                <option key={id} value={id}>
                  {t.common.crops[id]}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      <div className="flex gap-2 pt-1">
        {initial ? (
          <button
            type="button"
            onClick={onDone}
            className="h-11 cursor-pointer rounded-lg border border-line-strong px-3 font-medium transition-colors duration-150 hover:bg-surface-3"
          >
            {s.cancel}
          </button>
        ) : null}
        <button
          type="submit"
          className="h-11 flex-1 cursor-pointer rounded-lg bg-accent px-3 font-semibold text-on-accent transition-opacity duration-150 hover:opacity-90"
        >
          {s.submit}
        </button>
      </div>
    </form>
  );
}

function CropOption({
  selected,
  onSelect,
  className = "",
  children,
}: {
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 text-left font-medium transition-colors duration-150 ${
        selected ? "border-accent bg-accent/10 ring-1 ring-inset ring-accent" : "border-line-strong bg-surface-2 hover:bg-surface-3"
      } ${className}`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      {selected ? <Check aria-hidden="true" strokeWidth={2.5} className="size-4 shrink-0 text-accent" /> : null}
    </button>
  );
}

function FieldError({ id, children }: { readonly id?: string; readonly children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-poor">
      {children}
    </p>
  );
}
