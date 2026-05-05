"use client";

import { useEffect, useState } from "react";
import {
  type CampaignStarSlot,
  type QuestChoice,
  type QuestConsequence,
  QuestScenario,
  QuestStatus,
} from "@/entities/quest";
import { MissionMinigame, type VictoryStarFlightConfig } from "@/features/mission-minigame";
import {
  buildCampaignMetricsFullSheet,
  buildMissionMetricsExplainCard,
  CampaignStars,
  MetricsExplainCard,
} from "@/features/scoring-progress";
import { playGameUiSfx } from "@/shared/lib/gameUiSfx";

/** Один проигрыш фанфары за показ финала кампании (в т.ч. против двойного mount в Strict Mode). */
let campaignEndFanfareArmed = true;

interface DialoguePanelProps {
  isOpen: boolean;
  mission: QuestScenario;
  status: QuestStatus;
  selectedChoice: QuestChoice | null;
  consequence: QuestConsequence | null;
  consequenceSummary: string | null;
  canStart: boolean;
  hasNextMission: boolean;
  aiDialogue: string | null;
  aiHint: string | null;
  aiQuestVariation: string | null;
  aiLoading: boolean;
  totals: {
    score: number;
    quality: number;
    speed: number;
  };
  isCampaignFinished: boolean;
  showCampaignSummary: boolean;
  campaignStars: CampaignStarSlot[];
  onStart: () => void;
  onChoose: (choiceId: string) => void;
  onRetry: () => void;
  onNextMission: () => void;
  onRestartCampaign: () => void;
  onAskAiAssist: () => void;
  onShowCampaignSummary: () => void;
  preambleBeatIndex: number;
  preambleDone: boolean;
  onAdvancePreamble: () => void;
  choicesUnlocked: boolean;
  onMinigameHudOutcome: (earned: boolean) => void;
  onMinigameWinContinue: () => void;
  victoryStarFlight?: VictoryStarFlightConfig;
}

