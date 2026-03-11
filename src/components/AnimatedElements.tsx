import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import bikeSprite from "@/assets/bike.webp";
import { useTheme } from "@/hooks/useTheme";

type BikeGameState = "idle" | "running" | "gameover";
type ObstacleKind = "cone" | "box" | "bar";

type TrackObstacle = {
  id: number;
  kind: ObstacleKind;
  x: number;
  width: number;
  height: number;
  glyph: string;
  passed: boolean;
};

const GRAVITY = 0.78;
const JUMP_FORCE = 14;
const BASE_SPEED = 7;
const BIKE_WIDTH = 108;
const BIKE_HEIGHT = 66;
const TRACK_BOTTOM = 8;
const BIKE_VISUAL_DROP = 68;

const spawnObstacle = (id: number, startX: number): TrackObstacle => {
  const variants: Omit<TrackObstacle, "id" | "x" | "passed">[] = [
    { kind: "cone", width: 26, height: 28, glyph: "🚧" },
    { kind: "box", width: 30, height: 30, glyph: "📦" },
    { kind: "bar", width: 40, height: 22, glyph: "🧱" },
  ];
  const selected = variants[Math.floor(Math.random() * variants.length)];
  return { ...selected, id, x: startX, passed: false };
};

// Playable bike strip inspired by the Chrome dino game
export const RidingBike = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  const lastFrameRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const nextObstacleIdRef = useRef(1);

  const bikeYRef = useRef(0);
  const bikeVelocityRef = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const scoreFloatRef = useRef(0);
  const obstaclesRef = useRef<TrackObstacle[]>([]);
  const gameStateRef = useRef<BikeGameState>("idle");

  const [trackWidth, setTrackWidth] = useState(1200);
  const [bikeY, setBikeY] = useState(0);
  const [obstacles, setObstacles] = useState<TrackObstacle[]>([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameState, setGameState] = useState<BikeGameState>("idle");

  const bikeX = useMemo(() => Math.max(56, Math.round(trackWidth * 0.12)), [trackWidth]);
  const bikeXRef = useRef(bikeX);
  const trackWidthRef = useRef(trackWidth);

  useEffect(() => {
    bikeXRef.current = bikeX;
  }, [bikeX]);

  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);

  const setGameStateSync = useCallback((nextState: BikeGameState) => {
    gameStateRef.current = nextState;
    setGameState(nextState);
  }, []);

  const resetRound = useCallback(() => {
    bikeYRef.current = 0;
    bikeVelocityRef.current = 0;
    scoreFloatRef.current = 0;
    speedRef.current = BASE_SPEED;
    spawnTimerRef.current = 0;
    obstaclesRef.current = [];
    lastFrameRef.current = 0;
    setBikeY(0);
    setObstacles([]);
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    if (bikeYRef.current <= 0.5) {
      bikeVelocityRef.current = JUMP_FORCE;
    }
  }, []);

  const handleAction = useCallback(() => {
    if (gameStateRef.current === "idle") {
      resetRound();
      setGameStateSync("running");
      jump();
      return;
    }

    if (gameStateRef.current === "gameover") {
      resetRound();
      setGameStateSync("running");
      return;
    }

    jump();
  }, [jump, resetRound, setGameStateSync]);

  useEffect(() => {
    const updateTrackWidth = () => {
      setTrackWidth(containerRef.current?.clientWidth ?? window.innerWidth);
    };

    updateTrackWidth();
    window.addEventListener("resize", updateTrackWidth);
    return () => window.removeEventListener("resize", updateTrackWidth);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!["Space", "ArrowUp", "KeyW"].includes(event.code)) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) {
        return;
      }

      const tagName = target?.tagName;
      if (tagName && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tagName)) {
        return;
      }

      event.preventDefault();
      handleAction();
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAction]);

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (!lastFrameRef.current) {
        lastFrameRef.current = timestamp;
      }

      const deltaMs = Math.min(34, timestamp - lastFrameRef.current);
      lastFrameRef.current = timestamp;
      const deltaFactor = deltaMs / 16.67;

      if (gameStateRef.current === "running") {
        bikeVelocityRef.current -= GRAVITY * deltaFactor;
        bikeYRef.current = Math.max(0, bikeYRef.current + bikeVelocityRef.current * deltaFactor);
        if (bikeYRef.current === 0 && bikeVelocityRef.current < 0) {
          bikeVelocityRef.current = 0;
        }

        speedRef.current = Math.min(15, speedRef.current + deltaMs * 0.00045);
        spawnTimerRef.current += deltaMs;

        const nextSpawnIn = Math.max(620, 1350 - speedRef.current * 55);
        if (spawnTimerRef.current >= nextSpawnIn) {
          spawnTimerRef.current = 0;
          obstaclesRef.current = [
            ...obstaclesRef.current,
            spawnObstacle(nextObstacleIdRef.current++, trackWidthRef.current + 24),
          ];
        }

        const movement = speedRef.current * deltaMs * 0.08;
        let collisionDetected = false;

        obstaclesRef.current = obstaclesRef.current
          .map((obstacle) => ({ ...obstacle, x: obstacle.x - movement }))
          .filter((obstacle) => obstacle.x + obstacle.width > -32)
          .map((obstacle) => {
            const bikeLeft = bikeXRef.current + 14;
            const bikeRight = bikeXRef.current + BIKE_WIDTH - 18;
            const obstacleLeft = obstacle.x;
            const obstacleRight = obstacle.x + obstacle.width;

            const overlapsX = bikeRight > obstacleLeft && bikeLeft < obstacleRight;
            const overlapsY = bikeYRef.current < obstacle.height - 6;
            if (overlapsX && overlapsY) {
              collisionDetected = true;
            }

            if (!obstacle.passed && obstacleRight < bikeLeft) {
              scoreFloatRef.current += 12;
              return { ...obstacle, passed: true };
            }

            return obstacle;
          });

        scoreFloatRef.current += deltaMs * 0.045;
        const currentScore = Math.floor(scoreFloatRef.current);

        setBikeY(bikeYRef.current);
        setObstacles(obstaclesRef.current);
        setScore(currentScore);

        if (collisionDetected) {
          bikeYRef.current = 0;
          bikeVelocityRef.current = 0;
          setBikeY(0);
          setGameStateSync("gameover");
          setBestScore((previousBest) => Math.max(previousBest, currentScore));
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [setGameStateSync]);

  const helperText =
    gameState === "idle"
      ? "Press Space / ↑ / W or tap the strip to start"
      : gameState === "running"
        ? "Jump over obstacles"
        : "Crash! Press Space or tap to restart";
  const displayBikeY = gameState === "gameover" ? 0 : bikeY;

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label="Bike run mini game. Press space or tap to jump."
      onClick={handleAction}
      onKeyDown={(event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          handleAction();
        }
      }}
      className={`relative w-full overflow-hidden h-36 my-8 border-y bg-gradient-to-b from-primary/5 via-background to-background cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none transition-colors duration-200 ${
        gameState === "running"
          ? "border-primary/30 dark:border-primary/35"
          : "border-border/25 dark:border-border/35"
      }`}
    >
      <div className="absolute left-4 top-3 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary/90">
        <span className="font-display">Bike Run</span>
        <span className="text-foreground/50">{helperText}</span>
      </div>

      <div className="absolute right-4 top-3 flex items-center gap-4 text-xs font-display">
        <span className="rounded-full border border-primary/35 px-3 py-1 text-primary">Score: {score}</span>
        <span className="rounded-full border border-foreground/20 px-3 py-1 text-foreground/75">
          Best: {bestScore}
        </span>
      </div>

      <motion.div
        className="absolute left-0 bottom-[8px] h-[2px] w-[200%]"
        style={{
          background:
            "repeating-linear-gradient(90deg, hsl(var(--foreground) / 0.2) 0 46px, hsl(var(--primary) / 0.45) 46px 84px)",
        }}
        animate={gameState === "running" ? { x: [0, -84] } : { x: 0 }}
        transition={gameState === "running"
          ? { duration: 0.42, ease: "linear", repeat: Infinity }
          : { duration: 0.2 }}
      />

      {obstacles.map((obstacle) => (
        <motion.div
          key={obstacle.id}
          className="absolute flex items-end justify-center rounded-md bg-card/75 border border-border/50 shadow-[var(--shadow-card)]"
          style={{
            left: obstacle.x,
            bottom: TRACK_BOTTOM + 2,
            width: obstacle.width,
            height: obstacle.height,
          }}
          initial={{ scale: 0.9, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <span className="text-lg leading-none">{obstacle.glyph}</span>
        </motion.div>
      ))}

      <motion.div
        className="absolute z-10 relative"
        style={{ left: bikeX, bottom: TRACK_BOTTOM - 12 + displayBikeY }}
        animate={gameState === "running" ? { y: [0, -1.5, 0] } : { y: 0 }}
        transition={gameState === "running"
          ? { duration: 0.22, repeat: Infinity, ease: "linear" }
          : { duration: 0.2 }}
      >
        <motion.img
          src={bikeSprite}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none select-none drop-shadow-[0_4px_12px_hsl(var(--primary)/0.34)]"
          style={{
            width: BIKE_WIDTH,
            height: BIKE_HEIGHT,
            objectFit: "contain",
            objectPosition: "center bottom",
            y: BIKE_VISUAL_DROP,
          }}
          animate={gameState === "running" ? { rotate: [0, -0.8, 0.6, 0], scale: [1, 1.01, 1] } : { rotate: 0, scale: 1 }}
          transition={gameState === "running"
            ? { duration: 0.24, repeat: Infinity, ease: "linear" }
            : { duration: 0.2 }}
        />
        <motion.div
          className="absolute left-1 bottom-[-28px] w-2.5 h-2.5 rounded-full bg-muted-foreground/40"
          animate={gameState === "running"
            ? { x: [-2, -16], opacity: [0.35, 0], scale: [1, 1.9] }
            : { opacity: 0 }}
          transition={gameState === "running"
            ? { duration: 0.9, repeat: Infinity, ease: "easeOut" }
            : { duration: 0.2 }}
        />
        <motion.div
          className="absolute left-2 bottom-[-32px] w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
          animate={gameState === "running"
            ? { x: [-3, -20], opacity: [0.24, 0], scale: [1, 2.3] }
            : { opacity: 0 }}
          transition={gameState === "running"
            ? { duration: 1.1, repeat: Infinity, ease: "easeOut", delay: 0.18 }
            : { duration: 0.2 }}
        />
      </motion.div>

      {gameState === "gameover" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[1px]"
        >
          <p className="font-display text-lg md:text-xl text-foreground">
            Oops. You hit traffic. Press Space or tap to retry.
          </p>
        </motion.div>
      )}
    </div>
  );
};

