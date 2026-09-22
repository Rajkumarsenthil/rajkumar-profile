import { useSoundEnabled } from "../hooks/useSound";
import { sound } from "../lib/sound";

/** Animated equaliser button that switches the generative soundscape on and off. */
export function SoundToggle({ showLabel = false }: { showLabel?: boolean }) {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      onClick={() => sound.toggle()}
      aria-pressed={on}
      aria-label={on ? "Mute ambient sound" : "Play ambient sound"}
      className="group inline-flex h-9 items-center gap-2.5 rounded-full border border-line px-3 text-fg transition-colors hover:border-line-strong hover:bg-tint/[0.06]"
    >
      <span className="sound-bars flex h-3.5 items-end gap-[3px]" data-on={on}>
        <span />
        <span />
        <span />
        <span />
      </span>
      {showLabel && <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted">{on ? "Sound on" : "Sound off"}</span>}
    </button>
  );
}
