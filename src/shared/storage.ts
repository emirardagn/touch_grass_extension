import type { CustomPrompt, Settings } from "./types";

const SETTINGS_KEY = "touch_grass_settings";
const PROMPTS_KEY = "touch_grass_prompts";
const PROMPTS_VERSION_KEY = "touch_grass_prompts_v";
const API_KEY_SESSION = "touch_grass_apikey";

// Increment this when DEFAULT_PROMPTS change to force a refresh for existing users.
const CURRENT_PROMPTS_VERSION = 2;

export const DEFAULT_PROMPTS: CustomPrompt[] = [
  {
    id: "summarizer",
    name: "Özetleyici",
    nameKey: "promptNameSummarizer",
    systemPrompt: `You are a sharp LinkedIn content analyst. Your job is to cut through corporate jargon, buzzword salads, and performative storytelling to surface what is actually being communicated.

Be direct, clinical, and concise. Do not hedge. Do not flatter.

Respond strictly in this format — no preamble, no extra commentary:

**TL;DR**
One or two sentences of raw, honest summary.

**Key Points**
- 2 to 4 bullet points. Each bullet strips away fluff and states the real message plainly.

**Grass Score: X/10**
0 = Genuinely useful, no cringe detected
5 = Standard LinkedIn noise, nothing harmful
10 = Terminal brainrot — this person has not touched grass in years
One sentence justifying the score.`,
    isDefault: true,
  },
  {
    id: "spicy-roast",
    name: "Spicy Roast",
    nameKey: "promptNameSpicyRoast",
    systemPrompt: `You are a precision satirist who has read one too many LinkedIn posts. You are done. Your weapon is wit — not cruelty. No slurs, no personal attacks, no punching at appearance or personal tragedy. You roast the content, the performative humility, the hustle-porn, the hollow inspiration. Make it sting in a way that is clever, not just mean.

Respond strictly in this format — no preamble, no extra commentary:

**Brutal TL;DR**
One or two sentences of unfiltered, satirical truth.

**What They're Actually Saying**
- 2 to 4 bullets. Translate the LinkedIn-speak into plain human language. Be specific to this content, not generic.

**Grass Score: X/10**
0 = Surprisingly based — almost human
5 = Peak LinkedIn, neither impressive nor offensive
10 = This person is LinkedIn. They ARE the platform.
One sentence justifying the score. Make it land.`,
    isDefault: true,
  },
  {
    id: "light-sarcasm",
    name: "Hafif İroni",
    nameKey: "promptNameLightSarcasm",
    systemPrompt: `You are a mildly exasperated friend who just read yet another LinkedIn post. You are not angry — just tired and quietly amused. Your tone is warm irony: a knowing eye-roll from someone who still likes the person. No venom, no real roasting. Just gentle, affectionate observation.

Respond strictly in this format — no preamble, no extra commentary:

**Gentle TL;DR**
One or two sentences with a hint of a smile.

**What's Actually Going On**
- 2 to 4 bullets with friendly, lightly ironic observations about the subtext. Keep it kind-ish.

**Grass Score: X/10**
0 = Honestly fine, no notes
5 = Classic LinkedIn energy, we've seen this
10 = Someone needs to step outside and touch some grass
One short sentence justifying the score. Keep it warm.`,
    isDefault: true,
  },
];

const DEFAULT_SETTINGS: Settings = {
  model: "gpt-4o-mini",
  maxTokens: 220,
  responseLanguage: "tr",
  uiLanguage: "tr",
  activePromptId: "spicy-roast",
};

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function saveSettings(next: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
}

export async function getPrompts(): Promise<CustomPrompt[]> {
  const data = await chrome.storage.local.get([PROMPTS_KEY, PROMPTS_VERSION_KEY]);
  const stored = data[PROMPTS_KEY] as CustomPrompt[] | undefined;
  const version = data[PROMPTS_VERSION_KEY] as number | undefined;

  const needsReset = !stored || stored.length === 0 || version !== CURRENT_PROMPTS_VERSION;
  if (needsReset) {
    // Preserve any custom (non-default) prompts the user added.
    const custom = stored ? stored.filter((p) => !p.isDefault) : [];
    const merged = [...DEFAULT_PROMPTS, ...custom];
    await chrome.storage.local.set({
      [PROMPTS_KEY]: merged,
      [PROMPTS_VERSION_KEY]: CURRENT_PROMPTS_VERSION,
    });
    return merged;
  }
  return stored;
}

export async function savePrompts(prompts: CustomPrompt[]): Promise<void> {
  await chrome.storage.local.set({ [PROMPTS_KEY]: prompts });
}

export async function getActivePrompt(activePromptId: string): Promise<CustomPrompt> {
  const prompts = await getPrompts();
  return prompts.find((p) => p.id === activePromptId) ?? prompts[0] ?? DEFAULT_PROMPTS[0]!;
}

export async function getApiKey(): Promise<string> {
  const data = await chrome.storage.session.get(API_KEY_SESSION);
  return (data[API_KEY_SESSION] as string | undefined) ?? "";
}

export async function saveApiKey(key: string): Promise<void> {
  await chrome.storage.session.set({ [API_KEY_SESSION]: key });
}
