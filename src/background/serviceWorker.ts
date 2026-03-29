import { buildPrompt } from "../shared/prompts";
import { getActivePrompt, getApiKey, getSettings } from "../shared/storage";
import type { ErrorResult, ExtractedPayload, RuntimeResponse, SummaryResult } from "../shared/types";

interface OpenAIResponse {
  usage?: { total_tokens?: number };
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}

let lastRequestAt = 0;
const REQUEST_COOLDOWN_MS = 4000;

function extractTextFromOpenAI(response: OpenAIResponse): string {
  const first = response.output?.[0]?.content?.[0]?.text;
  return first?.trim() ?? "";
}

async function summarizePayload(payload: ExtractedPayload): Promise<RuntimeResponse> {
  const now = Date.now();
  if (now - lastRequestAt < REQUEST_COOLDOWN_MS) {
    return {
      error: "Cok hizli istek atildi.",
      hint: "Lutfen birkac saniye bekleyip tekrar dene.",
    };
  }
  lastRequestAt = now;

  const [settings, apiKey] = await Promise.all([getSettings(), getApiKey()]);
  if (!apiKey) {
    return {
      error: "OpenAI API key eksik.",
      hint: "Options sayfasindan API key gir.",
    } satisfies ErrorResult;
  }

  const activePrompt = await getActivePrompt(settings.activePromptId);
  const prompt = buildPrompt(payload, settings, activePrompt);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        max_output_tokens: settings.maxTokens,
        input: prompt,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        error: `OpenAI hatasi (${res.status})`,
        hint: body.slice(0, 220),
      };
    }

    const data = (await res.json()) as OpenAIResponse;
    const summary = extractTextFromOpenAI(data);
    if (!summary) {
      return { error: "Bos yanit alindi. Model veya prompt ayarini degistir." };
    }

    return {
      summary,
      tokensUsed: data.usage?.total_tokens,
    } satisfies SummaryResult;
  } catch (error) {
    return {
      error: "Istek basarisiz oldu.",
      hint: error instanceof Error ? error.message : "Bilinmeyen hata",
    };
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SUMMARIZE_PAYLOAD") {
    return;
  }

  const payload = message.payload as ExtractedPayload | undefined;
  if (!payload) {
    sendResponse({ error: "Payload eksik." } satisfies ErrorResult);
    return;
  }

  summarizePayload(payload).then((result) => sendResponse(result));
  return true;
});
