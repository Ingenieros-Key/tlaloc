import { queryOptions } from "@tanstack/react-query";
import {
  PowerError,
  fetchDailyPoint,
  fetchDailyRegional,
  fetchMonthlyPoint,
  fetchMonthlyRegional,
  type PointQuery,
  type RegionalQuery,
} from "./client";

/**
 * TanStack Query options for the POWER client. Keys hold every request parameter, so identical
 * requests anywhere in the app share one fetch and one cache entry.
 *
 * Past days rarely change, but the newest near-real-time days can be revised or published late, so
 * cached answers count as fresh for a few hours and are then refreshed in the background.
 */
const STALE_MS = 6 * 60 * 60 * 1000;

const ROOT = ["nasa-power", "daily"] as const;

/** Retry network and server failures, not POWER's own 4xx validation errors. */
function retry(failures: number, error: unknown): boolean {
  if (error instanceof PowerError && error.status !== null && error.status < 500) return false;
  return failures < 2;
}

type WithoutSignal<T> = Omit<T, "signal">;

export function powerPointQuery(query: WithoutSignal<PointQuery>) {
  const { parameters, community = "AG", longitude, latitude, start, end } = query;
  return queryOptions({
    queryKey: [...ROOT, "point", { parameters, community, longitude, latitude, start, end }] as const,
    queryFn: ({ signal }) => fetchDailyPoint({ ...query, signal }),
    staleTime: STALE_MS,
    retry,
  });
}

export function powerRegionalQuery(query: WithoutSignal<RegionalQuery>) {
  const { parameters, community = "AG", bbox, start, end } = query;
  return queryOptions({
    queryKey: [...ROOT, "regional", { parameters, community, bbox, start, end }] as const,
    queryFn: ({ signal }) => fetchDailyRegional({ ...query, signal }),
    staleTime: STALE_MS,
    retry,
  });
}

const MONTHLY_ROOT = ["nasa-power", "monthly"] as const;

/**
 * Complete past years do not change, but a year's annual value appears some days after it ends,
 * so monthly answers are refreshed once a day rather than kept forever.
 */
const MONTHLY_STALE_MS = 24 * 60 * 60 * 1000;

/** Monthly and annual values at a point; `start` and `end` are years ("2021"). */
export function powerMonthlyPointQuery(query: WithoutSignal<PointQuery>) {
  const { parameters, community = "AG", longitude, latitude, start, end } = query;
  return queryOptions({
    queryKey: [...MONTHLY_ROOT, "point", { parameters, community, longitude, latitude, start, end }] as const,
    queryFn: ({ signal }) => fetchMonthlyPoint({ ...query, signal }),
    staleTime: MONTHLY_STALE_MS,
    retry,
  });
}

/** Monthly and annual values for every grid cell in a bounding box; `start` and `end` are years. */
export function powerMonthlyRegionalQuery(query: WithoutSignal<RegionalQuery>) {
  const { parameters, community = "AG", bbox, start, end } = query;
  return queryOptions({
    queryKey: [...MONTHLY_ROOT, "regional", { parameters, community, bbox, start, end }] as const,
    queryFn: ({ signal }) => fetchMonthlyRegional({ ...query, signal }),
    staleTime: MONTHLY_STALE_MS,
    retry,
  });
}

/** Query key prefix for every daily POWER request, e.g. to invalidate them all. */
export const POWER_QUERY_ROOT = ROOT;
