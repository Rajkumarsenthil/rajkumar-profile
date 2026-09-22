import { Effect } from "postprocessing";
import * as THREE from "three";

/**
 * Filmic tone mapping (ACES fit, as in three.js) plus sRGB encoding, blended
 * in by `amount`. The water scene is physically lit (HDR sky and sea), so it
 * needs this; the night scene is authored in display colours and skips it.
 */
const fragment = /* glsl */ `
uniform float amount;
uniform float exposure;

vec3 rrtAndOdtFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}

vec3 acesFilmic(vec3 color) {
  const mat3 inputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 outputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color = inputMat * (color * exposure / 0.6);
  color = rrtAndOdtFit(color);
  return clamp(outputMat * color, 0.0, 1.0);
}

vec3 encodeSrgb(vec3 c) {
  return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308))));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 graded = encodeSrgb(acesFilmic(max(inputColor.rgb, 0.0)));
  outputColor = vec4(mix(inputColor.rgb, graded, amount), inputColor.a);
}
`;

export class DayGradeEffect extends Effect {
  constructor() {
    super("DayGradeEffect", fragment, {
      uniforms: new Map<string, THREE.Uniform>([
        ["amount", new THREE.Uniform(0)],
        ["exposure", new THREE.Uniform(0.46)],
      ]),
    });
  }

  set amount(value: number) {
    this.uniforms.get("amount")!.value = value;
  }
}

/** Tileable water normal map made from summed sine waves, so no texture file is needed. */
export function makeWaterNormals(size = 256) {
  let seed = 9;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  // Many small wave trains in random directions: fine, isotropic ripples.
  const waves = Array.from({ length: 56 }, () => {
    let kx = 0;
    let ky = 0;
    while (kx === 0 && ky === 0) {
      const k = 3 + Math.pow(random(), 1.6) * 38;
      const angle = random() * Math.PI * 2;
      kx = Math.round(Math.cos(angle) * k);
      ky = Math.round(Math.sin(angle) * k);
    }
    const k = Math.hypot(kx, ky);
    return { kx, ky, phase: random() * Math.PI * 2, amp: 1 / Math.pow(k, 0.9) };
  });
  const data = new Uint8Array(size * size * 4);
  const strength = 0.9;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0;
      let dy = 0;
      for (const w of waves) {
        const arg = (2 * Math.PI * (w.kx * x + w.ky * y)) / size + w.phase;
        const c = Math.cos(arg) * w.amp * 2 * Math.PI;
        dx += (c * w.kx) / size;
        dy += (c * w.ky) / size;
      }
      const nx = -dx * strength * size * 0.035;
      const ny = -dy * strength * size * 0.035;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
