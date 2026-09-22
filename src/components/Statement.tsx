import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { statement } from "../data/profile";
import { parseAccent } from "../lib/text";

/** Large statement whose words light up one by one as it scrolls through the viewport. */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  const words = parseAccent(statement);

  return (
    <section id="statement" className="py-32 md:py-48">
      <div className="container-x">
        <p className="eyebrow flex items-center gap-3">
          <span className="h-px w-10 bg-line-strong" />
          What I do
        </p>
        <p
          ref={ref}
          className="mt-8 max-w-5xl text-[clamp(1.75rem,4.1vw,3.6rem)] font-medium leading-[1.14] tracking-[-0.03em]"
        >
          {words.map((word, i) => (
            <Word
              key={`${word.text}-${i}`}
              progress={scrollYProgress}
              range={[i / words.length, (i + 1) / words.length]}
              accent={word.accent}
              still={!!reduce}
            >
              {word.text}
            </Word>
          ))}
        </p>
      </div>
    </section>
  );
}

type WordProps = {
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
  still: boolean;
  children: ReactNode;
};

function Word({ progress, range, accent, still, children }: WordProps) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <>
      <motion.span
        style={still ? undefined : { opacity }}
        className={accent ? "font-serif font-normal italic text-aurora pr-[0.08em]" : undefined}
      >
        {children}
      </motion.span>{" "}
    </>
  );
}
