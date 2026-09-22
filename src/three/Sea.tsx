import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { makeWaterNormals } from "./DayGrade";
import { NO_REFLECTION } from "./layers";
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
 * (three.js Sky and Water), a surf zone of breaking waves, a paddleboarder out
 * beyond the break, and a lived-in beach: palms and dune grass in the breeze, loungers under
 * an umbrella, a lifeguard tower with its flag flying, a sandcastle, a kite,
 * gulls wheeling overhead, dolphins, distant sailboats. The name floats over the
 * shoreline in the opening shot, so everything tall stays below or beside it.
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
  /** Cloth ripple: amplitude, wavenumber, speed, axis (0 flag along +x, 1 tail along -y). */
  flutter?: [number, number, number, number];
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
      uTime: { value: 0 },
      uFlutter: { value: new THREE.Vector4(...(look.flutter ?? [0, 0, 0, 0])) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

type PropPlacement = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
};

/** A lit mesh whose opacity follows the scene fade. */
function Prop({
  geometry,
  look,
  day,
  position,
  rotation,
  scale,
}: PropPlacement & { geometry: THREE.BufferGeometry; look: PropLook; day: DayRef }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = usePropUniforms(look);
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uOpacity.value = day.current;
    m.uniforms.uTime.value = state.clock.elapsedTime;
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

/** Shared unit geometries, scaled per use, so dozens of parts cost a handful of buffers. */
function useKit() {
  const box = useDisposable(() => new THREE.BoxGeometry(1, 1, 1));
  const cylinder = useDisposable(() => new THREE.CylinderGeometry(1, 1, 1, 14));
  const sphere = useDisposable(() => new THREE.SphereGeometry(1, 20, 14));
  return { box, cylinder, sphere };
}

type Kit = ReturnType<typeof useKit>;

/** A box-shaped part: size in metres, placed in its parent's frame. */
function Block({ kit, look, day, size, at, rotation }: { kit: Kit; look: PropLook; day: DayRef; size: [number, number, number]; at: [number, number, number]; rotation?: [number, number, number] }) {
  return <Prop geometry={kit.box} look={look} day={day} position={at} rotation={rotation} scale={size} />;
}

/* Where things stand on the beach (x, z). Everything tall sits below or beside the
   name in the opening drone shot, and frames the text in the eye-level views. */
const UMBRELLA = { x: -6.5, z: -16, radius: 1.55, height: 2.35 };
const BOARD = { x: 10.2, z: -15.6, length: 2.1 };
const LOUNGERS = [
  { x: -8.1, z: -14.3, yaw: 0.14 },
  { x: -5.9, z: -13.9, yaw: -0.06 },
];
const COOLER = { x: -4.5, z: -15.2, yaw: 0.4 };
const TOWEL = { x: -3.3, z: -16.9, angle: 0.35 };
const BALL = { x: 1.6, z: -17.3, radius: 0.28 };
const CASTLE = { x: 4.4, z: -17.1 };
const DRIFTWOOD = { x: 7.6, z: -16.9, yaw: 0.35 };
const TOWER = { x: -15.5, z: -19.5, yaw: 0.28 };

/** Direction shadows fall across the sand (away from the sun). */
const AWAY = new THREE.Vector2(-SUN_DIR.x, -SUN_DIR.z).normalize();

const WOOD: PropLook = { color: [0.55, 0.37, 0.22], color2: [0.36, 0.23, 0.13], pattern: 10, shine: 0.12 };
const PAINTED: PropLook = { color: [0.86, 0.84, 0.79], color2: [0.7, 0.67, 0.61], pattern: 10, shine: 0.08 };
const SAND: PropLook = { color: [0.8, 0.64, 0.42], pattern: 8, shine: 0.02 };

/** A wooden sun lounger with a striped cushion, head end towards the land so it faces the sea. */
function Lounger({ kit, day, x, z, yaw }: { kit: Kit; day: DayRef; x: number; z: number; yaw: number }) {
  const cushion: PropLook = { color: [0.05, 0.13, 0.3], color2: [0.9, 0.88, 0.82], pattern: 5, stripes: 3.5, shine: 0.04 };
  const back = -0.9;
  const backAt: [number, number, number] = [0, 0.33 + Math.sin(-back) * 0.39, 0.33 + Math.cos(back) * 0.39];
  const normal = [0, Math.cos(back), Math.sin(back)];
  return (
    <group position={[x, sandY(z) - 0.02, z]} rotation={[0, yaw, 0]}>
      {[-0.3, 0.3].map((side) => (
        <Block key={side} kit={kit} look={WOOD} day={day} size={[0.05, 0.06, 1.9]} at={[side, 0.3, 0]} />
      ))}
      {[-0.3, 0.3].flatMap((side) =>
        [-0.86, 0.86].map((end) => <Block key={`${side}${end}`} kit={kit} look={WOOD} day={day} size={[0.05, 0.3, 0.05]} at={[side, 0.15, end]} />),
      )}
      <Block kit={kit} look={WOOD} day={day} size={[0.6, 0.035, 1.25]} at={[0, 0.33, -0.3]} />
      <Block kit={kit} look={WOOD} day={day} size={[0.6, 0.035, 0.78]} at={backAt} rotation={[back, 0, 0]} />
      <Block kit={kit} look={cushion} day={day} size={[0.56, 0.07, 1.2]} at={[0, 0.385, -0.32]} />
      <Block
        kit={kit}
        look={cushion}
        day={day}
        size={[0.56, 0.07, 0.74]}
        at={[backAt[0], backAt[1] + normal[1] * 0.05, backAt[2] + normal[2] * 0.05]}
        rotation={[back, 0, 0]}
      />
    </group>
  );
}

/** Lifeguard tower on stilts: a painted hut with windows all round, a ramp to the sand and a flag. */
function LifeguardTower({ kit, day }: { kit: Kit; day: DayRef }) {
  const roof = useDisposable(() => new THREE.ConeGeometry(1.25, 0.55, 4, 1));
  const flag = useDisposable(() => {
    const g = new THREE.PlaneGeometry(0.95, 0.6, 18, 4);
    g.translate(0.475, 0, 0);
    return g;
  });
  const glass: PropLook = { color: [0.05, 0.08, 0.11], shine: 0.9 };
  const hut: PropLook = { color: [0.8, 0.87, 0.9], color2: [0.66, 0.74, 0.78], pattern: 10, shine: 0.1 };
  const top = 2.4;
  return (
    <group position={[TOWER.x, sandY(TOWER.z) - 0.05, TOWER.z]} rotation={[0, TOWER.yaw, 0]}>
      {[-0.75, 0.75].flatMap((x) =>
        [-0.75, 0.75].map((z) => <Block key={`${x}${z}`} kit={kit} look={PAINTED} day={day} size={[0.13, top, 0.13]} at={[x, top / 2, z]} />),
      )}
      {[-0.75, 0.75].map((z) => (
        <Block key={`b${z}`} kit={kit} look={PAINTED} day={day} size={[1.5, 0.08, 0.08]} at={[0, 0.9, z]} />
      ))}
      {[-0.75, 0.75].map((x) => (
        <Block key={`s${x}`} kit={kit} look={PAINTED} day={day} size={[0.08, 0.08, 1.5]} at={[x, 0.9, 0]} />
      ))}
      <Block kit={kit} look={PAINTED} day={day} size={[2.0, 0.12, 2.0]} at={[0, top, 0]} />
      <Block kit={kit} look={hut} day={day} size={[1.55, 1.3, 1.35]} at={[0, top + 0.71, 0.1]} />
      {[-1, 1].map((side) => (
        <Block key={`w${side}`} kit={kit} look={glass} day={day} size={[1.2, 0.48, 0.02]} at={[0, top + 0.95, 0.1 + side * 0.68]} />
      ))}
      {[-1, 1].map((side) => (
        <Block key={`v${side}`} kit={kit} look={glass} day={day} size={[0.02, 0.48, 0.95]} at={[side * 0.78, top + 0.95, 0.1]} />
      ))}
      <Prop geometry={roof} look={{ color: [0.7, 0.14, 0.08], shine: 0.2 }} day={day} position={[0, top + 1.36 + 0.27, 0.1]} rotation={[0, Math.PI / 4, 0]} />
      {/* Railing round the sea side of the deck. */}
      {[-0.97, 0.97].map((x) => (
        <Block key={`p${x}`} kit={kit} look={PAINTED} day={day} size={[0.05, 0.62, 0.05]} at={[x, top + 0.34, -0.97]} />
      ))}
      <Block kit={kit} look={PAINTED} day={day} size={[2.0, 0.05, 0.05]} at={[0, top + 0.62, -0.97]} />
      {/* Ramp down to the sand on the land side. */}
      <Block kit={kit} look={PAINTED} day={day} size={[0.75, 0.07, 3.3]} at={[0.35, top / 2, 1.0 + 1.15]} rotation={[0.806, 0, 0]} />
      <Prop geometry={kit.cylinder} look={{ color: [0.75, 0.75, 0.74], shine: 0.5 }} day={day} position={[0.72, top + 2.2, -0.45]} scale={[0.028, 1.7, 0.028]} />
      <Prop
        geometry={flag}
        look={{ color: [0.8, 0.07, 0.05], color2: [0.97, 0.78, 0.08], pattern: 9, shine: 0.05, flutter: [0.1, 5.5, 7.5, 0] }}
        day={day}
        position={[0.75, top + 2.72, -0.45]}
        rotation={[0, 0.5, 0]}
      />
    </group>
  );
}

/** A sandcastle with turrets and a little flag, and the bucket and spade that built it. */
function Sandcastle({ kit, day }: { kit: Kit; day: DayRef }) {
  const mound = useDisposable(() => new THREE.CylinderGeometry(0.5, 0.64, 0.22, 24));
  const keep = useDisposable(() => new THREE.CylinderGeometry(0.2, 0.24, 0.42, 18));
  const turret = useDisposable(() => new THREE.CylinderGeometry(0.1, 0.125, 0.26, 14));
  const spire = useDisposable(() => new THREE.ConeGeometry(0.12, 0.15, 14));
  const bucket = useDisposable(() => new THREE.CylinderGeometry(0.17, 0.13, 0.27, 22, 1, true));
  const flag = useDisposable(() => {
    const g = new THREE.PlaneGeometry(0.17, 0.1, 8, 2);
    g.translate(0.085, 0, 0);
    return g;
  });
  const y = sandY(CASTLE.z);
  const turrets: [number, number][] = [
    [0.36, 0.1],
    [-0.3, 0.22],
    [0.05, -0.38],
  ];
  return (
    <group position={[CASTLE.x, y, CASTLE.z]} rotation={[0, 0.3, 0]}>
      <Prop geometry={mound} look={SAND} day={day} position={[0, 0.06, 0]} />
      <Prop geometry={keep} look={SAND} day={day} position={[0, 0.38, 0]} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return <Block key={i} kit={kit} look={SAND} day={day} size={[0.07, 0.08, 0.07]} at={[Math.cos(a) * 0.17, 0.63, Math.sin(a) * 0.17]} rotation={[0, -a, 0]} />;
      })}
      {turrets.map(([tx, tz]) => (
        <group key={tx} position={[tx, 0.3, tz]}>
          <Prop geometry={turret} look={SAND} day={day} />
          <Prop geometry={spire} look={SAND} day={day} position={[0, 0.2, 0]} />
        </group>
      ))}
      <Prop geometry={kit.cylinder} look={{ color: [0.6, 0.5, 0.4] }} day={day} position={[0, 0.8, 0]} scale={[0.007, 0.34, 0.007]} />
      <Prop geometry={flag} look={{ color: [0.85, 0.2, 0.1], shine: 0.05, flutter: [0.18, 26, 9, 0] }} day={day} position={[0.008, 0.92, 0]} />
      {/* The bucket lies tipped on its side; the spade beside it. */}
      <Prop geometry={bucket} look={{ color: [0.82, 0.2, 0.09], shine: 0.5 }} day={day} position={[0.95, 0.15, 0.45]} rotation={[0.2, 0.6, Math.PI / 2]} />
      <group position={[-0.85, 0.03, 0.55]} rotation={[0, -0.7, 0]}>
        <Block kit={kit} look={{ color: [0.95, 0.74, 0.08], shine: 0.4 }} day={day} size={[0.035, 0.035, 0.42]} at={[0, 0, 0]} />
        <Block kit={kit} look={{ color: [0.95, 0.74, 0.08], shine: 0.4 }} day={day} size={[0.17, 0.02, 0.19]} at={[0, 0, 0.29]} />
      </group>
    </group>
  );
}

