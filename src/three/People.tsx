import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  AWAY,
  CASTLE,
  LOUNGERS,
  TOWEL,
  TOWER,
  TOWER_DECK,
  SHORE_Z,
  beachHeight,
  propMaterial,
  sandY,
  seeded,
  surfHeight,
} from "./beachKit";
import type { DayRef, PropLook } from "./beachKit";
import { NO_REFLECTION } from "./layers";
import { contactFragment, contactVertex } from "./shaders";

/**
 * People and puppies on the beach. Each figure is a small rig of rounded parts
 * with real proportions, animated procedurally: walk and run cycles with arm
 * swing and hip sway, breathing and weight shifts at rest, and a fetch game where
 * a puppy gallops after a thrown ball and trots it back while a second one bounds
 * alongside. Soft contact shadows ground everyone on the sand.
 */

type Vec3 = [number, number, number];

/* ------------------------------------------------------------------ building blocks */

/** Materials shared by colour, so a whole crowd costs a handful of programs' uniforms. */
class Wardrobe {
  private cache = new Map<string, THREE.ShaderMaterial>();
  get(look: PropLook) {
    const key = JSON.stringify(look);
    let material = this.cache.get(key);
    if (!material) {
      material = propMaterial(look);
      this.cache.set(key, material);
    }
    return material;
  }
  all() {
    return [...this.cache.values()];
  }
  dispose() {
    this.cache.forEach((m) => m.dispose());
  }
}

/** Geometry cache: one sphere and a capsule per distinct size. */
class Parts {
  sphere = new THREE.SphereGeometry(1, 18, 12);
  box = new THREE.BoxGeometry(1, 1, 1);
  plane = (() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  })();
  private capsules = new Map<string, THREE.CapsuleGeometry>();
  capsule(radius: number, length: number) {
    const key = `${radius.toFixed(3)}:${length.toFixed(3)}`;
    let g = this.capsules.get(key);
    if (!g) {
      g = new THREE.CapsuleGeometry(radius, length, 5, 12);
      this.capsules.set(key, g);
    }
    return g;
  }
  dispose() {
    this.sphere.dispose();
    this.box.dispose();
    this.plane.dispose();
    this.capsules.forEach((g) => g.dispose());
  }
}

function joint(parent: THREE.Object3D, at: Vec3) {
  const g = new THREE.Group();
  g.position.set(...at);
  parent.add(g);
  return g;
}

function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: Vec3, scale?: Vec3, rotation?: Vec3) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...at);
  if (scale) m.scale.set(...scale);
  if (rotation) m.rotation.set(...rotation);
  // Drawn normally but kept out of the sea's reflection pass.
  m.layers.set(NO_REFLECTION);
  parent.add(m);
  return m;
}

/* ------------------------------------------------------------------ people */

type Garment = { color: Vec3; kind: "tee" | "tank" | "bikini" | "sports" };
type Bottom = { color: Vec3; kind: "trunks" | "shorts" | "bikini" };

type HumanSpec = {
  build: "man" | "woman" | "child";
  height: number;
  skin: Vec3;
  hair: Vec3;
  hairStyle: "short" | "long" | "ponytail" | "cropped";
  top?: Garment;
  bottom: Bottom;
};

type Human = {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  chestMesh: THREE.Mesh;
  neck: THREE.Group;
  head: THREE.Group;
  hip: [THREE.Group, THREE.Group];
  knee: [THREE.Group, THREE.Group];
  ankle: [THREE.Group, THREE.Group];
  shoulder: [THREE.Group, THREE.Group];
  elbow: [THREE.Group, THREE.Group];
  wrist: [THREE.Group, THREE.Group];
  ponytail?: THREE.Group;
  /** Pelvis height standing, in the rig's own (unscaled) units. */
  restY: number;
  scale: number;
};

/** Index 0 is the figure's left (+x when it faces +z), 1 its right. */
const SIDES = [1, -1] as const;
const PELVIS_Y = 0.955;

