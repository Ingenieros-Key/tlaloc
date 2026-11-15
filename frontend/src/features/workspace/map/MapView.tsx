"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Layer, PickingInfo } from "@deck.gl/core";
import { MapLibreOverlay } from "@deck.gl/maplibre";
import { CloudOff, LoaderCircle, Sun, X } from "lucide-react";
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type ErrorEvent as MapErrorEvent,
  type MapMouseEvent,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TerraDraw } from "terra-draw";
import type { Theme } from "@/lib/theme";
import { useAppTheme } from "../hooks/useAppTheme";
import { formatDay } from "../panels/format";
import { LAYERS, formatValue } from "../layers";
import {
  precipDayIndex,
  stepMs,
  useMapController,
  useWorkspace,
  useWorkspaceDispatch,
  type WorkspaceState,
} from "../store";
import { t } from "../strings";
import type { Basemap, DataField, LayerId, LayerSettings, MapController, ViewState } from "../types";
import { IconButton } from "../ui/IconButton";
import {
  FALLBACK_STYLE,
  basemapStyle,
  findOverlayAnchor,
  needsStyleSwap,
  setBasemapLabels,
} from "./basemaps";
import { DATA_LAYER_ID, buildDeckLayers, deckGroupId } from "./deckLayers";
import { MAP_CONTAINER_ID } from "./focus";
import {
  COUNTRY_BOUNDS,
  GOTO_IN_MS,
  GOTO_MIN_ZOOM,
  GOTO_OUT_MS,
  GOTO_PEAK_ZOOM,
  INTRO_CENTER,
  INTRO_FLIGHT_MS,
  INTRO_HOLD_MS,
  INTRO_ZOOM,
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
  /** Index of the hovered cell in the active field. */
  readonly index: number;
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

/** Deck layers for the current state and field (empty during globe flights). */
function deckLayersFor(
  s: WorkspaceState,
  field: DataField | null,
  beforeId: string | undefined,
  globe: boolean,
  theme: Theme,
): Layer[] {
  if (globe) return [];
  return buildDeckLayers({
    field,
    activeLayer: s.activeLayer,
    layerSettings: s.layerSettings,
    style: s.dataStyle,
    zoom: s.view.zoom,
    // Satellite imagery is dark whatever the app theme.
    theme: s.basemap === "satellite" ? "dark" : theme,
    beforeId,
    display: s.display,
  });
}

/** Heatmap hover: the cell whose centre is nearest the pointer, if one is within about 4 km. */
function nearestCell(field: DataField, [lng, lat]: readonly number[]): number | null {
  let best = -1;
  let bestDist = 0.04 ** 2;
  field.cells.forEach(({ center }, i) => {
    const d = (center[0] - lng) ** 2 + (center[1] - lat) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best >= 0 ? best : null;
}

/** Linear blend between two days; a missing value on either side takes the other side. */
function blend(from: Float32Array, to: Float32Array, t: number): Float32Array {
  const out = new Float32Array(to.length);
  for (let i = 0; i < to.length; i += 1) {
    const a = from[i];
    const b = to[i];
    out[i] = Number.isNaN(a) ? b : Number.isNaN(b) ? NaN : a + (b - a) * t;
  }
  return out;
}

/**
 * The workspace map: MapLibre basemap (OpenFreeMap dark/Positron following the app theme, or NASA
 * GIBS), interleaved deck.gl sample
 * data and country outline, and terra-draw for the single plot rectangle. Registers the camera
 * controller used by the ribbon and nav bar.
 */
export function MapView() {
  const state = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const { register } = useMapController();
  const { activeLayer, layerSettings, dataStyle, precip, precipPlaying, precipSpeed, basemap, is3d, tool, plot, pin, picking, display } =
    state;
  const dayIndex = precipDayIndex(state);
  const frames = precip.status === "ready" ? precip.frames : null;
  const dayValues = frames?.values[dayIndex] ?? null;
  /** Wettest cell of the day on screen, to say so when the whole country is dry. */
  const dayMax = useMemo(() => {
    if (!dayValues) return null;
    let max = -Infinity;
    for (const value of dayValues) if (value > max) max = value;
    return Number.isFinite(max) ? max : null;
  }, [dayValues]);
  const dry = activeLayer === "precip" && display.data && dayMax !== null && dayMax < DRY_DAY_MM;
  const theme = useAppTheme();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapLibreOverlay | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const plotIdRef = useRef<string | number | null>(null);
  const stateRef = useRef(state);
  const beforeIdRef = useRef<string | undefined>(undefined);
  const appliedBasemapRef = useRef<Basemap>(basemap);
  const appliedThemeRef = useRef<Theme>(theme);
  const themeRef = useRef<Theme>(theme);
  const styleLoadedRef = useRef(false);
  const fallbackRef = useRef(false);
  const markerRef = useRef<Marker | null>(null);
  /**
   * True during a globe flight (the opening intro or a "Go to" jump): the map uses the globe
   * projection and deck layers stay hidden until it lands.
   */
  const globeRef = useRef(false);
  /** Values on screen. Usually the selected day; mid-blend while the timeline plays. */
  const fieldRef = useRef<DataField | null>(null);
  const fieldVersionRef = useRef(0);

  const [beforeId, setBeforeId] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [readyBasemap, setReadyBasemap] = useState<Basemap>(basemap);
  const [notice, setNotice] = useState<NoticeKind | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [globeActive, setGlobeActive] = useState(false);

  useEffect(() => {
    stateRef.current = state;
    themeRef.current = theme;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initial = stateRef.current;
    appliedBasemapRef.current = initial.basemap;
    appliedThemeRef.current = themeRef.current;

    // Intro: open on the globe and fly in on load. Reduced motion opens on the country directly.
    const intro = motionMs(INTRO_FLIGHT_MS) > 0;
    globeRef.current = intro;
    if (intro) queueMicrotask(() => setGlobeActive(true));
    const camera = intro
      ? { center: INTRO_CENTER, zoom: INTRO_ZOOM, pitch: 0 }
      : {
          bounds: COUNTRY_BOUNDS,
          fitBoundsOptions: { padding: cameraPadding(container) },
          pitch: initial.is3d ? PITCH_3D : 0,
        };

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: basemapStyle(initial.basemap, themeRef.current),
        ...camera,
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

    const currentLayers = () =>
      deckLayersFor(stateRef.current, fieldRef.current, beforeIdRef.current, globeRef.current, themeRef.current);

    // Globe flights. The intro starts in globe mode (set above); "Go to" enters it on demand.
    let introTimer = 0;
    /** Bumped per "Go to" so a superseded flight's second leg never starts. */
    let flightId = 0;
    /** Drops the intro's pre-flight beat, e.g. when "Go to" takes over the camera first. */
    const cancelIntroHold = () => {
      window.clearTimeout(introTimer);
      map.off("movestart", onIntroMoveStart);
    };
    /** Globe projection, plus an atmosphere glow that fades out by country zoom. */
    const applyGlobe = () => {
      map.setProjection({ type: "globe" });
      map.setSky({ "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 4, 1, 7, 0] });
    };
    /** deck.gl's interleaved polygons tear on the globe, so data layers hide until landing. */
    const enterGlobe = () => {
      if (globeRef.current) return;
      globeRef.current = true;
      setGlobeActive(true);
      applyGlobe();
      overlayRef.current?.setProps({ layers: [] });
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
      const field = fieldRef.current;
      let index: number | null = null;
      if (info.layer?.id === DATA_LAYER_ID && info.index >= 0) index = info.index;
      // The heatmap is not pickable, so look up the cell under the pointer instead.
      else if (field && info.coordinate && stateRef.current.dataStyle === "heatmap") {
        index = nearestCell(field, info.coordinate);
      }
      if (index === null) {
        setHover(null);
        return;
      }
      const flip = info.x > map.getContainer().clientWidth - TOOLTIP_FLIP_MARGIN;
      setHover({ index, x: info.x, y: info.y, flip });
    };

    const onStyleLoad = () => {
      styleLoadedRef.current = true;
      if (!fallbackRef.current) setNotice(null);

      // The globe is only for flights; setStyle resets projection and sky, so a style swap
      // mid-flight reapplies them and one afterwards falls back to the flat map.
      if (globeRef.current) applyGlobe();
      if (!stateRef.current.display.labels) setBasemapLabels(map, false);

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
      if (!overlay || !styleLoadedRef.current || globeRef.current) return;
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
      goTo: ([lng, lat]) => {
        const target = {
          center: [lng, lat] as [number, number],
          zoom: Math.max(map.getZoom(), GOTO_MIN_ZOOM),
          bearing: 0,
          pitch: stateRef.current.is3d ? PITCH_3D : 0,
          padding: cameraPadding(container),
        };
        if (motionMs(1) === 0) {
          map.jumpTo(target);
          return;
        }
        // Like the intro, in two legs: pull out to the globe over the point, then dive onto it.
        // (flyTo's minZoom peak is ignored under the globe projection, so the legs are explicit.)
        const id = ++flightId;
        cancelIntroHold();
        map.off("moveend", endGlobe);
        enterGlobe();
        map.easeTo({
          center: target.center,
          zoom: Math.min(map.getZoom(), GOTO_PEAK_ZOOM),
          bearing: 0,
          pitch: 0,
          padding: target.padding,
          duration: GOTO_OUT_MS,
        });
        // Registered after easeTo: starting it stops any running flight, which fires moveend.
        map.once("moveend", () => {
          if (id !== flightId) return; // A newer "Go to" took over.
          map.flyTo({ ...target, duration: GOTO_IN_MS });
          map.once("moveend", endGlobe);
        });
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

    /** Lands a globe flight: flat map, data layers on. Runs when the flight ends or is interrupted. */
    const endGlobe = () => {
      if (!globeRef.current) return;
      globeRef.current = false;
      cancelIntroHold();
      map.off("moveend", endGlobe);
      map.setProjection({ type: "mercator" });
      setGlobeActive(false);
      overlayRef.current?.setProps({ layers: currentLayers() });
    };
    const startIntroFlight = () => {
      map.off("movestart", onIntroMoveStart);
      fitCountry(INTRO_FLIGHT_MS);
      map.once("moveend", endGlobe);
    };
    /** The user grabbed the globe before the intro flight began: skip it and hand over the camera. */
    const onIntroMoveStart = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) endGlobe();
    };

    // MapLibre opens the compact attribution on load; start it folded to its ⓘ button so it does not
    // cover the map (it opens on click). Repeated once the map settles, in case sources added it late.
    const foldAttribution = () =>
      map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
    map.once("idle", foldAttribution);

    const onLoad = () => {
      window.clearTimeout(loadTimer);
      foldAttribution();
      setLoaded(true);
      setNotice((current) => (current === "slow" ? null : current));
      publishView();
      // A drag, scroll or camera button during the flight interrupts it (MapLibre's default), which
      // also fires moveend and lands the intro where the user stopped it.
      if (intro) {
        map.on("movestart", onIntroMoveStart);
        introTimer = window.setTimeout(startIntroFlight, INTRO_HOLD_MS);
      }
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
      window.clearTimeout(introTimer);
      map.off("movestart", onIntroMoveStart);
      map.off("moveend", endGlobe);
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
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [dispatch, register]);

  // Settings that change the deck layers (the field itself is pushed by the effect below).
  const heatmapZoom = dataStyle === "heatmap" ? state.view.zoom : 0;
  useEffect(() => {
    overlayRef.current?.setProps({
      layers: deckLayersFor(stateRef.current, fieldRef.current, beforeId, globeActive, theme),
    });
  }, [globeActive, activeLayer, layerSettings, dataStyle, heatmapZoom, beforeId, display, theme, basemap]);

  // The selected day's values. While the timeline plays, the map blends from what is on screen to
  // the new day over one step, so playback moves continuously instead of jumping day to day.
  const dayCount = frames?.dates.length ?? 0;
  useEffect(() => {
    const push = () =>
      overlayRef.current?.setProps({
        layers: deckLayersFor(stateRef.current, fieldRef.current, beforeIdRef.current, globeRef.current, themeRef.current),
      });
    const nextVersion = () => (fieldVersionRef.current += 1);

    if (!frames || !dayValues) {
      fieldRef.current = null;
      push();
      return;
    }
    const cells = frames.hexes;
    const prev = fieldRef.current;
    const duration = motionMs(stepMs(dayCount, precipSpeed));
    if (!precipPlaying || !prev || prev.cells !== cells || duration === 0) {
      fieldRef.current = { cells, values: dayValues, version: nextVersion() };
      push();
      return;
    }

    const from = prev.values;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      fieldRef.current = { cells, values: t >= 1 ? dayValues : blend(from, dayValues, t), version: nextVersion() };
      push();
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [frames, dayValues, precipPlaying, dayCount, precipSpeed]);

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
    if (!map) return;
    const from = { basemap: appliedBasemapRef.current, theme: appliedThemeRef.current };
    if (!needsStyleSwap(from, { basemap, theme })) {
      // Satellite looks the same in both themes; remember the theme for the next street swap.
      appliedThemeRef.current = theme;
      return;
    }
    appliedBasemapRef.current = basemap;
    appliedThemeRef.current = theme;
    styleLoadedRef.current = false;
    fallbackRef.current = false;
    if (drawRef.current) stopTerraDraw(drawRef.current);
    drawRef.current = null;
    beforeIdRef.current = undefined;
    overlayRef.current?.setProps({
      layers: deckLayersFor(stateRef.current, fieldRef.current, undefined, globeRef.current, theme),
    });
    map.setStyle(basemapStyle(basemap, theme), { diff: false });
  }, [basemap, theme]);

  // "Go to" pin: a draggable DOM marker, so it survives basemap/theme style swaps untouched.
  // Dragging it updates the pin (and so the Go to fields); the camera stays put.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin || !display.pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    let marker = markerRef.current;
    if (!marker) {
      const created = new Marker({ element: createPinElement(), anchor: "bottom", draggable: true });
      created.on("dragend", () => {
        const { lng, lat } = created.getLngLat();
        dispatch({ type: "setPin", pin: [lng, lat] });
      });
      created.setLngLat([pin[0], pin[1]]).addTo(map);
      markerRef.current = created;
      marker = created;
    }
    marker.setLngLat([pin[0], pin[1]]);
  }, [pin, display.pin, loaded, dispatch]);

  // Display card: basemap labels. Also reapplied on every style load (see onStyleLoad).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    setBasemapLabels(map, display.labels);
  }, [display.labels, loaded]);

  // "Pick on map": crosshair cursor; the next click drops the pin there and centres the map on it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !picking) return;
    const canvas = map.getCanvas();
    canvas.style.cursor = "crosshair";
    const onClick = (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      dispatch({ type: "setPin", pin: [lng, lat] });
      dispatch({ type: "setPicking", picking: false });
      map.easeTo({ center: [lng, lat], duration: motionMs(500) });
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      canvas.style.cursor = "";
    };
  }, [picking, dispatch]);

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
      {hover && activeLayer && display.tooltips ? (
        <CellTooltip
          hover={hover}
          layer={activeLayer}
          settings={layerSettings[activeLayer]}
          // Read the value from the frame on screen, so it follows the timeline while playing.
          value={dayValues && !Number.isNaN(dayValues[hover.index]) ? dayValues[hover.index] : undefined}
          caption={
            precip.status === "ready" && precip.frames.dates[dayIndex]
              ? t.map.tooltip.powerSource(formatDay(precip.frames.dates[dayIndex]))
              : t.common.sampleData
          }
        />
      ) : null}
      {dry && loaded && !globeActive && dayMax !== null ? <DryDayChip max={dayMax} /> : null}
      {spinning ? <LoadingIndicator label={t.map.loading} /> : null}
      {switching ? <LoadingIndicator label={t.map.switchingBasemap} compact /> : null}
      {notice ? <LoadNotice kind={notice} onDismiss={() => setNotice(null)} /> : null}
    </div>
  );
}