export function DialoguePanel({
  isOpen,
  mission,
  status,
  selectedChoice,
  consequence,
  consequenceSummary,
  canStart,
  hasNextMission,
  aiDialogue,
  aiHint,
  aiQuestVariation,
  aiLoading,
  totals,
  isCampaignFinished,
  showCampaignSummary,
  campaignStars,
  onStart,
  onChoose,
  onRetry,
  onNextMission,
  onRestartCampaign,
  onAskAiAssist,
  onShowCampaignSummary,
  preambleBeatIndex,
  preambleDone,
  onAdvancePreamble,
  choicesUnlocked,
  onMinigameHudOutcome,
  onMinigameWinContinue,
  victoryStarFlight,
}: DialoguePanelProps) {
  const [campaignMetricsSheetOpen, setCampaignMetricsSheetOpen] = useState(false);
  const campaignEndSummary = Boolean(isOpen && isCampaignFinished && showCampaignSummary);

  useEffect(() => {
    if (!campaignEndSummary) {
      campaignEndFanfareArmed = true;
      return;
    }
    if (!campaignEndFanfareArmed) {
      return;
    }
    campaignEndFanfareArmed = false;
    playGameUiSfx("campaignEnd");
  }, [campaignEndSummary]);

  if (!isOpen) {
    return null;
  }

  const campaignTripleTriumph =
    campaignStars.length >= 3 && campaignStars.every((slot) => slot === "earned");

  if (campaignEndSummary) {
    const triumphMod = campaignTripleTriumph ? " dialogueOverlay--campaignTriumph" : "";
    return (
      <>
        <div className="modalBackdrop">
          <section
            className={`dialogueOverlay dialogueOverlay--campaignEnd${triumphMod}`}
            role="dialog"
            aria-modal="true"
          >
            {campaignTripleTriumph ? <div className="dialogueCampaignEndFx" aria-hidden /> : null}
            <div
              className={`dialogueCampaignEndHeader${campaignTripleTriumph ? " dialogueCampaignEndHeader--triumph" : ""}`}
            >
              <div className="dialogueTitle">Кампания завершена</div>
              <p className="dialogueText dialogueCampaignEndLead">
                {campaignTripleTriumph
                  ? "Идеальный заход: все три миниигры без пропусков. Забирай сияние — ты это заслужил."
                  : "Все три миссии пройдены. Ниже — звёзды полного прохождения и суммарные метрики."}
              </p>
            </div>
            <div className="dialogueCampaignEndBody">
              <div className={`dialogueSummaryStars${campaignTripleTriumph ? " dialogueSummaryStars--triumph" : ""}`}>
                <CampaignStars slots={campaignStars} />
                <span
                  className={`dialogueText dialogueSummaryStarsHint${campaignTripleTriumph ? " dialogueSummaryStarsHint--triumph" : ""}`}
                >
                  {campaignTripleTriumph
                    ? "Три золотых звезды — полное прохождение кампании."
                    : "Золотые — миниигру прошли; серые — был пропуск."}
                </span>
              </div>
              <div className="dialogueCampaignEndMetrics">
                <div className="dialogueText">Очки: {totals.score}</div>
                <div className="dialogueText">Качество: {totals.quality}</div>
                <div className="dialogueText">Скорость: {totals.speed}</div>
              </div>
              <div className="dialogueActions dialogueCampaignEndActions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    playGameUiSfx("tap");
                    setCampaignMetricsSheetOpen(true);
                  }}
                >
                  Посмотреть сводку
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    playGameUiSfx("confirm");
                    onRestartCampaign();
                  }}
                >
                  Попробовать снова (все 3 миссии)
                </button>
              </div>
            </div>
          </section>
        </div>

        {campaignMetricsSheetOpen ? (
          <div
            className="metricsSheetBackdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Свод кампании"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                playGameUiSfx("tap");
                setCampaignMetricsSheetOpen(false);
              }
            }}
          >
            <div className="metricsSheetPanel">
              <div className="metricsSheetToolbar">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    playGameUiSfx("tap");
                    setCampaignMetricsSheetOpen(false);
                  }}
                >
                  Закрыть
                </button>
              </div>
              <div className="metricsSheetScroll">
                <MetricsExplainCard card={buildCampaignMetricsFullSheet({ totals, campaignStars })} />
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  const hasAiAssist =
    Boolean(aiDialogue?.trim()) && Boolean(aiHint?.trim()) && Boolean(aiQuestVariation?.trim());

  const preamble = mission.preamble ?? [];
  const preambleBeat = !preambleDone ? preamble[preambleBeatIndex] : undefined;

  return (
    <div className="modalBackdrop">
      <section className="dialogueOverlay" role="dialog" aria-modal="true">
        <div className="dialogueTitle">{mission.title}</div>
        <div className="dialogueText">{mission.intro}</div>

      {status === "new" && canStart && (
        <div className="dialogueActions single">
          <button
            className="button"
            type="button"
            onClick={() => {
              playGameUiSfx("confirm");
              onStart();
            }}
          >
            Начать миссию
          </button>
        </div>
      )}

      {status === "new" && !canStart && (
        <div className="resultBox">
          <p className="dialogueText">Подойди к NPC нужной зоны и нажми E, чтобы начать.</p>
        </div>
      )}

      {status === "inProgress" && !preambleDone && preambleBeat && (
        <div className="preambleFlow">
          <div
            className={
              preambleBeat.speaker === "npc" ? "dialogueBeat dialogueBeatNpc" : "dialogueBeat dialogueBeatPlayer"
            }
          >
            <div className="dialogueBeatMeta">{preambleBeat.speaker === "npc" ? "Наставник" : "Ты"}</div>
            <p className="dialogueText">{preambleBeat.text}</p>
          </div>
          <div className="dialogueActions single">
            <button
              className="button"
              type="button"
              onClick={() => {
                playGameUiSfx("tap");
                onAdvancePreamble();
              }}
            >
              {preambleBeat.speaker === "player" ? "Сказать это" : "Далее"}
            </button>
          </div>
        </div>
      )}

      {status === "inProgress" && preambleDone && !choicesUnlocked && mission.minigameId && (
        <MissionMinigame
          key={`${mission.id}-minigame`}
          id={mission.minigameId}
          onHudOutcome={onMinigameHudOutcome}
          onWinContinue={onMinigameWinContinue}
          victoryStarFlight={victoryStarFlight}
        />
      )}

      {status === "inProgress" && preambleDone && choicesUnlocked && (
        <div className="choiceList">
          {(aiLoading || !hasAiAssist) && (
            <div className="dialogueActions single">
              <button
                className="button ai"
                type="button"
                onClick={() => {
                  playGameUiSfx("tap");
                  onAskAiAssist();
                }}
                disabled={aiLoading}
              >
                {aiLoading ? "AI думает..." : "AI: диалог и подсказки"}
              </button>
            </div>
          )}

          {hasAiAssist && (
            <div className="aiAssistPanel">
              <div className="aiAssistBlock">
                <div className="aiAssistLabel">Реплика NPC</div>
                <p className="dialogueText">{aiDialogue}</p>
              </div>
              <div className="aiAssistBlock">
                <div className="aiAssistLabel">Подсказка</div>
                <p className="dialogueText">{aiHint}</p>
              </div>
              <div className="aiAssistBlock">
                <div className="aiAssistLabel">Вариация сценария</div>
                <p className="dialogueText">{aiQuestVariation}</p>
              </div>
            </div>
          )}

          {mission.choices.map((choice) => (
            <button
              className="button secondary"
              key={choice.id}
              type="button"
              onClick={() => {
                playGameUiSfx("confirm");
                onChoose(choice.id);
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

        {status === "completed" && consequenceSummary && !isCampaignFinished && selectedChoice && consequence && (
          <div className="resultBox">
            <div className="resultSummary">
              <p className="dialogueText">{consequenceSummary}</p>
            </div>
            <MetricsExplainCard
              card={buildMissionMetricsExplainCard({
                mission,
                choice: selectedChoice,
                consequence,
              })}
            />
            <div className="dialogueActions">
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  playGameUiSfx("tap");
                  onRetry();
                }}
              >
                Попробовать еще раз
              </button>
              {hasNextMission ? (
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    playGameUiSfx("confirm");
                    onNextMission();
                  }}
                >
                  Следующая миссия
                </button>
              ) : (
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    playGameUiSfx("confirm");
                    onRetry();
                  }}
                >
                  Пройти снова
                </button>
              )}
            </div>
          </div>
        )}

        {/* Last mission: show its result first; campaign summary only after acknowledgment */}
        {isCampaignFinished &&
          !showCampaignSummary &&
          consequenceSummary &&
          selectedChoice &&
          consequence && (
          <div className="resultBox">
            <div className="resultSummary">
              <p className="dialogueText">{consequenceSummary}</p>
            </div>
            <MetricsExplainCard
              card={buildMissionMetricsExplainCard({
                mission,
                choice: selectedChoice,
                consequence,
              })}
            />
            <div className="dialogueActions">
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  playGameUiSfx("tap");
                  onRetry();
                }}
              >
                Попробовать еще раз
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  playGameUiSfx("confirm");
                  onShowCampaignSummary();
                }}
              >
                Итоги прохождения
              </button>
            </div>
          </div>
        )}

      </section>
    </div>
  );
}
