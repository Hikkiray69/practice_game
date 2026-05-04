"use client";

import { DialoguePanel } from "@/features/dialogue";
import { useMission } from "@/features/quest-system";
import { Hud } from "@/features/scoring-progress";
import { fetchAiAssist } from "@/shared/api/aiClient";
import { SceneCanvas } from "@/shared/ui";
import { useState } from "react";

export function GameScreen() {
  const [npcInteracted, setNpcInteracted] = useState(false);
  const [aiDialogue, setAiDialogue] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiQuestVariation, setAiQuestVariation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const {
    mission,
    missionIndex,
    totalMissions,
    status,
    consequence,
    totals,
    hasNextMission,
    isCampaignFinished,
    startMission,
    selectChoice,
    retryMission,
    goToNextMission,
    restartCampaign,
  } = useMission();

  const requiredNpcId =
    mission.valueTag === "responsibility"
      ? "npc-responsibility"
      : mission.valueTag === "transparency"
        ? "npc-transparency"
        : "npc-speed";

  const requiredNpcRole =
    mission.valueTag === "responsibility"
      ? "Ответственность"
      : mission.valueTag === "transparency"
        ? "Прозрачность"
        : "Скорость";

  async function handleAskAiHint() {
    setAiLoading(true);
    try {
      const response = await fetchAiAssist({ valueTag: mission.valueTag, status });
      setAiDialogue(response.dialogue);
      setAiHint(response.hint);
      setAiQuestVariation(response.questVariation);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <main className="gameRoot">
      <SceneCanvas
        activeNpcId={requiredNpcId}
        onNpcInteract={(npcId) => {
          if (npcId === requiredNpcId) {
            setNpcInteracted(true);
          }
        }}
      />

      <Hud
        missionTitle={mission.title}
        objectiveText={`Иди к NPC зоны "${requiredNpcRole}" и нажми E`}
        missionProgressLabel={`${missionIndex + 1}/${totalMissions}`}
        missionProgressValue={(missionIndex + (status === "completed" ? 1 : 0)) / totalMissions}
        status={status}
      />

      <DialoguePanel
        isOpen={npcInteracted || status === "inProgress" || status === "completed"}
        mission={mission}
        status={status}
        consequenceSummary={consequence?.summary ?? null}
        canStart={npcInteracted}
        hasNextMission={hasNextMission}
        aiDialogue={aiDialogue}
        aiHint={aiHint}
        aiQuestVariation={aiQuestVariation}
        aiLoading={aiLoading}
        totals={totals}
        isCampaignFinished={isCampaignFinished}
        onStart={startMission}
        onChoose={selectChoice}
        onRetry={retryMission}
        onRestartCampaign={() => {
          setNpcInteracted(false);
          setAiDialogue(null);
          setAiHint(null);
          setAiQuestVariation(null);
          restartCampaign();
        }}
        onAskAiHint={handleAskAiHint}
        onNextMission={() => {
          setNpcInteracted(false);
          setAiDialogue(null);
          setAiHint(null);
          setAiQuestVariation(null);
          goToNextMission();
        }}
      />
    </main>
  );
}
