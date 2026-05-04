import { QuestScenario } from "./types";

export const speedMission: QuestScenario = {
  id: "mission-speed-3",
  valueTag: "speed",
  title: "Скорость: дедлайн без потери качества",
  intro: "Срочный релиз: дедлайн жёсткий, объём большой. Сначала обмен с командой, затем — как везти темп и scope.",
  preamble: [
    {
      speaker: "npc",
      text: "Дедлайн не двигается, а по объёму работ как на два спринта. Команда на нервяке, боюсь, что начнём резать углы.",
    },
    {
      speaker: "player",
      text: "Окей, давай выровняем темп: посмотрим, что реально успеть без провала по качеству — я помогу разрулить.",
    },
    {
      speaker: "npc",
      text: "Супер. Нужно решение: жать полный scope на максимальной скорости или аккуратно сузить и везти стабильный релиз. За тобой выбор.",
    },
  ],
  minigameId: "reaction",
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