/** Below this, nowhere in the country had measurable rain: the usual "rain day" cut-off. */
const DRY_DAY_MM = 1;

/** Says the map is on but dry, so near-empty cells are not mistaken for a missing layer. */
function DryDayChip({ max }: { readonly max: number }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 top-3 z-[5] flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-input bg-surface/95 px-3 py-1 text-xs text-text shadow-md shadow-black/20"
    >
      <Sun aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-muted" />
      {t.map.dryDay(max.toLocaleString("en-US", { maximumFractionDigits: 1 }))}
    </div>
  );
}

function CellTooltip({
  hover,
  layer,
  settings,
  value,
  caption,
}: {
  readonly hover: Hover;
  readonly layer: LayerId;
  readonly settings: LayerSettings;
  /** Undefined when the hovered cell has no data in the current frame. */
  readonly value: number | undefined;
  readonly caption: string;
}) {
  if (value === undefined) return null;
  const def = LAYERS[layer];
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
      <p className="text-[11px] text-muted">
        {caption}
      </p>
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

/**
 * "Go to" map pin: a teardrop with an elote (corn cob in its husk) inside; the tip sits on the
 * coordinate. Colors come from the theme tokens so it reads on both basemaps. Draggable with a
 * pointer; keyboard users set it through the Go to form, so it stays out of the accessibility tree.
 */
function createPinElement(): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.className = "cursor-grab drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)] active:cursor-grabbing";
  el.innerHTML = `<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 40.5C17 40.5 3.5 25.5 3.5 16a13.5 13.5 0 1 1 27 0c0 9.5-13.5 24.5-13.5 24.5Z"
    fill="var(--tl-surface)" stroke="var(--tl-accent)" stroke-width="2.25" stroke-linejoin="round"/>
  <ellipse cx="17" cy="14.5" rx="4.4" ry="7.6" fill="#f6b93b"/>
  <g stroke="#b9780c" stroke-width="0.7" stroke-linecap="round" opacity="0.55">
    <path d="M17 7.4v14.2M14.6 9.2v10.6M19.4 9.2v10.6"/>
    <path d="M13 11.2h8M12.7 14.5h8.6M13 17.8h8"/>
  </g>
  <path d="M17 25c-4.6-1.6-6.9-6.2-6.6-12.2 1.9 3.2 4 7 6.6 12.2Z" fill="var(--tl-good)"/>
  <path d="M17 25c4.6-1.6 6.9-6.2 6.6-12.2-1.9 3.2-4 7-6.6 12.2Z" fill="var(--tl-good)"/>
</svg>`;
  return el;
}
