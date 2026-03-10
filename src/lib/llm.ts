import type { LLMConfig, TasteAnalysis } from "./types";

export async function callLLM(prompt: string, config: LLMConfig): Promise<TasteAnalysis> {
  if (config.provider === "claude") {
    return callClaude(prompt, config);
  }
  return callOpenAICompatible(prompt, config);
}

async function callClaude(prompt: string, config: LLMConfig): Promise<TasteAnalysis> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: config.model || "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API 错误: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error("Claude API 返回了空响应，请重试");
  }
  return parseAnalysisJSON(text);
}

async function callOpenAICompatible(prompt: string, config: LLMConfig): Promise<TasteAnalysis> {
  const baseUrl = config.baseUrl?.replace(/\/+$/, "") || "https://api.openai.com/v1";

  const body: Record<string, unknown> = {
    model: config.model || "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 4096,
  };

  // Only add response_format for official OpenAI (custom endpoints may not support it)
  if (config.provider === "openai") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API 错误: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("LLM API 返回了空响应，请重试");
  }
  return parseAnalysisJSON(text);
}

function parseAnalysisJSON(text: string): TasteAnalysis {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = (jsonMatch ? jsonMatch[1] : text).trim();

  if (!jsonStr) {
    throw new Error("LLM 返回了空内容，请重试");
  }

  try {
    return JSON.parse(jsonStr) as TasteAnalysis;
  } catch {
    throw new Error("LLM 返回的结果无法解析为 JSON，请重试。原始响应：" + text.slice(0, 300));
  }
}
