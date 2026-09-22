/** Shared motion presets so every animation on the site uses the same feel. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const viewportOnce = { once: true, margin: "0px 0px -12% 0px" } as const;
