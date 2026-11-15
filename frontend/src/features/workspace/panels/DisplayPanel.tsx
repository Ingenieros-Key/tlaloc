"use client";

import { DEFAULT_DISPLAY, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { DisplayKey } from "../types";
import { SwitchRow } from "../ui/Switch";

const s = t.inspector.display;

const SECTIONS: readonly { readonly id: keyof typeof s.sections; readonly keys: readonly DisplayKey[] }[] = [
  { id: "map", keys: ["data", "borders", "outline", "labels"] },
  { id: "overlays", keys: ["tooltips", "pin", "plotLabel", "timeline", "navBar"] },
  { id: "panels", keys: ["legends", "limiting"] },
];

/** Display card (shown in the Inspector slot): switches for what the map and panels show. */
export function DisplayPanel() {
  const { display } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const allOn = (Object.keys(DEFAULT_DISPLAY) as DisplayKey[]).every((key) => display[key]);

  return (
    <div className="divide-y divide-line">
      {SECTIONS.map((section, index) => {
        const headingId = `display-${section.id}`;
        return (
          <section key={section.id} aria-labelledby={headingId} className="px-1.5 py-2">
            <div className="flex h-7 items-center justify-between px-1.5">
              <h3 id={headingId} className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {s.sections[section.id]}
              </h3>
              {index === 0 && !allOn ? (
                <button
                  type="button"
                  title={s.resetHint}
                  onClick={() => dispatch({ type: "resetDisplay" })}
                  className="cursor-pointer rounded px-1 text-xs font-medium text-accent transition-colors duration-150 hover:bg-accent/10 max-lg:min-h-11"
                >
                  {s.reset}
                </button>
              ) : null}
            </div>
            <ul>
              {section.keys.map((key) => (
                <li key={key}>
                  <SwitchRow
                    label={s.items[key]}
                    description={s.descriptions[key]}
                    checked={display[key]}
                    onChange={(visible) => dispatch({ type: "setDisplay", key, visible })}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
