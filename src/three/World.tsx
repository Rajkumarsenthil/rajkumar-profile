import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { BloomEffect, VignetteEffect } from "postprocessing";
import type { MotionValue } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { markWorldReady } from "../lib/events";
import { sound } from "../lib/sound";
import { getScene } from "../lib/scene";
import {
  auroraFragment,
  auroraVertex,
  blendFragment,
  glowFragment,
  glowVertex,
  skyFragment,
  skyVertex,
  starsVertex,
  streamVertex,
  terrainVertex,
} from "./shaders";
import { DayGradeEffect } from "./DayGrade";
import { Sea } from "./Sea";
import { TitleParticles } from "./TitleParticles";

/**
 * Two worlds. Sky: a night flight over a point-cloud mountain range, with a
 * glowing stream of "events", aurora and interactive stars. Water: a realistic
 * beach by day (see Sea.tsx). Switching blends one into the other over the same
 * eased 2.4 s as the page colours. Each page section has its own camera framing.
 */

/**
 * Premultiplied blending for point layers: the shader writes alpha 0 at night
 * (pure additive glow) and real alpha by day (painted over a bright sky).
 */
const POINT_BLEND = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;


const DEPTH = 170;
const NEAR = 6;
const HALF_WIDTH = 56;

type Frame = {
  camY: number;
  lookY: number;
  lookZ: number;
  terrain: number;
  stars: number;
  /** Aurora curtain strength in the sky. */
  aurora: number;
  /** 0 = moonlit blue ridges, 1 = violet-lit ridges. */
  violet: number;
};

/** High above the valley, looking down at the stream: where the intro dive starts. */
const DIVE: Frame = { camY: 48, lookY: -40, lookZ: -34, terrain: 1.1, stars: 1.3, aurora: 0.7, violet: 0 };

const FRAMES: Record<string, Frame> = {
  top: { camY: 4.2, lookY: 1.6, lookZ: -60, terrain: 1, stars: 1, aurora: 0.75, violet: 0.1 },
  statement: { camY: 6.5, lookY: 0.5, lookZ: -60, terrain: 0.7, stars: 0.9, aurora: 0.95, violet: 0.2 },
  work: { camY: 3.4, lookY: -1.6, lookZ: -40, terrain: 0.6, stars: 0.7, aurora: 0.55, violet: 0.15 },
  experience: { camY: 11, lookY: 4, lookZ: -70, terrain: 0.5, stars: 1, aurora: 1.15, violet: 0.35 },
  skills: { camY: 5, lookY: 1, lookZ: -60, terrain: 0.55, stars: 0.9, aurora: 0.9, violet: 0.5 },
  about: { camY: 2.4, lookY: 3.6, lookZ: -60, terrain: 0.65, stars: 1.1, aurora: 0.85, violet: 0.8 },
  contact: { camY: 3, lookY: 42, lookZ: -60, terrain: 0.85, stars: 1.7, aurora: 1.2, violet: 0.4 },
};

const SECTION_ORDER = ["top", "statement", "work", "experience", "skills", "about", "contact"];

type Quality = "high" | "low";

const COUNTS: Record<Quality, { cols: number; rows: number; stream: number; stars: number; titles: number }> = {
  high: { cols: 280, rows: 380, stream: 3000, stars: 9000, titles: 14000 },
  low: { cols: 190, rows: 250, stream: 1600, stars: 4500, titles: 8000 },
};

/** Deterministic PRNG (mulberry32) so geometry is identical between mounts. */
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

