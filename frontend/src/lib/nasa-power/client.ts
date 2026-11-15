/**
 * Minimal client for the NASA POWER API (https://power.larc.nasa.gov/docs/services/api/).
 * The API is public, keyless and sends `Access-Control-Allow-Origin: *`, so it is called straight
 * from the browser. Caching and request de-duplication live in `queries.ts` (TanStack Query).
 */

const API_ROOT = "https://power.larc.nasa.gov/api/temporal";

/** User community; it sets the units POWER answers in. AG = agroclimatology. */
export type PowerCommunity = "AG" | "RE" | "SB";

/** "YYYYMMDD" */
export type PowerDate = string;

type Common = {
  /** POWER parameter codes, e.g. ["PRECTOTCORR", "T2M"]. Regional queries accept only one. */
  readonly parameters: readonly string[];
  readonly community?: PowerCommunity;
  readonly start: PowerDate;
  readonly end: PowerDate;
  readonly signal?: AbortSignal;
};

export type PointQuery = Common & {
  readonly longitude: number;
  readonly latitude: number;
};

/** Bounding box in degrees. POWER requires at least a 2° range on each axis and at most 10°. */
export type RegionalQuery = Common & {
  readonly bbox: {
    readonly west: number;
    readonly south: number;
    readonly east: number;
    readonly north: number;
  };
};

/** Daily values for one parameter, keyed by "YYYYMMDD". Missing data (POWER's fill value) is null. */
export type DailySeries = Readonly<Record<PowerDate, number | null>>;

export type PowerLocation = {
  /**
   * Point queries echo the requested location (rounded to 3 decimals); regional queries return the
   * centre of each native grid cell. Either way the values come from the cell containing it.
   */
  readonly longitude: number;
  readonly latitude: number;
  /** Metres above sea level of that cell. */
  readonly elevation: number;
  /** One series per requested parameter. */
  readonly series: Readonly<Record<string, DailySeries>>;
};

export type ParameterInfo = { readonly units: string; readonly longname: string };

export type PowerResult<T> = {
  readonly data: T;
  /** Units and long name per parameter. */
  readonly parameters: Readonly<Record<string, ParameterInfo>>;
  /** Source datasets, e.g. ["MERRA2"]. */
  readonly sources: readonly string[];
};

/** Thrown for network failures, non-2xx answers and POWER's own validation messages. */
export class PowerError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "PowerError";
    this.status = status;
  }
}

/** Daily data for one point. */
export async function fetchDailyPoint(query: PointQuery): Promise<PowerResult<PowerLocation>> {
  const url = buildUrl("daily/point", query, {
    longitude: round(query.longitude),
    latitude: round(query.latitude),
  });
  const body = await request<PointResponse>(url, query.signal);
  return {
    data: toLocation(body, fillValue(body)),
    parameters: body.parameters ?? {},
    sources: body.header?.sources ?? [],
  };
}

/** Daily data for every POWER grid cell inside a bounding box. */
export async function fetchDailyRegional(
  query: RegionalQuery,
): Promise<PowerResult<readonly PowerLocation[]>> {
  const { west, south, east, north } = query.bbox;
  const url = buildUrl("daily/regional", query, {
    "longitude-min": round(west),
    "longitude-max": round(east),
    "latitude-min": round(south),
    "latitude-max": round(north),
  });
  const body = await request<RegionalResponse>(url, query.signal);
  const fill = fillValue(body);
  return {
    data: (body.features ?? []).map((feature) => toLocation(feature, fill)),
    parameters: body.parameters ?? {},
    sources: body.header?.sources ?? [],
  };
}

/** "YYYYMMDD" range covering a whole calendar year. */
export function yearRange(year: number): { readonly start: PowerDate; readonly end: PowerDate } {
  return { start: `${year}0101`, end: `${year}1231` };
}

// --- internals --------------------------------------------------------------------------------

type PointResponse = {
  readonly geometry?: { readonly coordinates?: readonly number[] };
  readonly properties?: { readonly parameter?: Record<string, Record<string, number>> };
  readonly header?: { readonly fill_value?: number; readonly sources?: readonly string[] };
  readonly parameters?: Record<string, ParameterInfo>;
  readonly messages?: readonly string[];
};

type RegionalResponse = Omit<PointResponse, "geometry" | "properties"> & {
  readonly features?: readonly PointResponse[];
};

const DEFAULT_FILL = -999;

function round(value: number): string {
  return value.toFixed(4);
}

function buildUrl(path: string, query: Common, location: Record<string, string>): string {
  const params = new URLSearchParams({
    parameters: query.parameters.join(","),
    community: query.community ?? "AG",
    ...location,
    start: query.start,
    end: query.end,
    format: "JSON",
  });
  return `${API_ROOT}/${path}?${params}`;
}

async function request<T>(url: string, signal: AbortSignal | undefined): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new PowerError("Could not reach NASA POWER. Check your connection.", null);
  }
  const body = (await response.json().catch(() => null)) as (T & PointResponse) | null;
  if (!response.ok || !body) {
    const detail = body?.messages?.join(" ") || response.statusText;
    throw new PowerError(`NASA POWER request failed (${response.status}): ${detail}`, response.status);
  }
  return body;
}

function fillValue(body: PointResponse | RegionalResponse): number {
  return body.header?.fill_value ?? DEFAULT_FILL;
}

function toLocation(feature: PointResponse, fill: number): PowerLocation {
  const [longitude = NaN, latitude = NaN, elevation = NaN] = feature.geometry?.coordinates ?? [];
  const raw = feature.properties?.parameter ?? {};
  const series: Record<string, DailySeries> = {};
  for (const [name, days] of Object.entries(raw)) {
    const clean: Record<string, number | null> = {};
    for (const [date, value] of Object.entries(days)) clean[date] = value === fill ? null : value;
    series[name] = clean;
  }
  return { longitude, latitude, elevation, series };
}
