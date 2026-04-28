export interface AiResponse {
  dialogue: string;
  hint: string;
  questVariation: string;
}

const FALLBACK: AiResponse = {
  dialogue: "Давай оценим решение не только по скорости, но и по последствиям для команды.",
  hint: "Сравни краткосрочную выгоду и долгосрочный риск перед выбором.",
  questVariation: "Вариация: поменяй приоритеты участников команды и выбери решение заново.",
};

export function validateAiOutput(input: unknown): AiResponse {
  if (!input || typeof input !== "object") {
    return FALLBACK;
  }

  const maybe = input as Partial<AiResponse>;
  const dialogue = typeof maybe.dialogue === "string" ? maybe.dialogue.trim() : "";
  const hint = typeof maybe.hint === "string" ? maybe.hint.trim() : "";
  const questVariation =
    typeof maybe.questVariation === "string" ? maybe.questVariation.trim() : "";

  if (!dialogue || !hint || !questVariation) {
    return FALLBACK;
  }

  if (dialogue.length > 240 || hint.length > 180 || questVariation.length > 240) {
    return FALLBACK;
  }

  return { dialogue, hint, questVariation };
}

