import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Plus } from "lucide-react";
import { profile, projects } from "../data/profile";
import type { Project } from "../data/profile";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { EASE, fadeUp, staggerContainer, viewportOnce } from "../lib/motion";
import { ProjectDialog } from "./ProjectDialog";
import { ProjectGlyph } from "./ProjectGlyph";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";

const HEADING = {
  index: "01",
  eyebrow: "Selected work",
  titleId: "work" as const,
  title: "Systems I've *built and owned.*",
  description:
    "Enterprise work rarely comes with screenshots I can share, so these are the stories instead: the problem, what I did about it, and what changed.",
};

export function Work() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduce = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : projects[openIndex];
  const step = useCallback(
    (delta: number) => setOpenIndex((i) => (i === null ? i : (i + delta + projects.length) % projects.length)),
    [],
  );
  const nextTitle = projects[((openIndex ?? 0) + 1) % projects.length].title;

  return (
    <section id="work" className="relative">
      {desktop && !reduce ? <HorizontalReel onOpen={setOpenIndex} /> : <StackedList onOpen={setOpenIndex} />}
      <ProjectDialog
        project={open}
        index={openIndex ?? 0}
        total={projects.length}
        onClose={() => setOpenIndex(null)}
        onStep={step}
        nextTitle={nextTitle}
      />
    </section>
  );
}

type ListProps = { onOpen: (index: number) => void };

/** Desktop: the section pins while vertical scrolling slides the cards sideways. */
function HorizontalReel({ onOpen }: ListProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const distance = useMotionValue(0);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const d = Math.max(0, track.scrollWidth - window.innerWidth);
      distance.set(d);
      setHeight(d + window.innerHeight);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [distance]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(() => -scrollYProgress.get() * distance.get());
  const counter = useTransform(scrollYProgress, (v) =>
    String(Math.min(projects.length, Math.floor(v * projects.length) + 1)).padStart(2, "0"),
  );

  return (
    <div ref={sectionRef} style={{ height: height ?? "300vh" }} className="relative">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <motion.div ref={trackRef} style={{ x }} className="flex w-max items-stretch gap-6 pl-[max(3rem,calc((100vw-76rem)/2+3rem))] pr-[12vw]">
          <div className="flex w-[34rem] shrink-0 flex-col justify-center pr-10">
            <SectionHeading {...HEADING} />
            <p className="mt-10 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">
              Keep scrolling <ArrowRight className="size-4" />
            </p>
          </div>
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} onOpen={() => onOpen(index)} className="w-[27rem]" />
          ))}
          <div className="flex w-[22rem] shrink-0 flex-col justify-center">
            <p className="text-3xl font-medium leading-tight tracking-[-0.03em]">
              More detail lives in the <span className="font-serif font-normal italic text-aurora pr-[0.08em]">résumé.</span>
            </p>
            <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="btn-ghost mt-6 self-start">
              Open résumé <ArrowRight className="size-4" />
            </a>
          </div>
        </motion.div>

        <div className="container-x mt-10 flex items-center gap-6 font-mono text-xs text-fg-muted">
          <span className="tabular-nums">
            <motion.span>{counter}</motion.span> / {String(projects.length).padStart(2, "0")}
          </span>
          <span className="relative h-px flex-1 overflow-hidden bg-line">
            <motion.span style={{ scaleX: scrollYProgress }} className="absolute inset-0 origin-left bg-accent" />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Mobile, tablet and reduced motion: a plain vertical list. */
function StackedList({ onOpen }: ListProps) {
  return (
    <div className="container-x py-24 md:py-32">
      <SectionHeading {...HEADING} />
      <motion.div
        className="mt-12 grid gap-5 md:grid-cols-2"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {projects.map((project, index) => (
          <motion.div key={project.id} variants={fadeUp} transition={{ duration: 0.7, ease: EASE }}>
            <ProjectCard project={project} index={index} onOpen={() => onOpen(index)} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

type CardProps = { project: Project; index: number; onOpen: () => void; className?: string };

function ProjectCard({ project, index, onOpen, className = "" }: CardProps) {
  return (
    <TiltCard max={5} className={`shrink-0 rounded-[1.75rem] ${className}`}>
      <article className="glass spotlight flex h-full min-h-[34rem] flex-col rounded-[1.75rem] p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-fg-faint">{String(index + 1).padStart(2, "0")}</span>
          <span className="rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            {project.metric}
          </span>
        </div>
        <div className="mt-5 aspect-[16/9] w-full rounded-2xl border border-line bg-[var(--well)] p-3">
          <ProjectGlyph id={project.id} />
        </div>
        <h3 className="mt-6 text-2xl font-medium leading-[1.12] tracking-[-0.03em]">{project.title}</h3>
        <p className="mt-3 leading-relaxed text-fg-muted">{project.subtitle}</p>
        <div className="mt-auto pt-6">
          <div className="flex flex-wrap gap-1.5">
            {project.stack.map((item) => (
              <span key={item} className="tag">
                {item}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="group mt-5 flex w-full items-center justify-between rounded-full border border-line-strong py-2 pl-4 pr-2 text-sm transition-colors hover:border-fg hover:bg-tint/[0.06]"
            aria-haspopup="dialog"
          >
            Read the case study
            <span className="grid size-8 place-items-center rounded-full bg-fg text-bg transition-transform duration-500 group-hover:rotate-90">
              <Plus className="size-4" />
            </span>
          </button>
        </div>
      </article>
    </TiltCard>
  );
}
