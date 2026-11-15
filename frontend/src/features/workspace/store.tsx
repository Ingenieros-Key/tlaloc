"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { computeAssessment } from "./data/assessment";
import { summarizePlot } from "./data/plot";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_PRESET_DAYS,
  buildPrecipFrames,
  latestWindow,
  PRECIP_PARAMETER,
  precipPointQuery,
  precipRegionalQuery,
  presetRange,
  type PrecipFrames,
  type PrecipWindow,
} from "./data/precip";
import { getSampleGrid } from "./data/sample-grid";
import { LAYER_ORDER, defaultLayerSettings } from "./layers";
import { t } from "./strings";
import type {
  AnalysisState,
  Basemap,
  DataStyle,
  DisplayKey,
  DisplaySettings,
  InspectorView,
  LayerId,
  LayerSettings,
  MapController,
  PlotFeature,
  PlotSummary,
  Tool,
  ViewState,
} from "./types";

export type PanelId = "browser" | "inspector";

export type PrecipMode = "latest" | "range";

/** Playback speed multipliers offered next to the timeline. */
export const PRECIP_SPEEDS = [0.5, 1, 2, 4] as const;
export type PrecipSpeed = (typeof PRECIP_SPEEDS)[number];

/**
 * NASA POWER daily precipitation frames, derived from a TanStack query (not reducer state). Fetched
 * the first time the layer is shown, then served from the query cache.
 */
export type PrecipState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  /** `refreshing`: a new timeframe is loading; `frames` still holds the previous one. */
  | { readonly status: "ready"; readonly frames: PrecipFrames; readonly refreshing: boolean }
  | { readonly status: "error"; readonly message: string; readonly retry: () => void };

export type WorkspaceState = {
  readonly tool: Tool;
  readonly basemap: Basemap;
  readonly is3d: boolean;
  /** Exactly one data layer is visible at a time; null = none. */
  readonly activeLayer: LayerId | null;
  readonly layerSettings: Readonly<Record<LayerId, LayerSettings>>;
  /** Hexagons (exact cell values) or a heatmap (smooth surface). */
  readonly dataStyle: DataStyle;
  readonly precip: PrecipState;
  /** "latest": the newest published day (default). "range": a chosen timeframe to scrub and play. */
  readonly precipMode: PrecipMode;
  /** The timeframe used in "range" mode. */
  readonly precipRange: PrecipWindow;
  /**
   * Frame shown in "range" mode, as an index into its dates; null = the last day. Read it through
   * `precipDayIndex`, which also clamps it and handles "latest".
   */
  readonly precipDay: number | null;
  readonly precipPlaying: boolean;
  /** Playback speed multiplier (1 = the default pace from `stepMs`). */
  readonly precipSpeed: PrecipSpeed;
  readonly plot: PlotFeature | null;
  readonly plotSummary: PlotSummary | null;
  /** What the user calls the drawn area; shown in the Browser, the Inspector and on the map. */
  readonly plotName: string;
  /** Focus plot: data clipped to the plot, the rest of the map dimmed, the value shown on it. */
  readonly focus: boolean;
  readonly analysis: AnalysisState;
  /** Bumped by "Analyze" to force a re-run on the same plot. */
  readonly analysisNonce: number;
  readonly view: ViewState;
  /** Drawer open state, only meaningful below the lg breakpoint. */
  readonly panels: Readonly<Record<PanelId, boolean>>;
  /** Point the user jumped to with "Go to coordinates", shown as a pin. [lng, lat] */
  readonly pin: readonly [number, number] | null;
  /** "Pick on map" mode: the next map click places the pin. */
  readonly picking: boolean;
  readonly inspectorView: InspectorView;
  readonly display: DisplaySettings;
  /** Floating panel collapsed to its header, only meaningful at lg and up. */
  readonly collapsed: Readonly<Record<PanelId, boolean>>;
};

/** What the reducer owns: everything except state derived from queries. */
type ReducerState = Omit<WorkspaceState, "precip">;

