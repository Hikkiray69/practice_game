import { type CampaignStarSlot, QuestStatus } from "@/entities/quest";
import { STATUS_LABELS } from "@/shared/constants/hud";
import { CampaignStars } from "./CampaignStars";

interface HudProps {
  missionTitle: string;
  objectiveText: string;
  missionProgressLabel: string;
  missionProgressValue: number; // 0..1
  status: QuestStatus;
  campaignStars: CampaignStarSlot[];
  onHudStarSlotRef?: (index: number, el: HTMLLIElement | null) => void;
  hudStarPulseIndex?: number | null;
}

export function Hud({
  missionTitle,
  objectiveText,
  missionProgressLabel,
  missionProgressValue,
  status,
  campaignStars,
  onHudStarSlotRef,
  hudStarPulseIndex,
}: HudProps) {
  const progressPercent = `${Math.round(Math.max(0, Math.min(1, missionProgressValue)) * 100)}%`;

  return (
    <aside className="hudTop">
      <div className="hudCard">
        <div className="hudTitle">SOC Training Hub</div>
        <div className="hudSub" suppressHydrationWarning>
          Миссия {missionProgressLabel}
        </div>
        <CampaignStars slots={campaignStars} onSlotRef={onHudStarSlotRef} pulseSlotIndex={hudStarPulseIndex} />
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
