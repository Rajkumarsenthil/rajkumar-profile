import { motion } from "motion/react";
import { EASE, viewportOnce } from "../lib/motion";
import { parseAccent } from "../lib/text";

type Props = {
  /** Plain text; wrap words in *asterisks* to render them as serif italic accents. */
  text: string;
  className?: string;
  /** Drive the animation externally ("hidden" | "visible"); otherwise it plays on scroll. */
  state?: "hidden" | "visible";
  delay?: number;
  stagger?: number;
};

const wordVariants = {
  hidden: { y: "110%", rotate: 3 },
  visible: { y: 0, rotate: 0 },
};

/** Word-by-word rising text reveal, clipped to each word's line box. */
export function SplitText({ text, className, state, delay = 0, stagger = 0.05 }: Props) {
  const words = parseAccent(text);
  const control = state
    ? { initial: "hidden" as const, animate: state }
    : { initial: "hidden" as const, whileInView: "visible" as const, viewport: viewportOnce };

  return (
    <motion.span className={className} {...control}>
      {words.map((word, i) => (
        <span key={`${word.text}-${i}`} className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
          <motion.span
            className={`inline-block origin-bottom-left will-change-transform ${word.accent ? "font-serif font-normal italic text-aurora pr-[0.08em]" : ""}`}
            variants={wordVariants}
            transition={{ duration: 1, ease: EASE, delay: delay + i * stagger }}
          >
            {word.text}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  );
}
