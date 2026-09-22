/* GLSL for the night-flight world. Written for this site; no external shader code. */

const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.73));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotate = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    value += amplitude * vnoise(p);
    p = rotate * p * 2.03 + 17.0;
    amplitude *= 0.5;
  }
  return value;
}

// The event stream winds through the valley along this path.
float riverX(float z) {
  return sin(z * 0.035) * 7.0 + sin(z * 0.09 + 1.7) * 2.5;
}

float terrainHeight(vec2 w) {
  float base = fbm(w * 0.045);
  float ridge = 1.0 - abs(vnoise(w * 0.09 + 3.1) * 2.0 - 1.0);
  float h = pow(base, 1.6) * 30.0 + ridge * ridge * 3.5;
  float side = smoothstep(2.0, 34.0, abs(w.x));
  h *= 0.22 + side * 1.5;
  float valley = smoothstep(1.4, 11.0, abs(w.x - riverX(w.y)));
  return h * valley;
}
`;

export const pointsFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

/**
 * Title particles: a soft glow at night, solid rounded sand grains by day.
 * Premultiplied blending: alpha 0 adds light, real alpha paints over the scene.
 */
export const titleFragment = /* glsl */ `
uniform float uDay;
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vSpin;

vec3 toLinear(vec3 c) {
  return pow(c, vec3(2.2)) * 1.25;
}

void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  c.y = -c.y;
  float r = length(c);
  if (vAlpha < 0.004) discard;
  float glow = smoothstep(1.0, 0.0, r) * vAlpha;

  vec3 dayColor;
  float dayAlpha;
  if (vKind > 1.5) {
    // Starfish: five tapering arms, coral orange with a pebbly surface.
    float cs = cos(vSpin);
    float sn = sin(vSpin);
    vec2 q = mat2(cs, -sn, sn, cs) * c;
    float angle = atan(q.y, q.x);
    float arm = pow(abs(cos(angle * 2.5)), 1.8);
    float edge = 0.9 * (0.32 + 0.68 * arm);
    float inside = 1.0 - smoothstep(edge - 0.06, edge, length(q));
    float bumps = 0.86 + 0.14 * step(0.5, fract(length(q) * 9.0 + arm * 3.0));
    vec3 star = mix(vec3(0.96, 0.52, 0.3), vec3(0.78, 0.3, 0.16), smoothstep(0.0, edge, length(q))) * bumps;
    dayColor = toLinear(star);
    dayAlpha = inside * vAlpha;
  } else if (vKind > 0.5) {
    // Scallop shell: a ribbed fan with a scalloped rim and a small hinge.
    float cs = cos(vSpin * 0.3 - 0.15);
    float sn = sin(vSpin * 0.3 - 0.15);
    vec2 q = mat2(cs, -sn, sn, cs) * c;
    vec2 v = q - vec2(0.0, -0.62);
    float angle = atan(v.x, v.y);
    float rim = 1.35 * (0.93 + 0.07 * cos(angle * 16.0));
    float fan = step(abs(angle), 0.95) * (1.0 - smoothstep(rim - 0.05, rim, length(v)));
    float hinge = step(abs(q.x), 0.34) * step(q.y, -0.48) * step(-0.72, q.y);
    float inside = max(fan, hinge);
    float ribs = 0.8 + 0.2 * cos(angle * 16.0);
    vec3 shell = mix(vec3(0.99, 0.9, 0.84), vec3(0.93, 0.7, 0.62), smoothstep(0.3, 1.3, length(v))) * ribs;
    dayColor = toLinear(shell);
    dayAlpha = inside * vAlpha;
  } else {
    // A grain: lit from above, a touch darker towards its lower edge.
    if (r > 1.0) discard;
    float shade = 0.82 + 0.28 * clamp(c.y * 0.5 + 0.5, 0.0, 1.0);
    dayAlpha = (1.0 - smoothstep(0.7, 1.0, r)) * vAlpha;
    dayColor = vColor * shade;
  }
  if (max(dayAlpha * uDay, glow * (1.0 - uDay)) < 0.003) discard;

  vec3 color = mix(vColor * glow, dayColor * dayAlpha, uDay);
  gl_FragColor = vec4(color, dayAlpha * uDay);
}
`;

/** Shared point fragment with day/night blending (see the materials' premultiplied blend setup). */
export const blendFragment = /* glsl */ `
uniform float uDay;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a, a * uDay);
}
`;

export const terrainVertex = /* glsl */ `
uniform float uTime;
uniform float uTravel;
uniform float uSize;
uniform float uPixelRatio;
uniform float uIntensity;
uniform float uDepth;
uniform float uNear;
uniform float uPulse;
uniform float uViolet;
uniform float uDay;
attribute float aRand;
varying vec3 vColor;
varying float vAlpha;
${NOISE}

