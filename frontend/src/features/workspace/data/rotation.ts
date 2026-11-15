import type { CropId, Rating } from "../types";

/** Crops a rotation step can name: the outlook crops plus the cover legume offered after cane. */
export type RotationCrop = CropId | "coverLegume";

/** What the farmer grew last. "other": a crop the rule sheet does not cover, or nothing. */
export type LastCrop = CropId | "other";

/** The one thing the farmer says matters most. */
export type Priority = "soil" | "water" | "harvest";
export const PRIORITIES: readonly Priority[] = ["soil", "water", "harvest"];

export type HarvestResult = "good" | "regular" | "poor";
export type StubbleUse = "left" | "removed" | "burned";

/** The farmer's last planting on the plot: where they are in their cycle. */
export type Planting = {
  readonly crop: LastCrop;
  /** 1 to 12; null with "other", which has no sowing to date. */
  readonly sowMonth: number | null;
  readonly sowYear: number | null;
  /** False: the crop is still in the field. */
  readonly harvested: boolean;
  readonly harvest: HarvestResult | null;
  readonly stubble: StubbleUse | null;
  /** The crop grown before the last one, if the farmer said. */
  readonly earlier: CropId | null;
  /** Sugarcane only: years the cane has stood, and whether the field is finished or being renewed. */
  readonly caneYears: number | null;
  readonly renewing: boolean;
};

type Family = "grass" | "legume";
type Level = 1 | 2 | 3;

/**
 * Crop family (real) plus two sample ratings used to compare rotations: how much a season of the
 * crop does for soil health, and how much water it needs. 1 = low, 3 = high. Placeholders, shown
 * as sample values.
 */
export const CROP_TRAITS: Readonly<Record<RotationCrop, { readonly family: Family; readonly soil: Level; readonly water: Level }>> = {
  corn: { family: "grass", soil: 2, water: 3 },
  beans: { family: "legume", soil: 3, water: 2 },
  sorghum: { family: "grass", soil: 2, water: 1 },
  sugarcane: { family: "grass", soil: 1, water: 3 },
  coverLegume: { family: "legume", soil: 3, water: 1 },
};

/** Fill colors of crop blocks and swatches. Light enough for dark text in both themes. */
export const CROP_COLORS: Readonly<Record<RotationCrop, string>> = {
  corn: "#f2cc5c",
  beans: "#e07a96",
  sorghum: "#c98a4b",
  sugarcane: "#9ccc65",
  coverLegume: "#5fb3d9",
};

/** The sheet's condition for one follow-up (wording in `strings/rotation.ts`). */
export type ConditionId =
  | "familyBreakCheck"
  | "sameFamily"
  | "multiYear"
  | "familyBreakLevel"
  | "familyBreakDefault"
  | "caneLegume"
  | "caneGrain"
  | "caneGrainSecond"
  | "afterCover";

type RuleOption = { readonly crop: RotationCrop; readonly condition: ConditionId };

/**
 * The rotation rule sheet (reglas_rotacion): for each previous crop, the three follow-ups in
 * priority order, each with its condition. The sugarcane row only applies when the cane field is
 * finished or renewed. Guidance pending local agronomic validation.
 */
export const ROTATION_RULES: Readonly<Record<CropId, readonly [RuleOption, RuleOption, RuleOption]>> = {
  corn: [
    { crop: "beans", condition: "familyBreakCheck" },
    { crop: "sorghum", condition: "sameFamily" },
    { crop: "sugarcane", condition: "multiYear" },
  ],
  sorghum: [
    { crop: "beans", condition: "familyBreakCheck" },
    { crop: "corn", condition: "sameFamily" },
    { crop: "sugarcane", condition: "multiYear" },
  ],
  beans: [
    { crop: "corn", condition: "familyBreakLevel" },
    { crop: "sorghum", condition: "familyBreakDefault" },
    { crop: "sugarcane", condition: "multiYear" },
  ],
  sugarcane: [
    { crop: "coverLegume", condition: "caneLegume" },
    { crop: "corn", condition: "caneGrain" },
    { crop: "sorghum", condition: "caneGrainSecond" },
  ],
};

/** Previous crops whose 1st and 2nd follow-ups the sheet rates level (corn and sorghum after beans). */
const LEVEL_ROWS: readonly CropId[] = ["beans"];

/** Crops ranked by climate fit alone when no rule applies. */
const ANNUAL_CROPS: readonly CropId[] = ["corn", "beans", "sorghum"];

export type SeasonName = "primera" | "postrera";

/**
 * The two rainy-season sowings. `first`..`last` are the months the crop occupies; sowing stays
 * open through `sowUntil`. December to April is the dry season, when the field rests.
 */
