/** id of the element MapLibre renders into; its canvas is the keyboard-focusable map. */
export const MAP_CONTAINER_ID = "workspace-map";

/**
 * Moves focus to the map canvas on the next frame, after a closing drawer has re-rendered and the
 * map is no longer inert, so keyboard users can pan, zoom or place a plot next.
 */
export function focusMapCanvas(): void {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`#${MAP_CONTAINER_ID} canvas`)?.focus({ preventScroll: true });
  });
}