void main() {
  // Points travel with the ground and wrap far away, so the flight never ends.
  float z = mod(position.z + uTravel, uDepth) - uDepth + uNear;
  float worldZ = z - uTravel;
  float h = terrainHeight(vec2(position.x, worldZ));
  vec3 pos = vec3(position.x, h - 4.0, z);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.001);

  float farFade = 1.0 - smoothstep(uDepth * 0.55, uDepth * 0.95, dist);
  float nearFade = smoothstep(0.8, 7.0, dist);
  float heightMix = clamp(h / 22.0, 0.0, 1.0);
  float river = 1.0 - smoothstep(0.0, 7.0, abs(position.x - riverX(worldZ)));

  // A soft scan line that sweeps towards the viewer every few seconds.
  float pulseZ = mod(uTime * 16.0, uDepth) - uDepth + uNear;
  float pulse = exp(-pow((z - pulseZ) / 2.5, 2.0)) * (1.0 - river) * uPulse;

  vec3 low = vec3(0.30, 0.40, 0.66);
  vec3 high = mix(vec3(0.88, 0.93, 1.0), vec3(0.76, 0.68, 1.0), uViolet);
  vec3 color = mix(low, high, pow(heightMix, 0.65));
  color = mix(color, vec3(0.36, 0.95, 0.8), river * 0.55);
  color += vec3(0.35, 0.45, 0.7) * pulse;

  // Morning: teal valley floor, deep blue ridges, warm sunlit peaks, haze with distance.
  vec3 dayColor = mix(vec3(0.2, 0.33, 0.42), vec3(0.15, 0.2, 0.38), smoothstep(0.05, 0.35, heightMix));
  dayColor = mix(dayColor, vec3(1.0, 0.77, 0.6), pow(heightMix, 1.4) * 0.6);
  dayColor = mix(dayColor, vec3(0.64, 0.64, 0.8), smoothstep(25.0, uDepth * 0.95, dist) * 0.85);
  dayColor = mix(dayColor, vec3(0.14, 0.5, 0.6), river * 0.5);

  vColor = mix(color, dayColor, uDay);
  float nightAlpha = 0.5 + heightMix * 0.5 + pulse * 0.6;
  float dayAlpha = 0.72 + heightMix * 0.2;
  vAlpha = farFade * nearFade * mix(nightAlpha, dayAlpha, uDay) * uIntensity;
  gl_PointSize = max(1.0, uSize * uPixelRatio * (0.55 + aRand * 0.9) / dist) * (1.0 + uDay * 0.3);
}
`;

export const streamVertex = /* glsl */ `
uniform float uTime;
uniform float uTravel;
uniform float uFlow;
uniform float uSize;
uniform float uPixelRatio;
uniform float uIntensity;
uniform float uDepth;
uniform float uNear;
uniform float uDay;
attribute float aSeed;
attribute float aLane;
attribute float aRand;
varying vec3 vColor;
varying float vAlpha;
${NOISE}

void main() {
  float z = mod(aSeed * uDepth + uFlow * (0.7 + aRand * 0.6) + uTravel, uDepth) - uDepth + uNear;
  float worldZ = z - uTravel;
  float x = riverX(worldZ) + aLane * 1.3;
  float y = -3.8 + aRand * 0.35 + sin(worldZ * 0.6 + aRand * 6.283 + uTime * 1.6) * 0.08;

  vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.001);

  float farFade = 1.0 - smoothstep(uDepth * 0.45, uDepth * 0.9, dist);
  float nearFade = smoothstep(0.6, 5.0, dist);
  vec3 night = mix(vec3(0.3, 1.0, 0.78), vec3(0.66, 0.56, 1.0), smoothstep(0.55, 1.0, aRand)) * 1.25;
  vec3 day = aRand > 0.82 ? vec3(1.0, 0.97, 0.9) : mix(vec3(0.12, 0.42, 0.58), vec3(0.3, 0.7, 0.78), aRand);
  vColor = mix(night, day, uDay);
  vAlpha = farFade * nearFade * (0.45 + aRand * 0.55) * uIntensity;
  gl_PointSize = max(1.0, uSize * uPixelRatio * (0.5 + aRand * 1.2) / dist);
}
`;

export const starsVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uIntensity;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uAspect;
uniform vec2 uRipple;
uniform float uRippleAge;
uniform float uDay;
attribute float aRand;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;

  // Stars near the pointer glow, grow and drift out of its way.
  vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
  float dist = length(delta);
  float near = smoothstep(0.42, 0.0, dist) * uPointerActive;
  vec2 push = (delta / max(dist, 0.0001)) * near * near * 0.09;
  clip.xy += (push / vec2(uAspect, 1.0)) * clip.w;

  // A click sends a ring of light outward through the sky.
  vec2 rippleDelta = (ndc - uRipple) * vec2(uAspect, 1.0);
  float ring = exp(-pow((length(rippleDelta) - uRippleAge * 1.2) / 0.07, 2.0)) * exp(-uRippleAge * 1.1) * 1.4;

  gl_Position = clip;
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aRand * 2.4) + aRand * 40.0);
  vec3 base = mix(vec3(0.75, 0.83, 1.0), vec3(0.72, 0.62, 1.0), step(0.9, aRand));
  vec3 glow = mix(vec3(0.45, 1.0, 0.84), vec3(0.7, 0.6, 1.0), aRand);
  float lit = clamp(near + ring, 0.0, 1.0);
  vec3 nightColor = mix(base, glow * 1.6, lit);
  vec3 dayColor = mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 1.0, 0.96), aRand);
  vColor = mix(nightColor, dayColor, uDay);
  float nightAlpha = twinkle * (0.3 + aRand * 0.7) * (1.0 + lit * 3.0);
  float dayAlpha = lit * (0.35 + aRand * 0.45) * twinkle;
  vAlpha = mix(nightAlpha, dayAlpha, uDay) * uIntensity;
  gl_PointSize = (0.8 + aRand * aRand * 2.6) * uSize * uPixelRatio * (1.0 + lit * 2.4);
}
`;

export const glowVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const glowFragment = /* glsl */ `
uniform float uIntensity;
varying vec2 vUv;

void main() {
  // vUv.y = 0.5 sits on the horizon: a soft sky haze above, a quick falloff below.
  float above = max(vUv.y - 0.5, 0.0);
  float below = max(0.5 - vUv.y, 0.0);
  float haze = exp(-pow(above * 3.2, 2.0)) * exp(-pow(below * 9.0, 2.0));
  float core = exp(-pow(above * 22.0, 2.0)) * exp(-pow(below * 30.0, 2.0));
  float across = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);
  vec3 color = vec3(0.08, 0.16, 0.36) * haze + mix(vec3(0.25, 0.85, 0.72), vec3(0.55, 0.45, 1.0), vUv.x) * core * 0.55;
  gl_FragColor = vec4(color * across * uIntensity, 1.0);
}
`;

export const titleVertex = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform float uScatter;
uniform float uPointerStrength;
uniform float uSize;
uniform float uPixelRatio;
uniform float uOpacity;
uniform float uDay;
uniform vec3 uPointer;
attribute vec3 aFrom;
attribute vec3 aTo;
attribute float aRand;
attribute float aDelay;
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vSpin;

