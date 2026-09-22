import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { makeWaterNormals } from "./DayGrade";
import {
  beachFragment,
  beachVertex,
  birdFragment,
  birdVertex,
  flatFragment,
  flatVertex,
  frondFragment,
  frondVertex,
  headlandFragment,
  headlandVertex,
  propFragment,
  propVertex,
  splashFragment,
  splashVertex,
  surfFragment,
  surfVertex,
} from "./shaders";

/**
 * The water scene: a beach by day. Physically based sky and reflective sea
 * (three.js Sky and Water), a surf zone of breaking waves with a surfer, a
 * detailed beach with props, dolphins, distant sailboats and gulls.
 * Everything here outputs linear light and is finished by the DayGrade pass.
 */

const SHORE_Z = -24;
const WATER_Y = -4;

/** Mid-morning sun, ahead and to the right: a clear blue sky and a glitter path on the sea. */
const SUN_DIR = new THREE.Vector3()
  .setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 17), THREE.MathUtils.degToRad(158))
  .normalize();

/** Must match SURF_RANGE in shaders.ts. */
const SURF_RANGE = 72;

type DayRef = { current: number };
export type SeaPointer = { current: { x: number; y: number; at: number; ripple: { x: number; y: number; at: number } } };

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

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Height of the sand at a given z, matching beachVertex. */
const sandY = (z: number) => WATER_Y + (z - SHORE_Z) * 0.07;

function useDisposable<T extends { dispose: () => void }>(factory: () => T): T {
  // The factory runs once; callers pass inline builders that never change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => factory(), []);
  useEffect(() => () => value.dispose(), [value]);
  return value;
}

/* ------------------------------------------------------------------ props */

type PropLook = {
  color: [number, number, number];
  color2?: [number, number, number];
  pattern?: number;
  stripes?: number;
  shine?: number;
};

function usePropUniforms(look: PropLook) {
  return useMemo(
    () => ({
      uColor: { value: new THREE.Vector3(...look.color) },
      uColor2: { value: new THREE.Vector3(...(look.color2 ?? look.color)) },
      uPattern: { value: look.pattern ?? 0 },
      uStripes: { value: look.stripes ?? 8 },
      uShine: { value: look.shine ?? 0.15 },
      uOpacity: { value: 0 },
      uSunDir: { value: SUN_DIR.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

/** A lit mesh whose opacity follows the scene fade. */
function Prop({
  geometry,
  look,
  day,
  position,
  rotation,
  scale,
}: {
  geometry: THREE.BufferGeometry;
  look: PropLook;
  day: DayRef;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = usePropUniforms(look);
  useFrame(() => {
    if (material.current) material.current.uniforms.uOpacity.value = day.current;
  });
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} scale={scale} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={propVertex}
        fragmentShader={propFragment}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

const UMBRELLA = { x: -5.6, z: -16.4, radius: 1.55, height: 2.35 };
const BOARD = { x: 4.6, z: -17.6, length: 2.1 };

function BeachProps({ day }: { day: DayRef }) {
  const pole = useDisposable(() => new THREE.CylinderGeometry(0.035, 0.035, UMBRELLA.height + 0.3, 8));
  const canopy = useDisposable(() => new THREE.ConeGeometry(UMBRELLA.radius, 0.55, 32, 1, true));
  const cap = useDisposable(() => new THREE.SphereGeometry(0.06, 12, 8));
  const board = useDisposable(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.27, BOARD.length / 2, 0, Math.PI * 2, false, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 32 });
    g.translate(0, 0, -0.025);
    return g;
  });
  const baseY = sandY(UMBRELLA.z);
  const boardY = sandY(BOARD.z);
  return (
    <group>
      <group position={[UMBRELLA.x, baseY, UMBRELLA.z]} rotation={[0.04, 0, -0.08]}>
        <Prop geometry={pole} look={{ color: [0.62, 0.6, 0.56], shine: 0.4 }} day={day} position={[0, (UMBRELLA.height + 0.3) / 2 - 0.3, 0]} />
        <Prop
          geometry={canopy}
          look={{ color: [0.62, 0.06, 0.05], color2: [0.86, 0.85, 0.82], pattern: 1, stripes: 8, shine: 0.05 }}
          day={day}
          position={[0, UMBRELLA.height, 0]}
        />
        <Prop geometry={cap} look={{ color: [0.86, 0.85, 0.82] }} day={day} position={[0, UMBRELLA.height + 0.29, 0]} />
      </group>
      <Prop
        geometry={board}
        look={{ color: [0.86, 0.85, 0.8], color2: [0.02, 0.3, 0.4], pattern: 2, shine: 0.6 }}
        day={day}
        position={[BOARD.x, boardY + 0.8, BOARD.z]}
        rotation={[0, 0.6, 0.13]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ surf + beach */

function Beach({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useDisposable(() => {
    // From behind the camera down under the shallows, so the sea bed shows through clear water.
    const g = new THREE.PlaneGeometry(600, 100, 300, 200);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, SHORE_Z - 3);
    return g;
  });
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDay: { value: 0 },
      uShore: { value: SHORE_Z },
      uSunDir: { value: SUN_DIR.clone() },
      uUmbrella: { value: new THREE.Vector4(UMBRELLA.x, UMBRELLA.z, UMBRELLA.radius, UMBRELLA.height) },
      uBoard: { value: new THREE.Vector4(BOARD.x, BOARD.z, BOARD.length, 0.13) },
    }),
    [],
  );
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = reduce ? 0 : state.clock.elapsedTime;
    m.uniforms.uDay.value = day.current;
  });
  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={-4}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={beachVertex} fragmentShader={beachFragment} transparent />
    </mesh>
  );
}

