import { QuestStatus } from "@/entities/quest";
import { STATUS_LABELS } from "@/shared/constants/hud";

interface HudProps {
  missionTitle: string;
  objectiveText: string;
  missionProgressLabel: string;
  missionProgressValue: number; // 0..1
  status: QuestStatus;
}

export function Hud({
  missionTitle,
  objectiveText,
  missionProgressLabel,
  missionProgressValue,
  status,
}: HudProps) {
  const progressPercent = `${Math.round(Math.max(0, Math.min(1, missionProgressValue)) * 100)}%`;

  return (
    <aside className="hudTop">
      <div className="hudCard">
        <div className="hudTitle">SOC Training Hub</div>
        <div className="hudSub">Миссия {missionProgressLabel}</div>
        <div className="progressBar" style={{ ["--progress" as never]: progressPercent }}>
          <div className="progressFill" />
        </div>
      </div>

      <div className="hudCard">
        <div className="hudTitle">{missionTitle}</div>
        <div className="hudSub">Статус: {STATUS_LABELS[status]}</div>
        <div className="hudSub">Цель: {objectiveText}</div>
      </div>
    </aside>
  );
}
