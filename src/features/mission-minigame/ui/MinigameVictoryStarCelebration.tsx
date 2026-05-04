"use client";

import { useEffect, useRef, useState } from "react";
import type { VictoryStarFlightConfig } from "../model/victoryStarFlight";

const INTRO_MS = 1200;
const FLIGHT_MS = 980;

type Props = VictoryStarFlightConfig;

export function MinigameVictoryStarCelebration({
  slotIndex,
  hudStarSlotsRef,
  onHudStarReveal,
  onStarArrive,
}: Props) {
  const heroGlyphRef = useRef<HTMLSpanElement>(null);
  const onStarArriveRef = useRef(onStarArrive);
  const onHudStarRevealRef = useRef(onHudStarReveal);

  const [heroHidden, setHeroHidden] = useState(false);

  useEffect(() => {
    onStarArriveRef.current = onStarArrive;
  }, [onStarArrive]);

  useEffect(() => {
    onHudStarRevealRef.current = onHudStarReveal;
  }, [onHudStarReveal]);

  useEffect(() => {
    let cancelled = false;
    let flyEl: HTMLDivElement | null = null;
    let anim: Animation | null = null;

    const introId = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      const hero = heroGlyphRef.current;
      const target = hudStarSlotsRef.current?.[slotIndex];
      if (!hero || !target) {
        if (!cancelled) {
          onHudStarRevealRef.current();
          onStarArriveRef.current(slotIndex);
        }
        return;
      }

      const from = hero.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const cx0 = from.left + from.width / 2;
      const cy0 = from.top + from.height / 2;
      const cx1 = to.left + to.width / 2;
      const cy1 = to.top + to.height / 2;
      const dx = cx1 - cx0;
      const dy = cy1 - cy0;
      const startSize = Math.max(from.width, from.height, 72);
      const endScale = Math.max(0.2, Math.min(1, to.height / startSize) * 1.05);

      setHeroHidden(true);

      flyEl = document.createElement("div");
      flyEl.className = "miniGameVictoryStarFly";
      flyEl.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.className = "miniGameVictoryStarFlyGlyph";
      inner.textContent = "★";
      flyEl.appendChild(inner);

      const half = startSize / 2;
      Object.assign(flyEl.style, {
        position: "fixed",
        left: `${cx0 - half}px`,
        top: `${cy0 - half}px`,
        width: `${startSize}px`,
        height: `${startSize}px`,
        zIndex: "10050",
        pointerEvents: "none",
        display: "grid",
        placeItems: "center",
      });

      document.body.appendChild(flyEl);

      const kf = [
        { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
        {
          transform: `translate(${dx * 0.38}px, ${dy * 0.22 - 36}px) scale(0.82)`,
          opacity: 1,
          offset: 0.38,
        },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${endScale})`,
          opacity: 0.88,
        },
      ];

      anim = flyEl.animate(kf, {
        duration: FLIGHT_MS,
        easing: "cubic-bezier(0.22, 0.82, 0.28, 1)",
        fill: "forwards",
      });

      anim.onfinish = () => {
        flyEl?.remove();
        flyEl = null;
        if (!cancelled) {
          onHudStarRevealRef.current();
          onStarArriveRef.current(slotIndex);
        }
      };
    }, INTRO_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(introId);
      anim?.cancel();
      if (flyEl?.parentNode) {
        flyEl.remove();
      }
    };
  }, [slotIndex, hudStarSlotsRef]);

  return (
    <div className={`miniGameVictoryHeroStar${heroHidden ? " miniGameVictoryHeroStar--hide" : ""}`}>
      <div className="miniGameVictoryHeroStarAura" aria-hidden />
      <span ref={heroGlyphRef} className="miniGameVictoryHeroStarGlyph">
        ★
      </span>
      <p className="miniGameVictoryHeroStarCaption">Звезда за полное прохождение миниигры</p>
    </div>
  );
}
