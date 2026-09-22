import { TITLES, titleFont } from "../lib/titles";
import type { TitleId } from "../lib/titles";

/** Particle target positions for one word, in local units where the word is 1 wide. */
export type WordShape = { positions: Float32Array; aspect: number };
export type TitleAtlas = Record<TitleId, WordShape>;

const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function sampleWord(text: string, font: "serif" | "sans", count: number, random: () => number): WordShape {
  const size = 220;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { positions: new Float32Array(count * 3), aspect: 4 };
  ctx.font = titleFont(font, size);
  const m = ctx.measureText(text);
  const pad = 6;
  canvas.width = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2;
  canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2;
  ctx.font = titleFont(font, size);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, pad + m.actualBoundingBoxLeft, pad + m.actualBoundingBoxAscent);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const points: number[] = [];
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      if (data[(y * canvas.width + x) * 4 + 3] > 128) points.push(x, y);
    }
  }
  const total = points.length / 2;
  // Shuffle so any prefix of the list covers the whole word evenly.
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const w = canvas.width;
  const h = canvas.height;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const k = order[i % Math.max(total, 1)] ?? 0;
    const x = points[k * 2] + (random() - 0.5) * 2;
    const y = points[k * 2 + 1] + (random() - 0.5) * 2;
    positions[i * 3] = (x - w / 2) / w;
    positions[i * 3 + 1] = -(y - h / 2) / w;
    positions[i * 3 + 2] = (random() - 0.5) * 0.02;
  }
  return { positions, aspect: w / h };
}

export async function buildTitleAtlas(count: number): Promise<TitleAtlas> {
  try {
    await Promise.all([
      document.fonts.load(titleFont("serif", 100)),
      document.fonts.load(titleFont("sans", 100)),
    ]);
  } catch {
    // Fallback faces still produce readable shapes.
  }
  const random = seeded(42);
  const atlas = {} as TitleAtlas;
  (Object.keys(TITLES) as TitleId[]).forEach((id) => {
    atlas[id] = sampleWord(TITLES[id].text, TITLES[id].font, count, random);
  });
  return atlas;
}
