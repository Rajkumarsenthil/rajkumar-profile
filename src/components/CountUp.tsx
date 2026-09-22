import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { EASE } from "../lib/motion";

type Props = { to: number; decimals?: number; suffix?: string; duration?: number; delay?: number };

/** Counts from 0 to `to` the first time it enters the viewport. */
export function CountUp({ to, decimals = 0, suffix = "", duration = 1.8, delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const controls = animate(0, to, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (value) => {
        el.textContent = `${value.toFixed(decimals)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, decimals, suffix, duration, delay, reduce]);

  return <span ref={ref}>{`${(reduce ? to : 0).toFixed(decimals)}${suffix}`}</span>;
}