float easeInOut(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
}

void main() {
  // Each particle leaves on its own schedule, so words dissolve and re-form as a wave.
  float t = clamp((uProgress - aDelay * 0.4) / 0.6, 0.0, 1.0);
  vec3 p = mix(aFrom, aTo, easeInOut(t));
  vec3 wobble = vec3(
    sin(aRand * 91.0 + uTime * 0.8),
    cos(aRand * 57.0 + uTime * 0.7),
    sin(aRand * 23.0 + uTime * 0.6)
  );
  float swirl = sin(t * 3.14159);
  p += wobble * (0.003 + swirl * 0.12 * (1.0 - uDay * 0.5) + uScatter * 0.45 * (1.0 - uDay * 0.6));
  // Sand: grains pour into place, fall and drift on the wind when a word breaks up,
  // and a thin trickle keeps running off the letters.
  p.y -= (swirl * 0.16 + uScatter * 0.45) * uDay;
  p.x += uScatter * 0.35 * aRand * uDay;
  float trickling = step(0.972, aRand) * uDay;
  float fall = fract(uTime * 0.22 + aRand * 17.0);
  p.y -= trickling * fall * fall * 0.3;
  p.x += trickling * fall * 0.02;

  // Particles near the pointer are pushed aside and towards the viewer.
  vec2 d = p.xy - uPointer.xy;
  float dist = length(d);
  float push = smoothstep(0.09, 0.0, dist) * uPointerStrength;
  p.xy += (d / max(dist, 0.0001)) * push * 0.05;
  p.z += push * 0.1;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec3 tint = aRand > 0.93 ? vec3(0.7, 0.58, 1.0) * 1.5 : vec3(0.4, 1.0, 0.8) * 1.45;
  vec3 night = aRand > 0.84 ? tint : vec3(0.86, 0.91, 1.0) * 1.2;
  // Sand: warm grain colours, lighter on top and darker below like a sand sculpture,
  // with the odd dark mineral grain and white shell fleck. Output is linear light.
  float tone = fract(aRand * 7.13);
  vec3 grain = mix(vec3(0.36, 0.24, 0.12), vec3(0.76, 0.6, 0.38), tone);
  grain = aRand > 0.9 && aRand < 0.935 ? vec3(0.22, 0.17, 0.12) : grain;
  grain = aRand < 0.03 ? vec3(0.96, 0.94, 0.9) : grain;
  grain *= 0.74 + 0.34 * smoothstep(-0.12, 0.12, p.y);
  vec3 sand = pow(grain, vec3(2.2)) * 1.25;
  vColor = mix(night, sand, uDay);
  float twinkle = mix(0.72 + 0.28 * sin(uTime * 2.2 + aRand * 60.0), 1.0, uDay);
  float trickleFade = 1.0 - trickling * smoothstep(0.6, 1.0, fall);
  vAlpha = uOpacity * twinkle * (1.0 - uScatter * 0.55) * trickleFade;
  // The sand version uses every particle; the night version keeps its original density.
  vAlpha *= mix(step(aDelay, 0.64), 1.0, uDay);
  // A few particles become sea shells (1) or starfish (2) set into the sand letters.
  float decor = step(0.961, aRand) * step(aRand, 0.962);
  vKind = decor * (fract(aRand * 977.0) < 0.42 ? 2.0 : 1.0);
  vSpin = fract(aRand * 331.0) * 6.28318;
  float grainSize = mix(0.62 + fract(aRand * 13.7) * 0.5, 5.4 + fract(aRand * 53.0) * 1.6, decor);
  gl_PointSize = uSize * uPixelRatio * mix((0.6 + aRand * 0.8) * 1.25, grainSize, uDay);
}
`;

export const auroraVertex = glowVertex;

export const auroraFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uSeed;
varying vec2 vUv;
${NOISE}

void main() {
  float x = vUv.x * 5.0 + uSeed * 13.0;
  float n = fbm(vec2(x * 0.8 + uTime * 0.02, uTime * 0.04 + uSeed));
  float bands = pow(0.5 + 0.5 * sin(x * 3.2 + n * 7.0 + uTime * 0.15), 3.0);
  float rise = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.3, 1.0, vUv.y));
  float streaks = 0.6 + 0.4 * vnoise(vec2(vUv.x * 120.0, vUv.y * 2.0 + uTime * 0.3));
  float edge = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 3.0);
  vec3 color = mix(vec3(0.15, 0.95, 0.65), vec3(0.55, 0.35, 1.0), smoothstep(0.1, 0.9, vUv.y + n * 0.3));
  gl_FragColor = vec4(color * bands * rise * streaks * edge * uIntensity * 0.6, 1.0);
}
`;

/** Night sky dome: a deep gradient behind the stars and aurora. */
export const skyVertex = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyFragment = /* glsl */ `
varying vec3 vDir;

void main() {
  float h = normalize(vDir).y;
  vec3 night = mix(vec3(0.02, 0.032, 0.068), vec3(0.012, 0.018, 0.04), smoothstep(0.0, 0.5, h));
  night = mix(night, vec3(0.014, 0.02, 0.036), smoothstep(0.0, -0.3, h));
  gl_FragColor = vec4(night, 1.0);
}
`;

/** Gulls drawn as flapping "v" shapes, crossing the sky over the sea. */
export const birdVertex = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform float uPixelRatio;
attribute vec3 aOffset;
attribute float aPhase;
attribute float aFlock;
varying float vFlap;
varying float vAlpha;

