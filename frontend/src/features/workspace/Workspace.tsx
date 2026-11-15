"use client";

import dynamic from "next/dynamic";
import { QueryProvider } from "@/lib/query";
import { useEffect, useRef, type ReactNode } from "react";
import { NavBar } from "./chrome/NavBar";
import { PlotUndoToast } from "./chrome/PlotUndoToast";
import { TimelineDock } from "./chrome/TimelineDock";
import { Ribbon } from "./chrome/Ribbon";
import { TopBar } from "./chrome/TopBar";
import { DRAWER_QUERY, useMediaQuery } from "./hooks/useMediaQuery";
import { AnalysisAnnouncer } from "./panels/AnalysisAnnouncer";
import { BrowserPanel } from "./panels/BrowserPanel";
import { InspectorPanel } from "./panels/InspectorPanel";
import { WorkspaceProvider, inspectorVisible, useWorkspace, useWorkspaceDispatch, type PanelId } from "./store";
import { t } from "./strings";

/** MapLibre/deck.gl touch `window`, so the map is client-only and code-split. */
const MapView = dynamic(() => import("./map/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="absolute inset-0 animate-pulse bg-surface" aria-hidden="true" />,
});

/** The Fusion-style workspace: top bar, tool ribbon, map canvas with floating Browser/Inspector. */
export function Workspace() {
  return (
    <QueryProvider>
      <WorkspaceProvider>
        <div lang="en" className="flex h-dvh flex-col overflow-hidden bg-bg text-text">
          <TopBar />
          <Ribbon />
          <Canvas />
        </div>
      </WorkspaceProvider>
    </QueryProvider>
  );
}

/**
 * Map area. While a drawer is open below lg the scrim covers the map and nav bar, so both are made
 * inert to keep keyboard focus out of content that cannot be seen.
 */
function Canvas() {
  const state = useWorkspace();
  const { panels, display } = state;
  const drawerLayout = useMediaQuery(DRAWER_QUERY);
  const covered = drawerLayout && (panels.browser || panels.inspector);

  return (
    <main
      id="workspace-canvas"
      data-inspector={inspectorVisible(state) ? "shown" : "hidden"}
      className="relative min-h-0 flex-1 overflow-hidden"
    >
      <div className="absolute inset-0" data-shortcuts="map" inert={covered}>
        <MapView />
      </div>
      <Drawers drawerLayout={drawerLayout} />
      <AnalysisAnnouncer />
      <div
        inert={covered}
        className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center px-4"
      >
        <PlotUndoToast />
        <TimelineDock />
        {display.navBar ? <NavBar /> : null}
      </div>
    </main>
  );
}

function Drawers({ drawerLayout }: { readonly drawerLayout: boolean }) {
  const state = useWorkspace();
  const { panels } = state;
  const dispatch = useWorkspaceDispatch();
  const anyOpen = panels.browser || panels.inspector;
  const showInspector = inspectorVisible(state);

  useEffect(() => {
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      dispatch({ type: "setPanel", panel: "browser", open: false });
      dispatch({ type: "setPanel", panel: "inspector", open: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyOpen, dispatch]);

  return (
    <>
      {anyOpen ? (
        <button
          type="button"
          aria-label={t.chrome.closePanel}
          tabIndex={-1}
          className="absolute inset-0 z-10 cursor-default bg-overlay lg:hidden"
          onClick={() => {
            dispatch({ type: "setPanel", panel: "browser", open: false });
            dispatch({ type: "setPanel", panel: "inspector", open: false });
          }}
        />
      ) : null}
      <Dock
        side="left"
        panel="browser"
        open={panels.browser}
        drawerLayout={drawerLayout}
      >
        <BrowserPanel />
      </Dock>
      {showInspector ? (
        <Dock side="right" panel="inspector" open={panels.inspector} drawerLayout={drawerLayout}>
          <InspectorPanel />
        </Dock>
      ) : null}
    </>
  );
}

/**
 * lg+: panel floats over the map at a fixed width. Below lg: off-canvas drawer toggled from the
 * top bar, closed with Escape or the scrim. Opening a drawer moves focus to its heading; closing it
 * returns focus to its top-bar toggle unless an in-panel action already moved focus elsewhere.
 * The dock always spans the full height and lets clicks through; the panel inside grows into it
 * and slides down to its header when collapsed (see `Panel`), so the map stays usable below it.
 */
function Dock({
  side,
  panel,
  open,
  drawerLayout,
  children,
}: {
  readonly side: "left" | "right";
  readonly panel: PanelId;
  readonly open: boolean;
  readonly drawerLayout: boolean;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    const changed = wasOpen.current !== open;
    wasOpen.current = open;
    const dock = ref.current;
    if (!changed || !drawerLayout || !dock) return;
    if (open) {
      // preventScroll: the drawer is still sliding in, and focusing it would scroll the
      // overflow-hidden <main> sideways to reveal it.
      dock.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      return;
    }
    const active = document.activeElement;
    if (active === null || active === document.body || dock.contains(active)) {
      document.querySelector<HTMLElement>(`[aria-controls="${dock.id}"]`)?.focus({ preventScroll: true });
    }
  }, [open, drawerLayout]);

  const width = side === "left" ? "w-[var(--tl-browser-w)]" : "w-[var(--tl-inspector-w)]";
  const position = side === "left" ? "left-0 lg:left-3" : "right-0 lg:right-3";
  const hidden = side === "left" ? "max-lg:-translate-x-full" : "max-lg:translate-x-full";
  return (
    <div
      ref={ref}
      id={`dock-${panel}`}
      className={`pointer-events-none absolute inset-y-0 z-20 flex max-w-[calc(100vw-3rem)] flex-col transition-transform duration-200 ease-out lg:bottom-3 lg:top-3 ${width} ${position} ${
        open ? "max-lg:translate-x-0" : `${hidden} max-lg:invisible`
      }`}
    >
      {children}
    </div>
  );
}