function Surf({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useDisposable(() => {
    const g = new THREE.PlaneGeometry(700, SURF_RANGE + 2, 280, 180);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, SHORE_Z - SURF_RANGE / 2 + 1);
    return g;
  });
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uDay: { value: 0 }, uShore: { value: SHORE_Z }, uSunDir: { value: SUN_DIR.clone() } }),
    [],
  );
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = reduce ? 0 : state.clock.elapsedTime;
    m.uniforms.uDay.value = day.current;
  });
  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={-2}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={surfVertex} fragmentShader={surfFragment} transparent />
    </mesh>
  );
}

/* ------------------------------------------------------------------ dolphins */

function useDolphinParts() {
  const body = useDisposable(() => {
    const radii = [0.02, 0.04, 0.07, 0.11, 0.15, 0.185, 0.21, 0.22, 0.215, 0.2, 0.175, 0.14, 0.1, 0.06, 0.045, 0.03, 0];
    const points = radii.map((r, i) => new THREE.Vector2(r, -1.2 + (i / (radii.length - 1)) * 2.4));
    const g = new THREE.LatheGeometry(points, 28);
    g.rotateZ(-Math.PI / 2);
    g.scale(1, 1, 0.82);
    return g;
  });
  const dorsal = useDisposable(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.28, 0);
    s.lineTo(0.12, 0);
    s.quadraticCurveTo(0.02, 0.1, -0.3, 0.36);
    s.quadraticCurveTo(-0.26, 0.16, -0.28, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 12 });
    g.translate(-0.05, 0.17, -0.015);
    return g;
  });
  const flukes = useDisposable(() => {
    const s = new THREE.Shape();
    s.moveTo(0.05, 0);
    s.quadraticCurveTo(-0.12, 0.2, -0.3, 0.34);
    s.lineTo(-0.36, 0.3);
    s.quadraticCurveTo(-0.24, 0.12, -0.2, 0.02);
    s.lineTo(-0.2, -0.02);
    s.quadraticCurveTo(-0.24, -0.12, -0.36, -0.3);
    s.lineTo(-0.3, -0.34);
    s.quadraticCurveTo(-0.12, -0.2, 0.05, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false, curveSegments: 12 });
    g.rotateX(Math.PI / 2);
    g.translate(-1.14, 0, 0);
    return g;
  });
  const flipper = useDisposable(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(-0.08, -0.12, -0.24, -0.2);
    s.quadraticCurveTo(-0.1, -0.04, 0.08, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false, curveSegments: 8 });
    return g;
  });
  return { body, dorsal, flukes, flipper };
}

