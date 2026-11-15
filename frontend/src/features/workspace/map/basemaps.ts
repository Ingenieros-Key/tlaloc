import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { t } from "../strings";
import type { Theme } from "@/lib/theme";
import type { Basemap } from "../types";
import { BG_HEX } from "./theme";
import { TD_PREFIX } from "./terraDraw";

/**
 * OpenFreeMap vector styles (OpenMapTiles schema; attribution comes from their TileJSON). Dark and
 * Positron share the same layout, so switching themes keeps labels and the overlay anchor.
 */
const STREET_STYLE_URL: Readonly<Record<Theme, string>> = {
  dark: "https://tiles.openfreemap.org/styles/dark",
  light: "https://tiles.openfreemap.org/styles/positron",
};

/**
 * NASA GIBS Blue Marble: Next Generation, a cloud-free monthly composite. Its TileMatrixSet is
 * GoogleMapsCompatible_Level8, so the source stops at z8 and MapLibre overzooms above that
 * (z9 returns HTTP 400). Template order is {TileMatrix}/{TileRow}/{TileCol} = {z}/{y}/{x}.
 */
const GIBS_TILES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";
const GIBS_MAX_ZOOM = 8;

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    gibs: {
      type: "raster",
      tiles: [GIBS_TILES],
      tileSize: 256,
      maxzoom: GIBS_MAX_ZOOM,
      attribution: t.map.attribution.gibs,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": BG_HEX } },
    { id: "gibs", type: "raster", source: "gibs" },
  ],
};

/**
 * Background-only style used when a basemap's style itself fails to load, so `style.load` still
 * fires and the data overlay, drawing and camera keep working.
 */
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": BG_HEX } }],
};

/** The MapLibre style for a basemap choice. Satellite imagery is the same in both themes. */
export function basemapStyle(basemap: Basemap, theme: Theme): StyleSpecification | string {
  return basemap === "satellite" ? SATELLITE_STYLE : STREET_STYLE_URL[theme];
}

/** Whether moving between these two theme/basemap combinations needs a new MapLibre style. */
export function needsStyleSwap(
  from: { readonly basemap: Basemap; readonly theme: Theme },
  to: { readonly basemap: Basemap; readonly theme: Theme },
): boolean {
  return basemapStyle(from.basemap, from.theme) !== basemapStyle(to.basemap, to.theme);
}

/**
 * Shows or hides the basemap's text and icon (symbol) layers: towns, roads, places. Terra-draw's
 * own layers are left alone. Style swaps reset this, so callers reapply it on `style.load`.
 */
export function setBasemapLabels(map: MapLibreMap, visible: boolean): void {
  const visibility = visible ? "visible" : "none";
  for (const layer of map.getStyle().layers) {
    if (layer.type !== "symbol" || layer.id.startsWith(`${TD_PREFIX}-`)) continue;
    map.setLayoutProperty(layer.id, "visibility", visibility);
  }
}

/**
 * Layer id the deck.gl data layers render beneath: the first label (symbol) layer of the style, or
 * terra-draw's lowest layer, whichever comes first. Keeps data under basemap labels and under the
 * drawn plot. Call after terra-draw has registered its layers.
 */
export function findOverlayAnchor(map: MapLibreMap): string | undefined {
  return map
    .getLayersOrder()
    .find((id) => id.startsWith(`${TD_PREFIX}-`) || map.getLayer(id)?.type === "symbol");
}