export const SEASONS: Readonly<Record<SeasonName, { readonly first: number; readonly last: number; readonly sowUntil: number }>> = {
  primera: { first: 5, last: 8, sowUntil: 6 },
  postrera: { first: 9, last: 11, sowUntil: 9 },
};

export type Season = {
  readonly name: SeasonName;
  readonly year: number;
  /** Orders seasons across years: year × 2, plus 1 for Postrera. */
  readonly index: number;
};

function season(index: number): Season {
  return { name: index % 2 === 0 ? "primera" : "postrera", year: Math.floor(index / 2), index };
}

/**
 * The season a sowing month belongs to. April to July is Primera, August to November Postrera. A
 * dry-season sowing (December to March) counts with the Postrera before it, so the next step is
 * still the coming Primera; `offSeason` says so.
 */
export function seasonOfSowing(month: number, year: number): { readonly season: Season; readonly offSeason: boolean } {
  if (month >= 4 && month <= 7) return { season: season(year * 2), offSeason: false };
  if (month >= 8 && month <= 11) return { season: season(year * 2 + 1), offSeason: false };
  return { season: season((month === 12 ? year : year - 1) * 2 + 1), offSeason: true };
}

export type Today = { readonly year: number; readonly month: number };

/** The next `count` seasons whose sowing is still open, after season `after` (if any). */
export function upcomingSeasons(today: Today, after: number | null, count: number): Season[] {
  const out: Season[] = [];
  for (let index = today.year * 2; out.length < count; index++) {
    const next = season(index);
    const open = next.year > today.year || today.month <= SEASONS[next.name].sowUntil;
    if (open && (after === null || index > after)) out.push(next);
  }
  return out;
}

export type Fit = { readonly score: number; readonly rating: Rating };
export type Fits = Readonly<Partial<Record<CropId, Fit>>>;

/** One crop that may be sown in a step, in the order shown. */
export type RankedOption = {
  readonly crop: RotationCrop;
  readonly condition: ConditionId | null;
  /** Its place on the sheet (1 to 3); null when no rule applied and climate fit ranked it. */
  readonly sheetRank: number | null;
  /**
   * Lifted over the sheet's 1st choice: by the farmer's priority, or by climate fit where the
   * sheet rates the two level and the priority does not tell them apart. Null: in sheet order.
   */
  readonly moved: "priority" | "fit" | null;
  /** NASA climate fit; null for the cover legume (it has no outlook) or before the outlook runs. */
  readonly fit: Fit | null;
};

function fitOf(crop: RotationCrop, fits: Fits): Fit | null {
  return crop === "coverLegume" ? null : (fits[crop] ?? null);
}

/** How well a crop serves a priority; higher is better. Harvest reads the NASA climate fit. */
function priorityValue(crop: RotationCrop, priority: Priority, fits: Fits): number {
  if (priority === "soil") return CROP_TRAITS[crop].soil;
  if (priority === "water") return 4 - CROP_TRAITS[crop].water;
  return fitOf(crop, fits)?.score ?? 0;
}

/**
 * What may follow `previous`, ranked. The sheet's order holds, except that the farmer's priority
 * may lift the 2nd choice over the 1st (never the 3rd). Where the sheet rates the first two level,
 * climate fit breaks a tie on priority. With no rule ("other"), climate fit ranks the annual crops.
 */
export function rankOptions(previous: LastCrop | "coverLegume", priority: Priority, fits: Fits): RankedOption[] {
  if (previous === "other") {
    return ANNUAL_CROPS.map((crop): RankedOption => ({ crop, condition: null, sheetRank: null, moved: null, fit: fitOf(crop, fits) }))
      .sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1));
  }
  if (previous === "coverLegume") {
    // The sheet names no follow-up for the cover legume. It is the first step out of cane, so the
    // sheet's other two options for a renewed cane field come next.
    return ROTATION_RULES.sugarcane.slice(1).map((rule, i) => ({
      crop: rule.crop,
      condition: "afterCover",
      sheetRank: i + 1,
      moved: null,
      fit: fitOf(rule.crop, fits),
    }));
  }
  const options = ROTATION_RULES[previous].map((rule, i): RankedOption => ({
    crop: rule.crop,
    condition: rule.condition,
    sheetRank: i + 1,
    moved: null,
    fit: fitOf(rule.crop, fits),
  }));
  const [first, second, third] = options;
  const a = priorityValue(first.crop, priority, fits);
  const b = priorityValue(second.crop, priority, fits);
  if (b > a) return [{ ...second, moved: "priority" }, first, third];
  const level = LEVEL_ROWS.includes(previous);
  if (level && b === a && (second.fit?.score ?? 0) > (first.fit?.score ?? 0)) {
    return [{ ...second, moved: "fit" }, first, third];
  }
  return options;
}