function buildHuman(spec: HumanSpec, wardrobe: Wardrobe, parts: Parts): Human {
  const woman = spec.build === "woman";
  const child = spec.build === "child";
  const skin = wardrobe.get({ color: spec.skin, pattern: 11, shine: 0.14 });
  const hair = wardrobe.get({ color: spec.hair, pattern: 12, shine: 0.3 });
  const bottom = wardrobe.get({ color: spec.bottom.color, pattern: 13, shine: 0.06 });
  const covered = spec.top && spec.top.kind !== "bikini";
  const top = spec.top ? wardrobe.get({ color: spec.top.color, pattern: 13, shine: 0.06 }) : skin;
  const torso = covered ? top : skin;

  const root = new THREE.Group();
  const pelvis = joint(root, [0, PELVIS_Y, 0]);
  part(pelvis, parts.sphere, bottom, [0, -0.01, 0], [woman ? 0.158 : 0.15, 0.108, 0.104]);

  // Spine, abdomen and chest.
  const spine = joint(pelvis, [0, 0.05, 0]);
  part(spine, parts.sphere, spec.top?.kind === "tee" || spec.top?.kind === "tank" ? top : skin, [0, 0.11, 0.004], [woman ? 0.12 : 0.132, 0.15, 0.094]);
  const chest = joint(spine, [0, 0.2, 0]);
  const chestMesh = part(chest, parts.sphere, torso, [0, 0.12, 0], [woman ? 0.148 : 0.168, 0.17, 0.112]);
  if (woman) {
    const cover = spec.top ? top : skin;
    SIDES.forEach((s) => part(chest, parts.sphere, cover, [s * 0.056, 0.1, 0.07], [0.058, 0.055, 0.05]));
  }
  if (spec.top?.kind === "bikini" || spec.top?.kind === "sports") {
    part(chest, parts.sphere, top, [0, 0.11, 0.004], [woman ? 0.152 : 0.17, spec.top.kind === "sports" ? 0.07 : 0.05, 0.115]);
  }

  // Neck and head.
  const neck = joint(chest, [0, 0.3, 0]);
  part(neck, parts.capsule(0.045, 0.05), skin, [0, 0.035, 0]);
  const head = joint(neck, [0, 0.085, 0]);
  const hs = child ? 1.22 : woman ? 0.96 : 1;
  const face = joint(head, [0, 0, 0]);
  face.scale.setScalar(hs);
  part(face, parts.sphere, skin, [0, 0.1, 0.012], [0.09, 0.112, 0.1]);
  part(face, parts.sphere, skin, [0, 0.085, 0.106], [0.017, 0.024, 0.02]);
  SIDES.forEach((s) => part(face, parts.sphere, skin, [s * 0.09, 0.095, 0], [0.016, 0.028, 0.012]));
  if (spec.hairStyle !== "cropped") part(face, parts.sphere, hair, [0, 0.135, -0.012], [0.096, 0.094, 0.104]);
  else part(face, parts.sphere, hair, [0, 0.145, -0.01], [0.093, 0.08, 0.1]);
  if (spec.hairStyle === "long") part(face, parts.sphere, hair, [0, 0.035, -0.066], [0.094, 0.16, 0.042]);
  let ponytail: THREE.Group | undefined;
  if (spec.hairStyle === "ponytail") {
    ponytail = joint(face, [0, 0.14, -0.095]);
    part(ponytail, parts.capsule(0.028, 0.14), hair, [0, -0.09, -0.01]);
  }

  // Arms.
  const shoulderW = woman ? 0.163 : child ? 0.17 : 0.187;
  const armR = woman ? 0.04 : 0.047;
  const shoulder = SIDES.map((s) => joint(chest, [s * shoulderW, 0.225, 0])) as [THREE.Group, THREE.Group];
  const elbow = shoulder.map((sh) => {
    part(sh, parts.sphere, spec.top?.kind === "tee" ? top : skin, [0, -0.01, 0], [0.056, 0.052, 0.054]);
    part(sh, parts.capsule(armR, 0.22), skin, [0, -0.15, 0]);
    if (spec.top?.kind === "tee") part(sh, parts.capsule(armR + 0.012, 0.07), top, [0, -0.065, 0]);
    const el = joint(sh, [0, -0.3, 0]);
    // A rounded cap over the joint so the arm reads as one limb, not two parts.
    part(el, parts.sphere, skin, [0, 0, 0], [armR * 0.92, armR * 0.92, armR * 0.92]);
    return el;
  }) as [THREE.Group, THREE.Group];
  const wrist = elbow.map((el) => {
    part(el, parts.capsule(armR * 0.8, 0.19), skin, [0, -0.125, 0]);
    const w = joint(el, [0, -0.26, 0]);
    part(w, parts.sphere, skin, [0, -0.055, 0.004], [0.032, 0.068, 0.022]);
    return w;
  }) as [THREE.Group, THREE.Group];

  // Legs.
  const legR = woman ? 0.079 : 0.075;
  const hip = SIDES.map((s) => joint(pelvis, [s * (woman ? 0.088 : 0.084), -0.04, 0])) as [THREE.Group, THREE.Group];
  const knee = hip.map((h) => {
    part(h, parts.capsule(legR, 0.33), skin, [0, -0.215, 0]);
    const cover = spec.bottom.kind === "shorts" ? 0.24 : spec.bottom.kind === "trunks" ? 0.12 : 0;
    if (cover > 0) part(h, parts.capsule(legR + 0.012, cover), bottom, [0, -0.04 - cover / 2, 0]);
    const k = joint(h, [0, -0.43, 0]);
    part(k, parts.sphere, skin, [0, 0, 0.004], [legR * 0.78, legR * 0.8, legR * 0.8]);
    return k;
  }) as [THREE.Group, THREE.Group];
  const ankle = knee.map((k) => {
    part(k, parts.capsule(legR * 0.68, 0.33), skin, [0, -0.2, 0]);
    // Calf: a little fuller at the back, just below the knee.
    part(k, parts.sphere, skin, [0, -0.13, -0.012], [legR * 0.76, 0.12, legR * 0.8]);
    const a = joint(k, [0, -0.42, 0]);
    part(a, parts.capsule(0.032, 0.14), skin, [0, -0.035, 0.05], undefined, [Math.PI / 2, 0, 0]);
    return a;
  }) as [THREE.Group, THREE.Group];

  root.scale.setScalar(spec.height / 1.81);
  return { root, pelvis, spine, chest, chestMesh, neck, head, hip, knee, ankle, shoulder, elbow, wrist, ponytail, restY: PELVIS_Y, scale: spec.height / 1.81 };
}

/** Back to a neutral standing pose before a pose function layers its angles on. */
function rest(h: Human) {
  h.pelvis.position.set(0, h.restY, 0);
  h.pelvis.rotation.set(0, 0, 0);
  for (const j of [h.spine, h.chest, h.neck, h.head, ...h.hip, ...h.knee, ...h.ankle, ...h.shoulder, ...h.elbow, ...h.wrist]) j.rotation.set(0, 0, 0);
  h.chestMesh.scale.y = 0.17;
  h.ponytail?.rotation.set(0.25, 0, 0);
}

/* Sign conventions (figure faces +z): limbs swing forward with negative x rotation,
   knees bend with positive x, the spine bends forward with positive x. */

function breathe(h: Human, t: number, seed: number) {
  h.chestMesh.scale.y = 0.17 * (1 + 0.018 * Math.sin(t * 1.5 + seed));
}

function stand(h: Human, t: number, seed: number) {
  const sway = Math.sin(t * 0.55 + seed);
  h.pelvis.position.x = 0.018 * sway;
  h.pelvis.rotation.z = 0.035 * sway;
  h.hip[0].rotation.z = -0.035 * sway;
  h.hip[1].rotation.z = -0.035 * sway;
  h.spine.rotation.z = -0.03 * sway;
  h.knee[sway > 0 ? 1 : 0].rotation.x = 0.08 * Math.abs(sway);
  SIDES.forEach((s, i) => {
    h.shoulder[i].rotation.set(0.04, 0, s * 0.07);
    h.elbow[i].rotation.x = -0.14;
  });
  h.head.rotation.y = 0.35 * Math.sin(t * 0.21 + seed * 1.7);
  breathe(h, t, seed);
}

function handsOnHips(h: Human) {
  SIDES.forEach((s, i) => {
    h.shoulder[i].rotation.set(0.25, 0, s * 0.62);
    h.elbow[i].rotation.set(-1.65, 0, 0);
    h.wrist[i].rotation.set(0, 0, -s * 0.4);
  });
}

/** A relaxed walk: amount 0..1 fades between standing and a full stride. */
function walk(h: Human, phase: number, amount: number) {
  const a = amount;
  SIDES.forEach((_, i) => {
    const p = phase + i * Math.PI;
    const swing = Math.sin(p);
    const hip = -0.42 * swing * a;
    const knee = (0.06 + 0.95 * Math.pow(Math.max(0, Math.cos(p)), 2)) * a;
    h.hip[i].rotation.x = hip;
    h.knee[i].rotation.x = knee;
    h.ankle[i].rotation.x = -(hip + knee) * 0.85 + 0.25 * Math.max(0, -Math.cos(p)) * a;
    h.shoulder[i].rotation.x = 0.32 * swing * a;
    h.elbow[i].rotation.x = -(0.2 + 0.25 * Math.max(0, -swing)) * a - 0.1;
  });
  h.pelvis.position.y = h.restY - 0.028 * Math.abs(Math.sin(phase)) * a + 0.01 * a;
  h.pelvis.rotation.y = 0.09 * Math.sin(phase) * a;
  h.pelvis.rotation.z = 0.04 * Math.cos(phase) * a;
  h.chest.rotation.y = -0.15 * Math.sin(phase) * a;
  h.spine.rotation.x = 0.05 * a;
  h.head.rotation.y = 0;
}

