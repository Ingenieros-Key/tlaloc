import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { t } from "../strings";
import type { Basemap } from "../types";
import { BG_HEX } from "./theme";
import { TD_PREFIX } from "./terraDraw";

/** OpenFreeMap dark vector style (OpenMapTiles schema; attribution comes from its TileJSON). */
const DARK_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

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

/** The MapLibre style for a basemap choice. */
export function basemapStyle(basemap: Basemap): StyleSpecification | string {
  return basemap === "satellite" ? SATELLITE_STYLE : DARK_STYLE_URL;
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
