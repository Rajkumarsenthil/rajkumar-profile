import { useCallback, useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { Cursor } from "./components/Cursor";
import { Experience } from "./components/Experience";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Loader } from "./components/Loader";
import { Marquee } from "./components/Marquee";
import { Nav } from "./components/Nav";
import { ScrollProgress } from "./components/ScrollProgress";
import { Skills } from "./components/Skills";
import { Statement } from "./components/Statement";
import { Work } from "./components/Work";
import { WorldLayer } from "./components/WorldLayer";
import { useActiveSection } from "./hooks/useActiveSection";
import { destroySmoothScroll, initSmoothScroll } from "./lib/scroll";
import { sound } from "./lib/sound";

const SOUND_SECTIONS = ["top", "statement", "work", "experience", "skills", "about", "contact"];

/** Retunes the soundscape to whichever section is on screen. */
function SoundDirector() {
  const active = useActiveSection(SOUND_SECTIONS);
  useEffect(() => {
    sound.setSection(active ?? "top");
  }, [active]);
  return null;
}

/** Feeds pointer position to `.spotlight` cards so their glow follows the cursor. */
function useSpotlight() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest<HTMLElement>(".spotlight");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
}

export default function App() {
  const reduce = useReducedMotion();
  // Hero and nav hold their entrance animations until the visitor enters.
  const [ready, setReady] = useState(false);
  const onEnter = useCallback(() => setReady(true), []);
  useSpotlight();

  useEffect(() => {
    if (reduce) return;
    initSmoothScroll();
    return () => destroySmoothScroll();
  }, [reduce]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <WorldLayer />
      <div aria-hidden className="grain" />
      <Loader onEnter={onEnter} />
      <ScrollProgress />
      <Cursor />
      <SoundDirector />
      <div className="relative z-10">
        <Nav ready={ready} />
        <main id="main">
          <Hero ready={ready} />
          <Marquee />
          <Statement />
          <Work />
          <Experience />
          <Skills />
          <About />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
