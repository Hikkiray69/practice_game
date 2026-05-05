"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playGameUiSfx } from "@/shared/lib/gameUiSfx";
import type { VictoryStarFlightConfig } from "../model/victoryStarFlight";
import { MinigameVictoryDecor } from "./MinigameVictoryDecor";
import { MinigameVictoryStarCelebration } from "./MinigameVictoryStarCelebration";

const GRID = 13;
const CELL = 16;
const WIN_APPLES = 10;
const TICK_MS = 135;

type Pt = { x: number; y: number };
type Dir = { x: number; y: number };

type GameState = {
  snake: Pt[];
  lastMoveDir: Dir;
  /** Очередь поворота — только в state, чтобы тик и ввод не гонялись с ref. */
  pendingDir: Dir | null;
  apple: Pt;
  eaten: number;
  status: "playing" | "won" | "lost";
};

function randomApple(snake: Pt[]): Pt {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`));
  for (let k = 0; k < 400; k++) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    const key = `${x},${y}`;
    if (!taken.has(key)) {
      return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

function createInitial(): GameState {
  const snake: Pt[] = [
    { x: 6, y: 6 },
    { x: 5, y: 6 },
    { x: 4, y: 6 },
  ];
  const lastMoveDir: Dir = { x: 1, y: 0 };
  return {
    snake,
    lastMoveDir,
    pendingDir: null,
    apple: randomApple(snake),
    eaten: 0,
    status: "playing",
  };
}

function SnakeCore({
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
  const [game, setGame] = useState<GameState>(createInitial);
  const prevEatenRef = useRef(game.eaten);
  const prevStatusRef = useRef(game.status);

  useEffect(() => {
    if (game.status === "playing" && game.eaten > prevEatenRef.current) {
      playGameUiSfx("pickup");
    }
    prevEatenRef.current = game.eaten;
  }, [game.eaten, game.status]);

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
        const head = g.snake[0];

        const want = g.pendingDir;
        let moveDir = g.lastMoveDir;
        if (want && !(want.x === -g.lastMoveDir.x && want.y === -g.lastMoveDir.y)) {
          moveDir = want;
        }

        let next = { x: head.x + moveDir.x, y: head.y + moveDir.y };

        if (g.snake.length > 1) {
          const neck = g.snake[1];
          if (next.x === neck.x && next.y === neck.y) {
            moveDir = g.lastMoveDir;
            next = { x: head.x + moveDir.x, y: head.y + moveDir.y };
          }
        }

        if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
          return { ...g, pendingDir: null, status: "lost" };
        }

        if (g.snake.some((s) => s.x === next.x && s.y === next.y)) {
          return { ...g, pendingDir: null, status: "lost" };
        }

        const ate = next.x === g.apple.x && next.y === g.apple.y;
        const newSnake = [next, ...g.snake];
        if (!ate) {
          newSnake.pop();
        }

        const eaten = ate ? g.eaten + 1 : g.eaten;
        if (ate && eaten >= WIN_APPLES) {
          return {
            snake: newSnake,
            lastMoveDir: moveDir,
            pendingDir: null,
            apple: g.apple,
            eaten,
            status: "won",
          };
        }

        const apple = ate ? randomApple(newSnake) : g.apple;
        return {
          snake: newSnake,
          lastMoveDir: moveDir,
          pendingDir: null,
          apple,
          eaten,
          status: "playing",
        };
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [game.status]);

  const queueDirection = useCallback((d: Dir) => {
    setGame((g) => {
      if (g.status !== "playing") {
        return g;
      }
      const eff = g.pendingDir ?? g.lastMoveDir;
      if (d.x === -eff.x && d.y === -eff.y) {
        return g;
      }
      return { ...g, pendingDir: d };
    });
  }, []);

  useEffect(() => {
    if (game.status !== "playing") {
      return;
    }
    function onKey(e: KeyboardEvent) {
      /* e.code — физическая клавиша, не зависит от раскладки (RU: те же KeyW и т.д.) */
      let handled = false;
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          queueDirection({ x: 0, y: -1 });
          handled = true;
          break;
        case "ArrowDown":
        case "KeyS":
          queueDirection({ x: 0, y: 1 });
          handled = true;
          break;
        case "ArrowLeft":
        case "KeyA":
          queueDirection({ x: -1, y: 0 });
          handled = true;
          break;
        case "ArrowRight":
        case "KeyD":
          queueDirection({ x: 1, y: 0 });
          handled = true;
          break;
        default:
          break;
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [game.status, queueDirection]);

  const size = GRID * CELL;
  const innerMod =
    game.status === "lost" ? " miniGameInner--lost" : game.status === "won" ? " miniGameInner--won" : "";

  return (
    <div className={`miniGameInner${innerMod}`}>
      <div className="miniGamePlayfield">
        <div className="miniGameHud">
          Яблоки: {game.eaten}/{WIN_APPLES}
        </div>
        <div
          className="miniGameCanvas miniGameCanvasSnake"
          style={{ width: size, height: size }}
          role="img"
          aria-label="Змейка"
        >
          <div
            className="miniGameApple"
            style={{
              width: CELL - 4,
              height: CELL - 4,
              left: game.apple.x * CELL + 2,
              top: game.apple.y * CELL + 2,
            }}
          />
          {game.snake.map((seg, idx) => (
            <div
              key={`${idx}-${seg.x}-${seg.y}`}
              className={idx === 0 ? "miniGameSnakeHead" : "miniGameSnakeBody"}
              style={{
                width: CELL - 3,
                height: CELL - 3,
                left: seg.x * CELL + 1,
                top: seg.y * CELL + 1,
              }}
            />
          ))}
        </div>

        <div className="miniGamePad" aria-hidden>
          <span className="miniGamePadFiller" />
          <button
            type="button"
            className="miniGamePadBtn"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              queueDirection({ x: 0, y: -1 });
            }}
          >
            ↑
          </button>
          <span className="miniGamePadFiller" />
          <button
            type="button"
            className="miniGamePadBtn"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              queueDirection({ x: -1, y: 0 });
            }}
          >
            ←
          </button>
          <span className="miniGamePadFiller" />
          <button
            type="button"
            className="miniGamePadBtn"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              queueDirection({ x: 1, y: 0 });
            }}
          >
            →
          </button>
          <span className="miniGamePadFiller" />
          <button
            type="button"
            className="miniGamePadBtn"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              queueDirection({ x: 0, y: 1 });
            }}
          >
            ↓
          </button>
          <span className="miniGamePadFiller" />
        </div>
      </div>

      {game.status === "won" && (
        <div className="miniGameOverlay miniGameOverlay--win">
          <MinigameVictoryDecor />
          {victoryStarFlight ? <MinigameVictoryStarCelebration {...victoryStarFlight} /> : null}
          <p className="miniGameOverlayText">
            Поздравляем! Ты собрал все яблоки — нажми «Перейти к выбору в миссии» под полем миниигры.
          </p>
        </div>
      )}

      {game.status === "lost" && (
        <div className="miniGameOverlay">
          <p className="miniGameOverlayText">Столкновение — попробуй ещё раз или пропусти.</p>
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

export function SnakeMinigame({
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
    <SnakeCore
      key={runKey}
      onHudOutcome={onHudOutcome}
      onVictoryUi={onVictoryUi}
      onSkip={onSkip}
      onLostRetry={() => setRunKey((k) => k + 1)}
      victoryStarFlight={victoryStarFlight}
    />
  );
}
