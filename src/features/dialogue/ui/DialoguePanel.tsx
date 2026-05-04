"use client";

import { QuestScenario, QuestStatus } from "@/entities/quest";

interface DialoguePanelProps {
  isOpen: boolean;
  mission: QuestScenario;
  status: QuestStatus;
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
  onStart: () => void;
  onChoose: (choiceId: string) => void;
  onRetry: () => void;
  onNextMission: () => void;
  onRestartCampaign: () => void;
  onAskAiHint: () => void;
}

export function DialoguePanel({
  isOpen,
  mission,
  status,
  consequenceSummary,
  canStart,
  hasNextMission,
  aiDialogue,
  aiHint,
  aiQuestVariation,
  aiLoading,
  totals,
  isCampaignFinished,
  onStart,
  onChoose,
  onRetry,
  onNextMission,
  onRestartCampaign,
  onAskAiHint,
}: DialoguePanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modalBackdrop">
      <section className="dialogueOverlay" role="dialog" aria-modal="true">
        <div className="dialogueTitle">{mission.title}</div>
        <div className="dialogueText">{mission.intro}</div>

      {status === "new" && canStart && (
        <div className="dialogueActions">
          <button className="button" type="button" onClick={onStart}>
            Начать миссию
          </button>
          <button className="button secondary" type="button" onClick={onAskAiHint} disabled={aiLoading}>
            {aiLoading ? "AI думает..." : "AI подсказка"}
          </button>
        </div>
      )}

      {status === "new" && !canStart && (
        <div className="resultBox">
          <p className="dialogueText">Подойди к NPC нужной зоны и нажми E, чтобы начать.</p>
        </div>
      )}

      {status === "inProgress" && (
        <div className="choiceList">
          <div className="dialogueActions">
            <button className="button secondary" type="button" onClick={onAskAiHint} disabled={aiLoading}>
              {aiLoading ? "AI думает..." : "AI подсказка"}
            </button>
          </div>

          {aiDialogue && <p className="dialogueText">{aiDialogue}</p>}
          {aiHint && <p className="dialogueText">Подсказка: {aiHint}</p>}
          {aiQuestVariation && <p className="dialogueText">Вариация: {aiQuestVariation}</p>}

          {mission.choices.map((choice) => (
            <button
              className="button secondary"
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice.id)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

        {status === "completed" && consequenceSummary && !isCampaignFinished && (
          <div className="resultBox">
            <p className="dialogueText">{consequenceSummary}</p>
            <div className="dialogueActions">
              <button className="button secondary" type="button" onClick={onRetry}>
                Попробовать еще раз
              </button>
              {hasNextMission ? (
                <button className="button" type="button" onClick={onNextMission}>
                  Следующая миссия
                </button>
              ) : (
                <button className="button" type="button" onClick={onRetry}>
                  Пройти снова
                </button>
              )}
            </div>
          </div>
        )}

        {isCampaignFinished && (
          <div className="resultBox">
            <p className="dialogueText">Все 3 миссии завершены. Итоги прохождения:</p>
            <div className="dialogueText">Очки: {totals.score}</div>
            <div className="dialogueText">Качество: {totals.quality}</div>
            <div className="dialogueText">Скорость: {totals.speed}</div>
            <div className="dialogueActions">
              <button className="button" type="button" onClick={onRestartCampaign}>
                Попробовать снова (все 3 миссии)
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
