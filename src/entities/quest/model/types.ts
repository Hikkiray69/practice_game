export type QuestStatus = "new" | "inProgress" | "completed" | "failed";

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
  choices: QuestChoice[];
  consequences: QuestConsequence[];
}
