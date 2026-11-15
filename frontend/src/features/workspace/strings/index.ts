import { browser } from "./browser";
import { chrome } from "./chrome";
import { common } from "./common";
import { inspector } from "./inspector";
import { map } from "./map";
import { rotation } from "./rotation";

/** Single entry point for all UI copy (English only in v1; Spanish later = translate these files). */
export const t = { common, chrome, browser, inspector, map, rotation } as const;
