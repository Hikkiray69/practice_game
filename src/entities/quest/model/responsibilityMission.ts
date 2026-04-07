import { QuestScenario } from "./types";

export const responsibilityMission: QuestScenario = {
  id: "mission-responsibility-1",
  valueTag: "responsibility",
  title: "Ответственность: срочный релиз",
  intro:
    "В спринте найден критический риск по сроку. Нужно выбрать: быстрый фикс с техдолгом или устойчивое решение с риском переноса.",
  choices: [
    {
      id: "fast-fix",
      label: "Сделать быстрый фикс и уложиться в срок",
      consequenceId: "fast-fix-outcome",
    },
    {
      id: "stable-solution",
      label: "Сделать устойчивое решение и принять риск сдвига",
      consequenceId: "stable-solution-outcome",
    },
  ],
  consequences: [
    {
      id: "fast-fix-outcome",
      scoreDelta: 10,
      qualityDelta: -5,
      speedDelta: 8,
      summary:
        "Релиз успели в срок, но вырос риск багов после запуска. Скорость выше, качество ниже.",
    },
    {
      id: "stable-solution-outcome",
      scoreDelta: 8,
      qualityDelta: 8,
      speedDelta: -3,
      summary:
        "Решение надежнее и уменьшает техдолг, но есть риск задержки. Качество выше, скорость ниже.",
    },
  ],
};
