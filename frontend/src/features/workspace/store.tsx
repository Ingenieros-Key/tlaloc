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
import { monthlyTotals, type Planting, type Priority } from "./data/rotation";
import { readSavedPlot, writeSavedPlot } from "./data/saved";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_PRESET_DAYS,
  buildLayerAggregate,
  buildLayerFrames,
  latestWindow,
  HUMIDITY_PARAMETER,
  PRECIP_PARAMETER,
  TEMP_PARAMETER,
  pointQuery,
  layerRegionalQuery,
  presetRange,
  type PrecipFrames,
  type PrecipWindow,
} from "./data/precip";
import { getSampleGrid } from "./data/sample-grid";
import { elevationQuery } from "./data/elevation";
import { buildScoreField, type ScoreField } from "./data/score";
import { LAYER_ORDER, defaultLayerSettings, isPowerLayer, isTwoLayerMode } from "./layers";
import { t } from "./strings";
import type {
  AnalysisState,
  Basemap,
  CropId,
  DataStyle,
  FactorId,
  DisplayKey,
  DisplaySettings,
  InspectorView,
  LayerId,
  LayerSettings,
  MapController,
  PowerLayerId,
  PlotFeature,
  PlotSummary,
  Tool,
  ViewMode,
  ViewState,
} from "./types";

export type PanelId = "browser" | "inspector";

/** Which of the plot's results the Inspector shows: the planting outlook or the rotation. */
export type InspectorTab = "outlook" | "rotation";

/** Seasons the rotation looks ahead: by default, and after "Show later seasons". */
export const ROTATION_SEASONS = { short: 4, long: 6 } as const;

/** What the left flyout shows: the plot list, or the active view mode's controls. */
export type BrowserSection = "plots" | "tool";

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

/** The Crop score view's field: 12 months of NASA POWER data scored for one crop, per cell. */
export type ScoreState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly field: ScoreField }
  | { readonly status: "error"; readonly retry: () => void };

export type WorkspaceState = {
  readonly tool: Tool;
  readonly basemap: Basemap;
  readonly is3d: boolean;
  /** Exactly one data layer is visible at a time; null = none. */
  readonly activeLayer: LayerId | null;
  readonly layerSettings: Readonly<Record<LayerId, LayerSettings>>;
  /** Hexagons (exact cell values) or a heatmap (smooth surface). */
  readonly dataStyle: DataStyle;
  /** Daily frames of the active Browser layer (the timeline settings below apply to any layer). */
  readonly layerData: PrecipState;
  /** One layer, or a combined view of two layers or of the crop outlook (see `ViewMode`). */
  readonly viewMode: ViewMode;
  /**
   * The other layer of a two-layer view; never the active one. Compare: the right side. Blend: the
   * vertical axis. Columns: the color (the active layer is the height).
   */
  readonly secondLayer: LayerId;
  /** Daily frames of `secondLayer`, loaded only in a two-layer view. */
  readonly layerDataB: PrecipState;
  /**
   * The layer whose days the timeline scrubs and plays: the active layer, or in a two-layer view
   * with elevation (which has no days) as the active one, the second layer. Null = no timeline.
   */
  readonly timelineLayer: PowerLayerId | null;
  /** `timelineLayer`'s frames: `layerData` or `layerDataB`. */
  readonly timelineData: PrecipState;
  /** The crop the Crop score view scores. */
  readonly scoreCrop: CropId;
  /** The Crop score view's values, loaded only in that view. */
  readonly scoreData: ScoreState;
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
  /**
   * Focus plot: data clipped to the plot, the rest of the map dimmed, the value shown on it, and
   * the plot's results in the Inspector (see `inspectorVisible`).
   */
  readonly focus: boolean;
  /** The farmer's last planting on the plot; null until they fill the form. Cleared with the plot. */
  readonly planting: Planting | null;
  /** What the farmer says matters most; it can lift the sheet's 2nd choice over the 1st. */
  readonly priority: Priority;
  readonly inspectorTab: InspectorTab;
  /** Which of the first season's options the rotation sows (0 = the top one). */
  readonly rotationStart: number;
  /** How many seasons the rotation looks ahead (see `ROTATION_SEASONS`). */
  readonly rotationSeasons: number;
  /** The plan lanes dock is open; it takes the timeline's place (see `lanesVisible`). */
  readonly lanesOpen: boolean;
  /** Rainfall per calendar month (0 = January) at the plot over the last 12 months; null until loaded. */
  readonly plotRain: readonly number[] | null;
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
  /**
   * lg and up: the Inspector folded to its header, and the left flyout closed (below lg the
   * flyout is a drawer, see `panels`).
   */
  readonly collapsed: Readonly<Record<PanelId, boolean>>;
  /** Which of the tool rail's sections the left flyout shows. */
  readonly browserSection: BrowserSection;
};

