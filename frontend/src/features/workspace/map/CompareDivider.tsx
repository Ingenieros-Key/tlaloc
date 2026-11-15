"use client";

import { ChevronsLeftRight } from "lucide-react";
import type { KeyboardEvent, PointerEvent, Ref } from "react";
import { t } from "../strings";

/** How far one arrow-key press moves the divider, as a fraction of its travel. */
const KEY_STEP = 0.02;

export type DividerMove =
  | { readonly clientX: number }
  | { readonly delta: number }
  | { readonly frac: number };

/**
 * Compare view's divider: a vertical line with a round handle and the two layers' names either
 * side of it. Drag the handle, or focus it and use the arrow keys (Home and End jump to the ends).
 * The handle sits above the middle of the map, clear of a focused plot's label at the centre.
 * The map view positions it (a translate on the root) and keeps `aria-valuenow` current, so moving
 * it never re-renders React.
 */
export function CompareDivider({
  ref,
  leftLabel,
  rightLabel,
  onMove,
}: {
  readonly ref: Ref<HTMLDivElement>;
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly onMove: (to: DividerMove) => void;
}) {
  const s = t.map.compare;
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) onMove({ clientX: e.clientX });
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const move: DividerMove | null =
      e.key === "ArrowLeft"
        ? { delta: -KEY_STEP }
        : e.key === "ArrowRight"
          ? { delta: KEY_STEP }
          : e.key === "Home"
            ? { frac: 0 }
            : e.key === "End"
              ? { frac: 1 }
              : null;
    if (!move) return;
    e.preventDefault();
    e.stopPropagation();
    onMove(move);
  };
  const chip =
    "absolute top-[30%] -translate-y-1/2 whitespace-nowrap rounded-md border border-line-strong bg-surface/95 px-2 py-0.5 text-xs font-medium text-text shadow-md shadow-black/30";
  return (
    <div ref={ref} className="pointer-events-none absolute inset-y-0 left-0 z-[4] w-0">
      <div aria-hidden="true" className="absolute inset-y-0 -left-px w-0.5 bg-text shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
      <span aria-hidden="true" className={`${chip} right-8`}>
        {leftLabel}
      </span>
      <span aria-hidden="true" className={`${chip} left-8`}>
        {rightLabel}
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-orientation="horizontal"
        aria-label={s.divider(leftLabel, rightLabel)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={50}
        title={s.dividerHint}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="pointer-events-auto absolute left-0 top-[30%] grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full border-2 border-text bg-surface text-text shadow-lg shadow-black/40"
      >
        <ChevronsLeftRight aria-hidden="true" strokeWidth={2} className="size-5" />
      </div>
    </div>
  );
}