function BeachProps({ day }: { day: DayRef }) {
  const kit = useKit();
  const pole = useDisposable(() => new THREE.CylinderGeometry(0.035, 0.035, UMBRELLA.height + 0.3, 8));
  const canopy = useDisposable(() => new THREE.ConeGeometry(UMBRELLA.radius, 0.55, 32, 1, true));
  const cap = useDisposable(() => new THREE.SphereGeometry(0.06, 12, 8));
  const log = useDisposable(() => new THREE.CylinderGeometry(0.09, 0.15, 2.3, 12, 4));
  const board = useDisposable(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.27, BOARD.length / 2, 0, Math.PI * 2, false, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 32 });
    g.translate(0, 0, -0.025);
    return g;
  });
  const baseY = sandY(UMBRELLA.z);
  const boardY = sandY(BOARD.z);
  const driftwood: PropLook = { color: [0.68, 0.62, 0.54], color2: [0.45, 0.4, 0.34], pattern: 10, shine: 0.05 };
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
      {LOUNGERS.map((l) => (
        <Lounger key={l.x} kit={kit} day={day} x={l.x} z={l.z} yaw={l.yaw} />
      ))}
      <group position={[COOLER.x, sandY(COOLER.z), COOLER.z]} rotation={[0, COOLER.yaw, 0]}>
        <Block kit={kit} look={{ color: [0.08, 0.32, 0.62], shine: 0.35 }} day={day} size={[0.6, 0.34, 0.38]} at={[0, 0.17, 0]} />
        <Block kit={kit} look={{ color: [0.92, 0.92, 0.89], shine: 0.3 }} day={day} size={[0.63, 0.07, 0.41]} at={[0, 0.375, 0]} />
        <Block kit={kit} look={{ color: [0.92, 0.92, 0.89], shine: 0.3 }} day={day} size={[0.34, 0.03, 0.05]} at={[0, 0.43, 0]} />
      </group>
      <Prop
        geometry={kit.sphere}
        look={{ color: [1, 1, 1], pattern: 7, stripes: 1, shine: 0.7 }}
        day={day}
        position={[BALL.x, sandY(BALL.z) + BALL.radius * 0.92, BALL.z]}
        rotation={[0.35, 0.8, 0.25]}
        scale={BALL.radius}
      />
      <Sandcastle kit={kit} day={day} />
      <group position={[DRIFTWOOD.x, sandY(DRIFTWOOD.z) + 0.07, DRIFTWOOD.z]} rotation={[0, DRIFTWOOD.yaw, 0]}>
        <Prop geometry={log} look={driftwood} day={day} rotation={[0, 0, Math.PI / 2]} />
        <Prop geometry={kit.cylinder} look={driftwood} day={day} position={[0.45, 0.12, 0.22]} rotation={[0.9, 0.4, 1.1]} scale={[0.045, 0.75, 0.045]} />
      </group>
      <LifeguardTower kit={kit} day={day} />
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

