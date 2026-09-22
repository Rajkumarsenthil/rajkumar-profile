import { useSyncExternalStore } from "react";
import { getScene, subscribeScene } from "../lib/scene";

export function useScene() {
  return useSyncExternalStore(subscribeScene, getScene, () => "sky" as const);
}