function useTerrainGeometry(quality: Quality) {
  const geometry = useMemo(() => {
    const { cols, rows } = COUNTS[quality];
    const random = seeded(7);
    const count = cols * rows;
    const positions = new Float32Array(count * 3);
    const rands = new Float32Array(count);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions[i * 3] = -HALF_WIDTH + ((c + random() * 0.8) / cols) * HALF_WIDTH * 2;
        positions[i * 3 + 2] = ((r + random() * 0.8) / rows) * DEPTH;
        rands[i] = random();
        i++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));
    return g;
  }, [quality]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function useStreamGeometry(quality: Quality) {
  const geometry = useMemo(() => {
    const count = COUNTS[quality].stream;
    const random = seeded(21);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const lanes = new Float32Array(count);
    const rands = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = random();
      // Roughly gaussian lane spread keeps the stream dense in the middle.
      lanes[i] = (random() + random() + random() - 1.5) / 1.5;
      rands[i] = random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aLane", new THREE.BufferAttribute(lanes, 1));
    g.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));
    return g;
  }, [quality]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function useStarGeometry(quality: Quality) {
  const geometry = useMemo(() => {
    const count = COUNTS[quality].stars;
    const random = seeded(99);
    const positions = new Float32Array(count * 3);
    const rands = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Only the half of the sky in front of the camera, so every star can be seen.
      const theta = Math.PI * (1.05 + random() * 0.9);
      const elevation = Math.asin(0.02 + Math.pow(random(), 1.4) * 0.98);
      const radius = 420;
      positions[i * 3] = Math.cos(elevation) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(elevation) * radius;
      positions[i * 3 + 2] = Math.cos(elevation) * Math.sin(theta) * radius;
      rands[i] = random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));
    return g;
  }, [quality]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}


type Stop = { at: number; frame: Frame };

/** Scroll offsets where each section's camera framing takes over. */
function useSectionStops() {
  const stops = useRef<Stop[]>([{ at: 0, frame: DIVE }]);
  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      const hero = document.getElementById("top");
      // The hero is pinned for an extra screen: the dive happens across that scroll.
      const diveEnd = hero ? Math.max(vh * 0.5, hero.offsetHeight - vh * 1.05) : vh * 0.85;
      const next: Stop[] = [
        { at: 0, frame: DIVE },
        { at: diveEnd, frame: FRAMES.top },
      ];
      SECTION_ORDER.forEach((id) => {
        if (id === "top") return;
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        next.push({ at: Math.max(diveEnd + 1, top - vh * 0.4), frame: FRAMES[id] });
      });
      next.sort((a, b) => a.at - b.at);
      stops.current = next;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return stops;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function frameAt(stops: Stop[], y: number): Frame {
  if (y <= stops[0].at) return stops[0].frame;
  const last = stops[stops.length - 1];
  if (y >= last.at) return last.frame;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (y >= a.at && y < b.at) {
      const t = smooth((y - a.at) / Math.max(1, b.at - a.at));
      const mix = (key: keyof Frame) => a.frame[key] + (b.frame[key] - a.frame[key]) * t;
      return {
        camY: mix("camY"),
        lookY: mix("lookY"),
        lookZ: mix("lookZ"),
        terrain: mix("terrain"),
        stars: mix("stars"),
        aurora: mix("aurora"),
        violet: mix("violet"),
      };
    }
  }
  return last.frame;
}

/**
 * Pointer position in -1..1, tracked on the window because the canvas ignores
 * pointer events. Clicks on empty space (not on links or controls) start a ripple.
 */
