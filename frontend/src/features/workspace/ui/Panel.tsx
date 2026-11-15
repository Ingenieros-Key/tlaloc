import type { ReactNode } from "react";

/**
 * Floating workspace panel shell (Browser, Inspector). Fills its container; caller sets size and
 * position. The heading is programmatically focusable so an opened drawer can move focus to it.
 */
export function Panel({
  title,
  children,
  labelledBy,
  className = "",
}: {
  readonly title: string;
  readonly children: ReactNode;
  /** id for the heading so the region/dialog can reference it. */
  readonly labelledBy: string;
  readonly className?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface/95 shadow-xl shadow-black/40 backdrop-blur ${className}`}
    >
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <h2
          id={labelledBy}
          tabIndex={-1}
          className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted"
        >
          {title}
        </h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
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
        {count !== undefined ? <span className="tabular font-mono text-muted/80">{count}</span> : null}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}
