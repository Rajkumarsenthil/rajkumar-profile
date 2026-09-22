import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import { profile, stats } from "../data/profile";
import { EASE } from "../lib/motion";
import { parseAccent } from "../lib/text";
import { CountUp } from "./CountUp";
import { TiltCard } from "./TiltCard";
import { TitleAnchor } from "./TitleAnchor";

/**
 * Pinned intro. At first only the name floats over the valley, seen from high
 * above; scrolling dives the camera down to eye level while the name rises
 * and the introduction fades in.
 */
export function Hero({ ready }: { ready: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;

  // Progress through the pinned stretch, derived from page scroll (the hero sits at the very top).
  const { scrollY } = useScroll();
  const pinRange = useMotionValue(1);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const measure = () => pinRange.set(Math.max(1, section.offsetHeight - window.innerHeight));
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinRange]);
  const scrollYProgress = useTransform(() => Math.min(1, Math.max(0, scrollY.get() / pinRange.get())));
  const nameY = useTransform(scrollYProgress, [0, 0.5], ["14vh", "0vh"]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const copyOpacity = useTransform(scrollYProgress, [0.28, 0.6], [0, 1]);
  const copyY = useTransform(scrollYProgress, [0.28, 0.6], [48, 0]);
  const copyEvents = useTransform(copyOpacity, (v) => (v > 0.5 ? "auto" : "none"));

  const staticCopy = reduce;

  return (
    <section id="top" ref={sectionRef} className={staticCopy ? "relative" : "relative h-[210svh]"}>
      <div className={staticCopy ? "flex min-h-svh flex-col justify-center py-28" : "sticky top-0 flex h-svh flex-col justify-end overflow-hidden pb-8 pt-24 md:justify-center md:py-0"}>
        <div className="container-x">
          <motion.div
            style={staticCopy ? undefined : { y: nameY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: ready ? 1 : 0 }}
            transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
          >
            <p className="eyebrow text-chip flex w-fit items-center gap-3">
              <span className="relative inline-flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                <span className="relative size-2 rounded-full bg-accent" />
              </span>
              {profile.role} · {profile.company} · {profile.location}
            </p>
            <h1 className="sr-only">
              {profile.name}, {profile.role}. {profile.tagline}.
            </h1>
            <TitleAnchor id="hero" start={ready} className="mt-3 h-[clamp(4.5rem,15.5vw,14.5rem)] w-full" />
          </motion.div>

          <motion.div
            style={staticCopy ? undefined : { opacity: copyOpacity, y: copyY, pointerEvents: copyEvents }}
            className="mt-5 grid items-end gap-6 md:mt-6 md:gap-8 lg:grid-cols-12 lg:gap-10"
          >
            <div className="text-card lg:col-span-7">
              <p className="max-w-2xl text-xl font-medium leading-snug tracking-[-0.02em] sm:text-2xl md:text-3xl">
                {parseAccent(profile.headline).map((word, i) => (
                  <span key={`${word.text}-${i}`} className={word.accent ? "font-serif font-normal italic text-aurora pr-[0.08em]" : undefined}>
                    {word.text}{" "}
                  </span>
                ))}
              </p>
              <p className="mt-5 hidden max-w-xl leading-relaxed text-fg-muted md:block">{profile.intro}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-7">
                <a href="#work" className="btn-primary group">
                  Explore the work
                  <ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                </a>
                <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                  Résumé <Download className="size-4" />
                </a>
                {profile.socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden items-center gap-1 px-2 font-mono text-xs uppercase tracking-[0.16em] text-fg-muted transition-colors hover:text-fg sm:inline-flex"
                  >
                    {social.label}
                    <ArrowUpRight className="size-3.5" />
                  </a>
                ))}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:gap-3 lg:col-span-5">
              {stats.map((stat, i) => (
                <TiltCard key={stat.label} className="glass spotlight rounded-2xl p-3.5 md:p-5">
                  <div className="flex flex-col-reverse gap-2">
                    <dt className="text-[11px] leading-snug text-fg-muted sm:text-xs md:text-sm">{stat.label}</dt>
                    <dd className="text-2xl font-medium leading-none tracking-[-0.04em] sm:text-3xl md:text-5xl">
                      {ready ? <CountUp to={stat.number} decimals={stat.decimals} suffix={stat.suffix} delay={0.2 + i * 0.1} /> : "0"}
                    </dd>
                  </div>
                </TiltCard>
              ))}
            </dl>
          </motion.div>
        </div>

        {!staticCopy && (
          <motion.div
            style={{ opacity: cueOpacity }}
            className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3"
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: ready ? 1 : 0 }}
              transition={{ delay: 1.6, duration: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="relative flex h-10 w-6 justify-center rounded-full border border-line-strong pt-2">
                <span className="scroll-dot block size-1 rounded-full bg-accent" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-fg-muted">Scroll to descend</span>
            </motion.span>
          </motion.div>
        )}
      </div>
    </section>
  );
}