/** Ref callback: draw this object, but keep it out of the sea's reflection. */
const skipReflection = (object: THREE.Object3D | null) => {
  object?.layers.set(NO_REFLECTION);
};

/** Palm shadows for the sand shader: trunk base, where the crown's shadow lands, and its size. */
function palmShadowUniforms() {
  const a = PALMS.map((spec) => {
    const crown = crownOf(spec);
    const drop = crown.y - sandY(spec.z);
    // Same shortened throw as the umbrella's shadow, so the beach reads as one light.
    return new THREE.Vector4(spec.x, spec.z, crown.x + AWAY.x * drop * 0.9, crown.z + AWAY.y * drop * 0.9);
  });
  const b = PALMS.map((spec) => new THREE.Vector4(3.1 * spec.scale, 0.5 * spec.scale, spec.x * 1.3, 0));
  return { uPalmA: { value: a }, uPalmB: { value: b } };
}

/** Soft contact shadows under the props, thrown a little away from the sun. */
function contactShadows() {
  const at = (x: number, z: number, height: number, rx: number, rz: number) =>
    new THREE.Vector4(x + AWAY.x * height * 0.9, z + AWAY.y * height * 0.9, rx, rz);
  return [
    ...LOUNGERS.map((l) => at(l.x, l.z, 0.35, 0.45, 1.15)),
    at(COOLER.x, COOLER.z, 0.2, 0.42, 0.34),
    at(BALL.x, BALL.z, 0.25, 0.32, 0.28),
    at(CASTLE.x, CASTLE.z, 0.3, 0.72, 0.64),
    at(DRIFTWOOD.x, DRIFTWOOD.z, 0.08, 1.2, 0.3),
    at(TOWER.x, TOWER.z, 1.2, 1.25, 1.15),
    at(TOWER.x, TOWER.z, 3.1, 1.05, 1.0),
  ];
}

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
      uTowel: { value: new THREE.Vector3(TOWEL.x, TOWEL.z, TOWEL.angle) },
      ...palmShadowUniforms(),
      uBlobs: { value: contactShadows() },
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
    <mesh geometry={geometry} frustumCulled={false} renderOrder={-4} ref={skipReflection}>
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
    <mesh geometry={geometry} frustumCulled={false} renderOrder={-2} ref={skipReflection}>
      {/* A depth bias keeps the surf, a few centimetres above the sea plane, from
          flickering against it in the distance as the camera moves. */}
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={surfVertex}
        fragmentShader={surfFragment}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-4}
      />
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

