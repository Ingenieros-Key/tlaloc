import { SEASONS, seasonOfSowing, type Planting, type RotationCrop, type Season, type SeasonName } from "../data/rotation";
import { t } from "../strings";

const s = t.rotation;

/** "Corn", "Cover legume". */
export function cropName(crop: RotationCrop): string {
  return crop === "coverLegume" ? s.crops.coverLegume : t.common.crops[crop];
}

/** "Primera 2027". */
export function seasonLabel(season: Season): string {
  return s.season(s.seasons[season.name], season.year);
}

/** "May – Aug". */
export function seasonMonths(name: SeasonName): string {
  return s.monthRange(s.monthShort(SEASONS[name].first), s.monthShort(SEASONS[name].last));
}

/** The last planting in two lines: what and when, then how it stands. */
export function plantingSummary(planting: Planting): { readonly title: string; readonly detail: string } {
  if (planting.crop === "other") return { title: s.otherSummary, detail: s.otherDetail };
  if (planting.crop === "sugarcane") {
    return { title: s.caneSummary(planting.caneYears), detail: planting.renewing ? s.caneRenewing : s.caneStanding };
  }
  const crop = t.common.crops[planting.crop];
  if (planting.sowMonth === null || planting.sowYear === null) return { title: crop, detail: "" };
  const sown = seasonOfSowing(planting.sowMonth, planting.sowYear);
  const when = sown.offSeason ? `${s.month(planting.sowMonth)} ${planting.sowYear}` : seasonLabel(sown.season);
  return {
    title: s.plantingLine(crop, when),
    detail: `${s.sownIn(s.month(planting.sowMonth))}, ${planting.harvested ? s.harvestedYes : s.harvestedNo}`,
  };
}