export type WorkspaceAction =
  | { readonly type: "setTool"; readonly tool: Tool }
  | { readonly type: "setBasemap"; readonly basemap: Basemap }
  | { readonly type: "set3d"; readonly is3d: boolean }
  | { readonly type: "setActiveLayer"; readonly layer: LayerId | null }
  | { readonly type: "setLayerOpacity"; readonly layer: LayerId; readonly opacity: number }
  | { readonly type: "setLayerRange"; readonly layer: LayerId; readonly range: readonly [number, number] }
  | { readonly type: "resetLayer"; readonly layer: LayerId }
  /** `day` null = follow the newest day. */
  | { readonly type: "setPrecipDay"; readonly day: number | null }
  | { readonly type: "setDataStyle"; readonly style: DataStyle }
  | { readonly type: "setPrecipMode"; readonly mode: PrecipMode }
  | { readonly type: "setPrecipRange"; readonly range: PrecipWindow }
  /** `from` is where playback starts (see `PrecipTimeline`). */
  | { readonly type: "setPrecipPlaying"; readonly playing: boolean; readonly from?: number }
  | { readonly type: "stepPrecip"; readonly last: number }
  | { readonly type: "setPrecipSpeed"; readonly speed: PrecipSpeed }
  | { readonly type: "setPlot"; readonly plot: PlotFeature }
  | { readonly type: "clearPlot" }
  | { readonly type: "setPlotName"; readonly name: string }
  | { readonly type: "setFocus"; readonly focus: boolean }
  | { readonly type: "runAnalysis" }
  | { readonly type: "analysisFinished"; readonly analysis: AnalysisState }
  | { readonly type: "setView"; readonly view: ViewState }
  | { readonly type: "setPanel"; readonly panel: PanelId; readonly open: boolean }
  | { readonly type: "setCollapsed"; readonly panel: PanelId; readonly collapsed: boolean }
  | { readonly type: "setPin"; readonly pin: readonly [number, number] | null }
  | { readonly type: "setPicking"; readonly picking: boolean }
  | { readonly type: "setInspectorView"; readonly view: InspectorView }
  | { readonly type: "setDisplay"; readonly key: DisplayKey; readonly visible: boolean }
  | { readonly type: "resetDisplay" };

/** Everything visible: the workspace as first designed. */
export const DEFAULT_DISPLAY: DisplaySettings = {
  data: true,
  borders: true,
  outline: true,
  labels: true,
  tooltips: true,
  pin: true,
  plotLabel: true,
  navBar: true,
  legends: true,
  limiting: true,
};

export const INITIAL_STATE: ReducerState = {
  tool: "pan",
  basemap: "map",
  is3d: true,
  activeLayer: "precip",
  layerSettings: Object.fromEntries(LAYER_ORDER.map((id) => [id, defaultLayerSettings(id)])) as Record<
    LayerId,
    LayerSettings
  >,
  dataStyle: "hexagons",
  precipMode: "latest",
  precipRange: presetRange(DEFAULT_PRESET_DAYS),
  precipDay: null,
  precipPlaying: false,
  precipSpeed: 1,
  plot: null,
  plotSummary: null,
  plotName: t.browser.plotName,
  focus: false,
  analysis: { status: "idle" },
  analysisNonce: 0,
  view: { bearing: 0, pitch: 30, zoom: 8 },
  panels: { browser: false, inspector: false },
  collapsed: { browser: false, inspector: false },
  pin: null,
  picking: false,
  inspectorView: "results",
  display: DEFAULT_DISPLAY,
};

