"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const STEP_MS = 1000;
const DIGITS = [3, 2, 1] as const;

/**
 * Ровно 3 секунды: показ 3 → 2 → 1, затем onComplete.
 * onComplete держим в ref, чтобы интервал не сбрасывался при смене ссылки с родителя.
 */
export function MinigameCountdown({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (index >= DIGITS.length) {
      queueMicrotask(() => {
        onCompleteRef.current();
      });
      return;
    }
    const id = window.setTimeout(() => {
      setIndex((i) => i + 1);
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [index]);

  if (index >= DIGITS.length) {
    return null;
  }

  const value = DIGITS[index];

  return (
    <div className="miniGameCountdown" aria-live="polite">
      <p className="miniGameCountLabel">Готовься</p>
      <div className="miniGameCountDigitWrap" key={value}>
        <span className="miniGameCountRing" aria-hidden />
        <span className="miniGameCountDigit">{value}</span>
      </div>
      <p className="miniGameCountHint">Скоро старт</p>
    </div>
  );
}
