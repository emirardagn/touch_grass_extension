export type PageType = "post" | "profile" | "unsupported";
export type Lang = "tr" | "en";

export interface CustomPrompt {
  id: string;
  name: string;
  nameKey?: string;
  systemPrompt: string;
  isDefault?: boolean;
}

export interface Settings {
  model: string;
  maxTokens: number;
  responseLanguage: Lang;
  uiLanguage: Lang;
  activePromptId: string;
}

export interface ExtractedPayload {
  pageType: Exclude<PageType, "unsupported">;
  url: string;
  title: string;
  body: string;
  metadata?: Record<string, string>;
  sections?: ProfileSection[];
}

export interface ProfileSection {
  id: string;
  label: string;
  componentKey: string;
  text: string;
}

export interface SummaryResult {
  summary: string;
  tokensUsed?: number;
}

export interface ErrorResult {
  error: string;
  hint?: string;
}

export type RuntimeResponse = SummaryResult | ErrorResult;
