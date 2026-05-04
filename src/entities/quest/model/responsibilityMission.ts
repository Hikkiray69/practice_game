import { QuestScenario } from "./types";

export const responsibilityMission: QuestScenario = {
  id: "mission-responsibility-1",
  valueTag: "responsibility",
  title: "Ответственность: срочный релиз",
  intro: "Спринт уперся в релиз: есть критический риск по сроку и качеству. Ниже — разговор с наставником, затем твой выбор.",
  preamble: [
    {
      speaker: "npc",
      text: "Слушай, перед релизом всплыл косяк: срок горит, а нормальный фикс неочевиден. Боюсь залить техдолгом или не успеть…",
    },
    {
      speaker: "player",
      text: "Ого, жёстко. Давай разберёмся — я помогу, расскажи, что уже знаем и что болит сильнее всего.",
    },
    {
      speaker: "npc",
      text: "Спасибо, ты выручаешь. Коротко: можем залатать быстро и вписаться в дедлайн, но потом выше риск багов. Или делать устойчиво, но тогда реально можно не успеть. Теперь твой ход.",
    },
  ],
  minigameId: "snake",
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
