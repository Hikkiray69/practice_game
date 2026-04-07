import { QuestScenario } from "./types";

export const speedMission: QuestScenario = {
  id: "mission-speed-3",
  valueTag: "speed",
  title: "Скорость: дедлайн без потери качества",
  intro:
    "Нужно выпустить срочный релиз. Времени мало, но критически важно не уронить качество ниже порога.",
  choices: [
    {
      id: "full-scope-rush",
      label: "Гнать полный scope на максимальной скорости",
      consequenceId: "full-scope-rush-outcome",
    },
    {
      id: "controlled-scope",
      label: "Сузить scope и доставить устойчивый релиз",
      consequenceId: "controlled-scope-outcome",
    },
  ],
  consequences: [
    {
      id: "full-scope-rush-outcome",
      scoreDelta: 6,
      qualityDelta: -6,
      speedDelta: 8,
      summary: "По срокам успели, но технический риск и вероятность багов выросли.",
    },
    {
      id: "controlled-scope-outcome",
      scoreDelta: 10,
      qualityDelta: 6,
      speedDelta: 2,
      summary: "Релиз устойчивый, команда сохранила качество и управляемый темп.",
    },
  ],
};