/* ------------------------------------------------------------------ life: gulls, kite, surfer */

function useGullParts() {
  const body = useDisposable(() => {
    const radii = [0, 0.03, 0.05, 0.058, 0.06, 0.055, 0.045, 0.032, 0.02, 0.01, 0];
    const points = radii.map((r, i) => new THREE.Vector2(r, -0.26 + (i / (radii.length - 1)) * 0.5));
    const g = new THREE.LatheGeometry(points, 14);
    g.rotateZ(-Math.PI / 2);
    g.scale(1, 0.85, 1);
    return g;
  });
  const wing = useDisposable(() => {
    // A long, swept gull wing; span runs along +z from the shoulder.
    const s = new THREE.Shape();
    s.moveTo(0.07, 0);
    s.quadraticCurveTo(0.12, 0.28, 0.02, 0.5);
    s.quadraticCurveTo(-0.04, 0.62, -0.12, 0.72);
    s.quadraticCurveTo(-0.1, 0.56, -0.12, 0.42);
    s.quadraticCurveTo(-0.1, 0.2, -0.09, 0);
    s.closePath();
    const g = new THREE.ShapeGeometry(s, 10);
    g.rotateX(Math.PI / 2);
    return g;
  });
  const tail = useDisposable(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.05);
    s.lineTo(-0.14, -0.07);
    s.lineTo(-0.14, 0.07);
    s.lineTo(0, 0.05);
    s.closePath();
    const g = new THREE.ShapeGeometry(s, 1);
    g.rotateX(Math.PI / 2);
    g.translate(-0.2, 0, 0);
    return g;
  });
  const head = useDisposable(() => new THREE.SphereGeometry(0.045, 12, 8));
  const beak = useDisposable(() => {
    const g = new THREE.ConeGeometry(0.012, 0.06, 6);
    g.rotateZ(-Math.PI / 2);
    return g;
  });
  return { body, wing, tail, head, beak };
}

