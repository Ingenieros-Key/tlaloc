import { useSyncExternalStore } from "react";

/** A saved plot shown as a clickable map pin (the active plot is drawn, so it is left out). */
export type PlotPin = {
  readonly plotId: string;
  readonly name: string;
  /** [lng, lat] of the plot's centroid. */
  readonly lngLat: readonly [number, number];
};

let pins: readonly PlotPin[] = [];
let select: (plotId: string) => void = () => {};
const subscribers = new Set<() => void>();

export function getPins(): readonly PlotPin[] {
  return pins;
}

export function setPins(next: readonly PlotPin[]): void {
  pins = next;
  subscribers.forEach((cb) => cb());
}

/** Registers how a pin click loads its plot (useSavedPlots owns the records + fly-to). */
export function setSelect(fn: (plotId: string) => void): void {
  select = fn;
}

export function selectPin(plotId: string): void {
  select(plotId);
}

export function subscribePins(cb: () => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function usePlotPins(): readonly PlotPin[] {
  return useSyncExternalStore(subscribePins, getPins, getPins);
}
