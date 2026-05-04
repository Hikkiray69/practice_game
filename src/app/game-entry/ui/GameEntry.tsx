"use client";

import { GameScreen } from "@/app/game-screen/ui/GameScreen";
import { GameIntroScreen } from "@/features/game-intro";
import { useCallback, useState } from "react";

export function GameEntry() {
  const [started, setStarted] = useState(false);
  const onStart = useCallback(() => setStarted(true), []);

  if (!started) {
    return <GameIntroScreen onStart={onStart} />;
  }

  return <GameScreen />;
}
