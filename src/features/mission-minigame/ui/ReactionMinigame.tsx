"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VictoryStarFlightConfig } from "../model/victoryStarFlight";
import { playGameUiSfx } from "@/shared/lib/gameUiSfx";
import { MinigameVictoryDecor } from "./MinigameVictoryDecor";
import { MinigameVictoryStarCelebration } from "./MinigameVictoryStarCelebration";

const NEED_HITS = 10;
const MAX_MISS = 3;
const TARGET_MS = 780;
const TICK_MS = 70;

type Target = { id: number; left: number; top: number; until: number };

function randPos() {
  const lo = 8;
  const hi = 82;
  return { left: lo + Math.random() * (hi - lo), top: lo + Math.random() * (hi - lo) };
}

type Game = {
  hits: number;
  misses: number;
  status: "playing" | "won" | "lost";
  target: Target | null;
};

function initialGame(): Game {
  return { hits: 0, misses: 0, status: "playing", target: null };
}

function ReactionCore({
  onHudOutcome,
  onVictoryUi,
  onSkip,
  onLostRetry,
  victoryStarFlight,
}: {
  onHudOutcome: (earned: boolean) => void;
  onVictoryUi: () => void;
  onSkip: () => void;
  onLostRetry: () => void;
  victoryStarFlight?: VictoryStarFlightConfig;
}) {
  const [game, setGame] = useState<Game>(initialGame);
  const spawnId = useRef(0);
  const prevStatusRef = useRef(game.status);
  const prevHitsRef = useRef(0);

  useEffect(() => {
    if (game.hits > prevHitsRef.current) {
      playGameUiSfx("hit");
    }
    prevHitsRef.current = game.hits;
  }, [game.hits]);

  useEffect(() => {
    if (prevStatusRef.current === "playing" && game.status === "lost") {
      playGameUiSfx("miss");
    }
    prevStatusRef.current = game.status;
  }, [game.status]);

  useEffect(() => {
    if (game.status !== "won") {
      return;
    }
    onHudOutcome(true);
    onVictoryUi();
  }, [game.status, onHudOutcome, onVictoryUi]);

  useEffect(() => {
    if (game.status !== "playing") {
      return;
    }

    const id = window.setInterval(() => {
      setGame((g) => {
        if (g.status !== "playing") {
          return g;
        }
        const now = Date.now();
        if (!g.target) {
          spawnId.current += 1;
          const p = randPos();
          return { ...g, target: { id: spawnId.current, ...p, until: now + TARGET_MS } };
        }
        if (now > g.target.until) {
          const misses = g.misses + 1;
          if (misses >= MAX_MISS) {
            return { ...g, target: null, misses, status: "lost" };
          }
          spawnId.current += 1;
          const p = randPos();
          return { ...g, misses, target: { id: spawnId.current, ...p, until: now + TARGET_MS } };
        }
        return g;
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [game.status]);

  const onHit = useCallback(() => {
    setGame((g) => {
      if (g.status !== "playing" || !g.target) {
        return g;
      }
      const hits = g.hits + 1;
      if (hits >= NEED_HITS) {
        return { ...g, hits, target: null, status: "won" };
      }
      return { ...g, hits, target: null };
    });
  }, []);

  const innerMod =
    game.status === "lost" ? " miniGameInner--lost" : game.status === "won" ? " miniGameInner--won" : "";

  return (
    <div className={`miniGameInner${innerMod}`}>
      <div className="miniGamePlayfield">
        <div className="miniGameHud">
          Попадания: {game.hits}/{NEED_HITS} · Промахи: {game.misses}/{MAX_MISS}
        </div>
        <div className="miniGameArena" role="application" aria-label="Реакция">
          {game.target && game.status === "playing" && (
            <button
              type="button"
              className="miniGameTarget"
              style={{ left: `${game.target.left}%`, top: `${game.target.top}%` }}
              onClick={onHit}
            >
              +
            </button>
          )}
        </div>
      </div>

      {game.status === "won" && (
        <div className="miniGameOverlay miniGameOverlay--win">
          <MinigameVictoryDecor />
          {victoryStarFlight ? <MinigameVictoryStarCelebration {...victoryStarFlight} /> : null}
          <p className="miniGameOverlayText">
            Поздравляем! Все цели пойманы — нажми «Перейти к выбору в миссии» под полем миниигры.
          </p>
        </div>
      )}

      {game.status === "lost" && (
        <div className="miniGameOverlay">
          <p className="miniGameOverlayText">Три промаха — попробуй снова или пропусти.</p>
          <div className="dialogueActions">
            <button
              type="button"
              className="button"
              onClick={() => {
                playGameUiSfx("tap");
                onLostRetry();
              }}
            >
              Переиграть
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                playGameUiSfx("tap");
                onSkip();
              }}
            >
              Пропустить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReactionMinigame({
  onHudOutcome,
  onVictoryUi,
  onSkip,
  victoryStarFlight,
}: {
  onHudOutcome: (earned: boolean) => void;
  onVictoryUi: () => void;
  onSkip: () => void;
  victoryStarFlight?: VictoryStarFlightConfig;
}) {
  const [runKey, setRunKey] = useState(0);
  return (
    <ReactionCore
      key={runKey}
      onHudOutcome={onHudOutcome}
      onVictoryUi={onVictoryUi}
      onSkip={onSkip}
      onLostRetry={() => setRunKey((k) => k + 1)}
      victoryStarFlight={victoryStarFlight}
    />
  );
}