export type RotationStep = {
  readonly season: Season;
  readonly crop: RotationCrop;
  /** Every crop that could be sown this season, ranked; `options[choice]` is `crop`. */
  readonly options: readonly RankedOption[];
  readonly choice: number;
  /** Sugarcane planted in an earlier step, still standing. */
  readonly continues: boolean;
  /** The farmer's last harvest of this crop was poor. */
  readonly poorRepeat: boolean;
};

/** The wait before the first sowing. */
export type RestStep = {
  readonly until: Season;
  readonly stubble: StubbleUse | null;
  /** The last crop is still in the field. */
  readonly standing: boolean;
};

export type RotationPlan =
  /** Sugarcane in ratoon: the sheet's rules wait until the field is finished or renewed. */
  | { readonly kind: "ratoon" }
  | {
      readonly kind: "plan";
      readonly rest: RestStep | null;
      readonly steps: readonly RotationStep[];
      /** No rule covered the last planting, so climate fit chose the first step. */
      readonly noRule: boolean;
      /** The last two plantings were of one family (the earlier one, then the last). */
      readonly sameFamilyTwice: readonly [CropId, CropId] | null;
    };

/**
 * The rotation from the farmer's last planting: `seasons` steps, each following the sheet from the
 * crop before it. `start` picks which of the first step's options to sow (0 = the top one); every
 * later step takes its top option. Sugarcane, once planted, holds the field for the rest.
 */
export function buildPlan(input: {
  readonly planting: Planting;
  readonly priority: Priority;
  readonly fits: Fits;
  readonly today: Today;
  readonly seasons: number;
  readonly start?: number;
}): RotationPlan {
  const { planting, priority, fits, today } = input;
  if (planting.crop === "sugarcane" && !planting.renewing) return { kind: "ratoon" };

  const last =
    planting.sowMonth !== null && planting.sowYear !== null && planting.crop !== "sugarcane"
      ? seasonOfSowing(planting.sowMonth, planting.sowYear).season.index
      : null;
  const slots = upcomingSeasons(today, last, input.seasons);
  const steps: RotationStep[] = [];
  let previous: LastCrop | "coverLegume" = planting.crop;
  let cane = false;
  slots.forEach((slot, i) => {
    if (cane) {
      steps.push({ season: slot, crop: "sugarcane", options: [], choice: 0, continues: true, poorRepeat: false });
      return;
    }
    const options = rankOptions(previous, priority, fits);
    const choice = i === 0 ? Math.min(Math.max(0, input.start ?? 0), options.length - 1) : 0;
    const crop = options[choice].crop;
    steps.push({
      season: slot,
      crop,
      options,
      choice,
      continues: false,
      poorRepeat: planting.harvest === "poor" && crop === planting.crop,
    });
    previous = crop;
    cane = crop === "sugarcane";
  });

  const first = slots[0];
  const waiting = first.year > today.year || today.month < SEASONS[first.name].first;
  const twice =
    planting.earlier !== null &&
    planting.crop !== "other" &&
    CROP_TRAITS[planting.earlier].family === CROP_TRAITS[planting.crop].family;
  return {
    kind: "plan",
    rest: waiting ? { until: first, stubble: planting.stubble, standing: !planting.harvested } : null,
    steps,
    noRule: planting.crop === "other",
    sameFamilyTwice: twice ? [planting.earlier as CropId, planting.crop as CropId] : null,
  };
}

/** How many first-step options a plan offers (the number of lanes to compare). */
export function startChoices(plan: RotationPlan): number {
  return plan.kind === "plan" ? (plan.steps[0]?.options.length ?? 0) : 0;
}

export type PlanMetrics = {
  /** Sample ratings averaged over the plan's seasons. */
  readonly soil: Level;
  readonly water: Level;
  /** Mean NASA climate fit of the crops sown; null when none has one. */
  readonly fit: number | null;
};

function level(mean: number): Level {
  if (mean >= 2.5) return 3;
  return mean >= 1.75 ? 2 : 1;
}

/** Soil, water and climate-fit summary of a plan, for comparing lanes. */
export function planMetrics(steps: readonly RotationStep[]): PlanMetrics {
  const mean = (values: readonly number[]) => values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
  const fits = steps.flatMap((step) => {
    const fit = step.options[step.choice]?.fit ?? null;
    return fit ? [fit.score] : [];
  });
  return {
    soil: level(mean(steps.map((step) => CROP_TRAITS[step.crop].soil))),
    water: level(mean(steps.map((step) => CROP_TRAITS[step.crop].water))),
    fit: fits.length > 0 ? Math.round(mean(fits)) : null,
  };
}
