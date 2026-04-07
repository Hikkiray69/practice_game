"use client";

import { QuestScenario, QuestStatus } from "@/entities/quest";

interface DialoguePanelProps {
  mission: QuestScenario;
  status: QuestStatus;
  consequenceSummary: string | null;
  canStart: boolean;
  hasNextMission: boolean;
  aiDialogue: string | null;
  aiHint: string | null;
  aiQuestVariation: string | null;
  aiLoading: boolean;
  onStart: () => void;
  onChoose: (choiceId: string) => void;
  onRetry: () => void;
  onNextMission: () => void;
  onAskAiHint: () => void;
}

export function DialoguePanel({
  mission,
  status,
  consequenceSummary,
  canStart,
  hasNextMission,
  aiDialogue,
  aiHint,
  aiQuestVariation,
  aiLoading,
  onStart,
  onChoose,
  onRetry,
  onNextMission,
  onAskAiHint,
}: DialoguePanelProps) {
  return (
    <section className="panel">
      <h2>{mission.title}</h2>
      <p>{mission.intro}</p>

      {status === "new" && canStart && (
        <button className="button" type="button" onClick={onStart}>
          Начать миссию
        </button>
      )}

      {status === "new" && !canStart && (
        <div className="resultBox">
          <p>Сначала подойди к NPC (куб) и кликни по нему, чтобы начать разговор.</p>
        </div>
      )}

      {status === "inProgress" && (
        <div className="choiceList">
          <button className="button" type="button" onClick={onAskAiHint} disabled={aiLoading}>
            {aiLoading ? "AI думает..." : "Спросить AI-подсказку"}
          </button>
          {aiDialogue && <p>{aiDialogue}</p>}
          {aiHint && <p>Подсказка: {aiHint}</p>}
          {aiQuestVariation && <p>AI-вариация: {aiQuestVariation}</p>}
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

      {status === "completed" && consequenceSummary && (
        <div className="resultBox">
          <p>{consequenceSummary}</p>
          <button className="button" type="button" onClick={onRetry}>
            Право на ошибку: попробовать еще раз
          </button>
          {hasNextMission ? (
            <button className="button secondary" type="button" onClick={onNextMission}>
              Перейти к следующей миссии
            </button>
          ) : (
            <p>Все миссии MVP-2 пройдены.</p>
          )}
        </div>
      )}
    </section>
  );
}
