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

function stripDisplayPrefixes(raw: string, patterns: RegExp[]): string {
  let s = raw.trim();
  for (const re of patterns) {
    const next = s.replace(re, "").trim();
    if (next.length > 0) {
      s = next;
    }
  }
  return s;
}

/** Убирает служебные префиксы из ответа модели перед показом в UI (контракт AI). */
export function cleanAiAssistForDisplay(response: AiResponse): AiResponse {
  const dialogue = stripDisplayPrefixes(response.dialogue, [
    /^реплика\s*npc\s*:\s*/i,
    /^реплика:\s*/i,
    /^npc\s*:\s*/i,
  ]);
  const hint = stripDisplayPrefixes(response.hint, [/^подсказка:\s*/i, /^hint:\s*/i]);
  const questVariation = stripDisplayPrefixes(response.questVariation, [
    /^вариация сценария:\s*/i,
    /^вариация:\s*/i,
    /^quest\s*variation:\s*/i,
  ]);

  return {
    dialogue: dialogue || response.dialogue.trim(),
    hint: hint || response.hint.trim(),
    questVariation: questVariation || response.questVariation.trim(),
  };
}
