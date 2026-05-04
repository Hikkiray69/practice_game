"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  allMissions,
  CampaignStarSlot,
  QuestChoice,
  QuestConsequence,
  QuestStatus,
} from "@/entities/quest";

interface Totals {
  score: number;
  quality: number;
  speed: number;
}

export function useMission() {
  const [status, setStatus] = useState<QuestStatus>("new");
  const [missionIndex, setMissionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<QuestChoice | null>(null);
  const [totals, setTotals] = useState<Totals>({ score: 0, quality: 0, speed: 0 });
  const [preambleBeatIndex, setPreambleBeatIndex] = useState(0);
  const [minigameCleared, setMinigameCleared] = useState(false);
  /** true только если миниигру закрыли победой, не кнопкой «пропустить». */
  const [minigameFullClear, setMinigameFullClear] = useState(false);
  const [campaignStars, setCampaignStars] = useState<CampaignStarSlot[]>(() =>
    Array.from({ length: allMissions.length }, () => "pending"),
  );

  const minigameFullClearRef = useRef(minigameFullClear);
  useEffect(() => {
    minigameFullClearRef.current = minigameFullClear;
  }, [minigameFullClear]);

  const mission = allMissions[missionIndex];
  const hasNextMission = missionIndex < allMissions.length - 1;
  const isCampaignFinished = !hasNextMission && status === "completed";

  const consequence: QuestConsequence | null = useMemo(() => {
    if (!selectedChoice) {
      return null;
    }

    return mission.consequences.find((item) => item.id === selectedChoice.consequenceId) ?? null;
  }, [mission, selectedChoice]);

  const preambleLength = mission.preamble?.length ?? 0;
  const preambleDone = preambleLength === 0 || preambleBeatIndex >= preambleLength;
  const minigameRequired = Boolean(mission.minigameId);
  const choicesUnlocked = preambleDone && (!minigameRequired || minigameCleared);

  function startMission() {
    setPreambleBeatIndex(0);
    setMinigameCleared(false);
    setMinigameFullClear(false);
    setStatus("inProgress");
    setSelectedChoice(null);
  }

  function advancePreamble() {
    setPreambleBeatIndex((i) => i + 1);
  }

  /**
   * Победа: только fullClear (слот в HUD станет earned после полёта звезды).
   * Пропуск: сразу missed в HUD + открытие выборов.
   */
  const reportMinigameHudOutcome = useCallback(
    (earned: boolean) => {
      setMinigameFullClear(earned);
      if (!earned && mission.minigameId) {
        setCampaignStars((prev) => {
          const next = [...prev];
          next[missionIndex] = "missed";
          return next;
        });
      }
      if (!earned) {
        setMinigameCleared(true);
      }
    },
    [mission.minigameId, missionIndex],
  );

  const revealMinigameHudStarEarned = useCallback(() => {
    if (!mission.minigameId) {
      return;
    }
    setCampaignStars((prev) => {
      const next = [...prev];
      next[missionIndex] = "earned";
      return next;
    });
  }, [mission.minigameId, missionIndex]);

  const acknowledgeMinigameWin = useCallback(() => {
    setMinigameCleared(true);
  }, []);

  function selectChoice(choiceId: string) {
    const choice = mission.choices.find((item) => item.id === choiceId);
    if (!choice) {
      return;
    }

    const nextConsequence = mission.consequences.find((item) => item.id === choice.consequenceId);
    setSelectedChoice(choice);
    setStatus("completed");

    const fullClear = !mission.minigameId || minigameFullClearRef.current;
    setCampaignStars((prev) => {
      const next = [...prev];
      next[missionIndex] = fullClear ? "earned" : "missed";
      return next;
    });

    if (nextConsequence) {
      setTotals((prev) => ({
        score: prev.score + nextConsequence.scoreDelta,
        quality: prev.quality + nextConsequence.qualityDelta,
        speed: prev.speed + nextConsequence.speedDelta,
      }));
    }
  }

  /** Если полёт звезды отменился при размонтировании миниигры, слот мог остаться pending — добиваем после завершения миссии. */
  useEffect(() => {
    if (status !== "completed" || !mission.minigameId) {
      return;
    }
    setCampaignStars((prev) => {
      const idx = missionIndex;
      if (prev[idx] !== "pending") {
        return prev;
      }
      const next = [...prev];
      next[idx] = minigameFullClearRef.current ? "earned" : "missed";
      return next;
    });
  }, [status, missionIndex, mission.minigameId]);

  function retryMission() {
    if (consequence) {
      setTotals((prev) => ({
        score: prev.score - consequence.scoreDelta,
        quality: prev.quality - consequence.qualityDelta,
        speed: prev.speed - consequence.speedDelta,
      }));
    }

    setPreambleBeatIndex(0);
    setMinigameCleared(false);
    setMinigameFullClear(false);
    setStatus("inProgress");
    setSelectedChoice(null);
    setCampaignStars((prev) => {
      const next = [...prev];
      next[missionIndex] = "pending";
      return next;
    });
  }

  function goToNextMission() {
    if (!hasNextMission) {
      return;
    }

    setMissionIndex((prev) => prev + 1);
    setStatus("new");
    setSelectedChoice(null);
    setPreambleBeatIndex(0);
    setMinigameCleared(false);
    setMinigameFullClear(false);
  }

  function restartCampaign() {
    setMissionIndex(0);
    setStatus("new");
    setSelectedChoice(null);
    setPreambleBeatIndex(0);
    setMinigameCleared(false);
    setMinigameFullClear(false);
    setTotals({ score: 0, quality: 0, speed: 0 });
    setCampaignStars(Array.from({ length: allMissions.length }, () => "pending"));
  }

  return {
    mission,
    missionIndex,
    totalMissions: allMissions.length,
    hasNextMission,
    isCampaignFinished,
    status,
    selectedChoice,
    consequence,
    totals,
    preambleBeatIndex,
    preambleDone,
    choicesUnlocked,
    campaignStars,
    startMission,
    advancePreamble,
    reportMinigameHudOutcome,
    revealMinigameHudStarEarned,
    acknowledgeMinigameWin,
    selectChoice,
    retryMission,
    goToNextMission,
    restartCampaign,
  };
}
