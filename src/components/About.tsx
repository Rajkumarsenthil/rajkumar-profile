import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Bike, Mountain, Rocket, Trophy, Tv } from "lucide-react";
import { aboutParagraphs, facts, passions } from "../data/profile";
import type { Passion } from "../data/profile";
import { EASE, fadeUp, staggerContainer, viewportOnce } from "../lib/motion";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";
import portrait720 from "../assets/hero-720.webp";
import portrait1120 from "../assets/hero-1120.webp";
import ride from "../assets/ride.webp";
import summit from "../assets/summit.webp";
import coast from "../assets/coast.webp";
import offbeat from "../assets/offbeat.webp";

const icons: Record<Passion["icon"], typeof Bike> = {
  bike: Bike,
  mountain: Mountain,
  trophy: Trophy,
  rocket: Rocket,
  tv: Tv,
};

const photos = [
  { src: ride, alt: "Rajkumar on his Royal Enfield, looking out over a misty valley", caption: "Two wheels, long roads" },
  { src: summit, alt: "Rajkumar in a red jacket on a snowy ridge under a clear blue sky", caption: "Above the snowline" },
  { src: coast, alt: "Rajkumar in a straw hat walking along a beach", caption: "Coastal reset" },
  { src: offbeat, alt: "Rajkumar carrying a Marshall speaker through a forest", caption: "Off days, loud music" },
];

export function About() {
  const stripRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stripRef, offset: ["start end", "end start"] });
  const driftDown = useTransform(scrollYProgress, [0, 1], [48, -48]);
  const driftUp = useTransform(scrollYProgress, [0, 1], [-32, 32]);

  return (
    <section id="about" className="py-28 md:py-40">
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <SectionHeading index="04" eyebrow="About" titleId="about" title="Owner of *problems,* not just tickets." />
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-fg-muted">
            {aboutParagraphs.map((paragraph, i) => (
              <Reveal key={paragraph} delay={0.05 * i}>
                <p>{paragraph}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1} className="mt-10">
            <dl className="glass grid gap-px overflow-hidden rounded-3xl bg-line sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} className="bg-bg/80 p-5">
                  <dt className="eyebrow">{fact.label}</dt>
                  <dd className="mt-2 text-sm leading-relaxed">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="lg:col-span-5">
          <Reveal delay={0.15}>
            <TiltCard max={6} className="mx-auto max-w-sm rounded-[1.75rem] lg:max-w-none">
              <img
                src={portrait720}
                srcSet={`${portrait720} 720w, ${portrait1120} 1120w`}
                sizes="(min-width: 1024px) 420px, (min-width: 640px) 384px, 85vw"
                width={720}
                height={900}
                loading="lazy"
                decoding="async"
                alt="Rajkumar standing on a snow-covered boulder with mountain ridges behind him"
                className="aspect-[4/5] w-full rounded-[1.75rem] border border-line object-cover [filter:saturate(0.85)_contrast(1.05)]"
              />
              <div className="glass absolute -bottom-6 left-5 right-5 rounded-2xl p-4 [transform:translateZ(40px)] sm:left-auto sm:w-64">
                <p className="eyebrow">Beyond code</p>
                <p className="mt-1.5 text-sm leading-snug">
                  Off the clock: long rides, high trails and football.
                </p>
              </div>
            </TiltCard>
          </Reveal>

          <motion.ul
            className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {passions.map((passion) => {
              const Icon = icons[passion.icon];
              return (
                <motion.li
                  key={passion.label}
                  variants={fadeUp}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="glass spotlight rounded-2xl p-4"
                >
                  <Icon className="size-5 text-accent" />
                  <p className="mt-3 font-medium">{passion.label}</p>
                  <p className="mt-1 text-sm leading-snug text-fg-muted">{passion.blurb}</p>
                </motion.li>
              );
            })}
          </motion.ul>
        </div>
      </div>

      <div ref={stripRef} className="container-x mt-24">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {photos.map((photo, i) => (
            <motion.figure
              key={photo.caption}
              style={{ y: i % 2 === 0 ? driftDown : driftUp }}
              className="group relative overflow-hidden rounded-3xl border border-line"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full object-cover transition-transform duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
              />
              <figcaption className="glass absolute inset-x-3 bottom-3 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]">
                {photo.caption}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