/** What the reducer owns: everything except state derived from queries. */
type ReducerState = Omit<
  WorkspaceState,
  "layerData" | "layerDataB" | "timelineLayer" | "timelineData" | "scoreData" | "plotRain"
>;

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
  | { readonly type: "setViewMode"; readonly mode: ViewMode }
  | { readonly type: "setSecondLayer"; readonly layer: LayerId }
  /** Two-layer views: the active and second layers trade places. */
  | { readonly type: "swapLayers" }
  | { readonly type: "setScoreCrop"; readonly crop: CropId }
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
  | { readonly type: "setPlanting"; readonly planting: Planting | null }
  | { readonly type: "setPriority"; readonly priority: Priority }
  | { readonly type: "setInspectorTab"; readonly tab: InspectorTab }
  | { readonly type: "setRotationStart"; readonly start: number }
  | { readonly type: "setRotationSeasons"; readonly seasons: number }
  | { readonly type: "setLanesOpen"; readonly open: boolean }
  /** The plot and answers kept from the last visit (ignored once a plot exists). */
  | {
      readonly type: "restoreSaved";
      readonly plot: PlotFeature;
      readonly plotName: string;
      readonly planting: Planting | null;
      readonly priority: Priority;
    }
  | { readonly type: "runAnalysis" }
  | { readonly type: "analysisFinished"; readonly analysis: AnalysisState }
  | { readonly type: "setView"; readonly view: ViewState }
  | { readonly type: "setPanel"; readonly panel: PanelId; readonly open: boolean }
  | { readonly type: "setCollapsed"; readonly panel: PanelId; readonly collapsed: boolean }
  | { readonly type: "setBrowserSection"; readonly section: BrowserSection }
  | { readonly type: "setPin"; readonly pin: readonly [number, number] | null }
  | { readonly type: "setPicking"; readonly picking: boolean }
  | { readonly type: "setInspectorView"; readonly view: InspectorView }
  | { readonly type: "setDisplay"; readonly key: DisplayKey; readonly visible: boolean }
  | { readonly type: "resetDisplay" };

/** The workspace as it opens: everything visible except the timeline. */
export const DEFAULT_DISPLAY: DisplaySettings = {
  data: true,
  borders: true,
  outline: true,
  labels: true,
  tooltips: true,
  pin: true,
  plotLabel: true,
  // Closed at start: the nav bar's Timeline button opens it, and so does picking a timeframe.
  timeline: false,
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
  viewMode: "single",
  secondLayer: "temp",
  scoreCrop: "corn",
  precipMode: "latest",
  precipRange: presetRange(DEFAULT_PRESET_DAYS),
  precipDay: null,
  precipPlaying: false,
  precipSpeed: 1,
  plot: null,
  plotSummary: null,
  plotName: t.browser.plotName,
  focus: false,
  planting: null,
  priority: "soil",
  inspectorTab: "outlook",
  rotationStart: 0,
  rotationSeasons: ROTATION_SEASONS.short,
  lanesOpen: false,
  analysis: { status: "idle" },
  analysisNonce: 0,
  view: { bearing: 0, pitch: 30, zoom: 8 },
  panels: { browser: false, inspector: false },
  // The left flyout starts closed (lg and up); the tool rail opens it.
  collapsed: { browser: true, inspector: false },
  browserSection: "tool",
  pin: null,
  picking: false,
  inspectorView: "results",
  display: DEFAULT_DISPLAY,
};

/** A layer other than `layer`: the first in Browser order. */
function otherLayer(layer: LayerId): LayerId {
  return LAYER_ORDER.find((id) => id !== layer) ?? layer;
}