void main() {
  float period = 64.0;
  float cycle = fract((uTime + aFlock * period * 0.5) / period);
  vec3 center = vec3(mix(-300.0, 300.0, cycle), 58.0 + aFlock * 26.0 + sin(uTime * 0.1 + aFlock) * 4.0, -320.0 - aFlock * 60.0);
  vec3 p = center + aOffset + vec3(sin(uTime * 0.6 + aPhase * 6.283) * 2.0, sin(uTime * 0.9 + aPhase * 12.0) * 1.5, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vFlap = sin(uTime * 8.0 + aPhase * 6.283);
  vAlpha = uDay * smoothstep(0.0, 0.06, cycle) * (1.0 - smoothstep(0.94, 1.0, cycle));
  gl_PointSize = uPixelRatio * 5200.0 / max(-mv.z, 1.0) * (0.85 + aPhase * 0.3);
}
`;

export const birdFragment = /* glsl */ `
varying float vFlap;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  uv.y = -uv.y;
  float x = abs(uv.x);
  float wing = 0.15 + vFlap * 0.4;
  float d = abs(uv.y - x * wing + 0.05);
  float a = smoothstep(0.11, 0.03, d) * smoothstep(0.95, 0.7, x);
  if (a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(vec3(0.03, 0.035, 0.05), a * vAlpha * 0.8);
}
`;

/** Flat-coloured shapes (boats, dolphins) in display colour space. */
export const flatVertex = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const flatFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uHaze;

void main() {
  // Distant shapes pick up the pale blue of the sea haze; output is linear for the grade.
  vec3 color = mix(uColor, vec3(0.8, 0.88, 0.95), uHaze);
  gl_FragColor = vec4(pow(color, vec3(2.2)) * 1.3, uOpacity);
}
`;

/** Spray thrown up when a dolphin leaves or re-enters the water. */
export const splashVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform vec4 uSplash[4];
attribute float aSlot;
attribute vec3 aVelocity;
varying float vAlpha;

void main() {
  vec4 splash = uSplash[int(aSlot)];
  float age = uTime - splash.w;
  float live = step(0.0, age) * step(age, 1.2);
  vec3 p = splash.xyz + aVelocity * age + vec3(0.0, -6.0 * age * age, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vAlpha = live * (1.0 - age / 1.2);
  gl_PointSize = uPixelRatio * 260.0 / max(-mv.z, 1.0);
}
`;

export const splashFragment = /* glsl */ `
uniform float uDay;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vAlpha * uDay;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(1.2, 1.24, 1.28), a);
}
`;

/** Surf timing shared by the waves and the beach wash (units: world metres and seconds). */
const SURF = /* glsl */ `
const float SURF_SPEED = 5.5;
const float SURF_SPACING = 24.0;
const float SURF_RANGE = 72.0;
`;

/**
 * The beach: sand sloping up out of the sea, with shallow wash that runs up in
 * time with each breaking wave, wind ripples, shells, pebbles, a starfish or two,
 * footprints, a towel and the shadows of the umbrella and surfboard.
 * Output is linear light.
 */
export const beachVertex = /* glsl */ `
uniform float uShore;
varying vec3 vWorld;
${NOISE}

void main() {
  vec3 p = position;
  float above = max(p.z - uShore, 0.0);
  p.y = -4.0 + (p.z - uShore) * 0.07 + vnoise(p.xz * 0.05) * 0.5 * smoothstep(4.0, 20.0, above);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const beachFragment = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform float uShore;
uniform vec3 uSunDir;
uniform vec4 uUmbrella; // x, z, canopy radius, height
uniform vec4 uBoard;    // x, z, length, lean
uniform vec3 uTowel;    // x, z, angle
uniform vec4 uPalmA[4]; // trunk base x, z; crown shadow centre x, z
uniform vec4 uPalmB[4]; // crown shadow radius, trunk width, sway phase
uniform vec4 uBlobs[8]; // soft contact shadows: x, z, radius x, radius z
varying vec3 vWorld;
${NOISE}
${SURF}

float ellipse(vec2 p, vec2 r) {
  return length(p / r);
}

/** The shadow of a palm: a thin trunk line and a crown of feathery fronds that sway. */
float palmShadow(vec2 xz, vec4 a, vec4 b) {
  vec2 pa = xz - a.xy;
  vec2 ba = a.zw - a.xy;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float width = b.y * mix(1.0, 0.55, h);
  float trunk = 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.08, length(pa - ba * h));
  trunk *= step(0.02, h);

  vec2 q = xz - a.zw;
  float sway = sin(uTime * 1.05 + b.z) * 0.5 + sin(uTime * 2.3 + b.z * 1.7) * 0.2;
  q += vec2(0.25, -0.1) * sway;
  float r = length(q) / b.x;
  float angle = atan(q.y, q.x) + sway * 0.03;
  float fronds = 14.0;
  float sector = angle / 6.28318 * fronds;
  float id = floor(sector);
  float reach = 0.7 + 0.3 * hash21(vec2(id, b.z));
  float across = abs(fract(sector) - 0.5) * 6.28318 / fronds * r * b.x;
  float serrate = 0.72 + 0.28 * step(0.45, fract(r * b.x * 5.5 + id * 0.37));
  float half_ = 0.36 * sin(3.14159 * clamp(r / reach, 0.0, 1.0)) * serrate + 0.03;
  float frond = (1.0 - smoothstep(half_ - 0.05, half_ + 0.05, across)) * step(r, reach);
  float hub = 1.0 - smoothstep(0.1, 0.2, r);
  float dapple = 0.82 + 0.18 * vnoise(xz * 3.0 + uTime * 0.3);
  return max(trunk * 0.9, max(frond, hub) * 0.8 * dapple);
}

