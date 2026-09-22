import { useSyncExternalStore } from "react";
import { sound } from "../lib/sound";

/** Whether the ambient soundscape is currently playing. */
export function useSoundEnabled() {
  return useSyncExternalStore(sound.subscribe, sound.getEnabled, () => false);
}