function usePointer() {
  const pointer = useRef({ x: 9, y: 9, at: -1e9, ripple: { x: 9, y: 9, at: 0 } });
  useEffect(() => {
    const toNdc = (event: PointerEvent) => ({
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: -((event.clientY / window.innerHeight) * 2 - 1),
    });
    const onMove = (event: PointerEvent) => {
      const { x, y } = toNdc(event);
      pointer.current.x = x;
      pointer.current.y = y;
      pointer.current.at = performance.now();
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("a, button, input, textarea, select, label, dialog, [role='button']")) return;
      const { x, y } = toNdc(event);
      pointer.current.ripple = { x, y, at: performance.now() };
      sound.chime();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);
  return pointer;
}

type SceneProps = { scrollY: MotionValue<number>; quality: Quality; reduce: boolean; dayRef: DayRef };

type DayRef = { current: number };

/** Length of the Sky ⇄ Water blend; matches the CSS token transition in styles.css. */
const SCENE_BLEND_SECONDS = 2.4;
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function Scene({ scrollY, quality, reduce, dayRef }: SceneProps) {
  const terrainMat = useRef<THREE.ShaderMaterial>(null);
  const streamMat = useRef<THREE.ShaderMaterial>(null);
  const starsMat = useRef<THREE.ShaderMaterial>(null);
  const glowMat = useRef<THREE.ShaderMaterial>(null);
  const auroraMat = useRef<THREE.ShaderMaterial>(null);
  const auroraMatB = useRef<THREE.ShaderMaterial>(null);
  const starsRef = useRef<THREE.Points>(null);
  const nightGroup = useRef<THREE.Group>(null);
  const skyMesh = useRef<THREE.Mesh>(null);
  const pointerActive = useRef(0);

  const terrain = useTerrainGeometry(quality);
  const stream = useStreamGeometry(quality);
  const stars = useStarGeometry(quality);
  const stops = useSectionStops();
  const pointer = usePointer();

  const motion = useRef({
    travel: 0,
    flow: 0,
    last: Number.NaN,
    boost: 0,
    camY: DIVE.camY,
    lookY: DIVE.lookY,
    lookZ: DIVE.lookZ,
    terrain: DIVE.terrain,
    stars: DIVE.stars,
    aurora: DIVE.aurora,
    violet: DIVE.violet,
    pointerActive: 0,
    rippleAt: -100,
    blend: getScene() === "water" ? 1 : 0,
    px: 0,
    py: 0,
    ready: false,
  });

  const terrainUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uSize: { value: 105 },
      uPixelRatio: { value: 1 },
      uIntensity: { value: 1 },
      uDepth: { value: DEPTH },
      uNear: { value: NEAR },
      uPulse: { value: 1 },
      uViolet: { value: 0 },
      uDay: { value: 0 },
    }),
    [],
  );
  const streamUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uFlow: { value: 0 },
      uSize: { value: 58 },
      uPixelRatio: { value: 1 },
      uIntensity: { value: 1 },
      uDepth: { value: DEPTH },
      uNear: { value: NEAR },
      uDay: { value: 0 },
    }),
    [],
  );
  const starsUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 1.15 },
      uPixelRatio: { value: 1 },
      uIntensity: { value: 1 },
      uPointer: { value: new THREE.Vector2(9, 9) },
      uPointerActive: { value: 0 },
      uAspect: { value: 1 },
      uRipple: { value: new THREE.Vector2(9, 9) },
      uRippleAge: { value: 10 },
      uDay: { value: 0 },
    }),
    [],
  );
  const glowUniforms = useMemo(() => ({ uIntensity: { value: 1 } }), []);
  const auroraUniforms = useMemo(() => ({ uTime: { value: 0 }, uIntensity: { value: 0 }, uSeed: { value: 0 } }), []);
  const auroraUniformsB = useMemo(() => ({ uTime: { value: 0 }, uIntensity: { value: 0 }, uSeed: { value: 3.7 } }), []);
  const skyUniforms = useMemo(() => ({}), []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = motion.current;
    const time = state.clock.elapsedTime;
    const damp = THREE.MathUtils.damp;

    const y = scrollY.get();
    if (Number.isNaN(s.last)) s.last = y;
    const dy = y - s.last;
    s.last = y;

    const target = frameAt(stops.current, y);
    s.camY = damp(s.camY, target.camY, 2.2, dt);
    s.lookY = damp(s.lookY, target.lookY, 2.2, dt);
    s.lookZ = damp(s.lookZ, target.lookZ, 2.2, dt);
    s.terrain = damp(s.terrain, target.terrain, 2.5, dt);
    s.stars = damp(s.stars, target.stars, 2.5, dt);
    s.aurora = damp(s.aurora, target.aurora, 1.5, dt);
    s.violet = damp(s.violet, target.violet, 1.5, dt);

    // Scene blend: a fixed-length, eased cross-fade so the page colours and the world move together.
    const goal = getScene() === "water" ? 1 : 0;
    const step = dt / (reduce ? 0.25 : SCENE_BLEND_SECONDS);
    s.blend = goal > s.blend ? Math.min(goal, s.blend + step) : Math.max(goal, s.blend - step);
    const dayValue = smootherstep(s.blend);
    dayRef.current = dayValue;
    const night = 1 - dayValue;

    if (!reduce) s.travel += dy * 0.028 + dt * 0.8;
    const speed = Math.min(1, Math.abs(dy) / Math.max(dt, 0.001) / 2500);
    s.boost = damp(s.boost, speed, 3, dt);
    s.flow += dt * (reduce ? 1.5 : 6 + s.boost * 26);

    const px = Math.abs(pointer.current.x) > 1 ? 0 : pointer.current.x;
    const py = Math.abs(pointer.current.y) > 1 ? 0 : pointer.current.y;
    s.px = damp(s.px, reduce ? 0 : px, 2.5, dt);
    s.py = damp(s.py, reduce ? 0 : py, 2.5, dt);

    state.camera.position.set(s.px * 1.2, s.camY - s.py * 0.5, 0);
    state.camera.lookAt(s.px * 4, s.lookY - s.py * 1.5, s.lookZ);
    state.camera.updateMatrixWorld();
    skyMesh.current?.position.copy(state.camera.position);

    const moved = performance.now() - pointer.current.at < 2500;
    s.pointerActive = damp(s.pointerActive, moved && !reduce ? 1 : 0, 3, dt);
    pointerActive.current = s.pointerActive;

    // The whole night world switches off once the beach has fully arrived.
    if (nightGroup.current) nightGroup.current.visible = night > 0.005;
    if (night > 0.005) {
      const pr = state.gl.getPixelRatio();
      const tm = terrainMat.current;
      if (tm) {
        tm.uniforms.uTime.value = time;
        tm.uniforms.uTravel.value = s.travel;
        tm.uniforms.uPixelRatio.value = pr;
        tm.uniforms.uIntensity.value = s.terrain * night;
        tm.uniforms.uPulse.value = reduce ? 0 : 1;
        tm.uniforms.uViolet.value = s.violet;
      }
      const sm = streamMat.current;
      if (sm) {
        sm.uniforms.uTime.value = time;
        sm.uniforms.uTravel.value = s.travel;
        sm.uniforms.uFlow.value = s.flow;
        sm.uniforms.uPixelRatio.value = pr;
        sm.uniforms.uIntensity.value = Math.min(1.4, s.terrain + 0.25 + s.boost * 0.4) * night;
      }
      const st = starsMat.current;
      if (st) {
        st.uniforms.uTime.value = reduce ? 0 : time;
        st.uniforms.uPixelRatio.value = pr;
        st.uniforms.uIntensity.value = s.stars * night;
        st.uniforms.uAspect.value = state.size.width / Math.max(1, state.size.height);
        st.uniforms.uPointer.value.set(pointer.current.x, pointer.current.y);
        st.uniforms.uPointerActive.value = s.pointerActive;
        const ripple = pointer.current.ripple;
        if (ripple.at !== s.rippleAt) {
          s.rippleAt = ripple.at;
          st.uniforms.uRipple.value.set(ripple.x, ripple.y);
          st.uniforms.uRippleAge.value = 0;
        } else {
          st.uniforms.uRippleAge.value = Math.min(10, st.uniforms.uRippleAge.value + dt);
        }
      }
      const gm = glowMat.current;
      if (gm) gm.uniforms.uIntensity.value = (0.6 + s.terrain * 0.5) * night;
      const am = auroraMat.current;
      if (am) {
        am.uniforms.uTime.value = reduce ? 20 : time;
        am.uniforms.uIntensity.value = s.aurora * night;
      }
      const amB = auroraMatB.current;
      if (amB) {
        amB.uniforms.uTime.value = reduce ? 20 : time * 0.8;
        amB.uniforms.uIntensity.value = s.aurora * 0.7 * night;
      }
      if (starsRef.current && !reduce) starsRef.current.rotation.y = time * 0.004;
    }

    if (!s.ready) {
      s.ready = true;
      markWorldReady();
    }
  }, -1);

  return (
    <>
      <mesh ref={skyMesh} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[900, 48, 24]} />
        <shaderMaterial uniforms={skyUniforms} vertexShader={skyVertex} fragmentShader={skyFragment} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <group ref={nightGroup}>
        <points ref={starsRef} geometry={stars} frustumCulled={false}>
          <shaderMaterial
            ref={starsMat}
            uniforms={starsUniforms}
            vertexShader={starsVertex}
            fragmentShader={blendFragment}
            transparent
            depthWrite={false}
            {...POINT_BLEND}
          />
        </points>
        <mesh position={[0, 72, -230]} frustumCulled={false}>
          <planeGeometry args={[760, 150]} />
          <shaderMaterial
            ref={auroraMat}
            uniforms={auroraUniforms}
            vertexShader={auroraVertex}
            fragmentShader={auroraFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[-120, 95, -300]} rotation={[0, 0.35, 0]} frustumCulled={false}>
          <planeGeometry args={[620, 170]} />
          <shaderMaterial
            ref={auroraMatB}
            uniforms={auroraUniformsB}
            vertexShader={auroraVertex}
            fragmentShader={auroraFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh position={[0, -3.5, -175]} frustumCulled={false}>
          <planeGeometry args={[720, 220]} />
          <shaderMaterial
            ref={glowMat}
            uniforms={glowUniforms}
            vertexShader={glowVertex}
            fragmentShader={glowFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <points geometry={terrain} frustumCulled={false}>
          <shaderMaterial
            ref={terrainMat}
            uniforms={terrainUniforms}
            vertexShader={terrainVertex}
            fragmentShader={blendFragment}
            transparent
            depthWrite={false}
            {...POINT_BLEND}
          />
        </points>
        <points geometry={stream} frustumCulled={false}>
          <shaderMaterial
            ref={streamMat}
            uniforms={streamUniforms}
            vertexShader={streamVertex}
            fragmentShader={blendFragment}
            transparent
            depthWrite={false}
            {...POINT_BLEND}
          />
        </points>
      </group>
      <Sea day={dayRef} reduce={reduce} pointer={pointer} pointerActive={pointerActive} />
      <TitleParticles count={COUNTS[quality].titles} reduce={reduce} day={dayRef} />
    </>
  );
}

