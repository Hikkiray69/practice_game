import { NextRequest, NextResponse } from "next/server";
import { AI_PROMPT_TEMPLATES } from "@/shared/constants/aiPrompts";
import { validateAiOutput } from "@/shared/lib/validateAiOutput";

function buildFallback(valueTag: string) {
  const map: Record<string, { dialogue: string; hint: string; questVariation: string }> = {
    responsibility: {
      dialogue:
        "Ответственность начинается с понимания последствий. Выбор должен быть обоснован и прозрачен.",
      hint: "Выбирай вариант, где ты готов объяснить последствия для срока и качества.",
      questVariation:
        "Вариация: добавь ограничение по времени и выбери, чем пожертвуешь ради стабильности.",
    },
    transparency: {
      dialogue:
        "Прозрачность снижает риски неожиданностей. Честный статус помогает команде синхронизироваться.",
      hint: "Не прячь риск: сообщи проблему и сразу предложи план действий.",
      questVariation:
        "Вариация: клиент просит ускорение, а команда предупреждает о рисках. Пересобери план коммуникации.",
    },
    speed: {
      dialogue:
        "Скорость важна, когда она управляемая. Быстрое решение не должно ломать базовое качество.",
      hint: "Проверь, сохраняет ли твой выбор баланс между дедлайном и надежностью.",
      questVariation:
        "Вариация: дедлайн сократили на 20%. Выбери новый scope без критической потери качества.",
    },
  };

  const base = map[valueTag] ?? map.responsibility;
  return {
    dialogue: base.dialogue,
    hint: base.hint,
    questVariation: base.questVariation,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const valueTag = typeof body?.valueTag === "string" ? body.valueTag : "responsibility";
  const status = typeof body?.status === "string" ? body.status : "new";

  // Current implementation uses safe local fallback content.
  // External model integration can be plugged here later.
  const response = buildFallback(valueTag);

  return NextResponse.json({
    ...validateAiOutput(response),
    promptTemplate: AI_PROMPT_TEMPLATES.hint,
    status,
  });
}