/** An easy jog, leaning in, arms bent and pumping. */
function run(h: Human, phase: number, amount: number) {
  const a = amount;
  SIDES.forEach((_, i) => {
    const p = phase + i * Math.PI;
    const swing = Math.sin(p);
    const hip = (-0.62 * swing - 0.12) * a;
    const knee = (0.35 + 1.45 * Math.pow(Math.max(0, Math.cos(p + 0.35)), 1.5)) * a;
    h.hip[i].rotation.x = hip;
    h.knee[i].rotation.x = knee;
    h.ankle[i].rotation.x = -(hip + knee) * 0.7;
    h.shoulder[i].rotation.set(0.62 * swing * a, 0, SIDES[i] * 0.12);
    h.elbow[i].rotation.x = -1.45 * a;
  });
  h.pelvis.position.y = h.restY - 0.05 + 0.055 * Math.abs(Math.cos(phase)) * a;
  h.pelvis.rotation.y = 0.12 * Math.sin(phase) * a;
  h.chest.rotation.y = -0.2 * Math.sin(phase) * a;
  h.spine.rotation.x = 0.17 * a;
  if (h.ponytail) h.ponytail.rotation.set(0.5 + 0.35 * Math.abs(Math.sin(phase)), 0, 0.3 * Math.sin(phase));
}

/** Lying back on a lounger: the torso follows the backrest, legs along the seat. */
function recline(h: Human, t: number, seed: number, variant: "reading" | "hands-behind") {
  h.pelvis.rotation.x = -0.67;
  h.hip[0].rotation.x = -0.92;
  h.hip[1].rotation.x = -0.92;
  h.ankle[0].rotation.x = 0.5;
  h.ankle[1].rotation.x = 0.5;
  h.neck.rotation.x = 0.35;
  h.head.rotation.y = 0.18 * Math.sin(t * 0.15 + seed);
  if (variant === "reading") {
    // One knee up, a book held over the chest, the other arm behind the head.
    h.hip[0].rotation.x = -1.45;
    h.knee[0].rotation.x = 1.25;
    h.ankle[0].rotation.x = 0.05;
    h.shoulder[0].rotation.set(-2.7, 0, 0.45);
    h.elbow[0].rotation.x = -2.1;
    h.shoulder[1].rotation.set(-1.05, 0, -0.2);
    h.elbow[1].rotation.x = -1.35 + 0.05 * Math.sin(t * 0.4);
    h.wrist[1].rotation.x = -0.4;
    h.neck.rotation.x = 0.55;
  } else {
    // Hands behind the head; every so often a knee comes up for a while.
    SIDES.forEach((s, i) => {
      h.shoulder[i].rotation.set(-2.75, 0, s * 0.62);
      h.elbow[i].rotation.x = -2.3;
    });
    const knee = THREE.MathUtils.smoothstep(Math.sin(t * 0.09 + seed), 0.2, 0.7);
    h.hip[1].rotation.x = -0.92 - 0.5 * knee;
    h.knee[1].rotation.x = 1.1 * knee;
    h.ankle[1].rotation.x = 0.5 - 0.45 * knee;
  }
  breathe(h, t, seed);
}

/** Face down on a towel, head turned on folded arms, lower legs idly swinging. */
function prone(h: Human, t: number) {
  h.pelvis.position.y = 0.13;
  h.pelvis.rotation.x = Math.PI / 2;
  SIDES.forEach((s, i) => {
    h.knee[i].rotation.x = 0.15 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.1 + i * Math.PI));
    h.ankle[i].rotation.x = 0.8;
    h.shoulder[i].rotation.set(-2.35, 0, s * 0.62);
    h.elbow[i].rotation.x = -1.95;
  });
  h.neck.rotation.set(-0.35, 0, 0);
  h.head.rotation.set(0, 0.95, 0);
  breathe(h, t, 0);
}

/** Kneeling in the sand, leaning over the castle and patting it into shape. */
function kneelAndPat(h: Human, t: number) {
  h.pelvis.position.y = 0.47;
  h.hip[0].rotation.x = -0.12;
  h.hip[1].rotation.x = -0.05;
  h.knee[0].rotation.x = 1.55;
  h.knee[1].rotation.x = 1.5;
  h.ankle[0].rotation.x = 0.55;
  h.ankle[1].rotation.x = 0.55;
  h.spine.rotation.x = 0.42;
  h.chest.rotation.x = 0.12;
  h.head.rotation.x = 0.35;
  const pat = Math.max(0, Math.sin(t * 6.5));
  h.shoulder[1].rotation.set(-1.05 - 0.28 * pat, 0, -0.15);
  h.elbow[1].rotation.x = -0.55 + 0.25 * pat;
  h.shoulder[0].rotation.set(-0.55, 0, 0.12);
  h.elbow[0].rotation.x = -0.5;
  breathe(h, t, 2);
}

/** Head-up breaststroke: body angled into the water, head and shoulders above it. */
function swim(h: Human, t: number, seed: number) {
  h.pelvis.rotation.x = 1.05;
  h.neck.rotation.x = -0.75;
  h.head.rotation.x = -0.25;
  const stroke = Math.sin(t * 1.9 + seed);
  SIDES.forEach((s, i) => {
    h.shoulder[i].rotation.set(-2.2 + 0.5 * stroke, 0, s * (0.5 + 0.35 * stroke));
    h.elbow[i].rotation.x = -0.4 - 0.4 * Math.max(0, -stroke);
    h.hip[i].rotation.set(-0.2 + 0.3 * stroke, 0, s * 0.25 * (1 + stroke));
    h.knee[i].rotation.x = 0.6 + 0.6 * stroke;
  });
}

/**
 * Squatting down to pick something up: knees bend, hips drop and sit back so the feet
 * stay planted, the back folds forward and the right arm reaches for the sand.
 * v runs 0 (standing) to 1 (down).
 */
function crouch(h: Human, v: number) {
  SIDES.forEach((_, i) => {
    h.hip[i].rotation.x += -1.25 * v;
    h.knee[i].rotation.x += 1.9 * v;
    h.ankle[i].rotation.x += -0.65 * v;
  });
  h.pelvis.position.y -= 0.371 * v;
  h.pelvis.position.z -= 0.154 * v;
  h.spine.rotation.x += 1.2 * v;
  h.chest.rotation.x += 0.3 * v;
  h.neck.rotation.x += -0.45 * v;
  h.shoulder[1].rotation.x = h.shoulder[1].rotation.x * (1 - v) - 1.6 * v;
  h.elbow[1].rotation.x = h.elbow[1].rotation.x * (1 - v) - 0.15 * v;
  h.shoulder[0].rotation.x = h.shoulder[0].rotation.x * (1 - v) - 1.0 * v;
  h.elbow[0].rotation.x = h.elbow[0].rotation.x * (1 - v) - 0.6 * v;
}