export function workspaceReducer(state: ReducerState, action: WorkspaceAction): ReducerState {
  switch (action.type) {
    case "setTool":
      // Choosing a drawing tool takes the map click away from "Pick on map".
      return { ...state, tool: action.tool, picking: action.tool === "pan" && state.picking };
    case "setBasemap":
      return { ...state, basemap: action.basemap };
    case "set3d":
      return { ...state, is3d: action.is3d };
    case "setViewMode": {
      if (action.mode === state.viewMode) return state;
      // A two-layer view needs two different layers on.
      const twoLayer = isTwoLayerMode(action.mode);
      const activeLayer = twoLayer ? (state.activeLayer ?? otherLayer(state.secondLayer)) : state.activeLayer;
      return {
        ...state,
        viewMode: action.mode,
        activeLayer,
        // Columns only read as columns on a tilted map.
        is3d: action.mode === "columns" ? true : state.is3d,
        precipPlaying: false,
      };
    }
    case "setSecondLayer":
      // Picking the active layer as the second one swaps the two.
      return action.layer === state.activeLayer
        ? { ...state, activeLayer: state.secondLayer, secondLayer: action.layer, precipPlaying: false }
        : { ...state, secondLayer: action.layer };
    case "swapLayers":
      return state.activeLayer === null
        ? state
        : { ...state, activeLayer: state.secondLayer, secondLayer: state.activeLayer, precipPlaying: false };
    case "setScoreCrop":
      return { ...state, scoreCrop: action.crop };
    case "setActiveLayer":
      return {
        ...state,
        activeLayer: action.layer,
        // The second layer is never the active one: taking its layer hands it the old active one.
        secondLayer:
          action.layer !== null && action.layer === state.secondLayer
            ? (state.activeLayer ?? otherLayer(action.layer))
            : state.secondLayer,
        // Playback stops when the layer changes: the new layer's days load first.
        precipPlaying: action.layer !== null && action.layer === state.activeLayer && state.precipPlaying,
      };
    case "setPrecipDay":
      return { ...state, precipDay: action.day, precipPlaying: false };
    case "setDataStyle":
      return { ...state, dataStyle: action.style };
    case "setPrecipSpeed":
      return { ...state, precipSpeed: action.speed };
    case "setPrecipMode":
      // A timeframe is scrubbed and played in the timeline, so choosing one opens it.
      return {
        ...state,
        precipMode: action.mode,
        precipPlaying: false,
        display: action.mode === "range" ? { ...state.display, timeline: true } : state.display,
      };
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
        // A plot in focus has its results on screen: bring the fresh ones into view. Out of focus
        // the Inspector stays as it is (a new plot is put in focus by whoever drew it).
        ...(state.focus ? { collapsed: { ...state.collapsed, inspector: false }, inspectorView: "results" as const } : {}),
      };
    case "setPlotName": {
      // A blank name falls back to the default rather than leaving the plot unlabelled.
      const name = action.name.trim().slice(0, PLOT_NAME_MAX);
      return { ...state, plotName: name || t.browser.plotName };
    }
    case "setFocus": {
      const focus = action.focus && state.plot !== null;
      if (focus === state.focus) return state;
      // Focus brings the plot's results up with it; leaving focus takes them (and their drawer) away.
      return focus
        ? { ...state, focus, collapsed: { ...state.collapsed, inspector: false }, inspectorView: "results" }
        : {
            ...state,
            focus,
            lanesOpen: false,
            panels: state.inspectorView === "results" ? { ...state.panels, inspector: false } : state.panels,
          };
    }
    case "setPlanting":
      // New answers start from the sheet's top choice again.
      return { ...state, planting: action.planting, rotationStart: 0, lanesOpen: action.planting !== null && state.lanesOpen };
    case "setPriority":
      // A priority can reorder the first season's options, so the pick by position starts over.
      return { ...state, priority: action.priority, rotationStart: 0 };
    case "setInspectorTab":
      return { ...state, inspectorTab: action.tab, lanesOpen: action.tab === "rotation" && state.lanesOpen };
    case "setRotationStart":
      return { ...state, rotationStart: action.start };
    case "setRotationSeasons":
      return { ...state, rotationSeasons: action.seasons };
    case "setLanesOpen":
      // The lanes take the timeline's place, and the timeline holds the pause button.
      return { ...state, lanesOpen: action.open, precipPlaying: action.open ? false : state.precipPlaying };
    case "restoreSaved":
      return state.plot
        ? state
        : {
            ...state,
            plot: action.plot,
            plotSummary: summarizePlot(action.plot),
            plotName: action.plotName.trim().slice(0, PLOT_NAME_MAX) || t.browser.plotName,
            planting: action.planting,
            priority: action.priority,
            analysis: { status: "running" },
          };
    case "clearPlot":
      return {
        ...state,
        focus: false,
        plotName: t.browser.plotName,
        tool: state.tool === "edit" ? "pan" : state.tool,
        plot: null,
        plotSummary: null,
        // The farmer's answers were about that plot.
        planting: null,
        rotationStart: 0,
        rotationSeasons: ROTATION_SEASONS.short,
        lanesOpen: false,
        inspectorTab: "outlook",
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
    case "setBrowserSection":
      return { ...state, browserSection: action.section };
    case "setPin":
      return { ...state, pin: action.pin };
    case "setInspectorView":
      // Switching what the card shows also unfolds it if it was collapsed. Closing Display with no
      // plot in focus leaves nothing to show, so the Inspector (and its drawer) goes away.
      return {
        ...state,
        inspectorView: action.view,
        collapsed: { ...state.collapsed, inspector: false },
        panels:
          action.view === "results" && !state.focus ? { ...state.panels, inspector: false } : state.panels,
      };
    case "setDisplay":
      return {
        ...state,
        display: { ...state.display, [action.key]: action.visible },
        // The timeline holds the pause button, so hiding it also stops playback.
        precipPlaying: action.key === "timeline" && !action.visible ? false : state.precipPlaying,
      };
    case "resetDisplay":
      return { ...state, display: DEFAULT_DISPLAY };
    case "setPicking":
      // Picking needs plain map clicks, so it parks any drawing tool on Pan.
      return action.picking ? { ...state, picking: true, tool: "pan" } : { ...state, picking: false };
  }
}

