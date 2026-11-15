"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { PickingInfo } from "@deck.gl/core";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import { CloudOff, LoaderCircle, X } from "lucide-react";
import {
  AttributionControl,
  Map as MapLibreMap,
  setWorkerUrl,
  type ErrorEvent as MapErrorEvent,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TerraDraw } from "terra-draw";
import { getSampleGrid } from "../data/sample-grid";
import { LAYERS, formatValue } from "../layers";
import { useMapController, useWorkspace, useWorkspaceDispatch } from "../store";
import { t } from "../strings";
import type { Basemap, GridCell, LayerId, LayerSettings, MapController, ViewState } from "../types";
import { IconButton } from "../ui/IconButton";
import { FALLBACK_STYLE, basemapStyle, findOverlayAnchor } from "./basemaps";
import { DATA_LAYER_ID, buildDeckLayers, deckGroupId } from "./deckLayers";
import { MAP_CONTAINER_ID } from "./focus";
import {
  COUNTRY_BOUNDS,
  MAX_PITCH,
  PITCH_3D,
  PLOT_MAX_ZOOM,
  cameraPadding,
  motionMs,
  plotBounds,
  squareAround,
} from "./geo";
import {
  addPlot,
  applyTool,
  createTerraDraw,
  isNewPlot,
  isPlotFeature,
  stopTerraDraw,
  toPlotFeature,
} from "./terraDraw";

/*
 * MapLibre derives its worker URL from import.meta.url, which is not an http(s) URL inside a
 * Turbopack chunk, so it would request the page itself. Point it at the emitted worker asset.
 */
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

type Hover = {
  readonly cell: GridCell;
  readonly x: number;
  readonly y: number;
  /** Render to the left of the pointer when it is near the right edge. */
  readonly flip: boolean;
};

type NoticeKind = keyof typeof t.map.notices;

const TOOLTIP_FLIP_MARGIN = 220;
/** With no `load` event after this long, the spinner gives way to a notice. */
const LOAD_TIMEOUT_MS = 15_000;
/** Keyboard-placed plots span a quarter of the map's shorter side, within these limits. */
const KEYBOARD_PLOT_MIN_M = 200;
const KEYBOARD_PLOT_MAX_M = 2_000;

/**
 * Tile, sprite, glyph and style-fetch failures are worth a notice; aborted requests and style
 * validation warnings are not.
 */
function isLoadFailure(event: MapErrorEvent): boolean {
  const { error } = event;
  if (error instanceof Error && error.name === "AbortError") return false;
  const networkFailure = error instanceof TypeError && /fetch|network|load failed/i.test(error.message);
  return "sourceId" in event || "status" in error || networkFailure;
}

function roundView(map: MapLibreMap): ViewState {
  return {
    bearing: Math.round(map.getBearing()),
    pitch: Math.round(map.getPitch()),
    zoom: Math.round(map.getZoom() * 10) / 10,
  };
}

/**
 * The workspace map: MapLibre basemap (OpenFreeMap dark or NASA GIBS), interleaved deck.gl sample
 * data and country outline, and terra-draw for the single plot rectangle. Registers the camera
 * controller used by the ribbon and nav bar.
 */
