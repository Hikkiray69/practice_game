import type { CampaignStarSlot } from "@/entities/quest";

const LABELS: Record<CampaignStarSlot, string> = {
  pending: "миссия ещё не завершена",
  earned: "полное прохождение",
  missed: "миссия завершена без миниигры",
};

export function CampaignStars({
  slots,
  onSlotRef,
  pulseSlotIndex,
}: {
  slots: CampaignStarSlot[];
  onSlotRef?: (index: number, el: HTMLLIElement | null) => void;
  pulseSlotIndex?: number | null;
}) {
  return (
    <ul className="hudStars" aria-label="Звёзды полного прохождения кампании">
      {slots.map((slot, i) => (
        <li
          key={i}
          ref={(el) => onSlotRef?.(i, el)}
          className={`hudStar hudStar--${slot}${pulseSlotIndex === i ? " hudStar--arrivePulse" : ""}`}
          title={LABELS[slot]}
          aria-label={`Миссия ${i + 1}: ${LABELS[slot]}`}
        >
          ★
        </li>
      ))}
    </ul>
  );
}