/**
 * The Inspector only appears when it has something to show: an open toolbox (Display, for now) or
 * the results for the plot in focus. A plot out of focus is just a shape on the map; its results
 * come back with focus. (`focus` is only ever true while a plot exists.)
 */
export function inspectorVisible(state: Pick<WorkspaceState, "inspectorView" | "focus">): boolean {
  return state.inspectorView === "display" || state.focus;
}

/** The plan lanes show while the plot's rotation is on screen: in focus, with the farmer's answers. */
export function lanesVisible(
  state: Pick<WorkspaceState, "lanesOpen" | "focus" | "inspectorView" | "inspectorTab" | "planting">,
): boolean {
  return (
    state.lanesOpen &&
    state.focus &&
    state.inspectorView === "results" &&
    state.inspectorTab === "rotation" &&
    state.planting !== null
  );
}

/** lg and up: whether the left flyout is open beside the tool rail (it takes map room there). */
export function browserVisible(state: Pick<WorkspaceState, "collapsed">): boolean {
  return !state.collapsed.browser;
}

/** Longest plot name kept; enough for "North field, beans 2026" and still fits a map label. */
export const PLOT_NAME_MAX = 40;

/** Index of the newest loaded day (0 until data has loaded). */
export function lastDay(precip: PrecipState): number {
  return precip.status === "ready" ? Math.max(0, precip.frames.dates.length - 1) : 0;
}