/** Keyframed channel: smooth interpolation through [time, value] pairs. */
function keys(u: number, frames: Array<[number, number]>) {
  if (u <= frames[0][0]) return frames[0][1];
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, v0] = frames[i];
    const [t1, v1] = frames[i + 1];
    if (u <= t1) {
      const k = (u - t0) / Math.max(1e-6, t1 - t0);
      return v0 + (v1 - v0) * k * k * (3 - 2 * k);
    }
  }
  return frames[frames.length - 1][1];
}

/* ------------------------------------------------------------------ puppies */

type Puppy = {
  root: THREE.Group;
  body: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  ears: [THREE.Group, THREE.Group];
  tail: THREE.Group;
  upper: [THREE.Group, THREE.Group, THREE.Group, THREE.Group]; // front L, front R, back L, back R
  lower: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
};

type PuppyCoat = { coat: Vec3; ears: Vec3; belly: Vec3; legs: Vec3 };

function buildPuppy(coat: PuppyCoat, size: number, wardrobe: Wardrobe, parts: Parts): Puppy {
  const fur = wardrobe.get({ color: coat.coat, pattern: 12, shine: 0.12 });
  const ear = wardrobe.get({ color: coat.ears, pattern: 12, shine: 0.1 });
  const belly = wardrobe.get({ color: coat.belly, pattern: 12, shine: 0.1 });
  const leg = wardrobe.get({ color: coat.legs, pattern: 12, shine: 0.1 });
  const dark = wardrobe.get({ color: [0.03, 0.025, 0.02], shine: 0.9 });

  const root = new THREE.Group();
  const body = joint(root, [0, 0.25, 0]);
  part(body, parts.capsule(0.075, 0.2), fur, [0, 0, 0], undefined, [Math.PI / 2, 0, 0]);
  part(body, parts.sphere, belly, [0, -0.02, 0.1], [0.078, 0.085, 0.088]);
  part(body, parts.sphere, fur, [0, 0.012, 0.095], [0.074, 0.08, 0.085]);
  part(body, parts.sphere, fur, [0, 0.008, -0.105], [0.078, 0.082, 0.085]);

  const neck = joint(body, [0, 0.04, 0.155]);
  part(neck, parts.capsule(0.043, 0.05), fur, [0, 0.03, 0.01], undefined, [-0.6, 0, 0]);
  const head = joint(neck, [0, 0.075, 0.035]);
  part(head, parts.sphere, fur, [0, 0.02, 0], [0.064, 0.058, 0.066]);
  part(head, parts.capsule(0.029, 0.04), belly, [0, -0.004, 0.068], undefined, [Math.PI / 2, 0, 0]);
  part(head, parts.sphere, dark, [0, 0.006, 0.112], [0.015, 0.012, 0.012]);
  SIDES.forEach((s) => part(head, parts.sphere, dark, [s * 0.03, 0.032, 0.052], [0.009, 0.009, 0.006]));
  const ears = SIDES.map((s) => {
    const e = joint(head, [s * 0.05, 0.038, -0.004]);
    part(e, parts.sphere, ear, [s * 0.012, -0.038, 0], [0.018, 0.048, 0.034]);
    return e;
  }) as [THREE.Group, THREE.Group];

  const tail = joint(body, [0, 0.045, -0.17]);
  part(tail, parts.capsule(0.015, 0.09), fur, [0, 0.055, 0]);

  const anchors: Vec3[] = [
    [0.048, -0.02, 0.105],
    [-0.048, -0.02, 0.105],
    [0.048, -0.01, -0.105],
    [-0.048, -0.01, -0.105],
  ];
  const upper = anchors.map((at) => {
    const u = joint(body, at);
    part(u, parts.capsule(0.027, 0.06), at[2] > 0 ? fur : fur, [0, -0.055, 0]);
    return u;
  }) as Puppy["upper"];
  const lower = upper.map((u) => {
    const l = joint(u, [0, -0.11, 0]);
    part(l, parts.capsule(0.021, 0.06), leg, [0, -0.05, 0]);
    part(l, parts.sphere, leg, [0, -0.107, 0.01], [0.024, 0.017, 0.03]);
    return l;
  }) as Puppy["lower"];

  root.scale.setScalar(size);
  return { root, body, neck, head, ears, tail, upper, lower };
}

function puppyRest(p: Puppy) {
  p.body.position.set(0, 0.25, 0);
  p.body.rotation.set(0, 0, 0);
  p.neck.rotation.set(0, 0, 0);
  p.head.rotation.set(0, 0, 0);
  p.ears.forEach((e) => e.rotation.set(0, 0, 0));
  p.tail.rotation.set(-0.6, 0, 0);
  p.upper.forEach((u) => u.rotation.set(0, 0, 0));
  p.lower.forEach((l) => l.rotation.set(0, 0, 0));
}

/** Legs stay under the body when it pitches. */
function levelLegs(p: Puppy) {
  p.upper.forEach((u) => (u.rotation.x -= p.body.rotation.x));
}

function gallop(p: Puppy, phase: number, amount: number) {
  const a = amount;
  const offsets = [0, -0.55, Math.PI - 0.25, Math.PI - 0.8];
  offsets.forEach((o, i) => {
    const s = Math.sin(phase + o);
    const front = i < 2;
    p.upper[i].rotation.x = (front ? -0.8 : -0.75) * s * a;
    p.lower[i].rotation.x = (front ? 1.0 : 0.9) * Math.max(0, Math.cos(phase + o + (front ? 0.6 : -0.4))) * a;
  });
  p.body.rotation.x = 0.13 * Math.sin(phase + Math.PI / 2) * a;
  p.body.position.y = 0.25 + 0.035 * Math.abs(Math.sin(phase)) * a;
  p.neck.rotation.x = -p.body.rotation.x * 0.8 + 0.12 * a;
  p.ears.forEach((e, i) => e.rotation.set(-0.55 * a * (0.6 + 0.4 * Math.sin(phase * 2 + i)), 0, 0));
  p.tail.rotation.set(-1.25 * a - 0.6 * (1 - a), 0, 0.3 * Math.sin(phase * 2));
  levelLegs(p);
}

function trot(p: Puppy, phase: number, amount: number) {
  const a = amount;
  [0, Math.PI, Math.PI, 0].forEach((o, i) => {
    const s = Math.sin(phase + o);
    p.upper[i].rotation.x = -0.45 * s * a;
    p.lower[i].rotation.x = 0.65 * Math.max(0, Math.cos(phase + o)) * a;
  });
  p.body.position.y = 0.25 + 0.012 * Math.abs(Math.cos(phase)) * a;
  p.neck.rotation.x = -0.15 * a;
  p.tail.rotation.set(-0.8, 0, 0.45 * Math.sin(phase * 1.5));
}

function playBow(p: Puppy, t: number) {
  p.body.rotation.x = 0.36;
  p.body.position.y = 0.19 + 0.025 * Math.max(0, Math.sin(t * 5.5));
  p.upper[0].rotation.x = -0.95;
  p.upper[1].rotation.x = -0.85;
  p.upper[2].rotation.x = 0.36 - 0.36;
  p.upper[3].rotation.x = 0.36 - 0.36;
  levelLegs(p);
  p.upper[0].rotation.x -= 0.55;
  p.upper[1].rotation.x -= 0.5;
  p.neck.rotation.x = -0.75;
  p.head.rotation.z = 0.2 * Math.sin(t * 1.3);
  p.tail.rotation.set(-0.15, 0, 0.75 * Math.sin(t * 15));
  p.ears.forEach((e) => e.rotation.set(-0.15, 0, 0));
}

