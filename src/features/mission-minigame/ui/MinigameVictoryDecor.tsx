"use client";

import type { CSSProperties } from "react";

/** Статичные параметры — без рандома, одинаково на SSR/клиенте. */
const CONFETTI = [
  { left: 6, delay: 0, rot: -12, hue: 285, drift: -18 },
  { left: 14, delay: 0.12, rot: 40, hue: 48, drift: 22 },
  { left: 22, delay: 0.24, rot: -55, hue: 200, drift: -8 },
  { left: 31, delay: 0.08, rot: 22, hue: 320, drift: 14 },
  { left: 38, delay: 0.32, rot: -30, hue: 150, drift: -26 },
  { left: 46, delay: 0.05, rot: 65, hue: 275, drift: 10 },
  { left: 54, delay: 0.2, rot: -48, hue: 38, drift: 30 },
  { left: 62, delay: 0.38, rot: 15, hue: 168, drift: -12 },
  { left: 70, delay: 0.15, rot: -70, hue: 305, drift: 6 },
  { left: 78, delay: 0.28, rot: 52, hue: 220, drift: -24 },
  { left: 86, delay: 0.02, rot: -8, hue: 52, drift: 18 },
  { left: 11, delay: 0.42, rot: 33, hue: 290, drift: -16 },
  { left: 58, delay: 0.18, rot: -22, hue: 130, drift: 8 },
  { left: 93, delay: 0.35, rot: 18, hue: 340, drift: -28 },
  { left: 3, delay: 0.45, rot: -40, hue: 195, drift: 12 },
  { left: 49, delay: 0.1, rot: 8, hue: 265, drift: -6 },
  { left: 67, delay: 0.3, rot: -62, hue: 72, drift: 26 },
  { left: 82, delay: 0.22, rot: 44, hue: 310, drift: -20 },
] as const;

const SPARKS = [
  { left: 10, top: 18, delay: 0 },
  { left: 88, top: 22, delay: 0.2 },
  { left: 18, top: 72, delay: 0.4 },
  { left: 92, top: 68, delay: 0.15 },
  { left: 50, top: 12, delay: 0.35 },
  { left: 72, top: 38, delay: 0.55 },
  { left: 28, top: 48, delay: 0.25 },
  { left: 84, top: 52, delay: 0.65 },
] as const;

export function MinigameVictoryDecor() {
  return (
    <div className="miniGameVictoryFx" aria-hidden>
      <div className="miniGameVictoryGlow" />
      <div className="miniGameVictoryRing" />
      <div className="miniGameVictoryRing miniGameVictoryRing--b" />
      {CONFETTI.map((c, i) => (
        <span
          key={`c-${i}`}
          className="miniGameConfetti"
          style={
            {
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
              ["--rot"]: `${c.rot}deg`,
              ["--hue"]: String(c.hue),
              ["--drift"]: String(c.drift),
            } as CSSProperties
          }
        />
      ))}
      {SPARKS.map((s, i) => (
        <span
          key={`s-${i}`}
          className="miniGameVictorySpark"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
