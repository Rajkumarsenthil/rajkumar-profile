import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { experience, profile } from "../data/profile";
import { EASE, fadeUp, staggerContainer, viewportOnce } from "../lib/motion";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";

export function Experience() {
  const listRef = useRef<HTMLOListElement>(null);
  // The accent line along the timeline draws itself as the list scrolls past.
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 20, restDelta: 0.001 });

  return (
    <section id="experience" className="py-28 md:py-40">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <SectionHeading index="02" eyebrow="Experience" titleId="experience" title="One product, *a widening brief.*" />
          <Reveal delay={0.1} className="mt-10">
            <TiltCard className="glass spotlight rounded-2xl p-6">
              <p className="text-3xl font-medium tracking-[-0.03em]">{profile.company}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg-muted">
                Enterprise facilities and maintenance management SaaS (CMMS)
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <dt className="eyebrow text-[10px]">Tenure</dt>
                  <dd className="mt-1.5 text-sm">Apr 2022 — Present</dd>
                </div>
                <div>
                  <dt className="eyebrow text-[10px]">Base</dt>
                  <dd className="mt-1.5 text-sm">{profile.location}</dd>
                </div>
              </dl>
            </TiltCard>
          </Reveal>
        </div>

        <motion.ol
          ref={listRef}
          className="relative space-y-10 pl-8 md:pl-12 lg:col-span-7"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <span aria-hidden className="absolute bottom-2 left-0 top-2 w-px bg-line" />
          <motion.span aria-hidden style={{ scaleY }} className="absolute bottom-2 left-0 top-2 w-px origin-top bg-accent" />

          {experience.map((role, i) => (
            <motion.li key={role.title} variants={fadeUp} transition={{ duration: 0.8, ease: EASE }} className="relative">
              <span
                aria-hidden
                className={`absolute top-8 size-2.5 rounded-full ring-4 ring-bg -left-[calc(2rem+5px)] md:-left-[calc(3rem+5px)] ${
                  i === 0 ? "bg-accent shadow-[0_0_16px_var(--accent)]" : "bg-line-strong"
                }`}
              />
              <div className="glass rounded-3xl p-6 md:p-8">
                <p className="eyebrow flex flex-wrap items-center gap-3">
                  {role.period}
                  {i === 0 && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] normal-case tracking-normal text-accent">
                      Current
                    </span>
                  )}
                </p>
                <h3 className="mt-3 text-2xl font-medium leading-tight tracking-[-0.03em] md:text-3xl">{role.title}</h3>
                <p className="mt-5 leading-relaxed text-fg-muted">{role.summary}</p>
                <ul className="mt-6 grid gap-2.5">
                  {role.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3 rounded-2xl border border-line bg-tint/[0.03] px-4 py-3 text-sm leading-relaxed">
                      <span className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-accent" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
