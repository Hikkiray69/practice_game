export type QuestStatus = "new" | "inProgress" | "completed" | "failed";

/** Слот звезды кампании: ещё не финишировали миссию / полное прохождение / финиш без миниигры (скип). */
export type CampaignStarSlot = "pending" | "earned" | "missed";

/** Миниигра перед выбором в миссии (после преамбулы). */
export type MinigameId = "snake" | "memory" | "reaction";

export type MissionDialogueSpeaker = "npc" | "player";

export interface MissionDialogueBeat {
  speaker: MissionDialogueSpeaker;
  text: string;
}

export interface QuestChoice {
  id: string;
  label: string;
  consequenceId: string;
}

export interface QuestConsequence {
  id: string;
  scoreDelta: number;
  qualityDelta: number;
  speedDelta: number;
  summary: string;
}

export interface QuestScenario {
  id: string;
  valueTag: "responsibility" | "transparency" | "speed";
  title: string;
  intro: string;
  /** Короткий обмен перед выбором: NPC → игрок → NPC с контекстом. */
  preamble?: MissionDialogueBeat[];
  minigameId?: MinigameId;
  choices: QuestChoice[];
  consequences: QuestConsequence[];
}
