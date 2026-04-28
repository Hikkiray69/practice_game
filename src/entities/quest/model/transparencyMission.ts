import { QuestScenario } from "./types";

export const transparencyMission: QuestScenario = {
  id: "mission-transparency-2",
  valueTag: "transparency",
  title: "Прозрачность: честный статус проекта",
  intro:
    "Команда нашла риск по внешней интеграции. Клиент пока не знает о проблеме. Нужно выбрать стратегию коммуникации.",
  choices: [
    {
      id: "hide-risk",
      label: "Скрыть риск до финальной проверки",
      consequenceId: "hide-risk-outcome",
    },
    {
      id: "open-risk",
      label: "Открыто обозначить риск и mitigation-план",
      consequenceId: "open-risk-outcome",
    },
  ],
  consequences: [
    {
      id: "hide-risk-outcome",
      scoreDelta: 4,
      qualityDelta: -4,
      speedDelta: 3,
      summary: "Краткосрочно спокойнее, но доверие падает и риск срыва растет.",
    },
    {
      id: "open-risk-outcome",
      scoreDelta: 9,
      qualityDelta: 5,
      speedDelta: -1,
      summary: "Риск прозрачен, команда синхронизирована, доверие клиента выше.",
    },
  ],
};
