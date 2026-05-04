"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VictoryStarFlightConfig } from "../model/victoryStarFlight";
import { MinigameVictoryDecor } from "./MinigameVictoryDecor";
import { MinigameVictoryStarCelebration } from "./MinigameVictoryStarCelebration";

const LABELS = ["Риск", "Клиент", "Срок", "Синк", "Честность", "План"] as const;
const MEMORY_TIME_SEC = 30;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MemoryRound({
  onHudOutcome,
  onVictoryUi,
  onRetry,
  victoryStarFlight,
}: {
  onHudOutcome: (earned: boolean) => void;
  onVictoryUi: () => void;
  onRetry: () => void;
  victoryStarFlight?: VictoryStarFlightConfig;
}) {
  const cards = useMemo(
    () =>
      shuffle(
        [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5].map((pairId) => ({
          pairId,
          label: LABELS[pairId],
        })),
      ).map((item, slot) => ({ ...item, slot })),
    [],
  );

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(() => new Set());
  const [secondsLeft, setSecondsLeft] = useState(MEMORY_TIME_SEC);
  const [lost, setLost] = useState(false);

  const matchedPairs = matched.size / 2;
  const allMatched = matched.size === 12;
  const allMatchedRef = useRef(false);
  useEffect(() => {
    allMatchedRef.current = allMatched;
  }, [allMatched]);

  useEffect(() => {
    if (!allMatched) {
      return;
    }
    onHudOutcome(true);
    onVictoryUi();
  }, [allMatched, onHudOutcome, onVictoryUi]);

  useEffect(() => {
    if (lost || allMatched) {
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          queueMicrotask(() => {
            if (!allMatchedRef.current) {
              setLost(true);
            }
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [lost, allMatched]);

  const onCardClick = useCallback(
    (slot: number) => {
      if (lost || allMatched || matched.has(slot) || flipped.includes(slot) || flipped.length >= 2) {
        return;
      }
      const next = [...flipped, slot];
      setFlipped(next);
      if (next.length !== 2) {
        return;
      }
      const [i1, i2] = next;
      const ca = cards.find((c) => c.slot === i1);
      const cb = cards.find((c) => c.slot === i2);
      if (ca && cb && ca.pairId === cb.pairId) {
        window.setTimeout(() => {
          setMatched((prev) => new Set([...prev, i1, i2]));
          setFlipped([]);
        }, 380);
      } else {
        window.setTimeout(() => setFlipped([]), 650);
      }
    },
    [lost, allMatched, cards, flipped, matched],
  );

  const innerMod = lost ? " miniGameInner--lost" : allMatched ? " miniGameInner--won" : "";

  return (
    <div className={`miniGameInner${innerMod}`}>
      <div className="miniGamePlayfield">
        <div className="miniGameHud">
          Пар: {matchedPairs}/6 · {lost ? "время вышло" : `осталось ${secondsLeft} с`}
        </div>
        <div className="miniGameMemoryGrid" role="grid" aria-label="Мемори">
          {cards.map((c) => {
            const isUp = flipped.includes(c.slot) || matched.has(c.slot);
            return (
              <button
                key={c.slot}
                type="button"
                className={`miniGameCard${isUp ? " miniGameCardUp" : ""}${matched.has(c.slot) ? " miniGameCardMatched" : ""}`}
                onClick={() => onCardClick(c.slot)}
                disabled={lost || allMatched || matched.has(c.slot) || flipped.length >= 2}
              >
                <span className="miniGameCardFace">{isUp ? c.label : "?"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {lost && (
        <div className="miniGameOverlay">
          <p className="miniGameOverlayText">
            За {MEMORY_TIME_SEC} секунд не успели открыть все пары. Карты перетасованы — попробуйте снова.
          </p>
          <div className="dialogueActions single">
            <button type="button" className="button" onClick={onRetry}>
              Попробовать снова
            </button>
          </div>
        </div>
      )}

      {allMatched && (
        <div className="miniGameOverlay miniGameOverlay--win">
          <MinigameVictoryDecor />
          {victoryStarFlight ? <MinigameVictoryStarCelebration {...victoryStarFlight} /> : null}
          <p className="miniGameOverlayText">
            Поздравляем! Все пары найдены — нажми «Продолжить к выбору в миссии» под полем миниигры.
          </p>
        </div>
      )}
    </div>
  );
}

export function MemoryMinigame({
  onHudOutcome,
  onVictoryUi,
  victoryStarFlight,
}: {
  onHudOutcome: (earned: boolean) => void;
  onVictoryUi: () => void;
  victoryStarFlight?: VictoryStarFlightConfig;
}) {
  const [round, setRound] = useState(0);
  return (
    <MemoryRound
      key={round}
      onHudOutcome={onHudOutcome}
      onVictoryUi={onVictoryUi}
      victoryStarFlight={victoryStarFlight}
      onRetry={() => {
        setRound((r) => r + 1);
      }}
    />
  );
}
