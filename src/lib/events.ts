/** Fired once the 3D world has rendered its first frame (or failed), so the loader can finish. */
export const WORLD_READY = "world:ready";

let ready = false;

export const isWorldReady = () => ready;

export function markWorldReady() {
  if (ready) return;
  ready = true;
  window.dispatchEvent(new Event(WORLD_READY));
}

let entered = false;

/** The visitor has passed the loader; hero animations may start. */
export const hasEnteredSite = () => entered;

export function markEntered() {
  entered = true;
}