const GULL_WHITE: PropLook = { color: [0.9, 0.9, 0.88], shine: 0.1 };
const GULL_WING: PropLook = { color: [0.5, 0.55, 0.6], color2: [0.03, 0.03, 0.035], pattern: 6, stripes: 0.72, shine: 0.05 };
const SOARING = [
  { radius: 11, speed: 0.2, height: 11, phase: 0, center: [-3, -30] as [number, number] },
  { radius: 8, speed: -0.24, height: 13.5, phase: 2.1, center: [4, -34] as [number, number] },
  { radius: 14, speed: 0.16, height: 9, phase: 4.2, center: [-6, -38] as [number, number] },
];

/** A few gulls wheeling over the beach: long glides, the odd burst of wingbeats, banking into the turn. */
function SoaringGulls({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const parts = useGullParts();
  const birds = useRef<Array<{ root: THREE.Group | null; left: THREE.Group | null; right: THREE.Group | null }>>(
    SOARING.map(() => ({ root: null, left: null, right: null })),
  );
  useFrame((state) => {
    const t = reduce ? 0 : state.clock.elapsedTime;
    SOARING.forEach((spec, i) => {
      const bird = birds.current[i];
      if (!bird.root || !bird.left || !bird.right) return;
      bird.root.visible = day.current > 0.01;
      const angle = t * spec.speed + spec.phase;
      const x = spec.center[0] + Math.cos(angle) * spec.radius;
      const z = spec.center[1] + Math.sin(angle) * spec.radius;
      const y = spec.height + Math.sin(t * 0.3 + spec.phase) * 1.4;
      bird.root.position.set(x, y, z);
      const vx = -Math.sin(angle) * spec.speed;
      const vz = Math.cos(angle) * spec.speed;
      const yaw = Math.atan2(-vz, vx);
      const bank = Math.sign(spec.speed) * 0.32;
      bird.root.rotation.set(bank, yaw, Math.sin(t * 0.3 + spec.phase) * 0.06, "YXZ");
      // Mostly gliding; every so often a few strong wingbeats.
      const burst = Math.max(0, Math.sin(t * 0.37 + i * 2.3) - 0.72) * 3.6;
      const flap = Math.sin(t * 9 + i) * burst;
      bird.right.rotation.x = -0.12 - flap * 0.55;
      bird.left.rotation.x = 0.12 + flap * 0.55;
    });
  });
  return (
    <>
      {SOARING.map((spec, i) => (
        <group
          key={spec.phase}
          visible={false}
          scale={1.05}
          ref={(el) => {
            birds.current[i].root = el;
          }}
        >
          <Prop geometry={parts.body} look={GULL_WHITE} day={day} />
          <Prop geometry={parts.head} look={GULL_WHITE} day={day} position={[0.22, 0.03, 0]} />
          <Prop geometry={parts.beak} look={{ color: [0.9, 0.7, 0.12] }} day={day} position={[0.28, 0.025, 0]} />
          <Prop geometry={parts.tail} look={GULL_WHITE} day={day} />
          <group
            position={[0.02, 0.02, 0.04]}
            ref={(el) => {
              birds.current[i].right = el;
            }}
          >
            <Prop geometry={parts.wing} look={GULL_WING} day={day} />
          </group>
          <group
            position={[0.02, 0.02, -0.04]}
            scale={[1, 1, -1]}
            ref={(el) => {
              birds.current[i].left = el;
            }}
          >
            <Prop geometry={parts.wing} look={GULL_WING} day={day} />
          </group>
        </group>
      ))}
    </>
  );
}

const KITE = { x: 6, y: 14, z: -34 };
/** The flyer stands behind the viewer, so the line runs in from the bottom of the frame. */
const KITE_ANCHOR = new THREE.Vector3(3.5, -2.2, 5);

/** A diamond kite swooping in lazy figure-eights on the sea breeze, its tail rippling. */
function Kite({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const kite = useRef<THREE.Group>(null);
  const halves = useDisposable(() => {
    const g = new THREE.BufferGeometry();
    // Left half then right half of the diamond, each its own colour group.
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.75, 0, -0.45, 0.12, 0, 0, -0.55, 0], 3));
    g.computeVertexNormals();
    return g;
  });
  const right = useDisposable(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.75, 0, 0, -0.55, 0, 0.45, 0.12, 0], 3));
    g.computeVertexNormals();
    return g;
  });
  const tail = useDisposable(() => {
    const g = new THREE.PlaneGeometry(0.07, 2.8, 1, 36);
    g.translate(0, -1.4, 0);
    return g;
  });
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(32 * 3), 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Vector3(0.3, 0.3, 0.32) }, uOpacity: { value: 0 }, uHaze: { value: 0.15 } },
      vertexShader: flatVertex,
      fragmentShader: flatFragment,
      transparent: true,
    });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, []);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  const lineRef = useRef<THREE.Line>(null);
  const bridle = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const g = kite.current;
    const string = lineRef.current;
    if (!g || !string) return;
    const t = reduce ? 0 : state.clock.elapsedTime;
    g.visible = day.current > 0.01;
    string.visible = g.visible;
    const sx = Math.sin(t * 0.45);
    g.position.set(KITE.x + sx * 2.4, KITE.y + Math.sin(t * 0.9) * 0.9 + Math.sin(t * 0.31) * 0.5, KITE.z);
    g.rotation.set(-0.35, 0, -Math.cos(t * 0.45) * 0.4);
    g.updateMatrixWorld();
    bridle.set(0, 0.05, 0).applyMatrix4(g.matrixWorld);
    // The line sags a little between the kite and the flyer.
    const positions = string.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 32; i++) {
      const u = i / 31;
      const x = bridle.x + (KITE_ANCHOR.x - bridle.x) * u;
      const y = bridle.y + (KITE_ANCHOR.y - bridle.y) * u - Math.sin(u * Math.PI) * 1.6;
      const z = bridle.z + (KITE_ANCHOR.z - bridle.z) * u;
      positions.setXYZ(i, x, y, z);
    }
    positions.needsUpdate = true;
    // From high above the line would cut straight across the name; it only shows near eye level.
    state.camera.getWorldDirection(look);
    const m = string.material as THREE.ShaderMaterial;
    m.uniforms.uOpacity.value = day.current * 0.75 * (1 - smoothstepJs(0.3, 0.6, -look.y));
  });
  return (
    <>
      <group ref={kite} visible={false}>
        <Prop geometry={halves} look={{ color: [0.86, 0.22, 0.12], shine: 0.15 }} day={day} />
        <Prop geometry={right} look={{ color: [0.97, 0.76, 0.12], shine: 0.15 }} day={day} />
        <Prop geometry={tail} look={{ color: [0.1, 0.45, 0.62], shine: 0.05, flutter: [0.1, 3.2, 6.5, 1] }} day={day} position={[0, -0.55, 0]} />
      </group>
      <primitive object={line} ref={lineRef} />
    </>
  );
}

