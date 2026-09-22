import { sound } from "./sound";

/**
 * Which world the site is set in:
 * - "sky": the night valley, aurora and interactive stars.
 * - "water": a beach by day, with waves, dolphins, boats and gulls.
 * Remembered per visitor.
 */
export type SceneMode = "sky" | "water";

const KEY = "scene";
const THEME_COLORS: Record<SceneMode, string> = { sky: "#04060b", water: "#f3efe8" };

const read = (): SceneMode => {
  if (typeof document !== "undefined" && document.documentElement.dataset.scene === "water") return "water";
  try {
    return localStorage.getItem(KEY) === "water" ? "water" : "sky";
  } catch {
    return "sky";
  }
};

let current: SceneMode = read();
const listeners = new Set<() => void>();
let typeSwap: ReturnType<typeof setTimeout> | undefined;

/** Typefaces change at the midpoint of the 2.4 s blend, where the fade best hides the swap. */
const TYPE_SWAP_MS = 1200;
const typeFor = (mode: SceneMode) => (mode === "water" ? "beach" : "night");

export const getScene = () => current;

export const subscribeScene = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function apply(next: SceneMode) {
  current = next;
  const root = document.documentElement;
  root.dataset.scene = next;
  clearTimeout(typeSwap);
  typeSwap = setTimeout(() => {
    root.dataset.type = typeFor(next);
  }, TYPE_SWAP_MS);
  root.style.background = THEME_COLORS[next];
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[next]);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Storage unavailable; the choice still applies to this visit.
  }
  sound.setMood(next);
  listeners.forEach((listener) => listener());
}

/**
 * Switch scenes. The page colours (registered CSS properties) and the 3D world
 * both cross-fade over the same eased 2.4 seconds, so nothing snaps.
 */
export function setScene(next: SceneMode) {
  if (next === current) return;
  apply(next);
}

// Keep the audio mood and typefaces in step with a scene restored from a previous visit.
sound.setMood(current);
if (typeof document !== "undefined") document.documentElement.dataset.type = typeFor(current);