const pickQuality = (): Quality =>
  window.matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4 ? "low" : "high";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Post effects blend continuously with the scene: strong bloom and vignette
 * under the night sky, a clean grade and gentle sun bloom at the beach.
 */
function Effects({ quality, day }: { quality: Quality; day: DayRef }) {
  const bloom = useRef<BloomEffect>(null);
  const vignette = useRef<VignetteEffect>(null);
  const gradeRef = useRef<DayGradeEffect>(null);
  const grade = useMemo(() => new DayGradeEffect(), []);
  useEffect(() => () => grade.dispose(), [grade]);
  const nightBloom = quality === "low" ? 0.9 : 1.15;

  useFrame(() => {
    const d = day.current;
    // The beach is HDR: keep its grade and high bloom threshold until the bright sky has
    // mostly faded, so a switch never flashes white on the way through.
    const hold = THREE.MathUtils.smoothstep(d, 0, 0.35);
    if (bloom.current) {
      bloom.current.intensity = lerp(nightBloom, 0.32, d);
      bloom.current.luminanceMaterial.threshold = lerp(0.32, 3, hold);
    }
    if (vignette.current) vignette.current.darkness = lerp(0.72, 0.2, d);
    if (gradeRef.current) gradeRef.current.amount = THREE.MathUtils.smoothstep(d, 0, 0.45);
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom ref={bloom} mipmapBlur intensity={nightBloom} luminanceThreshold={0.32} luminanceSmoothing={0.25} radius={0.72} />
      <Vignette ref={vignette} offset={0.25} darkness={0.72} eskil={false} />
      <primitive ref={gradeRef} object={grade} />
    </EffectComposer>
  );
}

export default function World({ scrollY }: { scrollY: MotionValue<number> }) {
  const reduce = useReducedMotion() ?? false;
  const [quality] = useState<Quality>(pickQuality);
  const dayRef = useRef(getScene() === "water" ? 1 : 0);

  return (
    <Canvas
      linear
      flat
      dpr={[1, quality === "low" ? 1.25 : 1.5]}
      camera={{ fov: 55, near: 0.1, far: 1200, position: [0, DIVE.camY, 0] }}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false }}
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={["#04060b"]} />
      <Scene scrollY={scrollY} quality={quality} reduce={reduce} dayRef={dayRef} />
      <Effects quality={quality} day={dayRef} />
    </Canvas>
  );
}