/* The surf model, ported from surfVertex so the paddleboarder rides the rendered swell. */
const SURF_SPEED = 5.5;
const SURF_SPACING = 24;
const fract = (v: number) => v - Math.floor(v);
const glslMod = (a: number, b: number) => a - b * Math.floor(a / b);
const smoothstepJs = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const hash21 = (x: number, y: number) => {
  let px = fract(x * 233.34);
  let py = fract(y * 851.73);
  const d = px * (px + 23.45) + py * (py + 23.45);
  px += d;
  py += d;
  return fract(px * py);
};
const vnoise = (x: number, y: number) => {
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

/** Rendered height at a world position, allowing for the crest leaning shoreward in surfVertex. */
function surfHeight(x: number, D: number, t: number) {
  const guess = surfAt(x, D, t);
  return surfAt(x, D + guess.crest * 0.55, t).h;
}

const SUP_LANE = 56; // metres out from the shore: beyond the break, where the swell is gentle
const SUP_RANGE: [number, number] = [-18, 22];
const STROKE = 1.7; // seconds per paddle stroke

/**
 * A stand-up paddleboarder cruising along beyond the break: steady strokes that
 * surge the board forward, switching sides every few strokes, rising and falling
 * gently on the swell, and turning slowly at each end of the run.
 */
function PaddleBoarder({ day, reduce }: { day: DayRef; reduce: boolean }) {
  const kit = useKit();
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const stroke = useRef<THREE.Group>(null);
  const opacity = useRef(0);
  const board = useDisposable(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 1.6, 0.38, 0, Math.PI * 2, false, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 28 });
    g.rotateX(-Math.PI / 2);
    return g;
  });
  const blade = useDisposable(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, 0.1, 0.22, 0, Math.PI * 2, false, 0);
    return new THREE.ShapeGeometry(shape, 12);
  });
  const motion = useRef({ x: SUP_RANGE[0] + 6, dir: 1, heading: 0, y: 0, pitch: 0, roll: 0, strokes: 0 });
  const tools = useMemo(() => ({ yaw: new THREE.Quaternion(), tilt: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), normal: new THREE.Vector3() }), []);
  const suit: PropLook = { color: [0.06, 0.1, 0.14], shine: 0.25 };
  const skin: PropLook = { color: [0.5, 0.32, 0.22], shine: 0.1 };

  useFrame((state, rawDelta) => {
    const g = root.current;
    if (!g) return;
    opacity.current = reduce ? 0 : day.current;
    g.visible = opacity.current > 0.01;
    if (!g.visible) return;
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const m = motion.current;

    // Each stroke pulls the board on; it coasts and slows between strokes.
    const phase = (t / STROKE) % 1;
    const power = phase < 0.45 ? Math.sin((phase / 0.45) * Math.PI) : 0;
    const speed = 0.75 + power * 0.7;
    const turning = (m.dir > 0 && m.x > SUP_RANGE[1]) || (m.dir < 0 && m.x < SUP_RANGE[0]);
    if (turning) m.dir *= -1;
    const targetHeading = m.dir > 0 ? 0 : Math.PI;
    m.heading = THREE.MathUtils.damp(m.heading, targetHeading, 0.45, dt);
    m.x += Math.cos(m.heading) * speed * dt;

    // Ride the swell: follow a softened surface height and slope so it never snaps.
    const D = SUP_LANE;
    const h = surfHeight(m.x, D, t);
    const slopeD = (surfHeight(m.x, D + 1.5, t) - surfHeight(m.x, D - 1.5, t)) / 3;
    const slopeX = (surfHeight(m.x + 1.5, D, t) - surfHeight(m.x - 1.5, D, t)) / 3;
    m.y = THREE.MathUtils.damp(m.y, h, 3, dt);
    m.pitch = THREE.MathUtils.damp(m.pitch, slopeD, 2.5, dt);
    m.roll = THREE.MathUtils.damp(m.roll, slopeX, 2.5, dt);
    g.position.set(m.x, -3.99 + m.y + Math.sin(t * 1.7) * 0.015, SHORE_Z - D);
    tools.yaw.setFromAxisAngle(tools.up, m.heading);
    tools.normal.set(-m.roll * 0.8, 1, m.pitch * 0.8).normalize();
    tools.tilt.setFromUnitVectors(tools.up, tools.normal);
    g.quaternion.copy(tools.tilt).multiply(tools.yaw);

    // The paddle reaches forward, pulls back through the water, lifts and recovers.
    const s = stroke.current;
    if (s) {
      const swing = phase < 0.45 ? THREE.MathUtils.lerp(0.55, -0.45, phase / 0.45) : THREE.MathUtils.lerp(-0.45, 0.55, (phase - 0.45) / 0.55);
      const lifted = phase < 0.45 ? 0 : Math.sin(((phase - 0.45) / 0.55) * Math.PI) * 0.18;
      s.rotation.set(lifted, 0, swing);
      // Switch sides every four strokes.
      const side = Math.floor(t / STROKE / 4) % 2 === 0 ? 1 : -1;
      s.scale.z = side;
    }
    if (body.current) body.current.rotation.z = -0.08 - power * 0.12;
  });

  const limb = (from: [number, number, number], to: [number, number, number], radius: number, look: PropLook, key: string) => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    return <Prop key={key} geometry={kit.cylinder} look={look} day={opacity} position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]} scale={[radius, a.distanceTo(b), radius]} />;
  };

  return (
    <group ref={root} visible={false}>
      <Prop geometry={board} look={{ color: [0.94, 0.93, 0.9], color2: [0.05, 0.45, 0.5], pattern: 2, stripes: 8, shine: 0.6 }} day={opacity} />
      {/* Standing tall with soft knees, hips square to the nose. */}
      <group ref={body} position={[0, 0.1, 0]}>
        {limb([0.05, 0.02, 0.16], [0.1, 0.48, 0.14], 0.055, suit, "shinL")}
        {limb([0.1, 0.48, 0.14], [0.02, 0.92, 0.1], 0.07, suit, "thighL")}
        {limb([0.05, 0.02, -0.16], [0.1, 0.48, -0.14], 0.055, suit, "shinR")}
        {limb([0.1, 0.48, -0.14], [0.02, 0.92, -0.1], 0.07, suit, "thighR")}
        {limb([0.02, 0.9, 0], [0.06, 1.48, 0], 0.14, suit, "torso")}
        <Prop geometry={kit.sphere} look={skin} day={opacity} position={[0.08, 1.66, 0]} scale={0.105} />
        <Prop geometry={kit.sphere} look={{ color: [0.07, 0.05, 0.04] }} day={opacity} position={[0.05, 1.7, 0]} scale={[0.105, 0.09, 0.105]} />
        {/* Arms and paddle swing together from the shoulders. */}
        <group ref={stroke} position={[0.06, 1.42, 0]}>
          {limb([0, 0, 0.14], [0.32, 0.12, 0.24], 0.042, skin, "armTop")}
          {limb([0, 0, -0.14], [0.34, -0.42, 0.24], 0.042, skin, "armLow")}
          <Prop geometry={kit.cylinder} look={{ color: [0.12, 0.12, 0.13], shine: 0.5 }} day={opacity} position={[0.34, -0.55, 0.24]} rotation={[0, 0, -0.03]} scale={[0.016, 1.95, 0.016]} />
          <Prop geometry={blade} look={{ color: [0.9, 0.35, 0.12], shine: 0.3 }} day={opacity} position={[0.37, -1.5, 0.24]} rotation={[0, Math.PI / 2, 0]} />
        </group>
      </group>
    </group>
  );
}

