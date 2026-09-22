import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { EASE, viewportOnce } from "../lib/motion";

type Props = { children: ReactNode; delay?: number; className?: string; y?: number };

/** Fades and lifts its children the first time they scroll into view. */
export function Reveal({ children, delay = 0, className, y = 28 }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
