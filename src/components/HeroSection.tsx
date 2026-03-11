import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import heroBg from "@/assets/raj4.png";
import heroBg2 from "@/assets/raj2.png";
import heroBg3 from "@/assets/raj3.png";
import heroBg4 from "@/assets/raj5.png";

const letterVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.3 + i * 0.04,
      duration: 0.5,
      ease: "easeOut" as const,
    },
  }),
};

const AnimatedText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => (
  <span className={className}>
    {text.split("").map((char, i) => (
      <motion.span
        key={i}
        custom={i}
        variants={letterVariants}
        initial="hidden"
        animate="visible"
        className="inline-block"
      >
        {char === " " ? "\u00A0" : char}
      </motion.span>
    ))}
  </span>
);

const heroBackgrounds = [
  { id: "mountain", src: heroBg, emoji: "🏔️", mood: "Mountain Mode" },
  { id: "rocket", src: heroBg2, emoji: "🚀", mood: "Launch Mode" },
  { id: "vibes", src: heroBg3, emoji: "😎", mood: "Chill Mode" },
  { id: "portrait", src: heroBg4, emoji: "📸", mood: "Portrait Mode" },
] as const;

const HeroSection = () => {
  const [activeBgIndex, setActiveBgIndex] = useState(0);
  const activeBackground = heroBackgrounds[activeBgIndex];

  const cycleBackground = () => {
    setActiveBgIndex((prevIndex) => (prevIndex + 1) % heroBackgrounds.length);
  };

  const backgroundCounterText = useMemo(
    () => `${activeBgIndex + 1} / ${heroBackgrounds.length}`,
    [activeBgIndex],
  );

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBackground.id}
            initial={{
              opacity: 0,
              scale: 1.22,
              rotate: -1,
              filter: "saturate(1.15) contrast(1.06)",
            }}
            animate={{
              opacity: 1,
              scale: 1.05,
              rotate: 0,
              filter: "saturate(1) contrast(1)",
            }}
            exit={{
              opacity: 0,
              scale: 1,
              rotate: 1,
              filter: "saturate(0.9) contrast(0.95)",
            }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-cover bg-center hero-bg-layer hero-bg-switch"
            style={{ backgroundImage: `url(${activeBackground.src})` }}
          />
        </AnimatePresence>
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="absolute inset-0 hero-text-overlay" />
      </div>

      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 md:right-10"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1, duration: 0.7 }}
      >
        <motion.button
          onClick={cycleBackground}
          className="vibe-shuffle-btn group"
          aria-label="Shuffle hero background image"
          whileHover={{ scale: 1.06, rotate: -2 }}
          whileTap={{ scale: 0.95, rotate: 2 }}
        >
          <span className="text-2xl">{activeBackground.emoji}</span>
          <span className="font-display text-[10px] tracking-[0.16em] uppercase">
            Shuffle Me
          </span>
          <span className="text-[11px] font-semibold">
            {activeBackground.mood}
          </span>
          <span className="text-[10px] text-foreground/65 dark:text-foreground/65">
            {backgroundCounterText}
          </span>
        </motion.button>

        <div className="mt-3 flex items-center justify-end gap-2">
          {heroBackgrounds.map((background, index) => (
            <button
              key={background.id}
              onClick={() => setActiveBgIndex(index)}
              aria-label={`Switch to ${background.mood}`}
              className={`vibe-dot ${index === activeBgIndex ? "is-active" : ""}`}
              style={{ backgroundImage: `url(${background.src})` }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        className="absolute top-20 right-20 w-72 h-72 rounded-full opacity-20"
        style={{ background: "var(--gradient-blue)" }}
        animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-40 left-10 w-40 h-40 rounded-full opacity-10"
        style={{ background: "var(--gradient-accent)" }}
        animate={{ y: [0, 15, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 container mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-foreground/85 dark:text-slate-200/95 tracking-[0.3em] uppercase text-sm mb-6 font-medium"
          >
            Full Stack Developer · Engineering Lead · Explorer
          </motion.p>

          <h1 className="font-display text-foreground dark:text-slate-100 text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-8 drop-shadow-[0_4px_12px_hsl(220_30%_6%_/_0.35)]">
            <AnimatedText text="Rajkumar" />
            <br />
            <span className="text-gradient">
              <AnimatedText text="Senthil" />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            className="font-body text-foreground/86 dark:text-slate-300/95 text-lg md:text-xl max-w-lg leading-relaxed"
          >
            Full-stack engineer with 4+ years building scalable,
            workflow-intensive applications. Rider, adventurer, and aspiring
            entrepreneur from Chennai.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="mt-10 flex gap-4 flex-wrap"
          >
            {["Facilio", "Java & Vue.js", "4+ Years", "Chennai"].map(
              (tag, i) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.8 + i * 0.15 }}
                  className="px-4 py-2 rounded-full border border-foreground/20 dark:border-slate-200/28 text-foreground/85 dark:text-slate-100 text-sm font-display font-medium backdrop-blur-sm bg-background/55 dark:bg-slate-950/28"
                >
                  {tag}
                </motion.span>
              ),
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-primary/40 flex items-start justify-center p-1.5"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-1.5 rounded-full bg-primary"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
