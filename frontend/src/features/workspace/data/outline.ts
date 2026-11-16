import type { Feature, Polygon } from "geojson";
import outlineJson from "@/data/el-salvador.json";

/** El Salvador outline (geoBoundaries / OpenStreetMap, CC BY-SA 2.0). */
export const EL_SALVADOR = outlineJson as Feature<Polygon>;