const POD = 2;
const JUMP_EVERY = 8;
const JUMP_TIME = 1.6;
const DOLPHIN_LOOK: PropLook = { color: [0.05, 0.075, 0.1], color2: [0.36, 0.39, 0.42], pattern: 3, shine: 0.9 };

/** A pod of dolphins arcing out of the open sea, with spray as they break the surface. */
function Dolphins({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const parts = useDolphinParts();
  const groups = useRef<Array<THREE.Group | null>>([]);
  const splashMat = useRef<THREE.ShaderMaterial>(null);
  const state = useRef({ phase: Array.from({ length: POD }, () => 0), slot: 0 });

  const splashGeometry = useDisposable(() => {
    const perSplash = 48;
    const count = perSplash * 4;
    const random = seeded(77);
    const positions = new Float32Array(count * 3);
    const slots = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      slots[i] = Math.floor(i / perSplash);
      const angle = random() * Math.PI * 2;
      const speed = 0.8 + random() * 2.4;
      velocities[i * 3] = Math.cos(angle) * speed * 0.7;
      velocities[i * 3 + 1] = 2 + random() * 3.2;
      velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSlot", new THREE.BufferAttribute(slots, 1));
    g.setAttribute("aVelocity", new THREE.BufferAttribute(velocities, 3));
    return g;
  });
  const splashUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uDay: { value: 0 },
      uSplash: { value: Array.from({ length: 4 }, () => new THREE.Vector4(0, -50, 0, -100)) },
    }),
    [],
  );

  useFrame((frame) => {
    const t = frame.clock.elapsedTime;
    const st = state.current;
    const sm = splashMat.current;
    for (let i = 0; i < POD; i++) {
      const g = groups.current[i];
      if (!g) continue;
      const clock = t + i * 0.5;
      const jump = Math.floor(clock / JUMP_EVERY);
      const local = clock - jump * JUMP_EVERY;
      const visible = day.current > 0.01 && !reduce && local < JUMP_TIME;
      g.visible = visible;
      if (!visible) {
        st.phase[i] = 0;
        continue;
      }
      const u = local / JUMP_TIME;
      const run = 11;
      const rise = 3.6;
      const x0 = -26 + hash(jump) * 44 + i * 3.5;
      const z = SHORE_Z - 55 - hash(jump + 13) * 22 - i * 2;
      const x = x0 + (u - 0.5) * run;
      const y = WATER_Y - 1.1 + 4 * u * (1 - u) * rise;
      g.position.set(x, y, z);
      g.rotation.set(0.12, 0, Math.atan2(rise * 4 * (1 - 2 * u), run));
      [0.12, 0.86].forEach((at, k) => {
        if (st.phase[i] <= k && u >= at && sm) {
          const slot = st.slot++ % 4;
          sm.uniforms.uSplash.value[slot].set(x0 + (at - 0.5) * run, WATER_Y, z, t);
          st.phase[i] = k + 1;
        }
      });
    }
    if (sm) {
      sm.uniforms.uTime.value = t;
      sm.uniforms.uPixelRatio.value = frame.gl.getPixelRatio();
      sm.uniforms.uDay.value = day.current;
    }
  });

  return (
    <>
      {Array.from({ length: POD }, (_, i) => (
        <group
          key={i}
          visible={false}
          scale={1.3}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <Prop geometry={parts.body} look={DOLPHIN_LOOK} day={day} />
          <Prop geometry={parts.dorsal} look={DOLPHIN_LOOK} day={day} />
          <Prop geometry={parts.flukes} look={DOLPHIN_LOOK} day={day} />
          <Prop geometry={parts.flipper} look={DOLPHIN_LOOK} day={day} position={[0.5, -0.12, 0.16]} rotation={[0.5, 0, 0]} />
          <Prop geometry={parts.flipper} look={DOLPHIN_LOOK} day={day} position={[0.5, -0.12, -0.16]} rotation={[-0.5, 0, 0]} />
        </group>
      ))}
      <points geometry={splashGeometry} frustumCulled={false} renderOrder={1}>
        <shaderMaterial ref={splashMat} uniforms={splashUniforms} vertexShader={splashVertex} fragmentShader={splashFragment} transparent depthWrite={false} />
      </points>
    </>
  );
}

