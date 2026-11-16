export {
  PowerError,
  fetchDailyPoint,
  fetchDailyRegional,
  fetchMonthlyPoint,
  fetchMonthlyRegional,
  yearRange,
  type DailySeries,
  type ParameterInfo,
  type PointQuery,
  type PowerCommunity,
  type PowerDate,
  type PowerLocation,
  type PowerResult,
  type RegionalQuery,
} from "./client";
export {
  POWER_QUERY_ROOT,
  powerMonthlyPointQuery,
  powerMonthlyRegionalQuery,
  powerPointQuery,
  powerRegionalQuery,
} from "./queries";
export {
  addDays,
  dateRange,
  parsePowerDate,
  sliceSeries,
  summarizeDaily,
  toPowerDate,
  type DailySummary,
} from "./stats";

/**
 * Typical delay before POWER publishes a day of near-real-time data. The newest days come from
 * GEOS-IT and may be revised; older years come from MERRA-2.
 */
export const POWER_LAG_DAYS = 2;

/** MERRA-2 native grid POWER serves daily data on: 0.5° latitude × 0.625° longitude cells. */
export const POWER_CELL = { lat: 0.5, lng: 0.625 } as const;
