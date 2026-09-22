import { AnimatePresence, animate, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { profile } from "../data/profile";
import { WORLD_READY, isWorldReady, markEntered } from "../lib/events";
import { EASE } from "../lib/motion";
import { lockScroll, unlockScroll } from "../lib/scroll";
import { getScene } from "../lib/scene";
import { sound } from "../lib/sound";

const ENTERED_KEY = "entered";
const YEAR = new Date().getFullYear();

const hasEntered = () => {
  try {
    return sessionStorage.getItem(ENTERED_KEY) === "1";
  } catch {
    return false;
  }
};

type Phase = "loading" | "choose" | "gone";

/**
 * Opening screen: counts up while the 3D world compiles, then asks whether to
 * enter with sound (browsers only allow audio after a click). Shown once per session.
 */
export function Loader({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<Phase>(() => (hasEntered() ? "gone" : "loading"));
  const [skipped] = useState(phase === "gone");
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (skipped) {
      markEntered();
      onEnter();
      return;
    }
    lockScroll();
    lockedRef.current = true;
    let value = 0;
    let ready = isWorldReady();
    let introDone = false;
    const render = (v: number) => {
      value = v;
      if (counterRef.current) counterRef.current.textContent = String(Math.round(v)).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${v / 100})`;
    };
    let finishing: ReturnType<typeof animate> | null = null;
    const finish = () => {
      if (!ready || !introDone || finishing) return;
      finishing = animate(value, 100, { duration: 0.6, ease: EASE, onUpdate: render, onComplete: () => setPhase("choose") });
    };
    const intro = animate(0, 88, {
      duration: 1.6,
      ease: [0.3, 0.1, 0.2, 1],
      onUpdate: render,
      onComplete: () => {
        introDone = true;
        finish();
      },
    });
    const onReady = () => {
      ready = true;
      finish();
    };
    window.addEventListener(WORLD_READY, onReady);
    const fallback = window.setTimeout(onReady, 7000);
    return () => {
      intro.stop();
      finishing?.stop();
      window.removeEventListener(WORLD_READY, onReady);
      window.clearTimeout(fallback);
      if (lockedRef.current) {
        lockedRef.current = false;
        unlockScroll();
      }
    };
  }, [skipped, onEnter]);

  // Release the page as soon as the visitor enters (the loader itself stays mounted).
  useEffect(() => {
    if (phase === "gone" && lockedRef.current) {
      lockedRef.current = false;
      unlockScroll();
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "choose") enterRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const enter = (withSound: boolean) => {
    if (withSound) sound.enable();
    else sound.disable();
    try {
      sessionStorage.setItem(ENTERED_KEY, "1");
    } catch {
      // Ignore: the loader simply shows again next visit.
    }
    markEntered();
    setPhase("gone");
    onEnter();
  };

  return (
    <AnimatePresence>
      {phase !== "gone" && (
        <motion.div
          key="loader"
          role="dialog"
          aria-modal="true"
          aria-label="Loading portfolio"
          className="fixed inset-0 z-[90] flex flex-col justify-between bg-bg px-5 py-6 sm:px-10 sm:py-8"
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 1.15, ease: EASE }}
        >
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-fg-muted">
            <span>{profile.name}</span>
            <span>Portfolio · {YEAR}</span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span
              ref={counterRef}
              className="font-mono text-[clamp(4.5rem,18vw,13rem)] font-light leading-none tracking-[-0.06em] tabular-nums"
            >
              000
            </span>
            <div className="mt-8 flex min-h-24 flex-col items-center">
              <AnimatePresence mode="wait">
                {phase === "loading" ? (
                  <motion.p
                    key="status"
                    className="eyebrow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {getScene() === "water" ? "Catching the tide" : "Rendering the night sky"}
                  </motion.p>
                ) : (
                  <motion.div
                    key="choose"
                    className="flex flex-col items-center gap-5"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    <div className="flex flex-wrap justify-center gap-3">
                      <button ref={enterRef} type="button" onClick={() => enter(true)} className="btn-primary">
                        <Volume2 className="size-4" /> Enter with sound
                      </button>
                      <button type="button" onClick={() => enter(false)} className="btn-ghost">
                        <VolumeX className="size-4" /> Enter silently
                      </button>
                    </div>
                    <p className="text-sm text-fg-faint">Headphones recommended. You can switch sound off any time.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div>
            <div className="h-px w-full overflow-hidden bg-line">
              <span ref={barRef} className="block h-full origin-left scale-x-0 bg-accent" />
            </div>
            <div className="mt-3 flex justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-fg-faint">
              <span>{profile.role}</span>
              <span>{profile.location}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