/* ------------------------------------------------------------------ boats + gulls */

function useShape(build: (shape: THREE.Shape) => void) {
  return useDisposable(() => {
    const shape = new THREE.Shape();
    build(shape);
    return new THREE.ShapeGeometry(shape, 12);
  });
}

function Silhouette({ geometry, color, day, haze }: { geometry: THREE.BufferGeometry; color: [number, number, number]; day: DayRef; haze: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Vector3(...color) }, uOpacity: { value: 0 }, uHaze: { value: haze } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame(() => {
    if (material.current) material.current.uniforms.uOpacity.value = day.current;
  });
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={flatVertex} fragmentShader={flatFragment} transparent />
    </mesh>
  );
}

const BOATS = [
  { x: -80, z: -300, scale: 0.9, speed: 0.4, sail: [0.97, 0.97, 0.95] as [number, number, number] },
  { x: 60, z: -360, scale: 1.05, speed: -0.28, sail: [0.93, 0.62, 0.55] as [number, number, number] },
  { x: 150, z: -270, scale: 0.75, speed: 0.32, sail: [0.97, 0.97, 0.95] as [number, number, number] },
];

function Boats({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const hull = useShape((s) => {
    s.moveTo(-3, 0);
    s.lineTo(3.2, 0);
    s.lineTo(2.4, -1.1);
    s.lineTo(-2.5, -1.1);
    s.closePath();
  });
  const mast = useShape((s) => {
    s.moveTo(0.1, 0);
    s.lineTo(0.3, 0);
    s.lineTo(0.3, 8.6);
    s.lineTo(0.1, 8.6);
    s.closePath();
  });
  const mainsail = useShape((s) => {
    s.moveTo(0.4, 0.7);
    s.lineTo(0.4, 8.2);
    s.quadraticCurveTo(2.2, 3.6, 2.9, 0.7);
    s.closePath();
  });
  const jib = useShape((s) => {
    s.moveTo(0, 7.6);
    s.lineTo(-2.5, 0.7);
    s.lineTo(0, 0.7);
    s.closePath();
  });
  const groups = useRef<Array<THREE.Group | null>>([]);
  const xs = useRef(BOATS.map((b) => b.x));
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    BOATS.forEach((boat, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.visible = day.current > 0.01;
      if (!reduce) {
        xs.current[i] += boat.speed * Math.min(delta, 0.05);
        if (xs.current[i] > 220) xs.current[i] = -220;
        if (xs.current[i] < -220) xs.current[i] = 220;
      }
      g.position.set(xs.current[i], WATER_Y + 0.4 + Math.sin(t * 0.9 + i * 2) * 0.2, boat.z);
      g.rotation.z = Math.sin(t * 0.7 + i) * 0.04;
    });
  });
  return (
    <>
      {BOATS.map((boat, i) => (
        <group
          key={boat.z}
          scale={boat.scale}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <Silhouette geometry={hull} color={[0.2, 0.3, 0.42]} day={day} haze={0.35} />
          <Silhouette geometry={mast} color={[0.2, 0.3, 0.42]} day={day} haze={0.35} />
          <Silhouette geometry={mainsail} color={boat.sail} day={day} haze={0.3} />
          <Silhouette geometry={jib} color={[0.94, 0.95, 0.96]} day={day} haze={0.3} />
        </group>
      ))}
    </>
  );
}

