import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { hasEnteredSite } from "../lib/events";
import type { TitleId } from "../lib/titles";
import { titleFragment, titleVertex } from "./shaders";
import { buildTitleAtlas } from "./titleAtlas";
import type { TitleAtlas } from "./titleAtlas";

/** Distance in front of the camera where titles float. */
const DEPTH = 14;

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

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * One shared particle system that forms each chapter word. Every frame it finds
 * the most visible `[data-title]` anchor on the page, pins itself exactly over
 * that box, and morphs into the anchor's word when the chapter changes.
 */
type DayRef = { current: number };

export function TitleParticles({ count, reduce, day }: { count: number; reduce: boolean; day: DayRef }) {
  const [atlas, setAtlas] = useState<TitleAtlas | null>(null);
  useEffect(() => {
    let alive = true;
    void buildTitleAtlas(count).then((result) => {
      if (alive) setAtlas(result);
    });
    return () => {
      alive = false;
    };
  }, [count]);
  if (!atlas) return null;
  return <TitleSystem atlas={atlas} count={count} reduce={reduce} day={day} />;
}

function TitleSystem({ atlas, count, reduce, day }: { atlas: TitleAtlas; count: number; reduce: boolean; day: DayRef }) {
  const group = useRef<THREE.Group>(null);
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const random = seeded(5);
    const from = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Start as a loose cloud of dust that condenses into the name.
      from[i * 3] = (random() - 0.5) * 2.6;
      from[i * 3 + 1] = (random() - 0.5) * 1.1;
      from[i * 3 + 2] = (random() - 0.5) * 1.5;
    }
    const to = new Float32Array(atlas.hero.positions);
    const rands = new Float32Array(count);
    const delays = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      rands[i] = random();
      delays[i] = random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(to), 3));
    g.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
    g.setAttribute("aTo", new THREE.BufferAttribute(to, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rands, 1));
    g.setAttribute("aDelay", new THREE.BufferAttribute(delays, 1));
    return g;
  }, [atlas, count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uScatter: { value: 1 },
      uPointer: { value: new THREE.Vector3(9, 9, 0) },
      uPointerStrength: { value: 0 },
      uSize: { value: 2.5 },
      uPixelRatio: { value: 1 },
      uOpacity: { value: 0 },
      uDay: { value: 0 },
    }),
    [],
  );

  const tools = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(),
      normal: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
    }),
    [],
  );

  const state = useRef({
    word: "hero" as TitleId,
    progress: 0,
    scatter: 1,
    opacity: 0,
    anchors: [] as HTMLElement[],
    lastQuery: -10,
    pointer: { x: 0, y: 0, active: false, at: 0 },
    strength: 0,
  });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const p = state.current.pointer;
      p.x = (event.clientX / window.innerWidth) * 2 - 1;
      p.y = -((event.clientY / window.innerHeight) * 2 - 1);
      p.active = true;
      p.at = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const morphTo = (id: TitleId) => {
    const mesh = points.current;
    const st = state.current;
    if (!mesh) return;
    const fromAttr = mesh.geometry.getAttribute("aFrom") as THREE.BufferAttribute;
    const toAttr = mesh.geometry.getAttribute("aTo") as THREE.BufferAttribute;
    const delayAttr = mesh.geometry.getAttribute("aDelay") as THREE.BufferAttribute;
    const from = fromAttr.array as Float32Array;
    const to = toAttr.array as Float32Array;
    const delay = delayAttr.array as Float32Array;
    // Freeze wherever each particle currently is, then aim it at the new word.
    for (let i = 0; i < count; i++) {
      const t = easeInOut(Math.min(1, Math.max(0, (st.progress - delay[i] * 0.4) / 0.6)));
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        from[j] += (to[j] - from[j]) * t;
      }
    }
    to.set(atlas[id].positions);
    fromAttr.needsUpdate = true;
    toAttr.needsUpdate = true;
    st.word = id;
    st.progress = 0;
  };

  useFrame((frame, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const st = state.current;
    const camera = frame.camera as THREE.PerspectiveCamera;
    const g = group.current;
    const mat = material.current;
    if (!g || !mat) return;

    const time = frame.clock.elapsedTime;
    if (time - st.lastQuery > 1) {
      st.anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-title]"));
      st.lastQuery = time;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let best: { el: HTMLElement; rect: DOMRect; area: number } | null = null;
    for (const el of st.anchors) {
      const rect = el.getBoundingClientRect();
      const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
      const visibleW = Math.min(rect.right, vw) - Math.max(rect.left, 0);
      const area = visibleH > 0 && visibleW > 0 ? visibleH * visibleW : 0;
      if (area > (best?.area ?? 0)) best = { el, rect, area };
    }

    const entered = hasEnteredSite();
    const visible = best !== null && entered;
    if (best && visible) {
      const id = best.el.dataset.title as TitleId;
      if (id !== st.word && atlas[id]) morphTo(id);

      // Map the anchor box onto a plane DEPTH units in front of the camera.
      const aspect = atlas[st.word].aspect;
      const worldH = 2 * DEPTH * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const perPx = worldH / vh;
      const wordPx = Math.min(best.rect.width, best.rect.height * aspect);
      const centerX = best.el.dataset.align === "center" ? best.rect.left + best.rect.width / 2 : best.rect.left + wordPx / 2;
      const centerY = best.rect.top + best.rect.height / 2;
      tools.tmp.set(
        ((centerX / vw) * 2 - 1) * ((worldH * camera.aspect) / 2),
        -((centerY / vh) * 2 - 1) * (worldH / 2),
        -DEPTH,
      );
      tools.tmp.applyMatrix4(camera.matrixWorld);
      g.position.copy(tools.tmp);
      g.quaternion.copy(camera.quaternion);
      g.scale.setScalar(wordPx * perPx);
      g.updateMatrixWorld();

      const spacing = Math.sqrt((wordPx * (wordPx / aspect) * 0.34) / count);
      mat.uniforms.uSize.value = Math.min(6, Math.max(1.3, spacing * 1.3));
    }

    // Pointer: intersect a ray with the title plane and convert to the word's local space.
    const p = st.pointer;
    const recent = p.active && performance.now() - p.at < 1800;
    if (recent && !reduce) {
      tools.ndc.set(p.x, p.y);
      tools.raycaster.setFromCamera(tools.ndc, camera);
      camera.getWorldDirection(tools.normal);
      tools.plane.setFromNormalAndCoplanarPoint(tools.normal, g.position);
      if (tools.raycaster.ray.intersectPlane(tools.plane, tools.hit)) {
        g.worldToLocal(tools.hit);
        mat.uniforms.uPointer.value.copy(tools.hit);
      }
    }
    st.strength = THREE.MathUtils.damp(st.strength, recent && !reduce ? 1 : 0, 4, dt);

    const damp = THREE.MathUtils.damp;
    st.scatter = damp(st.scatter, visible ? 0 : 1, 2.5, dt);
    st.opacity = damp(st.opacity, visible ? 1 : 0, 3, dt);
    if (entered) st.progress = Math.min(1, st.progress + dt / (reduce ? 0.05 : 2.1));

    mat.uniforms.uDay.value = day.current;
    mat.uniforms.uProgress.value = st.progress;
    mat.uniforms.uTime.value = reduce ? 0 : time;
    mat.uniforms.uScatter.value = reduce ? 0 : st.scatter;
    mat.uniforms.uOpacity.value = st.opacity;
    mat.uniforms.uPointerStrength.value = st.strength;
    mat.uniforms.uPixelRatio.value = frame.gl.getPixelRatio();
  });

  return (
    <group ref={group}>
      <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={10}>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={titleVertex}
          fragmentShader={titleFragment}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.CustomBlending}
          blendSrc={THREE.OneFactor}
          blendDst={THREE.OneMinusSrcAlphaFactor}
          blendSrcAlpha={THREE.OneFactor}
          blendDstAlpha={THREE.OneMinusSrcAlphaFactor}
        />
      </points>
    </group>
  );
}
