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
    startMission,
    selectChoice,
    retryMission,
    goToNextMission,
  } = useMission();

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
    <main className="page">
      <header className="topbar">
        <h1>Interactive Learning Game</h1>
        <p>MVP-1: миссия &quot;Ответственность&quot;</p>
      </header>

      <section className="layout">
        <SceneCanvas onNpcInteract={() => setNpcInteracted(true)} />
        <div className="sidebar">
          <Hud
            missionTitle={mission.title}
            missionProgressLabel={`${missionIndex + 1}/${totalMissions}`}
            status={status}
            consequence={consequence}
            totals={totals}
          />
          <DialoguePanel
            mission={mission}
            status={status}
            consequenceSummary={consequence?.summary ?? null}
            canStart={npcInteracted}
            hasNextMission={hasNextMission}
            aiDialogue={aiDialogue}
            aiHint={aiHint}
            aiQuestVariation={aiQuestVariation}
            aiLoading={aiLoading}
            onStart={startMission}
            onChoose={selectChoice}
            onRetry={retryMission}
            onAskAiHint={handleAskAiHint}
            onNextMission={() => {
              setNpcInteracted(false);
              setAiDialogue(null);
              setAiHint(null);
              setAiQuestVariation(null);
              goToNextMission();
            }}
          />
        </div>
      </section>
    </main>
  );
}