function Gulls({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useDisposable(() => {
    const random = seeded(314);
    const perFlock = 9;
    const count = perFlock * 2;
    const positions = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const flocks = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const k = i % perFlock;
      const side = k === 0 ? 0 : k % 2 === 0 ? 1 : -1;
      const rank = Math.ceil(k / 2);
      offsets[i * 3] = -rank * 7 + (random() - 0.5) * 5;
      offsets[i * 3 + 1] = side * rank * 3 + (random() - 0.5) * 3;
      offsets[i * 3 + 2] = (random() - 0.5) * 14;
      phases[i] = random();
      flocks[i] = i < perFlock ? 0 : 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    g.setAttribute("aFlock", new THREE.BufferAttribute(flocks, 1));
    return g;
  });
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uDay: { value: 0 }, uPixelRatio: { value: 1 } }), []);
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = reduce ? 0 : state.clock.elapsedTime;
    m.uniforms.uDay.value = day.current;
    m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });
  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-4}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={birdVertex} fragmentShader={birdFragment} transparent depthWrite={false} />
    </points>
  );
}

/* ------------------------------------------------------------------ palms + headlands */

type PalmSpec = { x: number; z: number; lean: number; turn: number; height: number; scale: number };

const PALMS: PalmSpec[] = [
  { x: 9.2, z: -15.5, lean: -0.34, turn: 0.4, height: 7.2, scale: 1 },
  { x: 11.5, z: -17.5, lean: -0.22, turn: -0.3, height: 6.1, scale: 0.9 },
  { x: -15, z: -21, lean: 0.25, turn: 2.6, height: 6.6, scale: 0.85 },
];