export function workspaceReducer(state: ReducerState, action: WorkspaceAction): ReducerState {
  switch (action.type) {
    case "setTool":
      // Choosing a drawing tool takes the map click away from "Pick on map".
      return { ...state, tool: action.tool, picking: action.tool === "pan" && state.picking };
    case "setBasemap":
      return { ...state, basemap: action.basemap };
    case "set3d":
      return { ...state, is3d: action.is3d };
    case "setActiveLayer":
      return {
        ...state,
        activeLayer: action.layer,
        precipPlaying: action.layer === "precip" && state.precipPlaying,
      };
    case "setPrecipDay":
      return { ...state, precipDay: action.day, precipPlaying: false };
    case "setDataStyle":
      return { ...state, dataStyle: action.style };
    case "setPrecipSpeed":
      return { ...state, precipSpeed: action.speed };
    case "setPrecipMode":
      return { ...state, precipMode: action.mode, precipPlaying: false };
    case "setPrecipRange":
      // A new timeframe opens on its last day.
      return { ...state, precipRange: action.range, precipDay: null, precipPlaying: false };
    case "setPrecipPlaying":
      return action.playing
        ? { ...state, precipPlaying: true, precipDay: action.from ?? state.precipDay }
        : { ...state, precipPlaying: false };
    case "stepPrecip": {
      const day = Math.min(action.last, (state.precipDay ?? action.last) + 1);
      const done = day >= action.last;
      // Landing on the newest day hands back to "follow the newest day".
      return { ...state, precipDay: done ? null : day, precipPlaying: state.precipPlaying && !done };
    }
    case "setLayerOpacity":
      return {
        ...state,
        layerSettings: {
          ...state.layerSettings,
          [action.layer]: { ...state.layerSettings[action.layer], opacity: action.opacity },
        },
      };
    case "setLayerRange":
      return {
        ...state,
        layerSettings: {
          ...state.layerSettings,
          [action.layer]: { ...state.layerSettings[action.layer], range: action.range },
        },
      };
    case "resetLayer":
      return {
        ...state,
        layerSettings: { ...state.layerSettings, [action.layer]: defaultLayerSettings(action.layer) },
      };
    case "setPlot":
      return {
        ...state,
        plot: action.plot,
        plotSummary: summarizePlot(action.plot),
        analysis: { status: "running" },
        // A new plot produces results, so bring them into view.
        collapsed: { ...state.collapsed, inspector: false },
        inspectorView: "results",
      };
    case "setPlotName": {
      // A blank name falls back to the default rather than leaving the plot unlabelled.
      const name = action.name.trim().slice(0, PLOT_NAME_MAX);
      return { ...state, plotName: name || t.browser.plotName };
    }
    case "setFocus":
      return { ...state, focus: action.focus && state.plot !== null };
    case "clearPlot":
      return {
        ...state,
        focus: false,
        plotName: t.browser.plotName,
        tool: state.tool === "edit" ? "pan" : state.tool,
        plot: null,
        plotSummary: null,
        analysis: { status: "idle" },
        // Without results (and with Display closed) the Inspector disappears; so does its drawer.
        panels: state.inspectorView === "results" ? { ...state.panels, inspector: false } : state.panels,
      };
    case "runAnalysis":
      return state.plot
        ? { ...state, analysisNonce: state.analysisNonce + 1, analysis: { status: "running" } }
        : state;
    case "analysisFinished":
      return { ...state, analysis: action.analysis };
    case "setView":
      return { ...state, view: action.view };
    case "setPanel":
      return { ...state, panels: { ...state.panels, [action.panel]: action.open } };
    case "setCollapsed":
      return { ...state, collapsed: { ...state.collapsed, [action.panel]: action.collapsed } };
    case "setPin":
      return { ...state, pin: action.pin };
    case "setInspectorView":
      // Switching what the card shows also unfolds it if it was collapsed. Closing Display with no
      // plot leaves nothing to show, so the Inspector (and its drawer) goes away.
      return {
        ...state,
        inspectorView: action.view,
        collapsed: { ...state.collapsed, inspector: false },
        panels:
          action.view === "results" && !state.plotSummary ? { ...state.panels, inspector: false } : state.panels,
      };
    case "setDisplay":
      return { ...state, display: { ...state.display, [action.key]: action.visible } };
    case "resetDisplay":
      return { ...state, display: DEFAULT_DISPLAY };
    case "setPicking":
      // Picking needs plain map clicks, so it parks any drawing tool on Pan.
      return action.picking ? { ...state, picking: true, tool: "pan" } : { ...state, picking: false };
  }
}