function sniffDown(p: Puppy, amount: number) {
  p.neck.rotation.x += 0.95 * amount;
  p.head.rotation.x += 0.35 * amount;
}

/* ------------------------------------------------------------------ cast & choreography */

const SKIN = {
  fair: [0.8, 0.57, 0.44] as Vec3,
  tan: [0.64, 0.42, 0.29] as Vec3,
  brown: [0.44, 0.27, 0.17] as Vec3,
  deep: [0.25, 0.15, 0.1] as Vec3,
};

const HAIR = {
  black: [0.035, 0.03, 0.028] as Vec3,
  brown: [0.2, 0.12, 0.06] as Vec3,
  blonde: [0.72, 0.55, 0.3] as Vec3,
  auburn: [0.36, 0.13, 0.06] as Vec3,
};

const THROWER = { x: -1.4, z: -19.5, heading: Math.PI / 2 - 0.12 };
/** Where the right hand holds the ball, in the wrist's frame. */
const GRIP: Vec3 = [0, -0.08, 0.03];
const FETCH_CYCLE = 9.6;
const WALK_LANE = { z: -22.7, from: -12, to: 10, speed: 1.05 };
const JOG_LANE = { z: -21.9, from: -22, to: 22, speed: 3.0 };

type Mover = { x: number; dir: number; heading: number; phase: number; speed: number };

/** Walks or runs back and forth along x, easing to a stop and turning at each end. */
function stepMover(m: Mover, lane: { from: number; to: number; speed: number }, dt: number, stride: number) {
  if ((m.dir > 0 && m.x >= lane.to) || (m.dir < 0 && m.x <= lane.from)) m.dir = -m.dir;
  const targetHeading = m.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  const turning = Math.abs(m.heading - targetHeading);
  m.heading = THREE.MathUtils.damp(m.heading, targetHeading, 2.6, dt);
  // Slow right down while turning round, then pick the pace back up.
  const pace = lane.speed * THREE.MathUtils.clamp(1 - turning / 1.6, 0.15, 1);
  m.speed = THREE.MathUtils.damp(m.speed, pace, 3, dt);
  m.x += Math.sin(m.heading) * m.speed * dt;
  m.phase += (m.speed / stride) * Math.PI * 2 * dt;
}

type Shadow = { x: number; z: number; width: number; length: number; angle: number };

