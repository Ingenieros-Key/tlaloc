import type { HexColor } from "terra-draw";
import { MUTED_CELL } from "../layers";
import type { Rgba } from "../types";

/*
 * WebGL renderers (deck.gl, terra-draw) cannot read CSS variables, so the few colors they need are
 * mirrored here from the design tokens in app/globals.css. Keep the two in sync.
 */

/** --tl-accent */
export const ACCENT_HEX: HexColor = "#1fc8b4";
/** --tl-text (cream), used for selection handles. */
export const CREAM_HEX: HexColor = "#f4f0e6";
/** --tl-bg, used as the handle outline and the satellite style background. */
export const BG_HEX: HexColor = "#050b16";

/** Country outline: the muted blue-grey of MUTED_CELL, made opaque enough to read on both basemaps. */
export const OUTLINE_COLOR: Rgba = [MUTED_CELL[0], MUTED_CELL[1], MUTED_CELL[2], 200];
/** Hairline between hexagons: --tl-bg at low alpha (light basemap). */
export const CELL_STROKE: Rgba = [5, 11, 22, 90];
/** Hairline between hexagons on the dark basemap, where a navy stroke disappears: --tl-muted. */
export const CELL_STROKE_DARK: Rgba = [158, 176, 204, 70];
/** Hover highlight on the active data layer: cream at low alpha. */
export const CELL_HIGHLIGHT: Rgba = [244, 240, 230, 70];