/** Builds one frond: an arched rachis with leaflets hanging from both sides. */
function buildFrond(length: number, seed: number, dead: boolean) {
  const random = seeded(seed);
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const along: number[] = [];
  const tips: number[] = [];
  const index: number[] = [];
  const rachis = (u: number) =>
    new THREE.Vector3(u * length, Math.sin(u * Math.PI * 0.55) * length * 0.16 - u * u * length * 0.42, 0);

  const green = dead ? new THREE.Color(0.28, 0.2, 0.1) : new THREE.Color(0.06, 0.2, 0.04);
  const tipColor = dead ? new THREE.Color(0.22, 0.15, 0.08) : new THREE.Color(0.2, 0.24, 0.07);

  const strip = (points: THREE.Vector3[], widths: number[], across: THREE.Vector3, u: number, color: THREE.Color, tip: THREE.Color) => {
    const start = positions.length / 3;
    const normal = new THREE.Vector3().subVectors(points[points.length - 1], points[0]).cross(across).normalize();
    points.forEach((point, k) => {
      const t = k / (points.length - 1);
      const half = across.clone().multiplyScalar(widths[k] / 2);
      const c = color.clone().lerp(tip, t * 0.8);
      [point.clone().sub(half), point.clone().add(half)].forEach((v) => {
        positions.push(v.x, v.y, v.z);
        normals.push(normal.x, normal.y, normal.z);
        colors.push(c.r, c.g, c.b);
        along.push(u);
        tips.push(t);
      });
    });
    for (let k = 0; k < points.length - 1; k++) {
      const a = start + k * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };

  // The rachis itself: a thin stem.
  const stemPoints = Array.from({ length: 12 }, (_, i) => rachis(i / 11));
  strip(stemPoints, stemPoints.map((_, i) => 0.07 * (1 - i / 14)), new THREE.Vector3(0, 0, 1), 0.5, new THREE.Color(0.22, 0.2, 0.09), new THREE.Color(0.16, 0.18, 0.06));

  const leaflets = 36;
  for (let i = 1; i <= leaflets; i++) {
    const u = 0.1 + (i / leaflets) * 0.88;
    const base = rachis(u);
    const size = length * 0.36 * Math.pow(Math.sin(Math.PI * Math.min(u, 0.97)), 0.7);
    const shade = 0.8 + random() * 0.4;
    const color = green.clone().multiplyScalar(shade);
    for (const side of [-1, 1]) {
      // Leaflets point outwards, a little forward, and hang down: the frond folds into a V.
      const dir = new THREE.Vector3(0.35 + random() * 0.1, -0.35 - u * 0.35 - random() * 0.1, side).normalize();
      const droop = size * (0.25 + u * 0.3);
      const points = [0, 0.33, 0.66, 1].map((t) => base.clone().addScaledVector(dir, size * t).add(new THREE.Vector3(0, -droop * t * t, 0)));
      const across = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      const width = size * 0.12;
      strip(points, [width * 0.7, width, width * 0.7, width * 0.12], across, u, color, tipColor);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute("aTip", new THREE.Float32BufferAttribute(tips, 1));
  g.setIndex(index);
  return g;
}

type FrondSpec = { yaw: number; pitch: number; length: number; dead: boolean; seed: number };

function Frond({ day, spec, phase }: { day: DayRef; spec: FrondSpec; phase: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useDisposable(() => buildFrond(spec.length, spec.seed, spec.dead));
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPhase: { value: phase }, uOpacity: { value: 0 }, uSunDir: { value: SUN_DIR.clone() } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uOpacity.value = day.current;
  });
  return (
    <mesh geometry={geometry} rotation={[0, spec.yaw, spec.pitch]} frustumCulled={false}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={frondVertex} fragmentShader={frondFragment} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

/** A coconut palm: a curved, tapering, ringed trunk and a crown of arching fronds with a few dead ones hanging. */
function Palm({ spec, day }: { spec: PalmSpec; day: DayRef }) {
  const segments = 14;
  const trunk = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(spec.lean * spec.height * 0.1, spec.height * 0.6, 0),
      new THREE.Vector3(spec.lean * spec.height, spec.height, 0),
    );
    return Array.from({ length: segments }, (_, i) => {
      const a = curve.getPoint(i / segments);
      const b = curve.getPoint((i + 1) / segments);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dir = b.clone().sub(a);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      const t = i / segments;
      return { mid, length: dir.length(), quaternion, radius: 0.3 - t * 0.14 + (t < 0.08 ? 0.08 * (1 - t / 0.08) : 0) };
    });
  }, [spec.height, spec.lean]);
  const fronds = useMemo<FrondSpec[]>(() => {
    const random = seeded(Math.round(spec.x * 100));
    const live = Array.from({ length: 15 }, (_, i) => ({
      yaw: (i / 15) * Math.PI * 2 + random() * 0.25,
      pitch: 0.55 - random() * 0.5,
      length: 3 + random() * 1.1,
      dead: false,
      seed: Math.round(spec.x * 10) + i * 17,
    }));
    const dead = Array.from({ length: 3 }, (_, i) => ({
      yaw: random() * Math.PI * 2,
      pitch: -1.1 - random() * 0.3,
      length: 2.2 + random() * 0.6,
      dead: true,
      seed: Math.round(spec.x * 10) + 400 + i,
    }));
    return [...live, ...dead];
  }, [spec.x]);
  const crown: [number, number, number] = [spec.lean * spec.height, spec.height, 0];
  const segment = useDisposable(() => new THREE.CylinderGeometry(0.88, 1, 1, 14, 1, true));
  const nuts = useDisposable(() => new THREE.SphereGeometry(0.15, 12, 8));
  const bark: PropLook = { color: [0.42, 0.36, 0.28], color2: [0.24, 0.19, 0.14], pattern: 4, shine: 0.03 };
  return (
    <group position={[spec.x, sandY(spec.z) - 0.25, spec.z]} rotation={[0, spec.turn, 0]} scale={spec.scale}>
      {trunk.map((piece, i) => (
        <group key={i} position={piece.mid} quaternion={piece.quaternion}>
          <Prop geometry={segment} look={bark} day={day} scale={[piece.radius, piece.length * 1.04, piece.radius]} />
        </group>
      ))}
      <group position={crown}>
        {[0, 1, 2, 3].map((k) => (
          <Prop
            key={k}
            geometry={nuts}
            look={{ color: [0.24, 0.17, 0.06], shine: 0.25 }}
            day={day}
            position={[Math.cos(k * 1.7) * 0.17, -0.2 - (k % 2) * 0.08, Math.sin(k * 1.7) * 0.17]}
          />
        ))}
        {fronds.map((frond, i) => (
          <Frond key={i} day={day} spec={frond} phase={i * 1.3 + spec.x} />
        ))}
      </group>
    </group>
  );
}

function Headlands({ day }: { day: DayRef }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useDisposable(() => new THREE.PlaneGeometry(1400, 36, 220, 1));
  const uniforms = useMemo(() => ({ uOpacity: { value: 0 } }), []);
  useFrame(() => {
    if (material.current) material.current.uniforms.uOpacity.value = day.current;
  });
  return (
    <mesh geometry={geometry} position={[-330, WATER_Y + 18 - 0.4, -760]} frustumCulled={false} renderOrder={-8}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={headlandVertex} fragmentShader={headlandFragment} transparent />
    </mesh>
  );
}

/* ------------------------------------------------------------------ sky + sea */

const RIPPLE_UNIFORMS = /* glsl */ `
uniform vec3 uPointer;
uniform vec3 uRipple;
`;

/** Pointer ripples and click splashes, bent into the water's surface normal. */
const RIPPLE_NORMAL = /* glsl */ `
  vec2 toPointer = worldPosition.xz - uPointer.xy;
  float pointerDist = length(toPointer);
  float pointerRing = sin(pointerDist * 2.2 - time * 7.0) * exp(-pointerDist * 0.28) * uPointer.z;
  vec2 toRipple = worldPosition.xz - uRipple.xy;
  float rippleDist = length(toRipple);
  float rippleFront = rippleDist - uRipple.z * 7.0;
  float rippleRing = sin(rippleFront * 2.4) * exp(-pow(rippleFront / 2.2, 2.0)) * exp(-uRipple.z * 0.7);
  surfaceNormal = normalize(surfaceNormal
    + vec3(toPointer.x, 0.0, toPointer.y) / max(pointerDist, 0.001) * pointerRing * 0.3
    + vec3(toRipple.x, 0.0, toRipple.y) / max(rippleDist, 0.001) * rippleRing * 0.45);
`;

type SeaProps = { day: DayRef; reduce: boolean; pointer: SeaPointer; pointerActive: DayRef };

export function Sea({ day, reduce, pointer, pointerActive }: SeaProps) {
  const skyRef = useRef<Sky>(null);
  const waterRef = useRef<Water>(null);

  const normals = useDisposable(() => makeWaterNormals());

  const sky = useMemo(() => {
    const s = new Sky();
    s.scale.setScalar(900);
    const u = s.material.uniforms;
    u.turbidity.value = 1.6;
    u.rayleigh.value = 1.4;
    u.mieCoefficient.value = 0.003;
    u.mieDirectionalG.value = 0.8;
    u.cloudCoverage.value = 0.34;
    u.cloudDensity.value = 0.55;
    u.cloudElevation.value = 0.5;
    u.sunPosition.value.copy(SUN_DIR);
    u.uFade = { value: 0 };
    u.uSkyExposure = { value: 0.42 };
    // Fade the physical sky in over the night dome, with its own exposure so it stays blue.
    s.material.fragmentShader =
      "uniform float uFade;\nuniform float uSkyExposure;\n" +
      s.material.fragmentShader.replace("gl_FragColor = vec4( texColor, 1.0 );", "gl_FragColor = vec4( texColor * uSkyExposure, uFade );");
    s.material.transparent = true;
    s.renderOrder = -9;
    s.frustumCulled = false;
    return s;
  }, []);

  const water = useMemo(() => {
    const w = new Water(new THREE.PlaneGeometry(4000, 4000), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunDirection: SUN_DIR.clone(),
      sunColor: 0xfff1dc,
      waterColor: 0x0a5f78,
      distortionScale: 1.4,
      alpha: 0,
      fog: false,
    });
    const m = w.material;
    m.uniforms.uPointer = { value: new THREE.Vector3(0, 999, 0) };
    m.uniforms.uShore = { value: SHORE_Z };
    m.uniforms.uRipple = { value: new THREE.Vector3(0, 999, 20) };
    m.uniforms.size.value = 3.2;
    m.fragmentShader = (RIPPLE_UNIFORMS + "uniform float uShore;\n" + m.fragmentShader)
      .replace(
        "vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );",
        "vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );" + RIPPLE_NORMAL,
      )
      .replace(
        "sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );",
        "sunLight( surfaceNormal, eyeDirection, 420.0, 0.8, 0.5, diffuseLight, specularLight );",
      )
      // Clear, see-through water over the sand near the beach, deepening offshore.
      .replace(
        "gl_FragColor = vec4( outgoingLight, alpha );",
        "gl_FragColor = vec4( outgoingLight, alpha * smoothstep( -0.5, 18.0, uShore - worldPosition.z ) );",
      );
    m.transparent = true;
    w.rotation.x = -Math.PI / 2;
    w.position.y = WATER_Y;
    w.renderOrder = -3;
    w.frustumCulled = false;
    return w;
  }, [normals]);

  useEffect(
    () => () => {
      sky.geometry.dispose();
      sky.material.dispose();
      water.geometry.dispose();
      water.material.dispose();
    },
    [sky, water],
  );

  const helpers = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -WATER_Y),
      hit: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
    }),
    [],
  );
  const rippleAt = useRef(-100);
  const sunColor = useMemo(() => new THREE.Color(0xfff1dc), []);
  const world = useRef<THREE.Group>(null);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const d = day.current;
    const s = skyRef.current;
    const w = waterRef.current;
    const visible = d > 0.005;
    if (world.current) world.current.visible = visible;
    if (s) {
      s.visible = visible;
      s.material.uniforms.uFade.value = d;
      // Fade the sky's brightness with its opacity, so its HDR sun never glares mid-switch.
      s.material.uniforms.uSkyExposure.value = 0.42 * d;
      // Clouds drift slowly on the breeze.
      s.material.uniforms.time.value = reduce ? 0 : state.clock.elapsedTime * 1.2;
    }
    if (!w) return;
    w.visible = visible;
    if (!visible) return;
    const u = w.material.uniforms;
    u.alpha.value = d;
    u.sunColor.value.copy(sunColor).multiplyScalar(d);
    if (!reduce) u.time.value += dt * 0.5;

    // Project the pointer and clicks onto the sea for ripples.
    const p = pointer.current;
    const moved = performance.now() - p.at < 2500 && !reduce;
    helpers.ndc.set(p.x, p.y);
    helpers.raycaster.setFromCamera(helpers.ndc, state.camera);
    if (moved && helpers.raycaster.ray.intersectPlane(helpers.plane, helpers.hit)) {
      u.uPointer.value.set(helpers.hit.x, helpers.hit.z, pointerActive.current);
    } else {
      u.uPointer.value.z = pointerActive.current;
    }
    if (p.ripple.at !== rippleAt.current) {
      rippleAt.current = p.ripple.at;
      helpers.ndc.set(p.ripple.x, p.ripple.y);
      helpers.raycaster.setFromCamera(helpers.ndc, state.camera);
      if (helpers.raycaster.ray.intersectPlane(helpers.plane, helpers.hit)) u.uRipple.value.set(helpers.hit.x, helpers.hit.z, 0);
    } else {
      u.uRipple.value.z = Math.min(20, u.uRipple.value.z + dt);
    }
  });

  return (
    <group ref={world} visible={false}>
      <primitive ref={skyRef} object={sky} />
      <Headlands day={day} />
      <primitive ref={waterRef} object={water} />
      <Surf day={day} reduce={reduce} />
      <Beach day={day} reduce={reduce} />
      <BeachProps day={day} />
      {PALMS.map((palm) => (
        <Palm key={palm.x} spec={palm} day={day} />
      ))}
      <Dolphins day={day} reduce={reduce} />
      <Boats day={day} reduce={reduce} />
      <Gulls day={day} reduce={reduce} />
    </group>
  );
}
