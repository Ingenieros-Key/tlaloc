"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { computeAssessment } from "./data/assessment";
import { summarizePlot } from "./data/plot";
import { getSampleGrid } from "./data/sample-grid";
import { LAYER_ORDER, defaultLayerSettings } from "./layers";
import { t } from "./strings";
import type {
  AnalysisState,
  Basemap,
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

export type WorkspaceState = {
  readonly tool: Tool;
  readonly basemap: Basemap;
  readonly is3d: boolean;
  /** Exactly one data layer is visible at a time; null = none. */
  readonly activeLayer: LayerId | null;
  readonly layerSettings: Readonly<Record<LayerId, LayerSettings>>;
  readonly plot: PlotFeature | null;
  readonly plotSummary: PlotSummary | null;
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

export type WorkspaceAction =
  | { readonly type: "setTool"; readonly tool: Tool }
  | { readonly type: "setBasemap"; readonly basemap: Basemap }
  | { readonly type: "set3d"; readonly is3d: boolean }
  | { readonly type: "setActiveLayer"; readonly layer: LayerId | null }
  | { readonly type: "setLayerOpacity"; readonly layer: LayerId; readonly opacity: number }
  | { readonly type: "setLayerRange"; readonly layer: LayerId; readonly range: readonly [number, number] }
  | { readonly type: "resetLayer"; readonly layer: LayerId }
  | { readonly type: "setPlot"; readonly plot: PlotFeature }
  | { readonly type: "clearPlot" }
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
  navBar: true,
  legends: true,
  limiting: true,
};

export const INITIAL_STATE: WorkspaceState = {
  tool: "pan",
  basemap: "map",
  is3d: true,
  activeLayer: "humidity",
  layerSettings: Object.fromEntries(LAYER_ORDER.map((id) => [id, defaultLayerSettings(id)])) as Record<
    LayerId,
    LayerSettings
  >,
  plot: null,
  plotSummary: null,
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

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "setTool":
      // Choosing a drawing tool takes the map click away from "Pick on map".
      return { ...state, tool: action.tool, picking: action.tool === "pan" && state.picking };
    case "setBasemap":
      return { ...state, basemap: action.basemap };
    case "set3d":
      return { ...state, is3d: action.is3d };
    case "setActiveLayer":
      return { ...state, activeLayer: action.layer };
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
    case "clearPlot":
      return {
        ...state,
        tool: state.tool === "edit" ? "pan" : state.tool,
        plot: null,
        plotSummary: null,
        analysis: { status: "idle" },
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
      // Switching what the card shows also unfolds it if it was collapsed.
      return {
        ...state,
        inspectorView: action.view,
        collapsed: { ...state.collapsed, inspector: false },
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
  useEffect(() => {
    if (!plot) return;
    const timer = window.setTimeout(() => {
      const result = computeAssessment(plot, getSampleGrid());
      dispatch({ type: "analysisFinished", analysis: { status: "done", result } });
    }, ANALYSIS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [plot, analysisNonce]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <MapControllerContext.Provider value={registry}>{children}</MapControllerContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
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