/**
 * The Inspector only appears when it has something to show: an open toolbox (Display, for now) or
 * the results for a drawn plot. Its empty "draw a plot" state repeated the Area tool, so it is gone.
 */
export function inspectorVisible(state: Pick<WorkspaceState, "inspectorView" | "plotSummary">): boolean {
  return state.inspectorView === "display" || state.plotSummary !== null;
}

/** Longest plot name kept; enough for "North field, beans 2026" and still fits a map label. */
export const PLOT_NAME_MAX = 40;

/** Index of the newest loaded day (0 until data has loaded). */
export function lastDay(precip: PrecipState): number {
  return precip.status === "ready" ? Math.max(0, precip.frames.dates.length - 1) : 0;
}

/** Frame to draw: the newest day in "latest" mode, else the chosen day of the timeframe. */
export function precipDayIndex(state: Pick<WorkspaceState, "precip" | "precipDay" | "precipMode">): number {
  const last = lastDay(state.precip);
  if (state.precipMode === "latest") return last;
  return Math.min(last, Math.max(0, state.precipDay ?? last));
}

/**
 * How long each day stays on screen while the timeline plays. At 1×: 120 ms for short timeframes,
 * faster for long ones so 90 days play in about 6 seconds and a whole year in about 13. `speed`
 * divides that, never below one 60 Hz frame. The map fades between days over this time (see
 * MapView), so playback reads as continuous motion at any speed.
 */
export function stepMs(days: number, speed: number = 1): number {
  const base = Math.min(120, Math.max(35, 6_000 / Math.max(1, days)));
  return Math.round(Math.max(16, base / speed));
}

/** Simulated latency so "Analyze" gives visible feedback even though scoring is synchronous. */
const ANALYSIS_DELAY_MS = 450;

type MapControllerRegistry = {
  readonly register: (controller: MapController | null) => void;
  readonly get: () => MapController | null;
};

const StateContext = createContext<WorkspaceState | null>(null);
const DispatchContext = createContext<Dispatch<WorkspaceAction> | null>(null);
const MapControllerContext = createContext<MapControllerRegistry | null>(null);

