import type { PrecipFrames } from "./precip";
import { getSampleGrid } from "./sample-grid";

/**
 * Elevation on the workspace hexagon grid, from the AWS Terrain Tiles (Mapzen "terrarium" PNGs,
 * free, no key, CORS open). Over El Salvador their land heights come from NASA's SRTM. Each
 * hexagon is the mean height of the tile pixels within about 1.5 km of its centre, so it is as
 * coarse as the hexagons, not as the source.
 */
const TILE_URL = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium";

/** Zoom 9: tiles about 78 km wide, pixels about 300 m at El Salvador's latitude. */
const ZOOM = 9;
const TILE_SIZE = 256;

/** Pixels averaged on each side of a hexagon's centre: 5 px ≈ 1.5 km. */
const KERNEL_PX = 5;

type Pixel = { readonly tileX: number; readonly tileY: number; readonly x: number; readonly y: number };

/** Global pixel position of a point at `ZOOM` (Web Mercator). */
function toPixel(lng: number, lat: number): readonly [number, number] {
  const world = TILE_SIZE * 2 ** ZOOM;
  const rad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * world;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * world;
  return [x, y];
}

function split(px: number, py: number): Pixel {
  const tileX = Math.floor(px / TILE_SIZE);
  const tileY = Math.floor(py / TILE_SIZE);
  return { tileX, tileY, x: Math.floor(px - tileX * TILE_SIZE), y: Math.floor(py - tileY * TILE_SIZE) };
}

/** A tile's RGBA pixels. Terrarium encodes height as (R × 256 + G + B / 256) − 32768 metres. */
async function loadTile(tileX: number, tileY: number, signal?: AbortSignal): Promise<Uint8ClampedArray> {
  const response = await fetch(`${TILE_URL}/${ZOOM}/${tileX}/${tileY}.png`, { signal });
  if (!response.ok) throw new Error(`Elevation tile ${ZOOM}/${tileX}/${tileY}: HTTP ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D is not available to read elevation tiles");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return context.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
}

function heightAt(data: Uint8ClampedArray, x: number, y: number): number {
  const i = (y * TILE_SIZE + x) * 4;
  return data[i] * 256 + data[i + 1] + data[i + 2] / 256 - 32768;
}

/**
 * Every hexagon's mean elevation in metres, as one static frame (`dates` is empty: elevation has
 * no days, so the timeline stays hidden). Sea pixels (at or below 0 m) are left out of coastal
 * hexagons, so the shoreline does not drag them below sea level.
 */
export async function loadElevationFrames(signal?: AbortSignal): Promise<PrecipFrames> {
  const grid = getSampleGrid();
  const centres = grid.map((cell) => toPixel(cell.center[0], cell.center[1]));

  const needed = new Map<string, readonly [number, number]>();
  for (const [px, py] of centres) {
    for (const [dx, dy] of [
      [-KERNEL_PX, -KERNEL_PX],
      [KERNEL_PX, -KERNEL_PX],
      [-KERNEL_PX, KERNEL_PX],
      [KERNEL_PX, KERNEL_PX],
    ]) {
      const { tileX, tileY } = split(px + dx, py + dy);
      needed.set(`${tileX}/${tileY}`, [tileX, tileY]);
    }
  }
  const tiles = new Map(
    await Promise.all(
      [...needed].map(async ([key, [x, y]]) => [key, await loadTile(x, y, signal)] as const),
    ),
  );

  const frame = new Float32Array(grid.length);
  centres.forEach(([px, py], h) => {
    let sum = 0;
    let count = 0;
    for (let dy = -KERNEL_PX; dy <= KERNEL_PX; dy += 1) {
      for (let dx = -KERNEL_PX; dx <= KERNEL_PX; dx += 1) {
        const p = split(px + dx, py + dy);
        const data = tiles.get(`${p.tileX}/${p.tileY}`);
        if (!data) continue;
        const height = heightAt(data, p.x, p.y);
        if (height <= 0) continue;
        sum += height;
        count += 1;
      }
    }
    frame[h] = count > 0 ? sum / count : 0;
  });

  return {
    dates: [],
    hexes: grid.map(({ id, polygon, center }) => ({ id, polygon, center })),
    values: [frame],
  };
}

/** Query options for the elevation layer. Heights never change, so the answer never goes stale. */
export function elevationQuery() {
  return {
    queryKey: ["terrain-tiles", "elevation", ZOOM, KERNEL_PX] as const,
    queryFn: ({ signal }: { readonly signal?: AbortSignal }) => loadElevationFrames(signal),
    staleTime: Infinity,
  };
}
