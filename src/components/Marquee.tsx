import { marqueeItems } from "../data/profile";

/** Slow ticker of the core stack. Duplicated once so the loop never shows a seam. */
export function Marquee() {
  const items = [...marqueeItems, ...marqueeItems];
  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-line bg-bg/40 py-5 backdrop-blur-sm [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <ul className="marquee-track flex w-max gap-12 text-2xl font-medium tracking-[-0.02em] text-fg-muted md:text-3xl">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-center gap-12">
            <span className={i % 3 === 1 ? "font-serif font-normal italic text-fg" : undefined}>{item}</span>
            <span className="size-1.5 rounded-full bg-accent" />
          </li>
        ))}
      </ul>
    </div>
  );
}