export function MapView() {
  const state = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const { register } = useMapController();
  const { activeLayer, layerSettings, basemap, is3d, tool, plot } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapLibreOverlay | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const plotIdRef = useRef<string | number | null>(null);
  const stateRef = useRef(state);
  const beforeIdRef = useRef<string | undefined>(undefined);
  const appliedBasemapRef = useRef<Basemap>(basemap);
  const styleLoadedRef = useRef(false);
  const fallbackRef = useRef(false);

  const [beforeId, setBeforeId] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [readyBasemap, setReadyBasemap] = useState<Basemap>(basemap);
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const cells = useMemo(() => getSampleGrid(), []);
  const layers = useMemo(
    () => buildDeckLayers({ cells, activeLayer, layerSettings, beforeId }),
    [cells, activeLayer, layerSettings, beforeId],
  );

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initial = stateRef.current;
    appliedBasemapRef.current = initial.basemap;

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: basemapStyle(initial.basemap),
        bounds: COUNTRY_BOUNDS,
        fitBoundsOptions: { padding: cameraPadding(container) },
        pitch: initial.is3d ? PITCH_3D : 0,
        maxPitch: initial.is3d ? MAX_PITCH : 0,
        attributionControl: false,
        locale: { "Map.Title": t.map.canvasLabel },
      });
    } catch {
      // No WebGL2 (GPUInitializationError): keep the workspace and report it instead of crashing.
      queueMicrotask(() => setNotice("webgl"));
      return;
    }
    map.addControl(
      new AttributionControl({ compact: true, customAttribution: t.map.attribution.boundary }),
      "top-right",
    );
    mapRef.current = map;
    let moveFrame = 0;

    const currentLayers = () => {
      const s = stateRef.current;
      return buildDeckLayers({
        cells,
        activeLayer: s.activeLayer,
        layerSettings: s.layerSettings,
        beforeId: beforeIdRef.current,
      });
    };

    const syncPlotFromDraw = (id: string | number) => {
      const feature = drawRef.current?.getSnapshotFeature(id);
      const next = feature ? toPlotFeature(feature) : null;
      if (next) dispatch({ type: "setPlot", plot: next });
    };

    const onFinish = (id: string | number, context: { readonly mode: string; readonly action: string }) => {
      const draw = drawRef.current;
      if (!draw) return;
      if (isNewPlot(context)) {
        const others = draw
          .getSnapshot()
          .flatMap((f) => (f.id !== undefined && f.id !== id && isPlotFeature(f) ? [f.id] : []));
        if (others.length > 0) draw.removeFeatures(others);
        plotIdRef.current = id;
        syncPlotFromDraw(id);
        dispatch({ type: "setTool", tool: "pan" });
      } else if (id === plotIdRef.current) {
        syncPlotFromDraw(id);
      }
    };

    const onHover = (info: PickingInfo) => {
      const cell = info.layer?.id === DATA_LAYER_ID ? (info.object as GridCell | undefined) : undefined;
      if (!cell) {
        setHover(null);
        return;
      }
      const flip = info.x > map.getContainer().clientWidth - TOOLTIP_FLIP_MARGIN;
      setHover({ cell, x: info.x, y: info.y, flip });
    };

    const onStyleLoad = () => {
      styleLoadedRef.current = true;
      if (!fallbackRef.current) setNotice(null);

      if (drawRef.current) stopTerraDraw(drawRef.current);
      const draw = createTerraDraw(map);
      draw.start();
      draw.on("finish", onFinish);
      drawRef.current = draw;
      const s = stateRef.current;
      plotIdRef.current = s.plot ? addPlot(draw, s.plot) : null;
      applyTool(draw, s.tool, plotIdRef.current);

      const anchor = findOverlayAnchor(map);
      beforeIdRef.current = anchor;
      setBeforeId(anchor);

      const overlay = overlayRef.current;
      if (overlay) {
        overlay.setProps({ layers: currentLayers() });
        return;
      }
      const created = new MapLibreOverlay({
        interleaved: true,
        layers: currentLayers(),
        onHover,
        getCursor: () => map.getCanvas().style.cursor,
      });
      map.addControl(created);
      overlayRef.current = created;
    };

    const onIdle = () => {
      const overlay = overlayRef.current;
      if (!overlay || !styleLoadedRef.current) return;
      if (map.getLayer(deckGroupId(beforeIdRef.current))) {
        setReadyBasemap(appliedBasemapRef.current);
        return;
      }
      overlay.setProps({ layers: currentLayers() });
    };

    const publishView = () => {
      moveFrame = 0;
      const next = roundView(map);
      const prev = stateRef.current.view;
      if (next.bearing === prev.bearing && next.pitch === prev.pitch && next.zoom === prev.zoom) return;
      dispatch({ type: "setView", view: next });
    };
    const onMove = () => {
      if (!moveFrame) moveFrame = requestAnimationFrame(publishView);
    };

    const onError = (event: MapErrorEvent) => {
      if (!isLoadFailure(event)) return;
      const styleFailed = !styleLoadedRef.current && !("sourceId" in event);
      if (styleFailed && !fallbackRef.current) {
        fallbackRef.current = true;
        setNotice("style");
        map.setStyle(FALLBACK_STYLE, { diff: false });
        return;
      }
      setNotice((current) => current ?? "tiles");
    };

    const fitCountry = (duration: number) => {
      map.fitBounds(COUNTRY_BOUNDS, {
        padding: cameraPadding(container),
        bearing: 0,
        pitch: stateRef.current.is3d ? PITCH_3D : 0,
        duration,
      });
    };

    const fitPlot = (bounds: ReturnType<typeof plotBounds>) => {
      map.fitBounds(bounds, {
        padding: cameraPadding(container),
        maxZoom: PLOT_MAX_ZOOM,
        duration: motionMs(600),
      });
    };

    const controller: MapController = {
      zoomIn: () => map.zoomIn({ duration: motionMs(250) }),
      zoomOut: () => map.zoomOut({ duration: motionMs(250) }),
      resetNorth: () =>
        map.easeTo({
          bearing: 0,
          pitch: stateRef.current.is3d ? PITCH_3D : 0,
          duration: motionMs(400),
        }),
      resetView: () => fitCountry(motionMs(600)),
      focusPlot: () => {
        const current = stateRef.current.plot;
        if (current) fitPlot(plotBounds(current));
      },
    };
    register(controller);

    const placePlotAtCenter = () => {
      const center = map.getCenter();
      const sidePx = Math.min(container.clientWidth, container.clientHeight) / 4;
      const origin = map.project(center);
      const viewSide = center.distanceTo(map.unproject([origin.x + sidePx, origin.y]));
      const side = Math.min(KEYBOARD_PLOT_MAX_M, Math.max(KEYBOARD_PLOT_MIN_M, viewSide));
      const next = squareAround([center.lng, center.lat], side);
      dispatch({ type: "setPlot", plot: next });
      dispatch({ type: "setTool", tool: "pan" });
      if (side !== viewSide) fitPlot(plotBounds(next));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.defaultPrevented || e.repeat) return;
      if (e.target !== map.getCanvas() || stateRef.current.tool !== "square") return;
      if (drawRef.current?.getModeState() === "drawing") return;
      e.preventDefault();
      placePlotAtCenter();
    };

    const onLoad = () => {
      window.clearTimeout(loadTimer);
      setLoaded(true);
      setNotice((current) => (current === "slow" ? null : current));
      publishView();
    };

    const loadTimer = window.setTimeout(() => {
      setNotice((current) => current ?? "slow");
    }, LOAD_TIMEOUT_MS);

    map.on("style.load", onStyleLoad);
    map.once("load", onLoad);
    map.on("idle", onIdle);
    map.on("move", onMove);
    map.on("error", onError);
    container.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(loadTimer);
      if (moveFrame) cancelAnimationFrame(moveFrame);
      register(null);
      container.removeEventListener("keydown", onKeyDown);
      map.off("style.load", onStyleLoad);
      map.off("load", onLoad);
      map.off("idle", onIdle);
      map.off("move", onMove);
      map.off("error", onError);
      if (drawRef.current) stopTerraDraw(drawRef.current);
      drawRef.current = null;
      plotIdRef.current = null;
      const overlay = overlayRef.current;
      overlayRef.current = null;
      if (overlay) {
        try {
          map.removeControl(overlay);
        } catch {
          // The style is mid-swap; map.remove() below releases the deck instance regardless.
        }
      }
      mapRef.current = null;
      map.remove();
    };
  }, [cells, dispatch, register]);

  useEffect(() => {
    overlayRef.current?.setProps({ layers });
  }, [layers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const duration = motionMs(500);
    if (is3d) {
      map.setMaxPitch(MAX_PITCH);
      if (Math.abs(map.getPitch() - PITCH_3D) >= 0.01) map.easeTo({ pitch: PITCH_3D, duration });
      return;
    }
    const lock = () => {
      if (!stateRef.current.is3d) map.setMaxPitch(0);
    };
    if (map.getPitch() < 0.01) {
      lock();
      return;
    }
    map.once("moveend", lock);
    map.easeTo({ pitch: 0, duration });
    return () => {
      map.off("moveend", lock);
    };
  }, [is3d]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedBasemapRef.current === basemap) return;
    appliedBasemapRef.current = basemap;
    styleLoadedRef.current = false;
    fallbackRef.current = false;
    if (drawRef.current) stopTerraDraw(drawRef.current);
    drawRef.current = null;
    beforeIdRef.current = undefined;
    const s = stateRef.current;
    overlayRef.current?.setProps({
      layers: buildDeckLayers({
        cells,
        activeLayer: s.activeLayer,
        layerSettings: s.layerSettings,
        beforeId: undefined,
      }),
    });
    map.setStyle(basemapStyle(basemap), { diff: false });
  }, [basemap, cells]);

  useEffect(() => {
    const draw = drawRef.current;
    if (draw) applyTool(draw, tool, plotIdRef.current);
  }, [tool]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    if (!plot) {
      if (draw.getSnapshot().length > 0) draw.clear();
      plotIdRef.current = null;
      return;
    }
    const id = plotIdRef.current;
    if (id !== null && draw.hasFeature(id)) return;
    plotIdRef.current = addPlot(draw, plot);
    applyTool(draw, stateRef.current.tool, plotIdRef.current);
  }, [plot]);

  const spinning = !loaded && (notice === null || notice === "tiles");
  const switching = loaded && notice !== "webgl" && readyBasemap !== basemap;

  return (
    <div role="region" aria-label={t.map.regionLabel} className="absolute inset-0 bg-bg">
      <div id={MAP_CONTAINER_ID} ref={containerRef} className="h-full w-full" />
      {hover && activeLayer ? (
        <CellTooltip hover={hover} layer={activeLayer} settings={layerSettings[activeLayer]} />
      ) : null}
      {spinning ? <LoadingIndicator label={t.map.loading} /> : null}
      {switching ? <LoadingIndicator label={t.map.switchingBasemap} compact /> : null}
      {notice ? <LoadNotice kind={notice} onDismiss={() => setNotice(null)} /> : null}
    </div>
  );
}

