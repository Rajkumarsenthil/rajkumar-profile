import { useState } from "react";
import { TITLES } from "../lib/titles";
import type { TitleId } from "../lib/titles";
import { supportsWebGL } from "../lib/webgl";
import { ParticleTitle } from "./ParticleTitle";

type Props = { id: TitleId; align?: "left" | "center"; className?: string; start?: boolean };

/**
 * Reserves the box where a chapter word appears. With WebGL the 3D scene draws
 * the word here as glowing particles (it reads this element's position every
 * frame); without WebGL a 2D canvas version renders instead.
 */
export function TitleAnchor({ id, align = "left", className = "", start = true }: Props) {
  const [webgl] = useState(supportsWebGL);
  const title = TITLES[id];
  if (!webgl) {
    return <ParticleTitle text={title.text} font={title.font} align={align} maxSize={200} start={start} className={className} />;
  }
  return <div aria-hidden data-title={id} data-align={align} className={className} />;
}
