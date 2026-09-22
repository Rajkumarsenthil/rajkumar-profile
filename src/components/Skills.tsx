import { motion } from "motion/react";
import { skillGroups } from "../data/profile";
import { EASE, fadeUp, staggerContainer, viewportOnce } from "../lib/motion";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";

export function Skills() {
  return (
    <section id="skills" className="py-28 md:py-40">
      <div className="container-x">
        <SectionHeading
          index="03"
          eyebrow="Toolkit"
          titleId="skills"
          title="What I *reach for.*"
          description="Backend first, comfortable across the stack. These are the tools behind the stories above, and how I think about each."
        />
        <motion.div
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {skillGroups.map((group, i) => (
            <motion.div
              key={group.label}
              variants={fadeUp}
              transition={{ duration: 0.7, ease: EASE }}
              className={group.wide ? "lg:col-span-2" : ""}
            >
              <TiltCard className="glass spotlight h-full rounded-3xl p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">{group.label}</p>
                  <span className="font-mono text-[11px] text-fg-faint">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="mt-3 leading-relaxed text-fg-muted">{group.note}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-line-strong bg-tint/[0.04] px-3 py-1.5 text-sm transition-colors duration-300 hover:border-accent hover:text-accent"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
