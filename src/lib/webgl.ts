let cached: boolean | null = null;

/** Whether this browser can create a WebGL context. Checked once, then cached. */
export function supportsWebGL() {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    cached = gl !== null;
  } catch {
    cached = false;
  }
  return cached;
}