/** Owns workspace state and the assessment lifecycle (auto-runs on plot change or Analyze). */
export function WorkspaceProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, INITIAL_STATE);
  const controllerRef = useRef<MapController | null>(null);

  const register = useCallback((controller: MapController | null) => {
    controllerRef.current = controller;
  }, []);
  const get = useCallback(() => controllerRef.current, []);
  const registry = useMemo(() => ({ register, get }), [register, get]);

  const { plot, analysisNonce } = state;
  const plotRain = usePlotRainfall(state.plotSummary?.centroid ?? null);
  useEffect(() => {
    // The outlook waits for the plot's NASA rainfall; if that request fails it falls back to the
    // sample value, and the factor says so.
    if (!plot || plotRain.status === "loading") return;
    const measured = plotRain.status === "ready" ? { rain: plotRain.mm } : {};
    const timer = window.setTimeout(() => {
      const result = computeAssessment(plot, getSampleGrid(), measured);
      dispatch({ type: "analysisFinished", analysis: { status: "done", result } });
    }, ANALYSIS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [plot, analysisNonce, plotRain]);

  const precip = usePrecipQuery(
    state.activeLayer === "precip",
    state.precipMode === "latest" ? null : state.precipRange,
  );
  const value = useMemo<WorkspaceState>(() => ({ ...state, precip }), [state, precip]);

  const { precipPlaying, precipSpeed } = state;
  const last = lastDay(precip);
  useEffect(() => {
    if (!precipPlaying) return;
    const timer = window.setInterval(() => dispatch({ type: "stepPrecip", last }), stepMs(last + 1, precipSpeed));
    return () => window.clearInterval(timer);
  }, [precipPlaying, last, precipSpeed]);

  return (
    <StateContext.Provider value={value}>
      <DispatchContext.Provider value={dispatch}>
        <MapControllerContext.Provider value={registry}>{children}</MapControllerContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

/**
 * Precipitation frames for a timeframe, or for the newest days when `range` is null ("latest"). The
 * query starts once the layer is shown and is cached (and persisted) by TanStack Query, so reloads
 * and revisited timeframes skip the fetch. While a new timeframe loads, the previous one stays up.
 */
function usePrecipQuery(enabled: boolean, range: PrecipWindow | null): PrecipState {
  const [latest] = useState(latestWindow);
  const { data, error, isError, isPlaceholderData, refetch } = useQuery({
    ...precipRegionalQuery(range ?? latest),
    enabled,
    placeholderData: keepPreviousData,
  });
  const frames = useMemo(() => (data ? buildPrecipFrames(data.data) : null), [data]);
  return useMemo<PrecipState>(() => {
    if (frames && !(isError && isPlaceholderData)) {
      return { status: "ready", frames, refreshing: isPlaceholderData };
    }
    if (isError) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        retry: () => void refetch(),
      };
    }
    return enabled ? { status: "loading" } : { status: "idle" };
  }, [frames, isError, isPlaceholderData, error, refetch, enabled]);
}

type PlotRain =
  | { readonly status: "none" | "loading" | "error" }
  | { readonly status: "ready"; readonly mm: number };

/** Plot centres are rounded to ~5 km: POWER's cells are ~55 km, so small edits reuse the answer. */
function roundForRain(value: number): number {
  return Math.round(value * 20) / 20;
}

/**
 * Rainfall over the last 12 months at the plot, from NASA POWER (mm). Missing days are skipped
 * and the total scaled back to a full year, so a publishing lag does not read as a drier year.
 */
function usePlotRainfall(center: readonly [number, number] | null): PlotRain {
  const [range] = useState(() => presetRange(365));
  const lng = center ? roundForRain(center[0]) : null;
  const lat = center ? roundForRain(center[1]) : null;
  const query = useQuery({
    ...precipPointQuery([lng ?? 0, lat ?? 0], range),
    enabled: lng !== null && lat !== null,
  });
  const { data, isError } = query;
  return useMemo<PlotRain>(() => {
    if (lng === null) return { status: "none" };
    if (data) {
      const series = data.data.series[PRECIP_PARAMETER] ?? {};
      let total = 0;
      let days = 0;
      for (const value of Object.values(series)) {
        if (value === null) continue;
        total += value;
        days += 1;
      }
      return days > 0 ? { status: "ready", mm: (total * 365) / days } : { status: "error" };
    }
    return isError ? { status: "error" } : { status: "loading" };
  }, [lng, data, isError]);
}

export function useWorkspace(): WorkspaceState {
  const value = useContext(StateContext);
  if (!value) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return value;
}

export function useWorkspaceDispatch(): Dispatch<WorkspaceAction> {
  const value = useContext(DispatchContext);
  if (!value) throw new Error("useWorkspaceDispatch must be used inside <WorkspaceProvider>");
  return value;
}

/** MapView calls `register(controller)` on load and `register(null)` on unmount; chrome calls `get()`. */
export function useMapController(): MapControllerRegistry {
  const value = useContext(MapControllerContext);
  if (!value) throw new Error("useMapController must be used inside <WorkspaceProvider>");
  return value;
}

/** Collapse wiring for a floating panel's header toggle (see `Panel`'s `collapse` prop). */
export function usePanelCollapse(panel: PanelId, title: string) {
  const { collapsed } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const isCollapsed = collapsed[panel];
  return useMemo(
    () => ({
      collapsed: isCollapsed,
      onToggle: () => dispatch({ type: "setCollapsed", panel, collapsed: !isCollapsed }),
      label: isCollapsed ? t.chrome.expandPanel(title) : t.chrome.collapsePanel(title),
    }),
    [dispatch, isCollapsed, panel, title],
  );
}
