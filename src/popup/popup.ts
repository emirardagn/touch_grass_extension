import { applyI18n, t } from "../shared/i18n";
import { getSettings } from "../shared/storage";
import type { ExtractedPayload, Lang, ProfileSection, RuntimeResponse } from "../shared/types";

type ManualType = "post" | "profile";

const pickPostBtn = document.getElementById("pickPost") as HTMLButtonElement;
const pickProfileBtn = document.getElementById("pickProfile") as HTMLButtonElement;
const extractBtn = document.getElementById("extractBtn") as HTMLButtonElement;
const confirmBtn = document.getElementById("confirmBtn") as HTMLButtonElement;
const backBtn = document.getElementById("backBtn") as HTMLButtonElement;
const step1 = document.getElementById("step1") as HTMLDivElement;
const step2 = document.getElementById("step2") as HTMLDivElement;
const previewNode = document.getElementById("preview") as HTMLDivElement;
const sectionsWrap = document.getElementById("sectionsWrap") as HTMLDivElement;
const sectionListNode = document.getElementById("sectionList") as HTMLDivElement;
const sectionDropdown = document.getElementById("sectionDropdown") as HTMLSelectElement;
const sectionTextNode = document.getElementById("sectionText") as HTMLDivElement;
const resultNode = document.getElementById("result") as HTMLDivElement;
const stepBadge = document.getElementById("stepBadge") as HTMLSpanElement;
const openOptionsBtn = document.getElementById("openOptions") as HTMLButtonElement;
const statusNode = document.getElementById("status") as HTMLDivElement;

let lang: Lang = "tr";
let selectedType: ManualType | null = null;
let extractedPayload: ExtractedPayload | null = null;
let selectedSectionIds = new Set<string>();
let filteredSections: ProfileSection[] = [];

function setStatus(next: string): void {
  statusNode.textContent = next;
}

function setResult(next: string): void {
  resultNode.textContent = next;
}

