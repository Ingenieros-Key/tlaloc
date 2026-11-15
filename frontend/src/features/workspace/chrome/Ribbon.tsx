"use client";

import {
  Box,
  Focus,
  Hand,
  LoaderCircle,
  Map as MapIcon,
  RotateCcw,
  Satellite,
  ScanSearch,
  SlidersHorizontal,
  Square,
  SquarePen,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { t } from "../strings";
import { useMapController, useWorkspace, useWorkspaceDispatch } from "../store";
import { DRAWER_QUERY, useMediaQuery } from "../hooks/useMediaQuery";
import type { Basemap, Tool } from "../types";

const s = t.chrome.ribbon;

/** aria-keyshortcuts tokens (spec syntax, not UI copy). */
const ARIA_KEYS = {
  pan: "H",
  square: "S",
  edit: "E",
  deletePlot: "Delete Backspace",
  analyze: "A",
} as const;

const BASEMAPS: readonly { readonly id: Basemap; readonly icon: LucideIcon }[] = [
  { id: "map", icon: MapIcon },
  { id: "satellite", icon: Satellite },
];

type Roving = {
  readonly activeKey: string;
  readonly setActiveKey: (key: string) => void;
  /** id of the hidden "draw a plot first" description shared by disabled tools. */
  readonly needsPlotId: string;
};

const RovingContext = createContext<Roving | null>(null);

function useRoving(): Roving {
  const value = useContext(RovingContext);
  if (!value) throw new Error("Ribbon buttons must render inside <Ribbon>");
  return value;
}

/**
 * Fusion-style tool ribbon. One WAI-ARIA toolbar (single tab stop, roving tabindex with
 * Left/Right/Home/End); also owns the global single-key shortcuts.
 */
export function Ribbon() {
  const state = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const controller = useMapController();
  const [activeKey, setActiveKey] = useState("pan");
  const [fade, setFade] = useState({ start: false, end: false });
  const barRef = useRef<HTMLDivElement>(null);
  const needsPlotId = useId();

  const { tool, plot, is3d, basemap } = state;
  const displayOn = state.inspectorView === "display";
  const drawerLayout = useMediaQuery(DRAWER_QUERY);
  const hasPlot = plot !== null;
  const running = state.analysis.status === "running";

  const selectTool = (next: Tool) => dispatch({ type: "setTool", tool: next });
  const deletePlot = () => dispatch({ type: "clearPlot" });
  const analyze = () => dispatch({ type: "runAnalysis" });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }
      if (isEditableTarget(e.target)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const scope = shortcutScope(e.target);
      if (key !== "Escape" && scope === null) return;
      switch (key) {
        case "h":
          dispatch({ type: "setTool", tool: "pan" });
          break;
        case "s":
          dispatch({ type: "setTool", tool: "square" });
          break;
        case "e":
          if (!hasPlot) return;
          dispatch({ type: "setTool", tool: "edit" });
          break;
        case "Delete":
        case "Backspace":
          if (!hasPlot || e.repeat || scope !== "map") return;
          dispatch({ type: "clearPlot" });
          break;
        case "Escape":
          if (tool === "pan") return;
          dispatch({ type: "setTool", tool: "pan" });
          break;
        case "a":
          if (!hasPlot || running || e.repeat) return;
          dispatch({ type: "runAnalysis" });
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, hasPlot, running, tool]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => {
      const max = bar.scrollWidth - bar.clientWidth;
      const start = bar.scrollLeft > 1;
      const end = bar.scrollLeft < max - 1;
      setFade((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    bar.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      bar.removeEventListener("scroll", update);
    };
  }, []);

  const onToolbarKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-roving]"));
    const index = items.findIndex((item) => item === document.activeElement);
    if (index < 0) return;
    e.preventDefault();
    const last = items.length - 1;
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? last
          : e.key === "ArrowRight"
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  const mask = overflowMask(fade.start, fade.end);

  const toolTip = (id: Tool) =>
    s.tooltip(s.toolTips[id], s.keys[id], id === "edit" && !hasPlot ? s.needsPlot : undefined);

  return (
    <RovingContext.Provider value={{ activeKey, setActiveKey, needsPlotId }}>
      <div
        ref={barRef}
        role="toolbar"
        aria-label={s.label}
        data-shortcuts="ribbon"
        onKeyDown={onToolbarKeyDown}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="relative flex h-[var(--tl-ribbon-h)] shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-line bg-surface px-1.5"
      >
        <span id={needsPlotId} hidden>
          {s.needsPlotDescription}
        </span>
        <RibbonGroup label={s.groups.draw}>
          <RibbonButton
            id="pan"
            icon={Hand}
            label={s.tools.pan}
            title={toolTip("pan")}
            shortcut={ARIA_KEYS.pan}
            pressed={tool === "pan"}
            onPress={() => selectTool("pan")}
          />
          <RibbonButton
            id="square"
            icon={Square}
            label={s.tools.square}
            title={toolTip("square")}
            shortcut={ARIA_KEYS.square}
            pressed={tool === "square"}
            onPress={() => selectTool("square")}
          />
          <RibbonButton
            id="edit"
            icon={SquarePen}
            label={s.tools.edit}
            title={toolTip("edit")}
            shortcut={ARIA_KEYS.edit}
            pressed={tool === "edit"}
            disabled={!hasPlot}
            onPress={() => selectTool("edit")}
          />
          <RibbonButton
            id="delete"
            icon={Trash2}
            label={s.deletePlot}
            title={s.tooltip(s.deletePlotTip, s.keys.deletePlot, hasPlot ? undefined : s.needsPlot)}
            shortcut={ARIA_KEYS.deletePlot}
            disabled={!hasPlot}
            onPress={deletePlot}
          />
        </RibbonGroup>
        <GroupDivider />
        <RibbonGroup label={s.groups.analyze}>
          <RibbonButton
            id="analyze"
            icon={running ? LoaderCircle : ScanSearch}
            spin={running}
            busy={running}
            label={running ? s.analyzing : s.analyze}
            title={s.tooltip(s.analyzeTip, s.keys.analyze, hasPlot ? undefined : s.needsPlot)}
            shortcut={ARIA_KEYS.analyze}
            disabled={!hasPlot}
            onPress={() => {
              if (!running) analyze();
            }}
          />
          <RibbonButton
            id="focus"
            icon={Focus}
            label={s.focusPlot}
            title={s.tooltip(s.focusPlotTip, undefined, hasPlot ? undefined : s.needsPlot)}
            disabled={!hasPlot}
            onPress={() => controller.get()?.focusPlot()}
          />
        </RibbonGroup>
        <GroupDivider />
        <RibbonGroup label={s.groups.view}>
          <RibbonButton
            id="3d"
            icon={Box}
            label={s.threeD}
            title={s.tooltip(s.threeDTip)}
            pressed={is3d}
            onPress={() => dispatch({ type: "set3d", is3d: !is3d })}
          />
          <RibbonButton
            id="reset"
            icon={RotateCcw}
            label={s.resetView}
            title={s.tooltip(s.resetViewTip)}
            onPress={() => controller.get()?.resetView()}
          />
          <BasemapSwitch value={basemap} onChange={(next) => dispatch({ type: "setBasemap", basemap: next })} />
          <RibbonButton
            id="display"
            icon={SlidersHorizontal}
            label={s.display}
            title={s.tooltip(s.displayTip)}
            pressed={displayOn}
            onPress={() => {
              dispatch({ type: "setInspectorView", view: displayOn ? "results" : "display" });
              // Below lg the card is a drawer: opening Display slides it in.
              if (!displayOn && drawerLayout) {
                dispatch({ type: "setPanel", panel: "inspector", open: true });
                dispatch({ type: "setPanel", panel: "browser", open: false });
              }
            }}
          />
        </RibbonGroup>
        <p
          aria-live="polite"
          className="ml-auto flex shrink-0 items-center pl-4 pr-2 text-xs text-muted max-xl:sr-only"
        >
          {s.hints[tool]}
        </p>
      </div>
    </RovingContext.Provider>
  );
}