function CellTooltip({
  hover,
  layer,
  settings,
}: {
  readonly hover: Hover;
  readonly layer: LayerId;
  readonly settings: LayerSettings;
}) {
  const def = LAYERS[layer];
  const value = hover.cell.values[layer];
  const outside = value < settings.range[0] || value > settings.range[1];
  const offset = 14;
  const transform = hover.flip
    ? `translate(calc(${hover.x - offset}px - 100%), ${hover.y + offset}px)`
    : `translate(${hover.x + offset}px, ${hover.y + offset}px)`;
  return (
    <div
      aria-hidden="true"
      style={{ transform }}
      className="pointer-events-none absolute left-0 top-0 z-[5] min-w-36 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 shadow-lg shadow-black/40"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {t.common.layers[layer]}
      </p>
      <p className="font-mono text-sm text-text tabular">
        {formatValue(def, value)} <span className="text-xs text-muted">{def.unit}</span>
      </p>
      {outside ? <p className="text-[11px] text-fair">{t.map.tooltip.outsideRange}</p> : null}
      <p className="text-[11px] text-muted">{t.common.sampleData}</p>
    </div>
  );
}

function LoadingIndicator({ label, compact = false }: { readonly label: string; readonly compact?: boolean }) {
  return (
    <div
      role="status"
      className={`pointer-events-none absolute inset-x-0 z-[5] flex justify-center ${
        compact ? "top-3" : "inset-y-0 items-center"
      }`}
    >
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-muted shadow-lg shadow-black/40">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-accent" strokeWidth={2} />
        {label}
      </div>
    </div>
  );
}

function LoadNotice({ kind, onDismiss }: { readonly kind: NoticeKind; readonly onDismiss: () => void }) {
  const copy = t.map.notices[kind];
  return (
    <div
      role="alert"
      className="absolute left-3 top-3 z-[5] flex w-80 max-w-[calc(100%-1.5rem)] items-start gap-2 rounded-lg border border-line-strong bg-surface-2 py-1.5 pl-3 pr-1 shadow-lg shadow-black/40 lg:left-[calc(var(--tl-browser-w)+1.5rem)]"
    >
      <CloudOff aria-hidden="true" className="mt-2 size-4 shrink-0 text-fair" strokeWidth={1.75} />
      <div className="min-w-0 flex-1 py-1">
        <p className="text-sm font-medium text-text">{copy.title}</p>
        <p className="text-xs text-muted">{copy.body}</p>
      </div>
      <IconButton icon={X} label={t.map.dismissError} size="sm" onClick={onDismiss} />
    </div>
  );
}
