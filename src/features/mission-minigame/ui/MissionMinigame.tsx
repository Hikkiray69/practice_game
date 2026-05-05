"use client";

import type { MinigameId } from "@/entities/quest";
import { useCallback, useState } from "react";
import { playGameUiSfx } from "@/shared/lib/gameUiSfx";
import type { VictoryStarFlightConfig } from "../model/victoryStarFlight";
import { MemoryMinigame } from "./MemoryMinigame";
import { MinigameCountdown } from "./MinigameCountdown";
import { ReactionMinigame } from "./ReactionMinigame";
import { SnakeMinigame } from "./SnakeMinigame";

const LEADS: Record<MinigameId, string> = {
  snake: "Собери 10 яблок. Стены и хвост — проигрыш. Управление: WASD / стрелки или кнопки.",
  memory: "Открой 6 пар одинаковых карточек. Тема — риски и прозрачная коммуникация.",
  reaction: "Успей нажать на 10 целей. Упустил три раза подряд по таймеру — начни заново или пропусти.",
};

export interface MissionMinigameProps {
  id: MinigameId;
  /** Сразу при победе/пропуске: HUD-звезда и fullClear; при пропуске ещё и открытие выборов. */
  onHudOutcome: (earned: boolean) => void;
  /** После победы по кнопке «Продолжить» — открыть выборы в миссии. */
  onWinContinue: () => void;
  victoryStarFlight?: VictoryStarFlightConfig;
}

export function MissionMinigame({ id, onHudOutcome, onWinContinue, victoryStarFlight }: MissionMinigameProps) {
  const [countdownDone, setCountdownDone] = useState(false);
  const [showShellContinue, setShowShellContinue] = useState(false);

  const handleCountdownEnd = useCallback(() => {
    setShowShellContinue(false);
    setCountdownDone(true);
  }, []);

  const handleVictoryUi = useCallback(() => {
    playGameUiSfx("win");
    setShowShellContinue(true);
  }, []);

  return (
    <div className="miniGameShell">
      <p className="miniGameLead">{LEADS[id]}</p>
      {!countdownDone && <MinigameCountdown onComplete={handleCountdownEnd} />}
      {countdownDone && id === "snake" && (
        <SnakeMinigame
          victoryStarFlight={victoryStarFlight}
          onHudOutcome={onHudOutcome}
          onVictoryUi={handleVictoryUi}
          onSkip={() => onHudOutcome(false)}
        />
      )}
      {countdownDone && id === "memory" && (
        <MemoryMinigame
          victoryStarFlight={victoryStarFlight}
          onHudOutcome={onHudOutcome}
          onVictoryUi={handleVictoryUi}
        />
      )}
      {countdownDone && id === "reaction" && (
        <ReactionMinigame
          victoryStarFlight={victoryStarFlight}
          onHudOutcome={onHudOutcome}
          onVictoryUi={handleVictoryUi}
          onSkip={() => onHudOutcome(false)}
        />
      )}
      {showShellContinue && (
        <div className="dialogueActions single miniGameWinContinueRow">
          <button
            type="button"
            className="button"
            onClick={() => {
              playGameUiSfx("confirm");
              onWinContinue();
              setShowShellContinue(false);
            }}
          >
            Перейти к выбору в миссии
          </button>
        </div>
      )}
      {!showShellContinue && (
        <div className="dialogueActions single miniGameSkipRow">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              playGameUiSfx("tap");
              onHudOutcome(false);
            }}
          >
            Пропустить миниигру
          </button>
        </div>
      )}
    </div>
  );
}
