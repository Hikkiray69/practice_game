import type { RefObject } from "react";

/** Конфиг полёта звезды с экрана победы миниигры в слот HUD. */
export type VictoryStarFlightConfig = {
  slotIndex: number;
  hudStarSlotsRef: RefObject<(HTMLLIElement | null)[]>;
  /** Сразу после прилёта: включить золотую звезду в HUD (до этого слот остаётся pending). */
  onHudStarReveal: () => void;
  onStarArrive: (slotIndex: number) => void;
};
