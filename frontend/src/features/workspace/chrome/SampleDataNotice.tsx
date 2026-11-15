"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import { t } from "../strings";
import { Badge } from "../ui/Badge";

/**
 * "Sample data" badge as a disclosure button: the explanation is reachable by click, tap and
 * keyboard (not hover-only). Closes on Escape, outside pointer-down or when focus leaves it.
 * Sits on the crop outlook, the one part of the workspace that still uses simulated values.
 */
export function SampleDataNotice({ align = "start" }: { readonly align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
      if (rootRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    if (e.relatedTarget) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0" onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((value) => !value)}
        className="-mx-1 inline-flex h-7 max-lg:h-11 cursor-pointer items-center rounded-md px-1 transition-opacity duration-150 hover:opacity-85"
      >
        <Badge>
          <Info aria-hidden="true" className="size-3.5" strokeWidth={2} />
          {t.common.partlySample}
        </Badge>
      </button>
      <div
        id={popoverId}
        role="region"
        aria-labelledby={titleId}
        hidden={!open}
        className={`absolute top-full z-50 mt-1 w-64 rounded-lg border border-line-strong bg-surface-2 p-3 text-left normal-case tracking-normal shadow-lg shadow-black/40 ${
          align === "end" ? "right-0" : "left-0"
        }`}
      >
        <p id={titleId} className="text-sm font-semibold text-text">
          {t.chrome.topBar.sampleDataTitle}
        </p>
        <p className="mt-1 text-xs font-normal leading-relaxed text-muted">{t.common.sampleDataHint}</p>
      </div>
    </div>
  );
}