type ScenePointer = {
  x: number;
  y: number;
  active: boolean;
};

const cloudConfigs = [
  { id: "c1", leftPct: 12, topPx: 22, width: 138, height: 56, drift: 14, duration: 16 },
  { id: "c2", leftPct: 40, topPx: 48, width: 156, height: 62, drift: 18, duration: 18 },
  { id: "c3", leftPct: 68, topPx: 30, width: 148, height: 58, drift: 15, duration: 17 },
] as const;

const crowConfigs = [
  { id: "r1", leftPct: 21, topPx: 18, driftX: 10, driftY: 4, duration: 4 },
  { id: "r2", leftPct: 38, topPx: 28, driftX: 12, driftY: 5, duration: 4.8 },
  { id: "r3", leftPct: 56, topPx: 20, driftX: 11, driftY: 4, duration: 4.3 },
  { id: "r4", leftPct: 74, topPx: 24, driftX: 13, driftY: 5, duration: 5.2 },
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Animated mountain range with dark-mode moon and interactive sky elements
export const MountainScene = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const sceneRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ width: 1200, height: 192 });
  const [pointer, setPointer] = useState<ScenePointer>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const updateSceneSize = () => {
      const rect = sceneRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      setSceneSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSceneSize();
    window.addEventListener("resize", updateSceneSize);
    return () => window.removeEventListener("resize", updateSceneSize);
  }, []);

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setPointer({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setPointer((prev) => ({ ...prev, active: false }));
  };

  const moonCutoutStyle = useMemo(
    () => ({
      background: "hsl(var(--background) / 0.9)",
      boxShadow: "inset -4px -4px 12px hsl(220 20% 10% / 0.35)",
    }),
    [],
  );
  const skyParallaxX = pointer.active ? ((pointer.x / sceneSize.width) - 0.5) * 10 : 0;
  const skyParallaxY = pointer.active ? ((pointer.y / sceneSize.height) - 0.5) * 6 : 0;

  return (
    <div
      ref={sceneRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-48 overflow-hidden my-12"
    >
      <motion.div
        className="absolute inset-0"
        animate={{ x: skyParallaxX, y: skyParallaxY }}
        transition={{ type: "spring", stiffness: 65, damping: 18, mass: 0.8 }}
      >
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            background: isDark
              ? "linear-gradient(180deg, hsl(223 38% 16% / 0.9), hsl(224 30% 13% / 0.84) 42%, hsl(223 28% 11% / 0.9) 100%)"
              : "linear-gradient(180deg, hsl(212 58% 74% / 0.36), hsl(212 40% 68% / 0.32) 48%, hsl(220 28% 71% / 0.3) 100%)",
          }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(circle at 68% 28%, hsl(220 55% 74% / 0.12), transparent 42%), radial-gradient(circle at 18% 72%, hsl(213 44% 64% / 0.08), transparent 52%)"
              : "radial-gradient(circle at 72% 24%, hsl(210 72% 96% / 0.34), transparent 40%), radial-gradient(circle at 24% 70%, hsl(213 70% 92% / 0.24), transparent 55%)",
          }}
          animate={{ opacity: [0.72, 0.9, 0.72] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "linear-gradient(110deg, transparent 0%, hsl(220 40% 86% / 0.06) 48%, transparent 100%)"
              : "linear-gradient(110deg, transparent 0%, hsl(210 50% 99% / 0.18) 48%, transparent 100%)",
          }}
          animate={{ x: [0, -24, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {isDark && Array.from({ length: 14 }).map((_, index) => (
        <motion.div
          key={`star-${index}`}
          className="absolute rounded-full bg-slate-100/80"
          style={{
            width: 1.6 + (index % 3) * 0.8,
            height: 1.6 + (index % 3) * 0.8,
            left: `${6 + ((index * 7.4) % 88)}%`,
            top: 8 + (index % 4) * 12,
          }}
          animate={{ opacity: [0.22, 0.9, 0.22], scale: [0.9, 1.25, 0.9] }}
          transition={{ duration: 2.6 + (index % 4) * 0.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.18 }}
        />
      ))}
      {isDark && [0, 1].map((streakIndex) => (
        <motion.div
          key={`streak-${streakIndex}`}
          className="absolute pointer-events-none"
          style={{
            top: 20 + streakIndex * 26,
            left: `${26 + streakIndex * 36}%`,
            width: 132,
            height: 2,
            background: "linear-gradient(90deg, hsl(0 0% 100% / 0), hsl(218 78% 92% / 0.72), hsl(0 0% 100% / 0))",
            filter: "blur(0.2px)",
          }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 0.9, 0], x: [0, -160], y: [0, 62] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            repeatDelay: 7 + streakIndex * 3.2,
            ease: "easeOut",
            delay: streakIndex * 1.4,
          }}
        />
      ))}

      <motion.div
        className="absolute top-4 right-16 w-16 h-16 rounded-full overflow-hidden"
        style={{
          background: isDark
            ? "radial-gradient(circle at 30% 28%, hsl(216 36% 94%), hsl(216 26% 74%) 54%, hsl(217 22% 62%) 100%)"
            : "radial-gradient(circle, hsl(40 95% 65%), hsl(24 85% 48% / 0.6))",
        }}
        animate={{ y: [0, -5, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {isDark && (
          <>
            <div className="absolute left-4 top-4 w-2.5 h-2.5 rounded-full bg-slate-500/25" />
            <div className="absolute left-9 top-8 w-2 h-2 rounded-full bg-slate-600/20" />
            <div className="absolute left-7 top-11 w-1.5 h-1.5 rounded-full bg-slate-500/20" />
            <div className="absolute -right-1.5 top-1.5 w-14 h-14 rounded-full" style={moonCutoutStyle} />
          </>
        )}
      </motion.div>
      {isDark && (
        <motion.div
          className="absolute top-8 right-[74px] w-24 h-7 rounded-full pointer-events-none"
          style={{ background: "linear-gradient(90deg, hsl(219 30% 74% / 0), hsl(220 28% 72% / 0.2), hsl(219 30% 74% / 0))", filter: "blur(2px)" }}
          animate={{ x: [18, -26, 18], opacity: [0, 0.58, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.div
        className="absolute top-4 right-16 w-16 h-16 rounded-full"
        style={{
          background: isDark
            ? "radial-gradient(circle, transparent 48%, hsl(216 50% 82% / 0.22) 100%)"
            : "radial-gradient(circle, transparent 50%, hsl(40 95% 65% / 0.3) 100%)",
        }}
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Far mountains */}
      <motion.svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        animate={{ x: skyParallaxX * 0.22, y: skyParallaxY * 0.12 }}
        transition={{ type: "spring", stiffness: 58, damping: 20, mass: 1.1 }}
      >
        <motion.path
          d="M0 200 L0 140 L100 80 L200 120 L300 60 L400 100 L500 40 L600 90 L700 50 L800 110 L900 70 L1000 100 L1100 55 L1200 130 L1200 200Z"
          fill={isDark ? "hsl(220 28% 20% / 0.74)" : "hsl(215 18% 76% / 0.9)"}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.75 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        />
        {!isDark && (
          <motion.path
            d="M295 65 L300 60 L305 65Z M495 45 L500 40 L505 45Z M695 55 L700 50 L705 55Z M895 75 L900 70 L905 75Z M1095 60 L1100 55 L1105 60Z"
            fill="hsl(var(--background))"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
        )}
      </motion.svg>

      <motion.svg
        className="absolute bottom-[-6px] w-full"
        viewBox="0 0 1200 170"
        preserveAspectRatio="none"
        animate={{ x: skyParallaxX * 0.36, y: skyParallaxY * 0.18 }}
        transition={{ type: "spring", stiffness: 70, damping: 18, mass: 0.92 }}
      >
        <motion.path
          d="M0 170 L0 126 L120 74 L245 106 L390 62 L520 108 L665 54 L780 96 L920 66 L1070 98 L1200 58 L1200 170Z"
          fill={isDark ? "hsl(222 30% 18% / 0.78)" : "hsl(214 24% 71% / 0.88)"}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.15 }}
        />
      </motion.svg>

      {/* Near mountains */}
      <motion.svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1200 150"
        preserveAspectRatio="none"
        animate={{ x: skyParallaxX * 0.55, y: skyParallaxY * 0.24 }}
        transition={{ type: "spring", stiffness: 76, damping: 16, mass: 0.85 }}
      >
        <motion.path
          d="M0 150 L0 120 L150 60 L300 100 L450 30 L600 80 L750 50 L900 90 L1050 40 L1200 100 L1200 150Z"
          fill={isDark ? "hsl(223 28% 13% / 0.96)" : "hsl(216 24% 67% / 0.92)"}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
        />
      </motion.svg>
      <motion.div
        className="absolute bottom-0 inset-x-0 h-20 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(180deg, hsl(217 24% 24% / 0), hsl(217 24% 24% / 0.2) 45%, hsl(217 24% 24% / 0.42) 100%)"
            : "linear-gradient(180deg, hsl(214 35% 92% / 0), hsl(214 35% 90% / 0.2) 50%, hsl(214 35% 88% / 0.35) 100%)",
          filter: "blur(1px)",
        }}
        animate={{ opacity: [0.55, 0.72, 0.55], x: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Interactive realistic clouds */}
      {cloudConfigs.map((cloud, index) => {
        const cloudX = (cloud.leftPct / 100) * sceneSize.width;
        const cloudY = cloud.topPx;
        const parallaxX = pointer.active ? ((pointer.x / sceneSize.width) - 0.5) * (8 + index * 2) : 0;
        const parallaxY = pointer.active ? ((pointer.y / sceneSize.height) - 0.5) * (5 + index) : 0;

        const dx = pointer.x - cloudX;
        const dy = pointer.y - cloudY;
        const distance = Math.hypot(dx, dy);
        const repelStrength = pointer.active ? clamp((210 - distance) / 210, 0, 1) : 0;
        const repelX = distance > 0 ? -(dx / distance) * repelStrength * 28 : 0;
        const repelY = distance > 0 ? -(dy / distance) * repelStrength * 12 : 0;

        return (
          <motion.div
            key={cloud.id}
            className="absolute pointer-events-none"
            style={{
              left: `${cloud.leftPct}%`,
              top: cloud.topPx,
              width: cloud.width,
              height: cloud.height,
            }}
            animate={{ x: parallaxX + repelX, y: parallaxY + repelY }}
            transition={{ type: "spring", stiffness: 80, damping: 18, mass: 0.5 }}
          >
            <motion.div
              className="relative w-full h-full"
              animate={{ x: [0, cloud.drift, 0], y: [0, -3.5, 0], scale: [1, 1.01, 1] }}
              transition={{ duration: cloud.duration, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
            >
              <div
                className="absolute inset-x-[12%] bottom-[14%] h-[44%] rounded-full"
                style={{
                  background: isDark
                    ? "linear-gradient(180deg, hsl(220 24% 78% / 0.18), hsl(220 22% 66% / 0.14))"
                    : "linear-gradient(180deg, hsl(214 32% 95% / 0.8), hsl(214 26% 87% / 0.7))",
                }}
              />
              <div
                className="absolute left-[12%] bottom-[30%] w-[34%] h-[46%] rounded-full"
                style={{
                  background: isDark
                    ? "linear-gradient(180deg, hsl(220 24% 80% / 0.18), hsl(220 22% 66% / 0.15))"
                    : "linear-gradient(180deg, hsl(214 30% 95% / 0.76), hsl(214 25% 88% / 0.68))",
                }}
              />
              <div
                className="absolute left-[34%] bottom-[36%] w-[38%] h-[52%] rounded-full"
                style={{
                  background: isDark
                    ? "linear-gradient(180deg, hsl(220 26% 82% / 0.18), hsl(220 24% 68% / 0.14))"
                    : "linear-gradient(180deg, hsl(214 34% 97% / 0.82), hsl(214 28% 90% / 0.72))",
                }}
              />
              <div
                className="absolute right-[10%] bottom-[27%] w-[30%] h-[42%] rounded-full"
                style={{
                  background: isDark
                    ? "linear-gradient(180deg, hsl(220 24% 78% / 0.17), hsl(220 22% 64% / 0.14))"
                    : "linear-gradient(180deg, hsl(214 30% 95% / 0.78), hsl(214 25% 88% / 0.66))",
                }}
              />
              <div
                className="absolute inset-x-[16%] bottom-[8%] h-[22%] rounded-full blur-[4px]"
                style={{ background: isDark ? "hsl(221 22% 38% / 0.2)" : "hsl(214 28% 62% / 0.26)" }}
              />
              <div
                className="absolute inset-x-[15%] bottom-[11%] h-[48%] rounded-full blur-[8px]"
                style={{ background: isDark ? "hsl(220 30% 65% / 0.1)" : "hsl(214 34% 94% / 0.24)" }}
              />
              <div
                className="absolute left-[22%] top-[34%] w-[20%] h-[14%] rounded-full blur-[3px]"
                style={{ background: isDark ? "hsl(220 24% 92% / 0.1)" : "hsl(0 0% 100% / 0.35)" }}
              />
              <div
                className="absolute left-[48%] top-[39%] w-[15%] h-[12%] rounded-full blur-[2px]"
                style={{ background: isDark ? "hsl(220 20% 90% / 0.08)" : "hsl(0 0% 100% / 0.3)" }}
              />
            </motion.div>
          </motion.div>
        );
      })}

      {/* Crows fly away when cursor gets near */}
      {crowConfigs.map((crow, index) => {
        const crowX = (crow.leftPct / 100) * sceneSize.width;
        const crowY = crow.topPx;
        const dx = crowX - pointer.x;
        const dy = crowY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const dangerLevel = pointer.active ? clamp((160 - distance) / 160, 0, 1) : 0;
        const fleeX = distance > 0 ? (dx / distance) * dangerLevel * 140 : 0;
        const fleeY = distance > 0 ? (dy / distance) * dangerLevel * 70 - dangerLevel * 20 : 0;
        const tilt = dangerLevel > 0.05 ? (fleeX > 0 ? -22 : 22) : 0;

        return (
          <motion.div
            key={crow.id}
            className="absolute text-foreground/40 pointer-events-none"
            style={{ top: crow.topPx, left: `${crow.leftPct}%` }}
            animate={{ x: fleeX, y: fleeY, opacity: 0.35 + (1 - dangerLevel) * 0.4, scale: 1 + dangerLevel * 0.08 }}
            transition={{ type: "spring", stiffness: 130, damping: 15, mass: 0.38 }}
          >
            <motion.div
              animate={{ y: [0, -crow.driftY, 0], x: [0, crow.driftX, 0] }}
              transition={{ duration: crow.duration, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
            >
              <motion.svg width="24" height="12" viewBox="0 0 24 12" fill="none" animate={{ rotate: tilt }}>
                <motion.path
                  d="M2 10 C5 3, 8 3, 12 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  animate={{ y: dangerLevel > 0.05 ? [0, -1.8, 0] : [0, -1, 0] }}
                  transition={{ duration: dangerLevel > 0.05 ? 0.18 : 0.62, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.path
                  d="M22 10 C19 3, 16 3, 12 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  animate={{ y: dangerLevel > 0.05 ? [0, -1.6, 0] : [0, -1, 0] }}
                  transition={{ duration: dangerLevel > 0.05 ? 0.18 : 0.62, repeat: Infinity, ease: "easeInOut", delay: 0.06 }}
                />
                <ellipse cx="12" cy="8.4" rx="1.5" ry="1.05" fill="currentColor" opacity="0.75" />
                <path d="M11.2 8.2 L8.8 10.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
                <path d="M12.8 8.2 L15.2 10.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
              </motion.svg>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

const WAVE_CANVAS_WIDTH = 1600;
const WAVE_CANVAS_HEIGHT = 180;

type SeaLayer = {
  id: string;
  baseY: number;
  amplitude: number;
  frequency: number;
  speed: number;
  turbulence: number;
  fillDark: string;
  fillLight: string;
  strokeDark: string;
  strokeLight: string;
  blur: number;
};

const seaLayers: SeaLayer[] = [
  {
    id: "back",
    baseY: 94,
    amplitude: 11,
    frequency: 1.35,
    speed: 0.62,
    turbulence: 0.24,
    fillDark: "hsl(204 52% 32% / 0.52)",
    fillLight: "hsl(201 56% 64% / 0.52)",
    strokeDark: "hsl(206 72% 72% / 0.2)",
    strokeLight: "hsl(200 76% 92% / 0.24)",
    blur: 0.3,
  },
  {
    id: "mid",
    baseY: 112,
    amplitude: 14,
    frequency: 1.58,
    speed: 0.9,
    turbulence: 0.3,
    fillDark: "hsl(202 54% 36% / 0.62)",
    fillLight: "hsl(201 58% 68% / 0.56)",
    strokeDark: "hsl(205 74% 82% / 0.24)",
    strokeLight: "hsl(200 78% 96% / 0.3)",
    blur: 0.16,
  },
  {
    id: "front",
    baseY: 128,
    amplitude: 16,
    frequency: 1.84,
    speed: 1.24,
    turbulence: 0.34,
    fillDark: "hsl(201 56% 42% / 0.7)",
    fillLight: "hsl(202 58% 72% / 0.64)",
    strokeDark: "hsl(204 76% 86% / 0.3)",
    strokeLight: "hsl(199 80% 98% / 0.35)",
    blur: 0,
  },
];

const buildWaveLine = (
  width: number,
  baseY: number,
  amplitude: number,
  frequency: number,
  phase: number,
  pointerX: number,
  pointerY: number,
  pointerActive: boolean,
  turbulence: number,
) => {
  const pointerInfluence = pointerActive
    ? clamp(1 - Math.abs(pointerY - baseY / WAVE_CANVAS_HEIGHT) * 1.7, 0, 1)
    : 0;

  let line = `M 0 ${baseY.toFixed(2)} `;
  for (let x = 0; x <= width; x += 20) {
    const progress = x / width;
    const swell = Math.sin(progress * Math.PI * 2 * frequency + phase) * amplitude;
    const chop =
      Math.sin(progress * Math.PI * 2 * (frequency * 2.2) - phase * 1.6) *
      amplitude *
      0.28;
    const drift =
      Math.cos(progress * Math.PI * 2 * (frequency * 0.72) + phase * 0.6) *
      amplitude *
      turbulence;

    const distance = Math.abs(progress - pointerX);
    const gaussian = Math.exp(-Math.pow(distance * 9.2, 2));
    const cursorRipple = pointerActive
      ? gaussian *
        pointerInfluence *
        (Math.sin(progress * 42 - phase * 4.8) * amplitude * 1.15 +
          Math.cos(progress * 24 + phase * 6.2) * amplitude * 0.36)
      : 0;

    const y = baseY + swell + chop + drift + cursorRipple;
    line += `L ${x.toFixed(1)} ${y.toFixed(2)} `;
  }

  return line;
};

// Cursor-reactive ocean waves with multi-layer realistic motion
export const SeaBreeze = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 1200, height: 160 });
  const [phase, setPhase] = useState(0);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.72, active: false });

  useEffect(() => {
    const updateBounds = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      setBounds({ width: rect.width, height: rect.height });
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = Math.min(34, now - previous);
      previous = now;
      setPhase((current) => current + delta * 0.00145);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const waves = useMemo(
    () =>
      seaLayers.map((layer, index) => {
        const line = buildWaveLine(
          WAVE_CANVAS_WIDTH,
          layer.baseY,
          layer.amplitude,
          layer.frequency,
          phase * layer.speed + index * 0.8,
          pointer.x,
          pointer.y,
          pointer.active,
          layer.turbulence,
        );
        return {
          ...layer,
          line,
          fillPath: `${line}L ${WAVE_CANVAS_WIDTH} ${WAVE_CANVAS_HEIGHT} L 0 ${WAVE_CANVAS_HEIGHT} Z`,
        };
      }),
    [phase, pointer],
  );

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const normalizedX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const normalizedY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    setPointer({ x: normalizedX, y: normalizedY, active: true });
  };

  const handleMouseLeave = () => {
    setPointer((prev) => ({ ...prev, active: false }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-28 md:h-32 overflow-hidden my-3 md:my-4"
    >
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "linear-gradient(180deg, hsl(217 36% 12% / 0.06), hsl(209 46% 20% / 0.18) 56%, hsl(205 42% 23% / 0.24) 100%)"
            : "linear-gradient(180deg, hsl(202 70% 90% / 0.1), hsl(202 66% 84% / 0.15) 62%, hsl(202 58% 80% / 0.2) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-8 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background) / 0.9), hsl(var(--background) / 0))",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, hsl(var(--background) / 0), hsl(var(--background) / 0.82))",
        }}
      />

      <motion.div
        className="absolute inset-x-0 top-[54%] h-10 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(180deg, hsl(0 0% 100% / 0.09), hsl(0 0% 100% / 0))"
            : "linear-gradient(180deg, hsl(0 0% 100% / 0.28), hsl(0 0% 100% / 0))",
          filter: "blur(8px)",
        }}
        animate={{ x: [0, -18, 0], opacity: [0.45, 0.72, 0.45] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${WAVE_CANVAS_WIDTH} ${WAVE_CANVAS_HEIGHT}`}
        preserveAspectRatio="none"
      >
        {waves.map((layer) => (
          <g
            key={layer.id}
            style={{ filter: layer.blur > 0 ? `blur(${layer.blur}px)` : undefined }}
          >
            <path
              d={layer.fillPath}
              fill={isDark ? layer.fillDark : layer.fillLight}
            />
            <path
              d={layer.line}
              fill="none"
              stroke={isDark ? layer.strokeDark : layer.strokeLight}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      <motion.div
        className="absolute pointer-events-none rounded-full blur-2xl"
        style={{
          width: 220,
          height: 96,
          left: `calc(${pointer.x * 100}% - 110px)`,
          top: `calc(${pointer.y * 100}% - 48px)`,
          background: isDark
            ? "radial-gradient(circle, hsl(201 88% 76% / 0.28), hsl(201 88% 76% / 0))"
            : "radial-gradient(circle, hsl(199 90% 82% / 0.42), hsl(199 90% 82% / 0))",
        }}
        animate={{
          opacity: pointer.active ? [0.25, 0.54, 0.25] : 0,
          scale: pointer.active ? [0.9, 1.08, 0.9] : 0.9,
        }}
        transition={{ duration: 1.8, repeat: pointer.active ? Infinity : 0, ease: "easeInOut" }}
      />

      {Array.from({ length: 12 }).map((_, index) => (
        <motion.div
          key={`sparkle-${index}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 1.5 + (index % 4) * 0.6,
            height: 1.5 + (index % 4) * 0.6,
            left: `${6 + ((index * 8.4) % 90)}%`,
            bottom: `${24 + (index % 4) * 11}%`,
            background: isDark ? "hsl(202 92% 78% / 0.46)" : "hsl(200 88% 72% / 0.5)",
          }}
          animate={{
            y: [0, -8 - (index % 3) * 2, 0],
            opacity: [0.08, 0.85, 0.08],
            scale: [0.85, 1.2, 0.85],
          }}
          transition={{
            duration: 2.2 + (index % 4) * 0.35,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.14,
          }}
        />
      ))}

      {pointer.active && [0, 1].map((ring) => (
        <motion.div
          key={`ripple-${ring}`}
          className="absolute pointer-events-none rounded-full border"
          style={{
            left: `calc(${pointer.x * 100}% - 28px)`,
            top: `calc(${pointer.y * 100}% - 28px)`,
            width: 56,
            height: 56,
            borderColor: isDark ? "hsl(203 88% 82% / 0.34)" : "hsl(200 80% 70% / 0.34)",
          }}
          initial={{ opacity: 0.42, scale: 0.45 }}
          animate={{ opacity: [0.42, 0], scale: [0.45, 1.4 + ring * 0.28] }}
          transition={{ duration: 1.25 + ring * 0.35, repeat: Infinity, ease: "easeOut", delay: ring * 0.2 }}
        />
      ))}
    </div>
  );
};

// Floating particles background
export const FloatingParticles = ({ count = 15 }: { count?: number }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: 3 + (i % 4) * 2,
          height: 3 + (i % 4) * 2,
          left: `${(i * 7.3) % 100}%`,
          top: `${(i * 13.7) % 100}%`,
          background: i % 3 === 0
            ? "hsl(var(--primary) / 0.3)"
            : "hsl(var(--muted-foreground) / 0.15)",
        }}
        animate={{
          y: [0, -30 - (i % 5) * 10, 0],
          x: [0, (i % 2 === 0 ? 15 : -15), 0],
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          duration: 5 + (i % 4) * 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.4,
        }}
      />
    ))}
  </div>
);