void main() {
  vec2 xz = vWorld.xz;
  float grain = vnoise(xz * 11.0) * 0.55 + vnoise(xz * 31.0) * 0.3 + vnoise(xz * 2.2) * 0.15;
  vec3 dry = vec3(0.93, 0.86, 0.72) * (0.9 + grain * 0.16);
  // Wind ripples in the dry sand.
  float ripple = sin(dot(xz, vec2(0.7, 3.1)) + vnoise(xz * 0.5) * 9.0) * vnoise(xz * 0.12);
  dry *= 0.975 + 0.025 * ripple;
  vec3 damp = vec3(0.7, 0.61, 0.49) * (0.92 + grain * 0.1);

  // Each breaking wave runs quickly up the beach, then drains away slowly.
  float cycle = fract(uTime * SURF_SPEED / SURF_SPACING + 0.62);
  float runUp = cycle < 0.28 ? smoothstep(0.0, 0.28, cycle) : 1.0 - smoothstep(0.28, 1.0, cycle);
  float edgeNoise = (vnoise(vec2(vWorld.x * 0.25, uTime * 0.3)) - 0.5) * 2.2 + sin(vWorld.x * 0.05) * 1.2;
  float front = uShore + 0.6 + runUp * 5.5 + edgeNoise;
  float highWater = uShore + 6.4 + edgeNoise * 0.6;

  float d = vWorld.z - uShore;
  float wetness = smoothstep(highWater + 1.2, highWater - 1.5, vWorld.z);
  vec3 sand = mix(dry, damp, wetness);
  sand += vec3(0.1, 0.11, 0.12) * smoothstep(highWater, front, vWorld.z) * step(front, vWorld.z) * (1.0 - runUp);

  float drySand = 1.0 - wetness;

  // Footprints wandering down towards the water; the waves wash the lower ones away.
  float pathX = -2.0 + sin(vWorld.z * 0.12) * 2.4;
  float stepIndex = floor(vWorld.z / 0.72);
  float side = mod(stepIndex, 2.0) * 2.0 - 1.0;
  vec2 foot = vec2(vWorld.x - pathX - side * 0.17, fract(vWorld.z / 0.72) * 0.72 - 0.36);
  float print = 1.0 - smoothstep(0.8, 1.0, ellipse(foot, vec2(0.085, 0.2)));
  float rim = smoothstep(0.85, 1.0, ellipse(foot, vec2(0.085, 0.2))) * (1.0 - smoothstep(1.0, 1.25, ellipse(foot, vec2(0.085, 0.2))));
  float printsHere = step(uShore + 3.0, vWorld.z) * (1.0 - smoothstep(0.35, 0.8, wetness));
  sand *= 1.0 - print * 0.16 * printsHere;
  sand += rim * 0.04 * printsHere;

  // Scattered shells, pebbles and the occasional starfish (only above the wash).
  vec2 cellSize = vec2(1.15);
  vec2 cell = floor(xz / cellSize);
  vec2 local = fract(xz / cellSize) - 0.5;
  float pick = hash21(cell);
  vec2 offset = vec2(hash21(cell + 7.13), hash21(cell + 3.71)) - 0.5;
  vec2 q = (local - offset * 0.55) * cellSize;
  float kind = hash21(cell + 11.0);
  float itemsHere = step(uShore + 2.0, vWorld.z) * smoothstep(0.0, 0.25, 1.0 - wetness * 0.6);
  if (pick > 0.86 && itemsHere > 0.0) {
    vec2 shadowQ = q + vec2(0.035, -0.02);
    if (kind > 0.97) {
      // Starfish: a soft five-armed star in coral orange.
      float angle = atan(q.y, q.x) + hash21(cell + 5.0) * 6.283;
      float radius = 0.17 * (0.42 + 0.58 * pow(abs(cos(angle * 2.5)), 3.0));
      float star = 1.0 - smoothstep(radius - 0.01, radius + 0.01, length(q));
      sand = mix(sand, vec3(0.86, 0.42, 0.28) * (0.85 + 0.2 * vnoise(q * 60.0)), star * itemsHere);
    } else if (kind > 0.55) {
      // Shell: a small ribbed fan, pale pink-white, with a contact shadow.
      float e = ellipse(q, vec2(0.1, 0.075));
      float shadow = 1.0 - smoothstep(0.9, 1.3, ellipse(shadowQ, vec2(0.11, 0.085)));
      sand *= 1.0 - shadow * 0.25 * itemsHere;
      float ribs = 0.85 + 0.15 * sin(atan(q.y + 0.06, q.x) * 14.0);
      sand = mix(sand, vec3(0.97, 0.9, 0.86) * ribs, (1.0 - smoothstep(0.85, 1.0, e)) * itemsHere);
    } else {
      // Pebble: a smooth grey-brown stone with a highlight.
      float size = 0.05 + kind * 0.08;
      float e = ellipse(q, vec2(size, size * 0.75));
      float shadow = 1.0 - smoothstep(0.9, 1.4, ellipse(shadowQ, vec2(size * 1.1, size * 0.85)));
      sand *= 1.0 - shadow * 0.3 * itemsHere;
      vec3 stone = mix(vec3(0.52, 0.47, 0.42), vec3(0.66, 0.62, 0.56), hash21(cell + 2.0));
      stone += 0.12 * (1.0 - smoothstep(0.0, 0.6, ellipse(q - vec2(-size * 0.3, size * 0.25), vec2(size * 0.4))));
      sand = mix(sand, stone, (1.0 - smoothstep(0.85, 1.0, e)) * itemsHere);
    }
  }

  // A dry line of seaweed, twigs and bits of shell left at the last high tide.
  float wrackBand = exp(-pow((vWorld.z - (highWater + 0.9 + sin(vWorld.x * 0.21) * 0.35)) / 0.32, 2.0));
  float wrack = smoothstep(0.58, 0.8, vnoise(vec2(vWorld.x * 2.4, vWorld.z * 7.0))) * wrackBand;
  wrack *= step(0.3, vnoise(vec2(vWorld.x * 0.35, 4.0)));
  sand = mix(sand, mix(vec3(0.3, 0.26, 0.14), vec3(0.18, 0.2, 0.1), vnoise(xz * 12.0)), wrack * 0.75);

  // A beach towel spread on the sand: soft blue and white stripes.
  vec2 towel = vec2(vWorld.x - uTowel.x, vWorld.z - uTowel.y);
  towel = mat2(cos(uTowel.z), -sin(uTowel.z), sin(uTowel.z), cos(uTowel.z)) * towel;
  float onTowel = step(abs(towel.x), 0.55) * step(abs(towel.y), 1.0);
  vec3 towelColor = mix(vec3(0.95, 0.95, 0.92), vec3(0.16, 0.42, 0.72), step(0.5, fract(towel.y * 2.2)));
  towelColor *= 0.92 + 0.08 * vnoise(towel * 14.0);
  sand = mix(sand, towelColor, onTowel);

  // Soft shadows of the umbrella canopy and the surfboard, cast away from the sun.
  vec2 away = -normalize(uSunDir.xz) * 1.0;
  float umbrellaShadow = 1.0 - smoothstep(0.75, 1.1, ellipse(xz - (uUmbrella.xy + away * uUmbrella.w * 0.9), vec2(uUmbrella.z, uUmbrella.z * 0.7)));
  vec2 boardDir = normalize(away);
  vec2 bq = xz - (uBoard.xy + boardDir * uBoard.z * 0.55);
  bq = vec2(dot(bq, boardDir), dot(bq, vec2(-boardDir.y, boardDir.x)));
  float boardShadow = 1.0 - smoothstep(0.8, 1.1, ellipse(bq, vec2(uBoard.z * 0.55, 0.16)));
  float shade = max(umbrellaShadow * 0.38, boardShadow * 0.3);
  for (int i = 0; i < 4; i++) shade = max(shade, palmShadow(xz, uPalmA[i], uPalmB[i]) * 0.4);
  for (int i = 0; i < 8; i++) {
    vec4 blob = uBlobs[i];
    shade = max(shade, (1.0 - smoothstep(0.55, 1.0, ellipse(xz - blob.xy, blob.zw))) * 0.34);
  }
  // Shadows on sand are lit by the blue sky, so they read cool rather than grey.
  sand *= mix(vec3(1.0), vec3(0.64, 0.68, 0.8), shade / 0.4 * 0.95 * step(uShore + 1.0, vWorld.z));

  // Shallow water sheet between the sea and the running front.
  float sheet = smoothstep(front + 0.25, front - 0.35, vWorld.z);
  float depth = clamp(1.0 - d / 7.0, 0.0, 1.0);
  vec3 shallow = mix(vec3(0.5, 0.8, 0.78), vec3(0.14, 0.52, 0.6), depth);
  float caustic = vnoise(xz * 1.6 + uTime * 0.6) * vnoise(xz * 2.3 - uTime * 0.4);
  shallow += caustic * 0.18;
  vec3 color = mix(sand, mix(sand, shallow, 0.72), sheet);

  // Broken foam along the running edge and a softer band just behind it.
  float lace = smoothstep(0.35, 0.75, vnoise(vec2(vWorld.x * 1.3, vWorld.z * 2.0 + uTime * 0.8)));
  float foam = exp(-pow((vWorld.z - front) / 0.35, 2.0)) * (0.55 + 0.45 * lace);
  foam += exp(-pow((vWorld.z - front + 1.4) / 0.8, 2.0)) * 0.35 * lace;
  color = mix(color, vec3(1.0, 1.0, 1.0), clamp(foam, 0.0, 1.0));

  // Under the sea the sand fades into turquoise, then deep blue, so the shoreline blends.
  float seabedDepth = smoothstep(0.0, -30.0, d);
  color = mix(color, vec3(0.03, 0.3, 0.34), seabedDepth * 0.85);

  color *= 0.92 + 0.08 * max(uSunDir.y, 0.0);
  gl_FragColor = vec4(min(pow(color, vec3(2.2)) * 1.4, vec3(1.15)), uDay);
}
`;

/**
 * The surf zone: swells that rise as they near the beach, pitch forward and
 * break into whitewater. Blends into the reflective sea further out. Linear light.
 */
export const surfVertex = /* glsl */ `
uniform float uTime;
uniform float uShore;
varying vec3 vWorld;
varying float vFoam;
varying float vCrest;
varying float vD;
${NOISE}
${SURF}