/** Frame to draw: the newest day in "latest" mode, else the chosen day of the timeframe. */
export function precipDayIndex(state: Pick<WorkspaceState, "timelineData" | "precipDay" | "precipMode">): number {
  const last = lastDay(state.timelineData);
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

  // The plot, its name and the farmer's answers survive a reload. Restored after mount (the page is
  // prerendered without them), then saved on every change and forgotten when the plot is deleted.
  const { plot, plotName, planting, priority, analysisNonce } = state;
  const hadPlot = useRef(false);
  useEffect(() => {
    const saved = readSavedPlot();
    if (saved) dispatch({ type: "restoreSaved", ...saved });
  }, []);
  useEffect(() => {
    if (plot) {
      hadPlot.current = true;
      writeSavedPlot({ plot, plotName, planting, priority });
    } else if (hadPlot.current) {
      hadPlot.current = false;
      writeSavedPlot(null);
    }
  }, [plot, plotName, planting, priority]);

  const plotClimate = usePlotClimate(state.plotSummary?.centroid ?? null);
  useEffect(() => {
    // The outlook waits for the plot's NASA climate; if that request fails it falls back to the
    // sample values, and each factor says where its value came from.
    if (!plot || plotClimate.status === "loading") return;
    const measured = plotClimate.status === "ready" ? plotClimate.measured : {};
    const timer = window.setTimeout(() => {
      const result = computeAssessment(plot, getSampleGrid(), measured);
      dispatch({ type: "analysisFinished", analysis: { status: "done", result } });
    }, ANALYSIS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [plot, analysisNonce, plotClimate]);

  const range = state.precipMode === "latest" ? null : state.precipRange;
  const scoring = state.viewMode === "score";
  // The score view has no day to show, so it leaves the daily layers alone.
  const layerData = useLayerQuery(scoring ? null : state.activeLayer, range);
  const layerDataB = useLayerQuery(isTwoLayerMode(state.viewMode) ? state.secondLayer : null, range);
  const scoreData = useScoreData(scoring, state.scoreCrop);
  const plotRain = plotClimate.status === "ready" ? plotClimate.monthlyRain : null;
  // Elevation has no days: as the active layer of a two-layer view, the timeline follows the other.
  const { activeLayer, secondLayer, viewMode } = state;
  const timelineFromB = activeLayer === "elevation" && isTwoLayerMode(viewMode) && isPowerLayer(secondLayer);
  const timelineLayer = timelineFromB
    ? (secondLayer as PowerLayerId)
    : activeLayer && isPowerLayer(activeLayer)
      ? activeLayer
      : null;
  const timelineData = timelineFromB ? layerDataB : layerData;
  const value = useMemo<WorkspaceState>(
    () => ({ ...state, layerData, layerDataB, timelineLayer, timelineData, scoreData, plotRain }),
    [state, layerData, layerDataB, timelineLayer, timelineData, scoreData, plotRain],
  );

  const { precipPlaying, precipSpeed } = state;
  const last = lastDay(timelineData);
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
 * The active layer's frames for a timeframe, or for the newest days when `range` is null
 * ("latest"). Each layer loads the first time it is shown and is then cached (and persisted) by
 * TanStack Query, so switching back, reloading or revisiting a timeframe skips the fetch. While a
 * new timeframe loads, the same layer's previous one stays up; another layer's never does, since
 * its values would be read against the wrong scale.
 */
/** The parameters a POWER query key asks for, as a comparable string. */
function keyParameters(key: readonly unknown[]): string {
  return JSON.stringify((key[3] as { readonly parameters?: readonly string[] } | undefined)?.parameters);
}

function useLayerQuery(layer: LayerId | null, range: PrecipWindow | null): PrecipState {
  const power = usePowerLayerQuery(layer === "elevation" ? null : layer, range);
  const elevation = useElevationLayer(layer === "elevation");
  return layer === "elevation" ? elevation : power;
}

/** Elevation: one static frame from the terrain tiles, loaded the first time it is shown. */
function useElevationLayer(enabled: boolean): PrecipState {
  const { data, error, isError, refetch } = useQuery({ ...elevationQuery(), enabled });
  return useMemo<PrecipState>(() => {
    if (data) return { status: "ready", frames: data, refreshing: false };
    if (isError) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        retry: () => void refetch(),
      };
    }
    return enabled ? { status: "loading" } : { status: "idle" };
  }, [data, isError, error, refetch, enabled]);
}

function usePowerLayerQuery(layer: PowerLayerId | null, range: PrecipWindow | null): PrecipState {
  const [latest] = useState(latestWindow);
  const enabled = layer !== null;
  const options = layerRegionalQuery(layer ?? "precip", range ?? latest);
  const parameterKey = keyParameters(options.queryKey);
  const { data, error, isError, isPlaceholderData, refetch } = useQuery({
    ...options,
    enabled,
    placeholderData: (previous, previousQuery) =>
      previousQuery && keyParameters(previousQuery.queryKey) === parameterKey
        ? keepPreviousData(previous)
        : undefined,
  });
  const frames = useMemo(
    () => (data && layer ? buildLayerFrames(data.data, layer) : null),
    [data, layer],
  );
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

/** Days the crop outlook looks back over. */
const OUTLOOK_DAYS = 365;

/**
 * The Crop score view: the last 12 months of rainfall, temperature and humidity over the country
 * (three regional requests, cached like any layer), reduced to one value per cell and scored for
 * `crop` with the plot outlook's rules. Changing the crop only re-scores.
 */
function useScoreData(enabled: boolean, crop: CropId): ScoreState {
  const [range] = useState(() => presetRange(OUTLOOK_DAYS));
  const rain = useQuery({ ...layerRegionalQuery("precip", range), enabled });
  const temp = useQuery({ ...layerRegionalQuery("temp", range), enabled });
  const humidity = useQuery({ ...layerRegionalQuery("humidity", range), enabled });
  const rainData = rain.data;
  const tempData = temp.data;
  const humidityData = humidity.data;
  const climate = useMemo(
    () =>
      enabled && rainData && tempData && humidityData
        ? {
            rain: buildLayerAggregate(rainData.data, "precip", OUTLOOK_DAYS),
            temp: buildLayerAggregate(tempData.data, "temp", OUTLOOK_DAYS),
            humidity: buildLayerAggregate(humidityData.data, "humidity", OUTLOOK_DAYS),
          }
        : null,
    [enabled, rainData, tempData, humidityData],
  );
  const field = useMemo(() => (climate ? buildScoreField(climate, crop) : null), [climate, crop]);
  const failed = rain.isError || temp.isError || humidity.isError;
  const refetchRain = rain.refetch;
  const refetchTemp = temp.refetch;
  const refetchHumidity = humidity.refetch;
  return useMemo<ScoreState>(() => {
    if (!enabled) return { status: "idle" };
    if (field) return { status: "ready", field };
    if (failed) {
      return {
        status: "error",
        retry: () => {
          void refetchRain();
          void refetchTemp();
          void refetchHumidity();
        },
      };
    }
    return { status: "loading" };
  }, [enabled, field, failed, refetchRain, refetchTemp, refetchHumidity]);
}

/** The plot's climate over the last 12 months, from NASA POWER. */
type PlotClimate =
  | { readonly status: "none" | "loading" | "error" }
  | {
      readonly status: "ready";
      readonly measured: Partial<Record<FactorId, number>>;
      /** Rainfall per calendar month over the same 12 months (the rotation's season axis). */
      readonly monthlyRain: readonly number[] | null;
    };

/** Plot centres are rounded to ~5 km: POWER's cells are ~55 km, so small edits reuse the answer. */
function roundForClimate(value: number): number {
  return Math.round(value * 20) / 20;
}

/** Sum and count of the valid (non-missing) days of a daily series. */
function totals(series: Readonly<Record<string, number | null>> | undefined): { sum: number; days: number } {
  let sum = 0;
  let days = 0;
  for (const value of Object.values(series ?? {})) {
    if (value === null) continue;
    sum += value;
    days += 1;
  }
  return { sum, days };
}

/**
 * The crop outlook's measured factors at the plot, from one NASA POWER request over the last 12
 * months: rainfall (total, scaled to a full year when the newest days are not published yet),
 * relative humidity and air temperature (both means). Any parameter without data is left out, so
 * the outlook falls back to the sample value for it (or skips temperature, which has none).
 */
function usePlotClimate(center: readonly [number, number] | null): PlotClimate {
  const [range] = useState(() => presetRange(OUTLOOK_DAYS));
  const lng = center ? roundForClimate(center[0]) : null;
  const lat = center ? roundForClimate(center[1]) : null;
  const query = useQuery({
    ...pointQuery([lng ?? 0, lat ?? 0], range, [PRECIP_PARAMETER, HUMIDITY_PARAMETER, TEMP_PARAMETER]),
    enabled: lng !== null && lat !== null,
  });
  const { data, isError } = query;
  return useMemo<PlotClimate>(() => {
    if (lng === null) return { status: "none" };
    if (data) {
      const series = data.data.series;
      const measured: Partial<Record<FactorId, number>> = {};
      const rain = totals(series[PRECIP_PARAMETER]);
      if (rain.days > 0) measured.rain = (rain.sum * OUTLOOK_DAYS) / rain.days;
      const humidity = totals(series[HUMIDITY_PARAMETER]);
      if (humidity.days > 0) measured.humidity = humidity.sum / humidity.days;
      const temp = totals(series[TEMP_PARAMETER]);
      if (temp.days > 0) measured.temp = temp.sum / temp.days;
      return Object.keys(measured).length > 0
        ? { status: "ready", measured, monthlyRain: monthlyTotals(series[PRECIP_PARAMETER]) }
        : { status: "error" };
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
