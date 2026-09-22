import type { TitleId } from "../lib/titles";
import { Reveal } from "./Reveal";
import { SplitText } from "./SplitText";
import { TitleAnchor } from "./TitleAnchor";

type Props = {
  index: string;
  eyebrow: string;
  /** Chapter word the 3D scene draws in particles above the heading. */
  titleId: TitleId;
  /** Real heading text; wrap words in *asterisks* for accents. */
  title: string;
  description?: string;
};

export function SectionHeading({ index, eyebrow, titleId, title, description }: Props) {
  return (
    <div>
      <Reveal>
        <p className="eyebrow text-chip flex w-fit items-center gap-3">
          <span className="text-accent">{index}</span>
          <span className="h-px w-10 bg-line-strong" />
          {eyebrow}
        </p>
      </Reveal>
      <TitleAnchor id={titleId} className="mt-4 h-[clamp(4.5rem,12vw,10.5rem)] w-full max-w-4xl" />
      {/* With a description, heading and copy share a card so they stay legible over the beach. */}
      <div className={description ? "text-card mt-3 max-w-3xl" : "mt-3 max-w-3xl"}>
        <h2 className="text-3xl font-medium leading-[1.06] tracking-[-0.03em] sm:text-4xl md:text-5xl">
          <SplitText text={title} stagger={0.045} />
        </h2>
        {description && (
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">{description}</p>
          </Reveal>
        )}
      </div>
    </div>
  );
}
