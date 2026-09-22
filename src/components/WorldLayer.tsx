import { Component, Suspense, lazy, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useScroll } from "motion/react";
import { markWorldReady } from "../lib/events";
import { supportsWebGL } from "../lib/webgl";

// Three.js ships in its own chunk so the page content paints first.
const World = lazy(() => import("../three/World"));


class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    markWorldReady();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Fixed full-screen 3D backdrop. Falls back to a static gradient without WebGL. */
export function WorldLayer() {
  const { scrollY } = useScroll();
  const [supported] = useState(supportsWebGL);

  useEffect(() => {
    if (!supported) markWorldReady();
  }, [supported]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh">
      <div className="world-base absolute inset-0" />
      {supported && (
        <WebGLBoundary>
          <Suspense fallback={null}>
            <World scrollY={scrollY} />
          </Suspense>
        </WebGLBoundary>
      )}
      <div className="world-fade absolute inset-0" />
    </div>
  );
}