/** Tufts of marram grass round the palms and the tower, combing in the breeze. */
function DuneGrass({ day }: { day: DayRef }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const geometry = useDisposable(() => {
    const tufts: [number, number, number][] = [
      [11.7, -14.7, 1],
      [14.4, -16.4, 0.9],
      [16.5, -16.3, 0.8],
      [18.9, -18.3, 1],
      [-13.1, -11.8, 1],
      [-15.8, -13.4, 0.85],
      [-18.2, -16.4, 0.9],
      [-20.6, -18.4, 1],
      [-13.4, -18.6, 0.8],
      [-17.4, -20.8, 0.7],
      [12.2, -11.4, 0.7],
    ];
    const random = seeded(4242);
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const along: number[] = [];
    const tips: number[] = [];
    const index: number[] = [];
    for (const [tx, tz, size] of tufts) {
      const baseY = sandY(tz) - 0.02;
      const blades = 34;
      for (let b = 0; b < blades; b++) {
        const angle = random() * Math.PI * 2;
        const spread = random() * 0.22 * size;
        const root = new THREE.Vector3(tx + Math.cos(angle) * spread, baseY, tz + Math.sin(angle) * spread);
        const height = (0.35 + random() * 0.5) * size;
        const lean = 0.15 + random() * 0.45;
        const out = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const across = new THREE.Vector3(-out.z, 0, out.x);
        const width = 0.022 + random() * 0.012;
        const shade = 0.75 + random() * 0.5;
        const base = new THREE.Color(0.24, 0.26, 0.1).multiplyScalar(shade);
        const tip = new THREE.Color(0.55, 0.47, 0.25).multiplyScalar(shade);
        const start = positions.length / 3;
        const segments = 4;
        for (let k = 0; k <= segments; k++) {
          const u = k / segments;
          const p = root.clone().addScaledVector(out, lean * height * u * u).add(new THREE.Vector3(0, height * (u - lean * 0.35 * u * u), 0));
          const w = width * (1 - u * 0.92);
          const c = base.clone().lerp(tip, u);
          const normal = new THREE.Vector3().crossVectors(across, new THREE.Vector3(0, 1, 0).addScaledVector(out, lean)).normalize();
          for (const side of [-1, 1]) {
            const v = p.clone().addScaledVector(across, (side * w) / 2);
            positions.push(v.x, v.y, v.z);
            normals.push(normal.x, normal.y, normal.z);
            colors.push(c.r, c.g, c.b);
            along.push(u * 0.55);
            tips.push(u * 0.4);
          }
        }
        for (let k = 0; k < segments; k++) {
          const a = start + k * 2;
          index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
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
  });
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPhase: { value: 0.7 }, uOpacity: { value: 0 }, uSunDir: { value: SUN_DIR.clone() } }), []);
  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime * 1.4;
    m.uniforms.uOpacity.value = day.current;
  });
  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={frondVertex} fragmentShader={frondFragment} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ palms + headlands */

