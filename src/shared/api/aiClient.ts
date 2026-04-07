import { AiResponse, validateAiOutput } from "@/shared/lib/validateAiOutput";

interface Params {
  valueTag: string;
  status: string;
}

export async function fetchAiAssist(params: Params): Promise<AiResponse> {
  const res = await fetch("/api/ai/assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    return validateAiOutput(null);
  }

  const data = await res.json().catch(() => null);
  return validateAiOutput(data);
}

