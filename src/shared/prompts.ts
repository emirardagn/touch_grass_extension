import type { CustomPrompt, ExtractedPayload, Settings } from "./types";

function languageInstruction(language: Settings["responseLanguage"]): string {
  if (language === "tr") {
    return `OUTPUT LANGUAGE: Turkish
You MUST write your entire response in Turkish. All section headers, bullets, and sentences must be in Turkish. Do not use English anywhere in the response.`;
  }
  return `OUTPUT LANGUAGE: English
You MUST write your entire response in English.`;
}

export function buildPrompt(
  payload: ExtractedPayload,
  settings: Settings,
  activePrompt: CustomPrompt
): string {
  return [
    "=== INSTRUCTIONS ===",
    activePrompt.systemPrompt,
    "",
    "=== OUTPUT LANGUAGE ===",
    languageInstruction(settings.responseLanguage),
    "",
    "=== CONTENT TO ANALYZE ===",
    `URL: ${payload.url}`,
    `Title: ${payload.title}`,
    `Body:\n${payload.body}`,
    payload.metadata ? `Metadata: ${JSON.stringify(payload.metadata)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
