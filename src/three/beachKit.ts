import * as THREE from "three";
import { propFragment, propVertex } from "./shaders";

/**
 * Shared pieces of the beach scene: where the shore and sun are, where each prop
 * stands, the sand height, and the lit material every prop, person and animal uses.
 * Kept free of components so Sea.tsx and People.tsx can both import it.
 */

export const SHORE_Z = -24;
export const WATER_Y = -4;

/** Mid-morning sun, ahead and to the right: a clear blue sky and a glitter path on the sea. */
export const SUN_DIR = new THREE.Vector3()
  .setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 17), THREE.MathUtils.degToRad(158))
  .normalize();

/** Direction shadows fall across the sand (away from the sun). */
export const AWAY = new THREE.Vector2(-SUN_DIR.x, -SUN_DIR.z).normalize();

export type DayRef = { current: number };

/* Where things stand on the beach (x, z). Everything tall sits below or beside the
   name in the opening drone shot, and frames the text in the eye-level views. */
export const UMBRELLA = { x: -6.5, z: -16, radius: 1.55, height: 2.35 };
export const BOARD = { x: 10.2, z: -15.6, length: 2.1 };
export const LOUNGERS = [
  { x: -8.1, z: -14.3, yaw: 0.14 },
  { x: -5.9, z: -13.9, yaw: -0.06 },
];
export const COOLER = { x: -4.5, z: -15.2, yaw: 0.4 };
export const TOWEL = { x: -3.3, z: -16.9, angle: 0.35 };
export const BALL = { x: 1.6, z: -17.3, radius: 0.28 };
export const CASTLE = { x: 4.4, z: -17.1 };
export const DRIFTWOOD = { x: 7.6, z: -16.9, yaw: 0.35 };
export const TOWER = { x: -15.5, z: -19.5, yaw: 0.28 };
/** Top of the lifeguard tower's deck, in the tower's own frame. */
export const TOWER_DECK = 2.46;

/** Deterministic PRNG (mulberry32) so geometry is identical between mounts. */
export const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* Ports of the GLSL noise in shaders.ts, so things can sit on the rendered surfaces. */
export const fract = (v: number) => v - Math.floor(v);
export const smoothstepJs = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const hash21 = (x: number, y: number) => {
  let px = fract(x * 233.34);
  let py = fract(y * 851.73);
  const d = px * (px + 23.45) + py * (py + 23.45);
  px += d;
  py += d;
  return fract(px * py);
};
export const vnoise = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy;
};

/** Height of the sand along the slope, ignoring the dunes (matches the old placement of props). */
export const sandY = (z: number) => WATER_Y + (z - SHORE_Z) * 0.07;

/** Height of the rendered sand at (x, z), including the gentle dunes up the beach (see beachVertex). */
export const beachHeight = (x: number, z: number) => {
  const above = Math.max(z - SHORE_Z, 0);
  return WATER_Y + (z - SHORE_Z) * 0.07 + vnoise(x * 0.05, z * 0.05) * 0.5 * smoothstepJs(4, 20, above);
};

/* The surf model, ported from surfVertex so people and boards ride the rendered swell. */
/** Must match SURF_RANGE in shaders.ts. */
export const SURF_RANGE = 72;
const SURF_SPEED = 5.5;
const SURF_SPACING = 24;
const glslMod = (a: number, b: number) => a - b * Math.floor(a / b);
const surfAmplitude = (d: number) => 1.25 * smoothstepJs(SURF_RANGE, 42, d) * smoothstepJs(2.5, 15, d);
const surfBend = (x: number) => Math.sin(x * 0.07 + 1.3) * 3.5 + (vnoise(x * 0.045, 3) - 0.5) * 11;

/** Height of the surf surface and its tallest crest at distance D from the shore. */
function surfAt(x: number, D: number, t: number) {
  const bend = surfBend(x) * smoothstepJs(SURF_RANGE, 20, D);
  let h = 0;
  let crest = 0;
  for (let k = 0; k < 3; k++) {
    const life = glslMod(k * SURF_SPACING - t * SURF_SPEED, SURF_RANGE);
    const lifeFade = smoothstepJs(0, 8, life) * smoothstepJs(SURF_RANGE, SURF_RANGE - 8, life);
    const center = life + bend;
    const dd = D - center;
    const width = dd < 0 ? 1.5 : 5.5;
    const shape = Math.exp(-(dd * dd) / (width * width));
    const a = surfAmplitude(center) * lifeFade;
    h += a * shape;
    crest = Math.max(crest, shape * a);
  }
  return { h, crest };
}

/**
 * Rendered surf height above its rest level (-3.97) at x and distance D from the shore,
 * allowing for the crest leaning shoreward in surfVertex.
 */
export function surfHeight(x: number, D: number, t: number) {
  const guess = surfAt(x, D, t);
  return surfAt(x, D + guess.crest * 0.55, t).h;
}

export type PropLook = {
  color: [number, number, number];
  color2?: [number, number, number];
  pattern?: number;
  stripes?: number;
  shine?: number;
  /** Cloth ripple: amplitude, wavenumber, speed, axis (0 flag along +x, 1 tail along -y). */
  flutter?: [number, number, number, number];
};

/** Uniforms for propVertex/propFragment. */
export const propUniforms = (look: PropLook) => ({
  uColor: { value: new THREE.Vector3(...look.color) },
  uColor2: { value: new THREE.Vector3(...(look.color2 ?? look.color)) },
  uPattern: { value: look.pattern ?? 0 },
  uStripes: { value: look.stripes ?? 8 },
  uShine: { value: look.shine ?? 0.15 },
  uOpacity: { value: 0 },
  uSunDir: { value: SUN_DIR.clone() },
  uTime: { value: 0 },
  uFlutter: { value: new THREE.Vector4(...(look.flutter ?? [0, 0, 0, 0])) },
});

/** A standalone lit material, for rigs built imperatively (people, animals). */
export const propMaterial = (look: PropLook) =>
  new THREE.ShaderMaterial({
    uniforms: propUniforms(look),
    vertexShader: propVertex,
    fragmentShader: propFragment,
    transparent: true,
  });
