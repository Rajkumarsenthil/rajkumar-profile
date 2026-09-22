/** Chapter words drawn as glowing particles in the 3D scene, keyed by their page anchor. */
export const TITLES = {
  hero: { text: "Rajkumar S", font: "sans" },
  work: { text: "Work", font: "serif" },
  experience: { text: "Experience", font: "serif" },
  skills: { text: "Toolkit", font: "serif" },
  about: { text: "About", font: "serif" },
  contact: { text: "Let's talk", font: "serif" },
} as const satisfies Record<string, { text: string; font: "serif" | "sans" }>;

export type TitleId = keyof typeof TITLES;

export const titleFont = (font: "serif" | "sans", size: number) =>
  font === "serif" ? `italic 400 ${size}px "Instrument Serif"` : `700 ${size}px "Geist Variable"`;
