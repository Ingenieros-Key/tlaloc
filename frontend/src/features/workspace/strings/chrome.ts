import type { Basemap, Tool } from "../types";

/** UI strings for the chrome area. Owned by the chrome module; add keys freely. */
export const chrome = {
  closePanel: "Close panel",
  collapsePanel: (panel: string) => `Collapse ${panel}`,
  expandPanel: (panel: string) => `Expand ${panel}`,
  topBar: {
    projectLabel: "Project:",
    projectName: "Untitled plot",
    sampleDataTitle: "About sample data",
    openLayers: "Layers",
    openResults: "Results",
    signIn: "Sign in",
    signedIn: "Signed in",
    signOut: "Sign out",
    home: "Home",
    theme: "Toggle theme",
  },
  ribbon: {
    label: "Workspace tools",
    groups: {
      draw: "Draw",
      analyze: "Analyze",
      view: "View",
    },
    tools: {
      pan: "Pan",
      square: "Square",
      edit: "Edit",
    } satisfies Record<Tool, string>,
    toolTips: {
      pan: "Pan and rotate the map",
      square: "Draw a square plot on the map",
      edit: "Move or resize the plot corners",
    } satisfies Record<Tool, string>,
    deletePlot: "Delete",
    deletePlotTip: "Delete the plot",
    analyze: "Analyze",
    analyzing: "Analyzing",
    analyzeTip: "Re-run the planting outlook for the plot",
    display: "Display",
    displayTip: "Show or hide map items, legends and notes",
    focusPlot: "Focus plot",
    focusPlotTip: "Zoom the map to the plot",
    threeD: "3D",
    threeDTip: "Tilt the map for a 3D view",
    resetView: "Reset view",
    resetViewTip: "Return to the El Salvador overview",
    basemapLabel: "Basemap",
    basemaps: {
      map: "Map",
      satellite: "Satellite",
    } satisfies Record<Basemap, string>,
    basemapTips: {
      map: "Vector street map",
      satellite: "NASA GIBS satellite imagery",
    } satisfies Record<Basemap, string>,
    needsPlot: "draw a plot first",
    /** Screen-reader description of a disabled tool. */
    needsPlotDescription: "Unavailable until you draw a plot.",
    /** Key names as shown in tooltips. */
    keys: {
      pan: "H",
      square: "S",
      edit: "E",
      deletePlot: "Del",
      analyze: "A",
    },
    hints: {
      pan: "Drag to move the map. Press S to draw a plot.",
      square: "Draw a square on the map, or press Enter on the focused map to place one. Esc to cancel.",
      edit: "Drag the corners to reshape your plot. Esc to finish.",
    } satisfies Record<Tool, string>,
    /** Native tooltip text: description, shortcut and, when unavailable, why. */
    tooltip: (description: string, shortcut?: string, unavailable?: string): string =>
      `${description}${shortcut ? ` (${shortcut})` : ""}${unavailable ? ` - ${unavailable}` : ""}`,
  },
  undo: {
    deleted: "Plot deleted.",
    undo: "Undo",
  },
  nav: {
    label: "Map navigation",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetNorth: "Reset north",
    home: "Reset view",
    goTo: {
      button: "Go to",
      title: "Go to",
      latitude: "Latitude",
      longitude: "Longitude",
      latitudePlaceholder: "13.6929",
      longitudePlaceholder: "-89.2182",
      submit: "Go",
      clearPin: "Clear pin",
      pick: "Pick on map",
      pickHint: "Click the map to place the pin",
      cancelPick: "Cancel",
      latitudeError: "Enter a latitude between -90 and 90.",
      longitudeError: "Enter a longitude between -180 and 180.",
    },
    /** Compact zoom readout, e.g. "Z 8.3". */
    zoomReadout: (zoom: number): string => `Z ${zoom.toFixed(1)}`,
  },
} as const;
