import Lenis from "lenis";
import { sound } from "./sound";

let lenis: Lenis | null = null;
let locks = 0;

/** Starts Lenis smooth scrolling (skipped for reduced-motion users). */
export function initSmoothScroll() {
  if (lenis) return;
  lenis = new Lenis({ autoRaf: true, lerp: 0.085, anchors: true });
  lenis.on("scroll", (instance: Lenis) => sound.setVelocity(Math.abs(instance.velocity) / 55));
  if (locks > 0) lenis.stop();
}

export function destroySmoothScroll() {
  lenis?.destroy();
  lenis = null;
}

/** Reference-counted scroll lock shared by the loader, dialogs and the mobile menu. */
export function lockScroll() {
  locks += 1;
  if (locks === 1) {
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
  }
}

export function unlockScroll() {
  if (locks === 0) return;
  locks -= 1;
  if (locks === 0) {
    lenis?.start();
    document.documentElement.style.overflow = "";
  }
}

export function scrollToTarget(selector: string) {
  if (lenis) {
    lenis.scrollTo(selector, { force: true });
    return;
  }
  document.querySelector(selector)?.scrollIntoView();
}
