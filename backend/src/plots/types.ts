export type Plot = {
  readonly userId: string;
  readonly plotId: string;
  readonly name: string;
  /** GeoJSON Polygon feature geometry (the land plot outline). */
  readonly geometry: unknown;
  /** Farmer's planting answers for this plot (shape owned by the frontend). */
  readonly planting?: unknown;
  readonly priority?: string;
  readonly updatedAt: string;
};
