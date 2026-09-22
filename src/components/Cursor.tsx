import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { sound } from "../lib/sound";

const INTERACTIVE = "a, button, [role='button'], [role='switch'], summary, label, [data-cursor]";

const popoverSupported = () => typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/**
 * Ring-and-dot cursor for fine pointers. It renders as a manual popover so it
 * sits in the browser's top layer, above modal dialogs; browsers without the
 * Popover API simply keep their native cursor.
 */
export function Cursor() {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduce = useReducedMotion();
  const [supported] = useState(popoverSupported);
  if (!fine || reduce || !supported) return null;
  return <CursorFollower />;
}

function CursorFollower() {
  const layer = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 420, damping: 36, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 420, damping: 36, mass: 0.6 });
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const hoverRef = useRef(false);
  const visibleRef = useRef(false);

  // Enter the top layer, and re-enter whenever a dialog opens so the cursor stays above it.
  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const raise = () => {
      try {
        if (el.matches(":popover-open")) el.hidePopover();
        el.showPopover();
      } catch {
        // Ignore: the element is not connected yet.
      }
    };
    raise();
    const observer = new MutationObserver(raise);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    return () => {
      observer.disconnect();
      try {
        el.hidePopover();
      } catch {
        // Already hidden.
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-cursor");
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX);
      y.set(event.clientY);
      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }
      const next = (event.target as Element | null)?.closest(INTERACTIVE) != null;
      if (next !== hoverRef.current) {
        hoverRef.current = next;
        setHover(next);
        if (next) sound.blip();
      }
    };
    const onLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [x, y]);

  const scale = pressed ? 0.8 : hover ? 1.8 : 1;

  return (
    <div ref={layer} popover="manual" aria-hidden className="cursor-layer" style={{ opacity: visible ? 1 : 0 }}>
      <motion.div className="absolute left-0 top-0" style={{ x: ringX, y: ringY }}>
        <motion.span
          data-hover={hover}
          className="cursor-ring absolute -left-[18px] -top-[18px] block size-9 rounded-full"
          animate={{ scale }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        />
      </motion.div>
      <motion.div className="absolute left-0 top-0" style={{ x, y }}>
        <span className="absolute -left-[2.5px] -top-[2.5px] block size-[5px] rounded-full bg-accent" />
      </motion.div>
    </div>
  );
}
