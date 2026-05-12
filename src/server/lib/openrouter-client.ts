import { extractJsonObject } from "@/lib/llm-json";

type OpenRouterChatOptions = {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
};

type OpenRouterChatResult = {
  raw: string;
  model: string;
};

function appReferer() {
  return (
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

export function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || "";
}

export async function requestOpenRouterChatCompletion(
  options: OpenRouterChatOptions
): Promise<OpenRouterChatResult> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": appReferer(),
      "X-Title": "Vitrina Store Seller Helper",
    },
    body: JSON.stringify({
      model: options.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${body.slice(0, 400)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return { raw, model: data.model ?? options.model };
}

export function parseOpenRouterJsonResponse<T>(raw: string): T {
  return JSON.parse(extractJsonObject(raw)) as T;
}
