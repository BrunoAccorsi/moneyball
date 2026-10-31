import { CATEGORIES, isCategory, type Category } from "./types";

export type LlmEnv = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

export async function llmCategorize(
  input: { description: string; amountCents: number; date: string },
  env: LlmEnv,
): Promise<Category | null> {
  if (!env.apiKey) return null;
  const fetchImpl = env.fetchImpl ?? fetch;
  const base = (env.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.model || "gpt-4o-mini";
  const response = await fetchImpl(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You categorize one personal-finance transaction in CAD. Reply with JSON {"category": "..."} using only one of: ${CATEGORIES.join(", ")}. If you are unsure, reply {"category": null}.`,
        },
        {
          role: "user",
          content: `${input.date} ${input.description} amount_cents=${input.amountCents}`,
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { category?: unknown };
    return typeof parsed.category === "string" && isCategory(parsed.category) ? parsed.category : null;
  } catch {
    return null;
  }
}