function setPreview(next: string): void {
  previewNode.textContent = next;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function sendToTab<T>(tabId: number, message: unknown): Promise<T> {
  return (await chrome.tabs.sendMessage(tabId, message)) as T;
}

async function sendToBackground<T>(message: unknown): Promise<T> {
  return (await chrome.runtime.sendMessage(message)) as T;
}

function setStep(step: 1 | 2): void {
  if (step === 1) {
    step1.classList.remove("hidden");
    step2.classList.add("hidden");
    stepBadge.textContent = t(lang, "step1Badge");
    return;
  }
  step1.classList.add("hidden");
  step2.classList.remove("hidden");
  stepBadge.textContent = t(lang, "step2Badge");
}

function updateSelectionUI(): void {
  pickPostBtn.classList.toggle("active", selectedType === "post");
  pickProfileBtn.classList.toggle("active", selectedType === "profile");
  extractBtn.disabled = selectedType === null;
}

function renderSectionPicker(sections: ProfileSection[]): void {
  sectionListNode.innerHTML = "";
  sectionsWrap.classList.remove("hidden");
  filteredSections = sections.filter((s) => s.text.trim().length > 0);
  selectedSectionIds = new Set(filteredSections.map((s) => s.id));

  sectionDropdown.innerHTML = "";
  filteredSections.forEach((section) => {
    const opt = document.createElement("option");
    opt.value = section.id;
    opt.textContent = `${section.label} — ${section.componentKey}`;
    sectionDropdown.appendChild(opt);
  });
  if (filteredSections[0]) {
    sectionDropdown.value = filteredSections[0].id;
    sectionTextNode.textContent = filteredSections[0].text;
  }

  sectionDropdown.onchange = () => {
    const found = filteredSections.find((s) => s.id === sectionDropdown.value);
    sectionTextNode.textContent = found?.text ?? "";
  };

  filteredSections.forEach((section) => {
    const row = document.createElement("label");
    row.className = "sectionItem";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.dataset.sectionId = section.id;
    cb.addEventListener("change", () => {
      if (cb.checked) {
        selectedSectionIds.add(section.id);
      } else {
        selectedSectionIds.delete(section.id);
      }
    });
    const info = document.createElement("div");
    info.innerHTML = `<div>${section.label}</div><div class="sectionMeta">${section.componentKey}</div>`;
    row.append(cb, info);
    sectionListNode.appendChild(row);
  });
}

function hideSectionPicker(): void {
  sectionsWrap.classList.add("hidden");
  sectionListNode.innerHTML = "";
  sectionDropdown.innerHTML = "";
  sectionTextNode.textContent = "";
  selectedSectionIds = new Set<string>();
  filteredSections = [];
}

function renderPayloadPreview(payload: ExtractedPayload): string {
  if (payload.sections?.length) {
    return `${payload.title}\n${payload.sections.length} ${t(lang, "foundSections")}`;
  }
  return [`Type: ${payload.pageType}`, `Title: ${payload.title}`, "", payload.body].join("\n");
}

async function extractForSelectedType(): Promise<void> {
  setStatus(t(lang, "statusChecking"));
  setPreview(t(lang, "statusExtracting"));
  setResult(t(lang, "noSummary"));

  const activeTab = await getActiveTab();
  const tabId = activeTab?.id ?? null;
  if (!activeTab || !tabId) {
    setStatus(t(lang, "statusNoTab"));
    return;
  }
  if (!activeTab.url?.includes("linkedin.com")) {
    setStatus(t(lang, "statusUnsupported"));
    setPreview(t(lang, "onlyLinkedIn"));
    return;
  }
  if (!selectedType) {
    setStatus(t(lang, "selectPostOrProfile"));
    return;
  }

  const extraction = (await sendToTab<{ payload?: ExtractedPayload; error?: string }>(tabId, {
    type: "EXTRACT_LINKEDIN_CONTENT",
    preferredType: selectedType,
  })) ?? { error: "No response from content script." };

  if (extraction.error || !extraction.payload) {
    setStatus(t(lang, "cannotExtract"));
    setPreview(extraction.error ?? t(lang, "cannotExtract"));
    return;
  }

  extractedPayload = extraction.payload;
  setPreview(renderPayloadPreview(extractedPayload));
  if (extractedPayload.pageType === "profile" && extractedPayload.sections?.length) {
    renderSectionPicker(extractedPayload.sections);
  } else {
    hideSectionPicker();
  }
  setStatus(t(lang, "statusReview"));
  setStep(2);
}

async function summarizeConfirmedPayload(): Promise<void> {
  if (!extractedPayload) {
    setStatus(t(lang, "noExtracted"));
    return;
  }
  setStatus(t(lang, "statusSummarizing"));
  setResult(t(lang, "working"));

  let payloadToSend = extractedPayload;
  if (extractedPayload.pageType === "profile" && extractedPayload.sections?.length) {
    const selected = extractedPayload.sections
      .filter((s) => s.text.trim().length > 0)
      .filter((s) => selectedSectionIds.has(s.id));
    if (!selected.length) {
      setStatus(t(lang, "selectSection"));
      setResult(t(lang, "noSectionSelected"));
      return;
    }
    payloadToSend = {
      ...extractedPayload,
      sections: selected,
      body: selected.map((s) => `${s.label} (${s.componentKey})\n${s.text}`).join("\n\n"),
    };
  }

  const result = await sendToBackground<RuntimeResponse>({
    type: "SUMMARIZE_PAYLOAD",
    payload: payloadToSend,
  });

  if ("error" in result) {
    setStatus(t(lang, "statusFailed"));
    setResult(result.hint ? `${result.error}\n\nHint: ${result.hint}` : result.error);
    return;
  }

  setStatus(
    result.tokensUsed ? `${t(lang, "done")} Tokens: ${result.tokensUsed}` : t(lang, "done")
  );
  setResult(result.summary);
}

pickPostBtn.addEventListener("click", () => {
  selectedType = "post";
  updateSelectionUI();
});

pickProfileBtn.addEventListener("click", () => {
  selectedType = "profile";
  updateSelectionUI();
});

extractBtn.addEventListener("click", () => {
  extractForSelectedType().catch((err) => {
    setStatus(t(lang, "statusFailed"));
    setPreview(err instanceof Error ? err.message : String(err));
  });
});

confirmBtn.addEventListener("click", () => {
  summarizeConfirmedPayload().catch((err) => {
    setStatus(t(lang, "statusFailed"));
    setResult(err instanceof Error ? err.message : String(err));
  });
});

backBtn.addEventListener("click", () => {
  setStep(1);
  setStatus(t(lang, "statusIdle"));
});

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function init(): Promise<void> {
  const settings = await getSettings();
  lang = settings.uiLanguage;
  applyI18n(lang);
  resultNode.textContent = t(lang, "noSummary");
  updateSelectionUI();
}

init().catch(console.error);
