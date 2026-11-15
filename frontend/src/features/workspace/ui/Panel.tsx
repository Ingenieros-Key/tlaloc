import { ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

export type PanelCollapse = {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  /** Accessible name for the toggle in its current state, e.g. "Collapse Browser". */
  readonly label: string;
};

/**
 * Floating workspace panel shell (Browser, Inspector). Fills its container; caller sets size and
 * position. The heading is programmatically focusable so an opened drawer can move focus to it.
 *
 * With `collapse`, lg+ shows a header toggle that folds the panel down to its header. Below lg the
 * panel is a drawer that closes entirely, so the toggle is hidden and `collapsed` is ignored.
 *
 * The parent must be a full-height flex column. The panel grows into it with `flex: 1 1 0` and folds
 * by animating flex-grow to 0, which slides its height down to the header (min-height) without
 * measuring content. The folded body turns invisible only after the slide, so it leaves the tab
 * order and accessibility tree without cutting the animation short.
 */
export function Panel({
  title,
  children,
  labelledBy,
  collapse,
  className = "",
}: {
  readonly title: string;
  readonly children: ReactNode;
  /** id for the heading so the region/dialog can reference it. */
  readonly labelledBy: string;
  readonly collapse?: PanelCollapse;
  readonly className?: string;
}) {
  const collapsed = collapse?.collapsed === true;
  const bodyId = `${labelledBy}-body`;
  return (
    <section
      aria-labelledby={labelledBy}
      className={`pointer-events-auto flex min-h-[42px] flex-[1_1_0%] flex-col overflow-hidden rounded-lg border border-line bg-surface/95 shadow-xl shadow-black/40 backdrop-blur transition-[flex-grow] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
        collapsed ? "lg:grow-0" : ""
      } ${className}`}
    >
      <header
        className={`flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line pl-3 pr-1 ${
          collapsed ? "lg:border-b-0" : ""
        }`}
        onDoubleClick={collapse ? collapse.onToggle : undefined}
      >
        <h2
          id={labelledBy}
          tabIndex={-1}
          className="select-none font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted"
        >
          {title}
        </h2>
        {collapse ? (
          <button
            type="button"
            aria-label={collapse.label}
            title={collapse.label}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={collapse.onToggle}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-3 hover:text-text max-lg:hidden"
          >
            <ChevronUp
              aria-hidden="true"
              strokeWidth={1.75}
              className={`size-4 transition-transform duration-200 ease-out ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </header>
      <div
        id={bodyId}
        className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? "lg:invisible lg:[transition:visibility_0s_300ms]" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

/** Collapsible-looking group inside a Panel, mimicking Fusion's Browser tree nodes. */
export function PanelGroup({
  label,
  count,
  children,
}: {
  readonly label: string;
  readonly count?: number;
  readonly children: ReactNode;
}) {
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex h-9 items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted">
        <span>{label}</span>
        {count !== undefined ? <span className="tabular font-mono text-muted">{count}</span> : null}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}