type PalmSpec = { x: number; z: number; lean: number; turn: number; height: number; scale: number };

const PALMS: PalmSpec[] = [
  { x: 13, z: -15.5, lean: -0.3, turn: 0.25, height: 8.6, scale: 1 },
  { x: 17.8, z: -17.2, lean: -0.2, turn: -0.35, height: 7, scale: 0.9 },
  { x: -14.5, z: -12.5, lean: 0.28, turn: -0.2, height: 7.8, scale: 0.95 },
  { x: -19.5, z: -17.2, lean: 0.14, turn: 0.5, height: 5.4, scale: 0.8 },
];

/** Where a palm's crown ends up, in world space (matches the Palm group transform). */
function crownOf(spec: PalmSpec) {
  const reach = spec.lean * spec.height * spec.scale;
  return new THREE.Vector3(
    spec.x + reach * Math.cos(spec.turn),
    sandY(spec.z) - 0.25 + spec.height * spec.scale,
    spec.z - reach * Math.sin(spec.turn),
  );
}

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
      <DuneGrass day={day} />
      {PALMS.map((palm) => (
        <Palm key={palm.x} spec={palm} day={day} />
      ))}
      <PaddleBoarder day={day} reduce={reduce} />
      <Dolphins day={day} reduce={reduce} />
      <Boats day={day} reduce={reduce} />
      <Gulls day={day} reduce={reduce} />
      <SoaringGulls day={day} reduce={reduce} />
      <Kite day={day} reduce={reduce} />
    </group>
  );
}
