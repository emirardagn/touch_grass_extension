import { applyI18n, t } from "../shared/i18n";
import { getApiKey, getPrompts, getSettings, saveApiKey, savePrompts, saveSettings } from "../shared/storage";
import type { CustomPrompt, Lang, Settings } from "../shared/types";

// Tab elements
const tabBtns = document.querySelectorAll<HTMLButtonElement>(".tab");
const panels = document.querySelectorAll<HTMLElement>(".panel");

// General panel
const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
const toggleKeyBtn = document.getElementById("toggleKey") as HTMLButtonElement;
const modelInput = document.getElementById("model") as HTMLSelectElement;
const maxTokensInput = document.getElementById("maxTokens") as HTMLInputElement;
const uiLanguageInput = document.getElementById("uiLanguage") as HTMLSelectElement;
const responseLanguageInput = document.getElementById("responseLanguage") as HTMLSelectElement;
const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
const saveStatus = document.getElementById("saveStatus") as HTMLSpanElement;

// Prompts panel
const promptsListNode = document.getElementById("promptsList") as HTMLDivElement;
const addPromptBtn = document.getElementById("addPromptBtn") as HTMLButtonElement;
const promptEditor = document.getElementById("promptEditor") as HTMLDivElement;
const promptNameInput = document.getElementById("promptName") as HTMLInputElement;
const promptTextArea = document.getElementById("promptText") as HTMLTextAreaElement;
const savePromptBtn = document.getElementById("savePromptBtn") as HTMLButtonElement;
const cancelPromptBtn = document.getElementById("cancelPromptBtn") as HTMLButtonElement;

let currentLang: Lang = "tr";
let currentSettings: Settings | null = null;
let currentPrompts: CustomPrompt[] = [];
let editingPromptId: string | null = null;

// Tab switching
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    panels.forEach((p) => p.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.tab ?? "general"}`)?.classList.remove("hidden");
  });
});

// API key toggle
toggleKeyBtn.addEventListener("click", () => {
  const isHidden = apiKeyInput.type === "password";
  apiKeyInput.type = isHidden ? "text" : "password";
  toggleKeyBtn.textContent = t(currentLang, isHidden ? "toggleHide" : "toggleShow");
});

// Live UI language switch (applies immediately without saving)
uiLanguageInput.addEventListener("change", () => {
  currentLang = uiLanguageInput.value as Lang;
  applyI18n(currentLang);
  // Restore toggle button text since applyI18n will reset it
  const isHidden = apiKeyInput.type === "password";
  toggleKeyBtn.textContent = t(currentLang, isHidden ? "toggleShow" : "toggleHide");
  // Re-render prompts list with new language
  if (currentSettings) {
    renderPromptsList(currentPrompts, currentSettings.activePromptId);
  }
});

// Save general settings
saveBtn.addEventListener("click", async () => {
  const tokens = Number(maxTokensInput.value || "220");
  const settings: Settings = {
    model: modelInput.value,
    maxTokens: Number.isFinite(tokens) ? Math.max(80, Math.min(800, tokens)) : 220,
    uiLanguage: uiLanguageInput.value as Lang,
    responseLanguage: responseLanguageInput.value as Lang,
    activePromptId: currentSettings?.activePromptId ?? "spicy-roast",
  };
  await Promise.all([saveSettings(settings), saveApiKey(apiKeyInput.value.trim())]);
  currentSettings = settings;
  saveStatus.textContent = t(currentLang, "saved");
  setTimeout(() => {
    saveStatus.textContent = "";
  }, 2200);
});

// Prompts rendering
function renderPromptsList(prompts: CustomPrompt[], activePromptId: string): void {
  promptsListNode.innerHTML = "";
  prompts.forEach((prompt) => {
    const row = document.createElement("div");
    row.className = "prompt-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "activePrompt";
    radio.value = prompt.id;
    radio.checked = prompt.id === activePromptId;
    radio.addEventListener("change", async () => {
      if (currentSettings) {
        currentSettings = { ...currentSettings, activePromptId: prompt.id };
        await saveSettings(currentSettings);
      }
    });

    const info = document.createElement("div");
    info.className = "prompt-info";
    const nameEl = document.createElement("span");
    nameEl.className = "prompt-name";
    nameEl.textContent = prompt.nameKey ? t(currentLang, prompt.nameKey) : prompt.name;
    info.appendChild(nameEl);
    if (prompt.isDefault) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = t(currentLang, "defaultBadge");
      info.appendChild(badge);
    }

    const actions = document.createElement("div");
    actions.className = "prompt-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-xs";
    editBtn.textContent = t(currentLang, "editBtn");
    editBtn.addEventListener("click", () => openEditor(prompt));
    actions.appendChild(editBtn);

    if (!prompt.isDefault) {
      const delBtn = document.createElement("button");
      delBtn.className = "btn-xs btn-danger-xs";
      delBtn.textContent = t(currentLang, "deleteBtn");
      delBtn.addEventListener("click", async () => {
        const updated = prompts.filter((p) => p.id !== prompt.id);
        if (updated.length === 0) return;
        await savePrompts(updated);
        currentPrompts = updated;
        if (currentSettings?.activePromptId === prompt.id) {
          const fallbackId = updated[0]?.id ?? "spicy-roast";
          currentSettings = { ...currentSettings, activePromptId: fallbackId };
          await saveSettings(currentSettings);
        }
        renderPromptsList(updated, currentSettings?.activePromptId ?? "spicy-roast");
      });
      actions.appendChild(delBtn);
    }

    row.append(radio, info, actions);
    promptsListNode.appendChild(row);
  });
}

function openEditor(prompt?: CustomPrompt): void {
  editingPromptId = prompt?.id ?? null;
  promptNameInput.value = prompt?.name ?? "";
  promptTextArea.value = prompt?.systemPrompt ?? "";
  promptEditor.classList.remove("hidden");
  promptNameInput.focus();
}

function closeEditor(): void {
  editingPromptId = null;
  promptNameInput.value = "";
  promptTextArea.value = "";
  promptEditor.classList.add("hidden");
}

addPromptBtn.addEventListener("click", () => openEditor());
cancelPromptBtn.addEventListener("click", closeEditor);

savePromptBtn.addEventListener("click", async () => {
  const name = promptNameInput.value.trim();
  const systemPrompt = promptTextArea.value.trim();
  if (!name || !systemPrompt) return;

  let updated: CustomPrompt[];
  if (editingPromptId) {
    updated = currentPrompts.map((p) =>
      p.id === editingPromptId ? { ...p, name, systemPrompt } : p
    );
  } else {
    const newPrompt: CustomPrompt = {
      id: `custom-${Date.now()}`,
      name,
      systemPrompt,
    };
    updated = [...currentPrompts, newPrompt];
  }

  await savePrompts(updated);
  currentPrompts = updated;
  renderPromptsList(updated, currentSettings?.activePromptId ?? "spicy-roast");
  closeEditor();
});

async function init(): Promise<void> {
  const [settings, prompts, apiKey] = await Promise.all([getSettings(), getPrompts(), getApiKey()]);
  currentSettings = settings;
  currentPrompts = prompts;
  currentLang = settings.uiLanguage;

  applyI18n(currentLang);

  apiKeyInput.value = apiKey;
  modelInput.value = settings.model;
  maxTokensInput.value = String(settings.maxTokens);
  uiLanguageInput.value = settings.uiLanguage;
  responseLanguageInput.value = settings.responseLanguage;

  renderPromptsList(prompts, settings.activePromptId);
}

init().catch(console.error);
