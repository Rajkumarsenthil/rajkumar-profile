import { motion } from "motion/react";
import { Moon, Waves } from "lucide-react";
import { useScene } from "../hooks/useScene";
import { setScene } from "../lib/scene";
import { sound } from "../lib/sound";

/** Sky / Water switch. Page and world cross-fade together. */
export function SceneToggle() {
  const scene = useScene();
  const water = scene === "water";

  const onClick = () => {
    setScene(water ? "sky" : "water");
    sound.chime();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={water}
      aria-label={water ? "Switch to the night sky" : "Switch to the sea"}
      title={water ? "Sky" : "Water"}
      onClick={onClick}
      className="relative flex h-9 w-[4.25rem] items-center rounded-full border border-line px-1 transition-colors hover:border-line-strong"
    >
      <motion.span
        aria-hidden
        className="absolute left-1 top-1 size-7 rounded-full bg-fg shadow-[0_4px_14px_-4px_rgb(0_0_0/0.5)]"
        animate={{ x: water ? 30 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
      />
      <span className="relative z-10 grid w-7 place-items-center">
        <Moon className={`size-3.5 transition-colors ${water ? "text-fg-muted" : "text-bg"}`} />
      </span>
      <span className="relative z-10 ml-auto grid w-7 place-items-center">
        <Waves className={`size-3.5 transition-colors ${water ? "text-bg" : "text-fg-muted"}`} />
      </span>
    </button>
  );
}
