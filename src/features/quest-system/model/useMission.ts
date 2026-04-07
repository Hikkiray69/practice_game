"use client";

import { useMemo, useState } from "react";
import { allMissions, QuestChoice, QuestConsequence, QuestStatus } from "@/entities/quest";

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

  const mission = allMissions[missionIndex];
  const hasNextMission = missionIndex < allMissions.length - 1;

  const consequence: QuestConsequence | null = useMemo(() => {
    if (!selectedChoice) {
      return null;
    }

    return mission.consequences.find((item) => item.id === selectedChoice.consequenceId) ?? null;
  }, [mission, selectedChoice]);

  function startMission() {
    setStatus("inProgress");
    setSelectedChoice(null);
  }

  function selectChoice(choiceId: string) {
    const choice = mission.choices.find((item) => item.id === choiceId);
    if (!choice) {
      return;
    }

    const nextConsequence = mission.consequences.find((item) => item.id === choice.consequenceId);
    setSelectedChoice(choice);
    setStatus("completed");

    if (nextConsequence) {
      setTotals((prev) => ({
        score: prev.score + nextConsequence.scoreDelta,
        quality: prev.quality + nextConsequence.qualityDelta,
        speed: prev.speed + nextConsequence.speedDelta,
      }));
    }
  }

  function retryMission() {
    if (consequence) {
      setTotals((prev) => ({
        score: prev.score - consequence.scoreDelta,
        quality: prev.quality - consequence.qualityDelta,
        speed: prev.speed - consequence.speedDelta,
      }));
    }

    setStatus("inProgress");
    setSelectedChoice(null);
  }

  function goToNextMission() {
    if (!hasNextMission) {
      return;
    }

    setMissionIndex((prev) => prev + 1);
    setStatus("new");
    setSelectedChoice(null);
  }

  return {
    mission,
    missionIndex,
    totalMissions: allMissions.length,
    hasNextMission,
    status,
    selectedChoice,
    consequence,
    totals,
    startMission,
    selectChoice,
    retryMission,
    goToNextMission,
  };
}
