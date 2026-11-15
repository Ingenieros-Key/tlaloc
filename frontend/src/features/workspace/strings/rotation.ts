import type { ConditionId, HarvestResult, LastCrop, Priority, RotationCrop, SeasonName, StubbleUse } from "../data/rotation";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

/**
 * UI strings for the rotation planner. The conditions and the scope note are translated from the
 * Spanish rule sheet (reglas_rotacion); a Spanish set would restore the sheet's own wording.
 */
export const rotation = {
  tabs: { label: "Results", outlook: "Outlook", rotation: "Rotation" },
  months: MONTHS,
  monthsShort: MONTHS_SHORT,
  /** 1-based month. */
  month: (month: number) => MONTHS[month - 1] ?? "",
  monthShort: (month: number) => MONTHS_SHORT[month - 1] ?? "",
  seasons: { primera: "Primera", postrera: "Postrera" } satisfies Record<SeasonName, string>,
  season: (name: string, year: number) => `${name} ${year}`,
  monthRange: (first: string, last: string) => `${first} – ${last}`,
  crops: { coverLegume: "Cover legume" } satisfies Record<Extract<RotationCrop, "coverLegume">, string>,

  lastPlanting: "Last planting",
  edit: "Edit",
  plantingLine: (crop: string, season: string) => `${crop} · ${season}`,
  sownIn: (month: string) => `Sown in ${month}`,
  harvestedYes: "harvested",
  harvestedNo: "still in the field",
  otherSummary: "Something else, or nothing",
  otherDetail: "No rotation rule applies to it.",
  caneSummary: (years: number | null) => (years === null ? "Sugarcane" : `Sugarcane · year ${years}`),
  caneRenewing: "The field is finished or being renewed",
  caneStanding: "The ratoon continues",

  priorityLabel: "What matters most",
  priorities: { soil: "Soil health", water: "Save water", harvest: "Harvest" } satisfies Record<Priority, string>,

  nextSeasons: "Next seasons",
  now: "Now",
  dry: "Dry season",
  rest: "Rest",
  restUntil: (month: string) => `Until ${month}`,
  restNotes: {
    standing: (crop: string) => `Your ${crop.toLowerCase()} is still in the field.`,
    left: "Leave the stubble on the soil until the rains.",
    removed: "The stubble was removed, so the soil is bare. Cover it with what you can until the rains.",
    burned: "The stubble was burned, so the soil is bare. Cover it with what you can, and avoid burning next time.",
    unknown: "Keep the soil covered until the rains.",
  },
  rank: (n: number) => `${ordinal(n)} choice`,
  byFit: "By climate fit",
  fit: "fit",
  fitLabel: (score: number, rating: string) => `Climate fit ${score} of 100, ${rating.toLowerCase()}`,
  noFit: "No climate fit yet",
  reasons: {
    rule: "Rule",
    nasa: "NASA",
    you: "You",
    fit: (rating: string) => `climate fit over the last 12 months: ${rating.toLowerCase()}`,
    fitPoor: "the climate here is a poor fit. Check before sowing.",
    moved: (priority: Priority, rank: string) =>
      `moved up ${{ soil: "for soil health", water: "to save water", harvest: "for the harvest" }[priority]}. The sheet lists it as ${rank}.`,
    levelFit: "the sheet rates the top two level, so the better climate fit goes first",
    noRule: "no rotation rule applies, so climate fit decides",
    poorRepeat: (crop: string) =>
      `Your last ${crop.toLowerCase()} harvest was poor. Find out why before sowing it again.`,
  },
  conditions: {
    familyBreakCheck: "A different crop family. Check suitability and plant health.",
    sameFamily: "Same family, so no family break. A conditional alternative.",
    multiYear: "Only if you want to establish a multi-year crop. Assess whether it is viable.",
    familyBreakLevel: "A different crop family. The sheet rates it level with sorghum.",
    familyBreakDefault: "A different crop family. Listed second by default, not because corn is proven better.",
    caneLegume: "Only when the cane field is finished or renewed. Choose the species locally.",
    caneGrain: "Only when the cane field is finished or renewed. Same family as cane, so assess it first.",
    caneGrainSecond:
      "Only when the cane field is finished or renewed. Same family as cane, so assess it first. Corn is not proven better.",
    afterCover: "After the cover legume, the sheet's grain options for a renewed cane field. Same family as cane, so assess it first.",
  } satisfies Record<ConditionId, string>,
  otherOptions: (n: number) => (n === 1 ? "1 other option" : `${n} other options`),
  hideOptions: "Hide other options",
  choose: "Choose",
  chooseCrop: (crop: string) => `Choose ${crop.toLowerCase()} for this season`,
  chosen: "Chosen",
  caneContinues: (season: string) => `Sugarcane stays in the field through ${season} and beyond (plant cane, then ratoons).`,
  canePlant: "Plant cane",
  ratoon: {
    title: "Continue the ratoon",
    body: "The rotation rules do not apply while the ratoon continues. Options appear when the field is finished or renewed.",
    change: "The field is being renewed",
  },
  sameFamilyTwice: (earlier: string, last: string) =>
    earlier === last
      ? `${earlier} twice in a row. A family break matters more now.`
      : `Two seasons of the same family in a row (${earlier.toLowerCase()}, then ${last.toLowerCase()}). A family break matters more now.`,
  noRuleNote: "The rule sheet does not cover your last planting, so the first season is ranked by NASA climate fit alone.",
  showLater: "Show later seasons",
  showFewer: "Show fewer seasons",
  compare: "Compare plans",
  scope: "Guidance only, pending local agronomic validation. It does not guarantee suitability or yield.",
  sampleNote: "Soil and water ratings are sample values.",

  form: {
    intro: (plot: string) => `Tell us what you grew on ${plot} so the rotation starts where you are.`,
    crop: "What did you plant last?",
    other: "Something else, or nothing",
    otherNote: "No rotation rule applies. The first season will be ranked by NASA climate fit.",
    sown: "When did you sow it?",
    month: "Month",
    year: "Year",
    chooseMonth: "Choose a month",
    seasonHint: (season: string) => `That is the ${season} season.`,
    offSeasonHint: "That is a dry-season sowing. The rotation continues with the next Primera.",
    harvested: "Is it harvested?",
    harvestedOptions: { yes: "Yes", no: "Still in the field" },
    optional: "Optional",
    harvest: "How was the harvest?",
    harvestOptions: { good: "Good", regular: "Regular", poor: "Poor" } satisfies Record<HarvestResult, string>,
    stubble: "What happened to the stubble?",
    stubbleOptions: { left: "Left on soil", removed: "Removed", burned: "Burned" } satisfies Record<StubbleUse, string>,
    earlier: "What did you plant before that?",
    earlierNone: "Not sure, or nothing",
    caneYears: "How many years has the cane stood?",
    caneYear: (n: number) => (n >= 6 ? "6 or more" : String(n)),
    renewing: "Is the field finished or being renewed?",
    renewingOptions: { yes: "Yes", no: "No, the ratoon continues" },
    submit: "See what can follow",
    cancel: "Cancel",
    errors: {
      crop: "Choose what you planted last.",
      month: "Choose the month you sowed it.",
      harvested: "Say whether it is harvested.",
      renewing: "Say whether the field is being renewed.",
    },
  },
  lastCrops: { other: "Something else" } satisfies Record<Extract<LastCrop, "other">, string>,

  lanes: {
    title: "Rotation plans",
    close: "Close rotation plans",
    rain: "Rain by month",
    rainSource: "NASA, last 12 months",
    rainLoading: "Loading rainfall",
    rainLabel: (wettest: string, driest: string) => `Monthly rainfall at the plot: wettest in ${wettest}, driest in ${driest}`,
    today: "Today",
    planted: "Outlined: what you planted",
    lane: (n: number) => `Plan ${n}`,
    startsWith: (crop: string) => `${crop} first`,
    sheetRank: (n: number) => `${ordinal(n)} on the sheet`,
    byFit: "By climate fit",
    rest: "Rest",
    cane: "Sugarcane · plant cane, then ratoons",
    soil: "Soil",
    water: "Water need",
    fit: "Fit",
    levels: { 1: "Low", 2: "Medium", 3: "High" } as Readonly<Record<1 | 2 | 3, string>>,
    sample: "sample",
    choosePlan: (n: number) => `Choose plan ${n}`,
    summary: (name: string, crops: string) => `${name}: ${crops}`,
  },
} as const;