float amplitude(float d) {
  return 1.25 * smoothstep(SURF_RANGE, 42.0, d) * smoothstep(2.5, 15.0, d);
}

void main() {
  vec3 p = position;
  float D = uShore - p.z;
  float bend = sin(p.x * 0.07 + 1.3) * 3.5 + (vnoise(vec2(p.x * 0.045, 3.0)) - 0.5) * 11.0;
  float h = 0.0;
  float foam = 0.0;
  float crest = 0.0;
  for (int k = 0; k < 3; k++) {
    // Each wave's life runs from the back of the set (72 m out) to the beach (0). The
    // crest line bends along the shore, so fade on life rather than distance: a wave
    // then never vanishes mid-swell when it recycles, wherever it is along the beach.
    float life = mod(float(k) * SURF_SPACING - uTime * SURF_SPEED, SURF_RANGE);
    float lifeFade = smoothstep(0.0, 8.0, life) * smoothstep(SURF_RANGE, SURF_RANGE - 8.0, life);
    float center = life + bend * smoothstep(SURF_RANGE, 20.0, D);
    float dd = D - center;
    float width = dd < 0.0 ? 1.5 : 5.5;
    float shape = exp(-(dd * dd) / (width * width));
    float a = amplitude(center) * lifeFade;
    h += a * shape;
    crest = max(crest, shape * a);
    // Each wave breaks in sections along its length, not as one straight line.
    float wave = floor((uTime * SURF_SPEED - float(k) * SURF_SPACING) / SURF_RANGE) * 3.0 + float(k);
    float sections = smoothstep(0.38, 0.62, vnoise(vec2(p.x * 0.035, wave * 7.3)));
    // Whitewater dies away as the wave runs out of water at the beach.
    float spent = lifeFade * smoothstep(0.5, 7.0, center);
    float breaking = smoothstep(22.0, 14.0, center) * sections * spent;
    foam += breaking * (smoothstep(0.55, 0.0, abs(dd + 0.4)) + smoothstep(-0.5, 0.8, dd) * smoothstep(5.0, 0.8, dd) * 0.45);
    foam += smoothstep(0.84, 0.98, shape) * smoothstep(30.0, 21.0, center) * 0.35 * sections * spent;
  }
  p.y = -3.97 + h;
  p.z += crest * 0.55;
  vFoam = foam;
  vCrest = crest;
  vD = D;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const surfFragment = /* glsl */ `
uniform float uTime;
uniform float uDay;
uniform vec3 uSunDir;
varying vec3 vWorld;
varying float vFoam;
varying float vCrest;
varying float vD;
${NOISE}

void main() {
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (n.y < 0.0) n = -n;
  vec2 q = vWorld.xz * 0.9 + vec2(uTime * 0.2, uTime * 0.5);
  n = normalize(n + vec3(vnoise(q) - 0.5, 0.0, vnoise(q + 9.0) - 0.5) * 0.35);
  vec3 view = normalize(cameraPosition - vWorld);
  float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(n, view), 0.0), 5.0);

  // The reflective sea shows through; this layer only adds the form of each wave:
  // a glassy, sunlit crest, a shaded front face, and whitewater once it breaks.
  // Only real wave faces get shaded, so small ripples near the beach stay clear.
  float face = clamp(-n.z * 2.0, 0.0, 1.0) * smoothstep(0.25, 0.8, vCrest);
  float backlit = smoothstep(0.35, 1.1, vCrest);
  vec3 crestColor = vec3(0.05, 0.42, 0.38);
  vec3 shadeColor = vec3(0.01, 0.12, 0.16);
  vec3 water = mix(crestColor, shadeColor, face * 0.7);
  vec3 r = reflect(-view, n);
  water += vec3(0.7, 0.66, 0.6) * pow(max(dot(r, uSunDir), 0.0), 300.0);
  float formAlpha = clamp(backlit * 0.55 + face * 0.35, 0.0, 0.7) * (1.0 - fresnel * 0.6);

  // Bubbly whitewater: two scales of cells so the foam breaks up into patches and holes.
  float lace = vnoise(vWorld.xz * vec2(0.9, 2.2) + vec2(0.0, uTime * 0.5)) * 0.55 + vnoise(vWorld.xz * 4.3 - uTime * 0.3) * 0.45;
  float bubbles = smoothstep(0.3, 0.7, vnoise(vWorld.xz * 7.0 + uTime * 0.4));
  float foam = smoothstep(0.45, 0.95, vFoam * (0.25 + lace * 1.25)) * mix(0.65, 1.0, bubbles);
  // Turquoise through the middle depths; clear right at the beach so the sand shows.
  float shallows = smoothstep(2.0, 12.0, vD) * smoothstep(72.0, 22.0, vD);
  vec3 turquoise = vec3(0.015, 0.42, 0.4);
  vec3 body = mix(turquoise, water, clamp(formAlpha * 1.4, 0.0, 1.0));
  vec3 color = mix(body, vec3(1.05, 1.08, 1.1), foam);

  float alpha = max(max(formAlpha, shallows * 0.42), foam) * smoothstep(72.0, 30.0, vD) * smoothstep(0.0, 1.5, vD);
  gl_FragColor = vec4(color, alpha * uDay);
}
`;

/**
 * Lit props (umbrella, loungers, tower, surfer, dolphins, gulls...): lambert, sky fill
 * and a wet highlight. Cloth (flags, kite tails) ripples in the wind. Linear light.
 */
export const propVertex = /* glsl */ `
uniform float uTime;
uniform vec4 uFlutter; // amplitude, wavenumber, speed, axis (0: flag along +x, 1: tail along -y)
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;

void main() {
  vLocal = position;
  vec3 p = position;
  if (uFlutter.x > 0.0) {
    // Ripples travel away from the fixed edge and grow towards the free end.
    float along = uFlutter.w < 0.5 ? p.x : -p.y;
    float wave = sin(along * uFlutter.y - uTime * uFlutter.z) + 0.35 * sin(along * uFlutter.y * 2.3 - uTime * uFlutter.z * 1.7);
    float bend = wave * uFlutter.x * along;
    if (uFlutter.w < 0.5) p.z += bend; else p.x += bend;
  }
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const propFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColor2;
// 0 plain, 1 canopy stripes, 2 centre stripe, 3 dolphin countershading, 4 bark,
// 5 fabric stripes, 6 gull wing tips, 7 beach ball, 8 packed sand, 9 two-band flag, 10 weathered wood
uniform float uPattern;
uniform float uStripes;
uniform float uShine;
uniform float uOpacity;
uniform vec3 uSunDir;
uniform vec4 uFlutter;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
${NOISE}

void main() {
  vec3 view = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormalW);
  if (!gl_FrontFacing) n = -n;
  if (uFlutter.x > 0.0) {
    // Rippling cloth: shade from the displaced surface itself, facing the viewer.
    n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (dot(n, view) < 0.0) n = -n;
  }
  vec3 base = uColor;
  if (uPattern > 0.5 && uPattern < 1.5) {
    float angle = atan(vLocal.z, vLocal.x) / 6.28318 + 0.5;
    base = mix(uColor, uColor2, step(0.5, fract(angle * uStripes)));
  } else if (uPattern > 1.5 && uPattern < 2.5) {
    base = mix(uColor, uColor2, step(abs(vLocal.x), 0.045));
  } else if (uPattern > 2.5 && uPattern < 3.5) {
    base = mix(uColor2, uColor, smoothstep(-0.35, 0.45, n.y));
  } else if (uPattern > 3.5 && uPattern < 4.5) {
    float wobble = sin(atan(vLocal.z, vLocal.x) * 3.0 + vLocal.y * 2.0) * 0.08;
    float ring = fract(vLocal.y * 4.2 + wobble);
    float fibres = 0.85 + 0.15 * sin(atan(vLocal.z, vLocal.x) * 40.0 + vLocal.y * 9.0);
    base = mix(uColor2, uColor, smoothstep(0.05, 0.3, ring) * (1.0 - smoothstep(0.8, 0.97, ring))) * fibres;
  } else if (uPattern > 4.5 && uPattern < 5.5) {
    // Woven fabric in lengthwise stripes.
    base = mix(uColor, uColor2, step(0.5, fract(vLocal.x * uStripes + 0.25)));
    base *= 0.94 + 0.06 * vnoise(vLocal.xz * 90.0);
  } else if (uPattern > 5.5 && uPattern < 6.5) {
    // Grey gull wing with black, white-spotted tips.
    float tip = smoothstep(uStripes * 0.72, uStripes * 0.8, abs(vLocal.z));
    base = mix(uColor, uColor2, tip);
    base = mix(base, vec3(0.9), tip * step(uStripes * 0.93, abs(vLocal.z)));
  } else if (uPattern > 6.5 && uPattern < 7.5) {
    // Beach ball: six coloured gores with white caps.
    float sector = floor((atan(vLocal.z, vLocal.x) / 6.28318 + 0.5) * 6.0);
    vec3 gore = sector < 0.5 ? vec3(0.8, 0.08, 0.06)
      : sector < 1.5 ? vec3(0.92, 0.9, 0.86)
      : sector < 2.5 ? vec3(0.05, 0.28, 0.72)
      : sector < 3.5 ? vec3(0.95, 0.72, 0.08)
      : sector < 4.5 ? vec3(0.92, 0.9, 0.86)
      : vec3(0.1, 0.55, 0.3);
    base = mix(gore, vec3(0.94, 0.93, 0.9), step(uStripes * 0.88, abs(vLocal.y)));
  } else if (uPattern > 7.5 && uPattern < 8.5) {
    // Packed damp sand: grainy, with darker hand-patted patches.
    float g = vnoise(vWorld.xz * 38.0 + vWorld.y * 21.0) * 0.6 + vnoise(vWorld.xy * 9.0 + vWorld.z * 5.0) * 0.4;
    base = uColor * (0.84 + g * 0.26);
  } else if (uPattern > 8.5 && uPattern < 9.5) {
    // Two-band flag (red over yellow, like a lifeguard flag).
    base = mix(uColor2, uColor, step(0.0, vLocal.y));
  } else if (uPattern > 9.5) {
    // Weathered, sun-bleached wood with grain along its length.
    float grain = vnoise(vec2(vLocal.y * 3.0, (vLocal.x + vLocal.z) * 40.0));
    base = mix(uColor2, uColor, 0.55 + grain * 0.45);
  }
  float diffuse = max(dot(n, uSunDir), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  vec3 color = base * (vec3(1.1, 1.05, 0.95) * diffuse * 1.4 + vec3(0.42, 0.52, 0.66) * sky * 0.55);
  // Cloth lets a little sun through when lit from behind.
  if (uFlutter.x > 0.0) color += base * vec3(0.9, 0.8, 0.6) * max(dot(-n, uSunDir), 0.0) * 0.5;
  vec3 h = normalize(uSunDir + view);
  color += vec3(1.2) * pow(max(dot(n, h), 0.0), 60.0) * uShine;
  gl_FragColor = vec4(color, uOpacity);
}
`;

/**
 * Palm fronds built as a rachis with real leaflets hanging from both sides,
 * swaying on the breeze with the tips fluttering. Thin-leaf lighting with light
 * shining through from behind. Linear light.
 */
export const frondVertex = /* glsl */ `
uniform float uTime;
uniform float uPhase;
attribute vec3 color;
attribute float aAlong;
attribute float aTip;
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  vec3 p = position;
  float sway = sin(uTime * 1.05 + uPhase) * 0.5 + sin(uTime * 2.3 + uPhase * 1.7) * 0.2;
  p.y += sway * 0.12 * aAlong * aAlong;
  p.z += sway * 0.28 * aAlong * aAlong;
  p.y += sin(uTime * 6.0 + aAlong * 18.0 + uPhase) * 0.035 * aTip;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vColor = color;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const frondFragment = /* glsl */ `
uniform float uOpacity;
uniform vec3 uSunDir;
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;

void main() {
  vec3 n = normalize(vNormalW);
  if (!gl_FrontFacing) n = -n;
  float front = max(dot(n, uSunDir), 0.0);
  float through = max(dot(-n, uSunDir), 0.0);
  float sky = 0.5 + 0.5 * n.y;
  vec3 color = vColor * (vec3(1.05, 1.0, 0.9) * front * 1.25 + vec3(0.38, 0.46, 0.58) * sky * 0.55);
  color += vColor * vec3(0.6, 0.8, 0.3) * through * 0.55;
  vec3 view = normalize(cameraPosition - vWorld);
  color += vec3(0.25) * pow(max(dot(n, normalize(uSunDir + view)), 0.0), 30.0) * front;
  gl_FragColor = vec4(color, uOpacity);
}
`;

/** Distant headlands on the horizon, softened by haze. Linear light. */
export const headlandVertex = /* glsl */ `
varying vec2 vUv;
${NOISE}

void main() {
  vUv = uv;
  vec3 p = position;
  // Top edge follows a ridge line; outside the headland it sinks to the sea.
  float ridge = clamp(fbm(vec2(uv.x * 7.0, 1.3)) * 1.3 - 0.2, 0.0, 1.0);
  float envelope = smoothstep(0.05, 0.25, uv.x) * (1.0 - smoothstep(0.45, 0.7, uv.x));
  float top = -18.0 + 36.0 * ridge * envelope;
  p.y = mix(-18.0, top, step(0.5, uv.y));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const headlandFragment = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;

void main() {
  vec3 land = vec3(0.12, 0.2, 0.2);
  vec3 haze = vec3(0.36, 0.5, 0.68);
  vec3 color = mix(land, haze, 0.62 + 0.2 * vUv.y);
  gl_FragColor = vec4(color, uOpacity);
}
`;
