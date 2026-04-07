import { QuestConsequence, QuestStatus } from "@/entities/quest";
import { STATUS_LABELS } from "@/shared/constants/hud";
import { formatMetric } from "@/shared/lib/formatMetric";

interface HudProps {
  missionTitle: string;
  missionProgressLabel: string;
  status: QuestStatus;
  consequence: QuestConsequence | null;
  totals: {
    score: number;
    quality: number;
    speed: number;
  };
}

export function Hud({ missionTitle, missionProgressLabel, status, consequence, totals }: HudProps) {
  return (
    <aside className="hud">
      <h3>HUD</h3>
      <p>Миссия: {missionTitle}</p>
      <p>Прогресс: {missionProgressLabel}</p>
      <p>Статус миссии: {STATUS_LABELS[status]}</p>
      <p>Изменение очков: {formatMetric(consequence?.scoreDelta ?? 0)}</p>
      <p>Изменение качества: {formatMetric(consequence?.qualityDelta ?? 0)}</p>
      <p>Изменение скорости: {formatMetric(consequence?.speedDelta ?? 0)}</p>
      <hr />
      <p>Суммарные очки: {formatMetric(totals.score)}</p>
      <p>Суммарное качество: {formatMetric(totals.quality)}</p>
      <p>Суммарная скорость: {formatMetric(totals.speed)}</p>
    </aside>
  );
}