/**
 * Map | Satellite radiogroup inside the toolbar. Left/Right keep moving through the toolbar (so the
 * toolbar stays one tab stop); Up/Down select and focus the adjacent option; Space/Enter select.
 */
function BasemapSwitch({
  value,
  onChange,
}: {
  readonly value: Basemap;
  readonly onChange: (basemap: Basemap) => void;
}) {
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const index = BASEMAPS.findIndex((option) => option.id === value);
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = BASEMAPS[(index + step + BASEMAPS.length) % BASEMAPS.length];
    if (!next) return;
    onChange(next.id);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-roving="basemap-${next.id}"]`)?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={s.basemapLabel}
      onKeyDown={onKeyDown}
      className="ml-1 flex items-center gap-0.5 rounded-md border border-line p-0.5"
    >
      {BASEMAPS.map((option) => (
        <RibbonButton
          key={option.id}
          id={`basemap-${option.id}`}
          role="radio"
          compact
          icon={option.icon}
          label={s.basemaps[option.id]}
          title={s.tooltip(s.basemapTips[option.id])}
          pressed={value === option.id}
          onPress={() => onChange(option.id)}
        />
      ))}
    </div>
  );
}

function RibbonGroup({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex shrink-0 flex-col items-center justify-center gap-1 px-1.5"
    >
      <div className="flex items-center gap-0.5">{children}</div>
      <span
        id={labelId}
        className="select-none max-sm:sr-only text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-muted"
      >
        {label}
      </span>
    </div>
  );
}

function GroupDivider() {
  return <span aria-hidden="true" className="my-2.5 w-px shrink-0 bg-line" />;
}

/**
 * Icon-over-label ribbon button. Disabled buttons use aria-disabled so they stay focusable in the
 * toolbar (and their tooltip can say why); presses are ignored while disabled.
 */
function RibbonButton({
  id,
  icon: Icon,
  label,
  title,
  shortcut,
  pressed,
  disabled = false,
  busy = false,
  spin = false,
  role,
  compact = false,
  onPress,
}: {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly title: string;
  /** aria-keyshortcuts value. */
  readonly shortcut?: string;
  /** Toggle state; rendered as aria-pressed, or aria-checked when role="radio". */
  readonly pressed?: boolean;
  readonly disabled?: boolean;
  readonly busy?: boolean;
  readonly spin?: boolean;
  readonly role?: "radio";
  readonly compact?: boolean;
  readonly onPress: () => void;
}) {
  const { activeKey, setActiveKey, needsPlotId } = useRoving();
  const on = pressed === true;
  const size = compact ? "h-11 min-w-14 max-sm:min-w-11" : "h-12 min-w-16 max-sm:h-11 max-sm:min-w-11";
  const tone = disabled
    ? "cursor-not-allowed text-muted opacity-40"
    : on
      ? "cursor-pointer bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
      : "cursor-pointer text-muted hover:bg-surface-3 hover:text-text";
  return (
    <button
      type="button"
      data-roving={id}
      tabIndex={activeKey === id ? 0 : -1}
      onFocus={() => setActiveKey(id)}
      role={role}
      aria-checked={role === "radio" ? on : undefined}
      aria-pressed={role === undefined && pressed !== undefined ? on : undefined}
      aria-disabled={disabled || undefined}
      aria-describedby={disabled ? needsPlotId : undefined}
      aria-busy={busy || undefined}
      aria-keyshortcuts={shortcut}
      title={title}
      onClick={() => {
        if (!disabled) onPress();
      }}
      className={`inline-flex ${size} shrink-0 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11px] font-medium leading-none transition-colors duration-150 ${tone}`}
    >
      <Icon
        aria-hidden="true"
        className={`size-5 shrink-0 ${spin ? "animate-spin" : ""}`}
        strokeWidth={1.75}
      />
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}

/** Edge fade showing that the toolbar scrolls (phones), or none when everything fits. */
function overflowMask(start: boolean, end: boolean): string | undefined {
  if (!start && !end) return undefined;
  const from = start ? "transparent, black 2.5rem" : "black";
  const to = end ? "black calc(100% - 2.5rem), transparent" : "black";
  return `linear-gradient(to right, ${from}, ${to})`;
}

type ShortcutScope = "map" | "ribbon";

/**
 * Single-key shortcuts only fire while focus is in the map or the ribbon (WCAG 2.1.4), so typing or
 * speech input elsewhere cannot change tools or delete the plot.
 */
function shortcutScope(target: EventTarget | null): ShortcutScope | null {
  if (!(target instanceof Element)) return null;
  const scope = target.closest("[data-shortcuts]")?.getAttribute("data-shortcuts");
  return scope === "map" || scope === "ribbon" ? scope : null;
}

const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='slider'], [role='textbox'], [role='spinbutton'], [role='combobox']";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest(EDITABLE_SELECTOR) !== null;
}