export function People({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const cast = useMemo(() => {
    const wardrobe = new Wardrobe();
    const parts = new Parts();
    const group = new THREE.Group();
    const place = (h: Human | Puppy, parent: THREE.Object3D = group) => {
      parent.add(h.root);
      return h;
    };

    // Sunbathers on the loungers, in each lounger's own frame (head end towards the land).
    const loungerFrames = LOUNGERS.map((l) => {
      const f = new THREE.Group();
      f.position.set(l.x, sandY(l.z) - 0.02, l.z);
      f.rotation.y = l.yaw;
      group.add(f);
      return f;
    });
    const reader = place(
      buildHuman({ build: "woman", height: 1.68, skin: SKIN.tan, hair: HAIR.brown, hairStyle: "long", top: { color: [0.75, 0.2, 0.14], kind: "bikini" }, bottom: { color: [0.75, 0.2, 0.14], kind: "bikini" } }, wardrobe, parts),
      loungerFrames[0],
    ) as Human;
    const book = part(reader.wrist[1], parts.box, wardrobe.get({ color: [0.55, 0.1, 0.08], shine: 0.2 }), [0.0, -0.09, 0.05], [0.15, 0.2, 0.025], [0.3, 0, 0]);
    part(book, parts.box, wardrobe.get({ color: [0.92, 0.9, 0.84], shine: 0.05 }), [0, 0, -0.55], [0.94, 0.94, 0.3]);
    const sleeper = place(
      buildHuman({ build: "man", height: 1.82, skin: SKIN.brown, hair: HAIR.black, hairStyle: "cropped", bottom: { color: [0.06, 0.12, 0.3], kind: "trunks" } }, wardrobe, parts),
      loungerFrames[1],
    ) as Human;

    const sunbather = place(
      buildHuman({ build: "woman", height: 1.7, skin: SKIN.fair, hair: HAIR.blonde, hairStyle: "long", top: { color: [0.92, 0.9, 0.86], kind: "bikini" }, bottom: { color: [0.92, 0.9, 0.86], kind: "bikini" } }, wardrobe, parts),
    ) as Human;
    const builder = place(
      buildHuman({ build: "child", height: 1.12, skin: SKIN.tan, hair: HAIR.auburn, hairStyle: "short", bottom: { color: [0.85, 0.25, 0.12], kind: "shorts" } }, wardrobe, parts),
    ) as Human;

    const walkers = [
      place(buildHuman({ build: "man", height: 1.8, skin: SKIN.fair, hair: HAIR.brown, hairStyle: "short", top: { color: [0.9, 0.9, 0.88], kind: "tee" }, bottom: { color: [0.36, 0.38, 0.24], kind: "shorts" } }, wardrobe, parts)) as Human,
      place(buildHuman({ build: "woman", height: 1.66, skin: SKIN.fair, hair: HAIR.auburn, hairStyle: "long", top: { color: [0.1, 0.45, 0.5], kind: "tank" }, bottom: { color: [0.9, 0.88, 0.82], kind: "shorts" } }, wardrobe, parts)) as Human,
    ];
    const jogger = place(
      buildHuman({ build: "woman", height: 1.7, skin: SKIN.brown, hair: HAIR.black, hairStyle: "ponytail", top: { color: [0.9, 0.35, 0.25], kind: "sports" }, bottom: { color: [0.05, 0.05, 0.06], kind: "shorts" } }, wardrobe, parts),
    ) as Human;
    const thrower = place(
      buildHuman({ build: "man", height: 1.78, skin: SKIN.tan, hair: HAIR.black, hairStyle: "short", top: { color: [0.55, 0.68, 0.82], kind: "tee" }, bottom: { color: [0.62, 0.55, 0.42], kind: "shorts" } }, wardrobe, parts),
    ) as Human;
    const wader = place(
      buildHuman({ build: "man", height: 1.84, skin: SKIN.deep, hair: HAIR.black, hairStyle: "cropped", bottom: { color: [0.04, 0.04, 0.05], kind: "trunks" } }, wardrobe, parts),
    ) as Human;
    const swimmers = [
      place(buildHuman({ build: "woman", height: 1.66, skin: SKIN.fair, hair: HAIR.brown, hairStyle: "short", top: { color: [0.1, 0.1, 0.12], kind: "bikini" }, bottom: { color: [0.1, 0.1, 0.12], kind: "bikini" } }, wardrobe, parts)) as Human,
      place(buildHuman({ build: "man", height: 1.8, skin: SKIN.tan, hair: HAIR.black, hairStyle: "cropped", bottom: { color: [0.7, 0.15, 0.1], kind: "trunks" } }, wardrobe, parts)) as Human,
    ];

    // The lifeguard stands on the tower deck, in the tower's frame, watching the water.
    const towerFrame = new THREE.Group();
    towerFrame.position.set(TOWER.x, sandY(TOWER.z) - 0.05, TOWER.z);
    towerFrame.rotation.y = TOWER.yaw;
    group.add(towerFrame);
    const lifeguard = place(
      buildHuman({ build: "man", height: 1.83, skin: SKIN.tan, hair: HAIR.brown, hairStyle: "short", top: { color: [0.82, 0.1, 0.07], kind: "tank" }, bottom: { color: [0.82, 0.1, 0.07], kind: "shorts" } }, wardrobe, parts),
      towerFrame,
    ) as Human;
    lifeguard.root.position.set(-0.4, TOWER_DECK, -0.8);
    lifeguard.root.rotation.y = Math.PI;
    const binoculars = part(lifeguard.wrist[1], parts.box, wardrobe.get({ color: [0.04, 0.04, 0.05], shine: 0.6 }), [0.06, -0.07, 0.05], [0.13, 0.05, 0.08]);

    const puppies = [
      place(buildPuppy({ coat: [0.78, 0.53, 0.26], ears: [0.62, 0.39, 0.17], belly: [0.86, 0.66, 0.4], legs: [0.8, 0.56, 0.3] }, 1.15, wardrobe, parts)) as Puppy,
      place(buildPuppy({ coat: [0.9, 0.88, 0.84], ears: [0.4, 0.24, 0.12], belly: [0.93, 0.92, 0.9], legs: [0.9, 0.88, 0.84] }, 1.0, wardrobe, parts)) as Puppy,
    ];
    // The white pup has a brown saddle and head.
    part(puppies[1].body, parts.sphere, wardrobe.get({ color: [0.42, 0.26, 0.13], pattern: 12, shine: 0.1 }), [0, 0.045, -0.02], [0.07, 0.05, 0.12]);
    part(puppies[1].head, parts.sphere, wardrobe.get({ color: [0.42, 0.26, 0.13], pattern: 12, shine: 0.1 }), [0, 0.035, -0.01], [0.06, 0.045, 0.058]);

    const ball = part(group, parts.sphere, wardrobe.get({ color: [0.78, 0.86, 0.14], shine: 0.3 }), [0, 0, 0], [0.035, 0.035, 0.035]);

    // Swimmers only ever show head, shoulders and arms above the moving surface.
    swimmers.forEach((h) => {
      h.hip.forEach((j) => (j.visible = false));
      h.pelvis.children[0].visible = false;
    });

    // Where the thrower's hand reaches at the bottom of the squat: the pup's ball rolls
    // there so he can pick it up. (The world group has no transform of its own.)
    rest(thrower);
    thrower.root.position.set(THROWER.x, beachHeight(THROWER.x, THROWER.z), THROWER.z);
    thrower.root.rotation.y = THROWER.heading;
    crouch(thrower, 1);
    group.updateMatrixWorld(true);
    const pickSpot = thrower.wrist[1].localToWorld(new THREE.Vector3(...GRIP));
    pickSpot.y = beachHeight(pickSpot.x, pickSpot.z) + 0.035;

    // Soft contact shadows, one instance per figure on the sand.
    const shadowCount = 12;
    const shadows = new THREE.InstancedMesh(
      parts.plane,
      new THREE.ShaderMaterial({ uniforms: { uOpacity: { value: 0 } }, vertexShader: contactVertex, fragmentShader: contactFragment, transparent: true, depthWrite: false }),
      shadowCount,
    );
    shadows.frustumCulled = false;
    shadows.renderOrder = -1;
    shadows.layers.set(NO_REFLECTION);
    group.add(shadows);

    return {
      group,
      wardrobe,
      parts,
      reader,
      book,
      sleeper,
      sunbather,
      builder,
      walkers,
      jogger,
      thrower,
      wader,
      swimmers,
      lifeguard,
      binoculars,
      puppies,
      ball,
      pickSpot,
      shadows,
    };
  }, []);

  useEffect(
    () => () => {
      cast.wardrobe.dispose();
      cast.parts.dispose();
      (cast.shadows.material as THREE.Material).dispose();
      cast.shadows.dispose();
    },
    [cast],
  );

  const castRef = useRef<typeof cast | null>(null);
  const state = useRef({
    walk: { x: -4, dir: 1, heading: Math.PI / 2, phase: 0, speed: 0 } as Mover,
    jog: { x: 12, dir: -1, heading: -Math.PI / 2, phase: 0, speed: 0 } as Mover,
    pupHeading: [-Math.PI / 2, -Math.PI / 2],
    pupPhase: [0, 0],
    pupSpeed: [0, 0],
    pupLast: [new THREE.Vector3(), new THREE.Vector3()],
    swimY: [Number.NaN, Number.NaN],
  });
  const tools = useMemo(
    () => ({
      dummy: new THREE.Object3D(),
      hand: new THREE.Vector3(),
      mouth: new THREE.Vector3(),
      release: new THREE.Vector3(),
      drop: new THREE.Vector3(),
      random: seeded(12),
    }),
    [],
  );
  useEffect(() => {
    castRef.current = cast;
  }, [cast]);

  useFrame((frame, rawDelta) => {
    const c = castRef.current;
    if (!c) return;
    const d = day.current;
    c.group.visible = d > 0.01;
    if (!c.group.visible) return;
    const dt = reduce ? 0 : Math.min(rawDelta, 0.05);
    const t = reduce ? 3.3 : frame.clock.elapsedTime;
    for (const m of c.wardrobe.all()) m.uniforms.uOpacity.value = d;
    (c.shadows.material as THREE.ShaderMaterial).uniforms.uOpacity.value = d;
    const st = state.current;
    const shadowList: Shadow[] = [];
    const standingShadow = (x: number, z: number, height: number, width = 0.42) =>
      shadowList.push({ x: x + AWAY.x * height * 0.3, z: z + AWAY.y * height * 0.3, width, length: 0.5 + height * 0.55, angle: Math.atan2(AWAY.x, AWAY.y) });

    // Sunbathers.
    rest(c.reader);
    c.reader.root.position.set(0, 0, 0.12);
    c.reader.root.rotation.y = Math.PI;
    recline(c.reader, t, 1, "reading");
    c.reader.pelvis.position.set(0, 0.52 / c.reader.scale, -0.18 / c.reader.scale);
    rest(c.sleeper);
    c.sleeper.root.position.set(0, 0, 0.12);
    c.sleeper.root.rotation.y = Math.PI;
    recline(c.sleeper, t, 4, "hands-behind");
    c.sleeper.pelvis.position.set(0, 0.52 / c.sleeper.scale, -0.18 / c.sleeper.scale);

    rest(c.sunbather);
    const towelHeading = Math.atan2(Math.sin(TOWEL.angle), -Math.cos(TOWEL.angle));
    c.sunbather.root.position.set(TOWEL.x, beachHeight(TOWEL.x, TOWEL.z) + 0.02, TOWEL.z);
    c.sunbather.root.rotation.y = towelHeading;
    prone(c.sunbather, t);
    shadowList.push({ x: TOWEL.x, z: TOWEL.z, width: 0.55, length: 1.9, angle: towelHeading });

    rest(c.builder);
    const bx = CASTLE.x + 0.55;
    const bz = CASTLE.z + 0.8;
    c.builder.root.position.set(bx, beachHeight(bx, bz), bz);
    c.builder.root.rotation.y = Math.atan2(CASTLE.x - bx, CASTLE.z - bz);
    kneelAndPat(c.builder, t);
    shadowList.push({ x: bx, z: bz, width: 0.35, length: 0.6, angle: c.builder.root.rotation.y });

    // A couple strolling along the water's edge, the jogger passing them.
    stepMover(st.walk, WALK_LANE, dt, 1.45);
    c.walkers.forEach((h, i) => {
      rest(h);
      const x = st.walk.x + (i === 0 ? 0 : -0.15 * Math.sin(st.walk.heading));
      const z = WALK_LANE.z - i * 0.55;
      h.root.position.set(x, beachHeight(x, z), z);
      h.root.rotation.y = st.walk.heading;
      const amount = THREE.MathUtils.clamp(st.walk.speed / WALK_LANE.speed, 0, 1);
      stand(h, t, i * 3);
      walk(h, st.walk.phase + i * 0.4, amount);
      standingShadow(x, z, 1.7);
    });
    stepMover(st.jog, JOG_LANE, dt, 2.2);
    {
      const h = c.jogger;
      rest(h);
      h.root.position.set(st.jog.x, beachHeight(st.jog.x, JOG_LANE.z), JOG_LANE.z);
      h.root.rotation.y = st.jog.heading;
      const amount = THREE.MathUtils.clamp(st.jog.speed / JOG_LANE.speed, 0, 1);
      if (amount < 0.3) walk(h, st.jog.phase, amount / 0.3);
      else run(h, st.jog.phase, amount);
      standingShadow(st.jog.x, JOG_LANE.z, 1.7);
    }

    // Standing knee-deep, hands on hips, looking out to sea.
    {
      const h = c.wader;
      rest(h);
      const x = -10.5;
      const z = -30.8;
      h.root.position.set(x, beachHeight(x, z), z);
      h.root.rotation.y = Math.PI + 0.3 * Math.sin(t * 0.07);
      stand(h, t, 7);
      handsOnHips(h);
    }

    // Two swimmers bobbing out beyond the wash, head and shoulders above the water.
    // They rise and fall with the swells that roll through (the same surf model the waves use).
    const tSurf = reduce ? 0 : frame.clock.elapsedTime;
    c.swimmers.forEach((h, i) => {
      rest(h);
      const x = 7.4 + i * 1.6 + Math.sin(t * 0.14 + i * 2) * 1.6;
      const z = -33.8 - i * 0.9;
      h.root.position.set(x, 0, z);
      // Turn smoothly at each end of the lazy back-and-forth, facing the shore on the way round.
      h.root.rotation.y = 0.4 + (Math.PI / 2) * THREE.MathUtils.clamp(Math.cos(t * 0.14 + i * 2) * 4, -1, 1);
      swim(h, t, i * 1.3);
      h.root.updateMatrixWorld(true);
      h.head.getWorldPosition(tools.hand);
      const surface = -3.97 + surfHeight(x, SHORE_Z - z, tSurf);
      st.swimY[i] = Number.isNaN(st.swimY[i]) ? surface : THREE.MathUtils.damp(st.swimY[i], surface, 4, dt || 0.016);
      h.root.position.y = st.swimY[i] + 0.07 + 0.04 * Math.sin(t * 1.9 + i * 1.3) - tools.hand.y;
    });

    // Lifeguard: every so often lifts the binoculars and scans the water.
    {
      const h = c.lifeguard;
      rest(h);
      stand(h, t, 11);
      const scan = THREE.MathUtils.smoothstep(Math.sin(t * 0.32), 0.25, 0.55);
      SIDES.forEach((s, i) => {
        h.shoulder[i].rotation.set(-1.25 * scan + 0.04 * (1 - scan), 0, s * (0.07 + 0.2 * scan));
        h.elbow[i].rotation.x = -0.14 - 1.85 * scan;
      });
      h.head.rotation.y = scan * 0.5 * Math.sin(t * 0.4);
      c.binoculars.visible = scan > 0.05;
    }

    // Fetch: throw, the pup gallops out and trots the ball back, the second pup tags along.
    const u = ((t % FETCH_CYCLE) + FETCH_CYCLE) % FETCH_CYCLE;
    const round = Math.floor(t / FETCH_CYCLE);
    const reach = 7 + tools.random() * 0 + ((round * 0.37) % 1) * 1.2;
    const S = new THREE.Vector3(THROWER.x + 1.1, 0, THROWER.z + 0.15);
    const L = new THREE.Vector3(THROWER.x + reach, 0, THROWER.z - 1.2 - ((round * 0.61) % 1) * 0.6);
    const B = L.clone().add(new THREE.Vector3(0.55, 0, -0.1));
    {
      const h = c.thrower;
      rest(h);
      h.root.position.set(THROWER.x, beachHeight(THROWER.x, THROWER.z), THROWER.z);
      h.root.rotation.y = THROWER.heading;
      stand(h, t, 5);
      // Wind up, throw, follow through; later squat down for the ball the pup brought back.
      h.shoulder[1].rotation.x = keys(u, [[0, 0.1], [0.35, 1.0], [0.6, -2.3], [0.95, -0.9], [1.6, 0.04]]);
      h.shoulder[1].rotation.z = keys(u, [[0, -0.07], [0.35, -0.45], [0.6, -0.2], [1.6, -0.07]]);
      h.elbow[1].rotation.x = keys(u, [[0, -0.3], [0.35, -1.6], [0.6, -0.3], [1.6, -0.14]]);
      h.chest.rotation.y = keys(u, [[0, 0], [0.35, -0.5], [0.6, 0.4], [1.2, 0.1], [1.8, 0]]);
      h.spine.rotation.x = keys(u, [[0, 0], [0.6, 0.22], [1.4, 0]]);
      h.hip[0].rotation.x = keys(u, [[0, 0], [0.35, -0.3], [0.7, -0.35], [1.6, 0]]);
      h.hip[1].rotation.x = keys(u, [[0, 0], [0.35, 0.2], [0.7, 0.1], [1.6, 0]]);
      h.shoulder[0].rotation.x = keys(u, [[0, 0.04], [0.35, -0.7], [0.7, 0.2], [1.6, 0.04]]);
      crouch(h, keys(u, [[6.9, 0], [7.4, 1], [7.8, 1], [8.5, 0]]));
      standingShadow(THROWER.x, THROWER.z, 1.7);
      h.root.updateMatrixWorld(true);
      h.wrist[1].localToWorld(tools.hand.set(...GRIP));
    }

    // Pup A's path through the round, as a function of time.
    const easeMove = (from: THREE.Vector3, to: THREE.Vector3, k: number) => from.clone().lerp(to, k * k * (3 - 2 * k));
    const posA = (time: number) => {
      const v = ((time % FETCH_CYCLE) + FETCH_CYCLE) % FETCH_CYCLE;
      if (v < 0.6) return S.clone();
      if (v < 2.75) return easeMove(S, B, (v - 0.6) / 2.15);
      if (v < 3.15) return B.clone();
      if (v < 6.3) return easeMove(B, S, (v - 3.15) / 3.15);
      return S.clone();
    };
    c.puppies.forEach((p, i) => {
      puppyRest(p);
      let target: THREE.Vector3;
      let facing: number;
      if (i === 0) {
        target = posA(u);
        const ahead = posA(u + 0.12);
        facing = ahead.distanceTo(target) > 0.01 ? Math.atan2(ahead.x - target.x, ahead.z - target.z) : u > 6.3 || u < 0.6 ? -Math.PI / 2 : u < 3.15 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        // Tags along a step behind and to the side, then bounces around the thrower.
        const lag = posA(u - 0.35);
        const side = new THREE.Vector3(0, 0, 0.75);
        const play = S.clone().add(new THREE.Vector3(0.5 + 0.35 * Math.sin(t * 1.7), 0, 0.9 + 0.45 * Math.sin(t * 1.1)));
        const follow = lag.add(side);
        // Fades to exactly 0 at u = 0.5 and u = 6.9, so the hand-off is continuous.
        const w = THREE.MathUtils.smoothstep(Math.min(u - 0.5, 6.9 - u), 0, 0.6);
        target = play.lerp(follow, w);
        const last = st.pupLast[1];
        facing = target.distanceTo(last) > 0.004 ? Math.atan2(target.x - last.x, target.z - last.z) : st.pupHeading[1];
      }
      const last = st.pupLast[i];
      const speed = dt > 0 ? target.distanceTo(last) / dt : 0;
      last.copy(target);
      st.pupSpeed[i] = THREE.MathUtils.damp(st.pupSpeed[i], Math.min(speed, 6), 6, dt || 0.016);
      let dh = facing - st.pupHeading[i];
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      st.pupHeading[i] += dh * Math.min(1, dt * 7);
      p.root.position.set(target.x, beachHeight(target.x, target.z), target.z);
      p.root.rotation.y = st.pupHeading[i];
      const sp = st.pupSpeed[i];
      if (sp > 2.2) {
        st.pupPhase[i] += dt * 16;
        gallop(p, st.pupPhase[i], THREE.MathUtils.clamp((sp - 1.5) / 1.5, 0, 1));
      } else if (sp > 0.25) {
        st.pupPhase[i] += dt * (7 + sp * 3);
        trot(p, st.pupPhase[i], THREE.MathUtils.clamp(sp / 1.2, 0.3, 1));
      } else {
        playBow(p, t + i);
      }
      if (i === 0 && u > 2.75 && u < 3.15) sniffDown(p, Math.sin(((u - 2.75) / 0.4) * Math.PI));
      if (i === 0 && u > 6.3 && u < 6.8) sniffDown(p, Math.sin(((u - 6.3) / 0.5) * Math.PI));
      shadowList.push({ x: target.x + AWAY.x * 0.1, z: target.z + AWAY.y * 0.1, width: 0.28, length: 0.55, angle: st.pupHeading[i] });
    });

    // The ball: in hand, in flight, bouncing, in the pup's mouth, dropped, picked up.
    {
      const b = c.ball;
      const ground = (x: number, z: number) => beachHeight(x, z) + 0.035;
      if (u < 0.6) {
        b.position.copy(tools.hand);
        tools.release.copy(tools.hand);
      } else if (u < 2.1) {
        const k = (u - 0.6) / 1.5;
        const from = tools.release;
        b.position.set(from.x + (L.x - from.x) * k, 0, from.z + (L.z - from.z) * k);
        b.position.y = from.y + (ground(L.x, L.z) - from.y) * k + 3.2 * 4 * k * (1 - k);
      } else if (u < 2.6) {
        const k = (u - 2.1) / 0.5;
        b.position.set(L.x + (B.x - L.x) * k, ground(L.x, L.z) + 0.3 * 4 * k * (1 - k), L.z + (B.z - L.z) * k);
      } else if (u < 3.05) {
        b.position.set(B.x, ground(B.x, B.z), B.z);
      } else if (u < 6.55) {
        const pup = c.puppies[0];
        pup.root.updateMatrixWorld(true);
        pup.head.localToWorld(tools.mouth.set(0, -0.012, 0.1));
        b.position.copy(tools.mouth);
        tools.drop.copy(tools.mouth);
      } else if (u < 6.72) {
        // Dropped: falls to the sand under the pup's mouth.
        const k = (u - 6.55) / 0.17;
        b.position.set(tools.drop.x, tools.drop.y + (ground(tools.drop.x, tools.drop.z) - tools.drop.y) * k * k, tools.drop.z);
      } else if (u < 7.35) {
        // Rolls the last bit to the thrower's feet, slowing as it goes.
        const k = 1 - Math.pow(1 - (u - 6.72) / 0.63, 2);
        const x = tools.drop.x + (c.pickSpot.x - tools.drop.x) * k;
        const z = tools.drop.z + (c.pickSpot.z - tools.drop.z) * k;
        b.position.set(x, ground(x, z), z);
      } else if (u < 7.45) {
        b.position.copy(c.pickSpot);
      } else if (u < 7.75) {
        // Picked up: from the sand into his hand as he closes it.
        b.position.lerpVectors(c.pickSpot, tools.hand, THREE.MathUtils.smoothstep(u, 7.45, 7.75));
      } else {
        b.position.copy(tools.hand);
      }
      if ((u > 2.1 && u < 3.05) || (u > 6.6 && u < 7.6)) shadowList.push({ x: b.position.x, z: b.position.z, width: 0.1, length: 0.1, angle: 0 });
    }

    // Write the contact shadows.
    const { dummy } = tools;
    for (let i = 0; i < c.shadows.count; i++) {
      const s = shadowList[i];
      if (s) {
        // Lie on the sand's slope (it rises 7% up the beach) so no part sinks into it.
        dummy.position.set(s.x, beachHeight(s.x, s.z) + 0.03, s.z);
        dummy.rotation.set(-Math.atan(0.07), s.angle, 0);
        dummy.scale.set(s.width, 1, s.length);
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      c.shadows.setMatrixAt(i, dummy.matrix);
    }
    c.shadows.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={cast.group} />;
}
