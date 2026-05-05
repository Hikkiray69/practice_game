"use client";

import { DialoguePanel } from "@/features/dialogue";
import type { VictoryStarFlightConfig } from "@/features/mission-minigame";
import { useMission } from "@/features/quest-system";
import { Hud } from "@/features/scoring-progress";
import { fetchAiAssist } from "@/shared/api/aiClient";
import { startGameBgm, stopGameBgm, setGameBgmMode, type GameBgmMode } from "@/shared/lib/gameBgm";
import { resumeGameUiAudio } from "@/shared/lib/gameUiSfx";
import { cleanAiAssistForDisplay } from "@/shared/lib/validateAiOutput";
import { GameAudioMuteButton } from "@/shared/ui/GameAudioMuteButton";
import { SceneCanvas } from "@/shared/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function GameScreen() {
  const [npcInteracted, setNpcInteracted] = useState(false);
  const [showCampaignSummary, setShowCampaignSummary] = useState(false);
  const [aiDialogue, setAiDialogue] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiQuestVariation, setAiQuestVariation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const {
    mission,
    missionIndex,
    totalMissions,
    status,
    selectedChoice,
    consequence,
    totals,
    hasNextMission,
    isCampaignFinished,
    startMission,
    selectChoice,
    retryMission,
    goToNextMission,
    restartCampaign,
    preambleBeatIndex,
    preambleDone,
    advancePreamble,
    choicesUnlocked,
    reportMinigameHudOutcome,
    revealMinigameHudStarEarned,
    acknowledgeMinigameWin,
    campaignStars,
  } = useMission();

  const hudStarSlotsRef = useRef<(HTMLLIElement | null)[]>([]);
  const [hudStarPulseIndex, setHudStarPulseIndex] = useState<number | null>(null);

  const registerHudStarSlot = useCallback((index: number, el: HTMLLIElement | null) => {
    hudStarSlotsRef.current[index] = el;
  }, []);

  const handleVictoryStarArrive = useCallback((slotIndex: number) => {
    setHudStarPulseIndex(slotIndex);
    window.setTimeout(() => {
      setHudStarPulseIndex((cur) => (cur === slotIndex ? null : cur));
    }, 720);
  }, []);

  const victoryStarFlight: VictoryStarFlightConfig = useMemo(
    () => ({
      slotIndex: missionIndex,
      hudStarSlotsRef,
      onHudStarReveal: revealMinigameHudStarEarned,
      onStarArrive: handleVictoryStarArrive,
    }),
    [missionIndex, revealMinigameHudStarEarned, handleVictoryStarArrive],
  );

  const completedCount = status === "completed" ? missionIndex + 1 : missionIndex;

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

  const inMissionFlow =
    npcInteracted || status === "inProgress" || status === "completed";

  const minigameActive =
    status === "inProgress" &&
    preambleDone &&
    !choicesUnlocked &&
    Boolean(mission.minigameId);

  const bgmMode: GameBgmMode =
    isCampaignFinished && showCampaignSummary
      ? "explore"
      : minigameActive
        ? "minigame"
        : inMissionFlow
          ? "mission"
          : "explore";

  const bgmModeRef = useRef(bgmMode);
  bgmModeRef.current = bgmMode;

  useEffect(() => {
    setGameBgmMode(bgmMode);
  }, [bgmMode]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".gameRoot");
    let armed = true;
    const wake = () => {
      if (!armed) return;
      armed = false;
      void startGameBgm(bgmModeRef.current);
    };
    root?.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake, { passive: true });
    void resumeGameUiAudio().then((c) => {
      if (c?.state === "running") {
        wake();
      }
    });
    return () => {
      armed = false;
      root?.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      stopGameBgm();
    };
  }, []);

  async function handleAskAiAssist() {
    setAiLoading(true);
    try {
      const raw = await fetchAiAssist({ valueTag: mission.valueTag, status });
      const response = cleanAiAssistForDisplay(raw);
      setAiDialogue(response.dialogue);
      setAiHint(response.hint);
      setAiQuestVariation(response.questVariation);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <main className="gameRoot">
      <GameAudioMuteButton />
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
        missionProgressLabel={`${completedCount}/${totalMissions}`}
        missionProgressValue={completedCount / totalMissions}
        status={status}
        campaignStars={campaignStars}
        onHudStarSlotRef={registerHudStarSlot}
        hudStarPulseIndex={hudStarPulseIndex}
      />

      <DialoguePanel
        isOpen={npcInteracted || status === "inProgress" || status === "completed"}
        mission={mission}
        status={status}
        selectedChoice={selectedChoice}
        consequence={consequence}
        consequenceSummary={consequence?.summary ?? null}
        canStart={npcInteracted}
        hasNextMission={hasNextMission}
        aiDialogue={aiDialogue}
        aiHint={aiHint}
        aiQuestVariation={aiQuestVariation}
        aiLoading={aiLoading}
        totals={totals}
        isCampaignFinished={isCampaignFinished}
        showCampaignSummary={showCampaignSummary}
        campaignStars={campaignStars}
        onShowCampaignSummary={() => setShowCampaignSummary(true)}
        onStart={() => {
          setAiDialogue(null);
          setAiHint(null);
          setAiQuestVariation(null);
          setShowCampaignSummary(false);
          startMission();
        }}
        onChoose={selectChoice}
        onRetry={() => {
          setShowCampaignSummary(false);
          setAiDialogue(null);
          setAiHint(null);
          setAiQuestVariation(null);
          retryMission();
        }}
        onRestartCampaign={() => {
          setNpcInteracted(false);
          setAiDialogue(null);
          setAiHint(null);
          setAiQuestVariation(null);
          setShowCampaignSummary(false);
          restartCampaign();
        }}
        onAskAiAssist={handleAskAiAssist}
        preambleBeatIndex={preambleBeatIndex}
        preambleDone={preambleDone}
        onAdvancePreamble={advancePreamble}
        choicesUnlocked={choicesUnlocked}
        onMinigameHudOutcome={reportMinigameHudOutcome}
        onMinigameWinContinue={acknowledgeMinigameWin}
        victoryStarFlight={victoryStarFlight}
        onNextMission={() => {
          setNpcInteracted(false);
          setAiDialogue(null);
          setAiHint(null);
          setAiQuestVariation(null);
          setShowCampaignSummary(false);
          goToNextMission();
        }}
      />
    </main>
  );
}
