import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { Project } from "../data/profile";
import { lockScroll, unlockScroll } from "../lib/scroll";
import { ProjectGlyph } from "./ProjectGlyph";

type Props = {
  project: Project | null;
  index: number;
  total: number;
  onClose: () => void;
  /** Move to the previous (-1) or next (+1) case study without closing. */
  onStep: (delta: number) => void;
  nextTitle: string;
};

/** Native modal dialog with the full case study. Esc, the backdrop and the Close buttons all close it. */
export function ProjectDialog({ project, index, total, onClose, onStep, nextTitle }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const isOpen = project !== null;
  const projectId = project?.id;

  // Open and close follow `isOpen` only, so stepping between projects keeps the dialog open.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !isOpen) return;
    if (!dialog.open) dialog.showModal();
    lockScroll();
    return () => {
      unlockScroll();
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") onStep(1);
      if (event.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onStep]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className="project-dialog"
      aria-labelledby="project-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the dimmed backdrop lands on the <dialog> element itself.
        if (event.target === ref.current) close();
      }}
    >
      {project && (
        <div className="flex max-h-[inherit] flex-col">
          <div ref={scroller} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="relative border-b border-line">
              <div className="aspect-[16/7] w-full bg-tint/[0.03] p-6 sm:p-10">
                <ProjectGlyph id={project.id} />
              </div>
              <button
                type="button"
                onClick={close}
                className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-line-strong bg-bg/70 backdrop-blur transition-colors hover:border-fg hover:bg-tint/[0.1]"
                aria-label="Close project details"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6 sm:p-10">
              <p className="eyebrow flex flex-wrap items-center gap-3">
                <span className="text-accent">
                  {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                </span>
                <span className="h-px w-8 bg-line-strong" />
                {project.metric}
              </p>
              <h3 id="project-dialog-title" className="mt-4 text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl">
                {project.title}
              </h3>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg-muted">{project.subtitle}</p>
              <div className="mt-6 flex flex-wrap gap-1.5">
                {project.stack.map((item) => (
                  <span key={item} className="tag">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-10 grid gap-8">
                <section>
                  <h4 className="eyebrow text-accent">The problem</h4>
                  <p className="mt-3 text-lg leading-relaxed">{project.challenge}</p>
                </section>
                <section>
                  <h4 className="eyebrow text-accent">What I did</h4>
                  <ul className="mt-4 grid gap-3">
                    {project.approach.map((step, i) => (
                      <li
                        key={step}
                        className="flex gap-4 rounded-2xl border border-line bg-tint/[0.03] p-5 leading-relaxed text-fg-muted transition-colors duration-300 hover:border-line-strong hover:bg-tint/[0.06] hover:text-fg"
                      >
                        <span className="font-mono text-xs text-fg-faint">{String(i + 1).padStart(2, "0")}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-2xl border border-accent/30 bg-accent-soft p-5">
                  <h4 className="eyebrow text-accent">The result</h4>
                  <p className="mt-3 text-lg leading-relaxed">{project.outcome}</p>
                </section>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-bg/60 px-4 py-3 backdrop-blur sm:px-6">
            <button
              type="button"
              onClick={() => onStep(-1)}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-tint/[0.08] hover:text-fg"
            >
              <ArrowLeft className="size-4" /> Previous
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-line-strong px-4 py-2 text-sm transition-colors hover:border-fg hover:bg-tint/[0.08]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              className="inline-flex max-w-[45%] items-center gap-2 rounded-full px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-tint/[0.08] hover:text-fg"
            >
              <span className="truncate">
                <span className="hidden sm:inline">Next: </span>
                {nextTitle}
              </span>
              <ArrowRight className="size-4 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
