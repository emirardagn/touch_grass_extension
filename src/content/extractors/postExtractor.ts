import type { ExtractedPayload } from "../../shared/types";

function textFromSelectors(selectors: string[]): string {
  for (const selector of selectors) {
    const node = document.querySelector<HTMLElement>(selector);
    const text = node?.innerText?.trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function longestTextFromSelectors(selectors: string[]): string {
  let winner = "";
  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const node of nodes) {
      const text = node.innerText?.trim() ?? "";
      if (text.length > winner.length) {
        winner = text;
      }
    }
  }
  return winner;
}

function textFromLtrSpans(): string {
  const spans = Array.from(document.querySelectorAll<HTMLSpanElement>("span[dir='ltr']"));
  const picked: string[] = [];

  for (const span of spans) {
    const text = span.innerText?.trim() ?? "";
    if (text.length > 0) {
      picked.push(text);
      if (picked.length === 2) {
        return picked.join("\n");
      }
    }
  }
  return picked.join("\n");
}

function fallbackPostFromMain(): string {
  const main = document.querySelector("main");
  if (!main) {
    return "";
  }

  const candidates = Array.from(
    main.querySelectorAll<HTMLElement>("article, div[role='article'], .feed-shared-update-v2")
  );
  let best = "";
  for (const candidate of candidates) {
    const text = candidate.innerText?.trim() ?? "";
    if (text.length > best.length) {
      best = text;
    }
  }
  return best;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 6000);
}

export function extractPostPayload(): ExtractedPayload | null {
  const body = textFromLtrSpans() || longestTextFromSelectors([
    ".feed-shared-update-v2__description-wrapper",
    ".update-components-text",
    '[data-test-id="main-feed-activity-card"] .update-components-text',
    '[data-urn*="activity"] .update-components-text',
    "div[role='article'] .update-components-text",
    "article .update-components-text",
    "article .break-words",
    "div[role='article'] .break-words",
  ]) || fallbackPostFromMain();

  if (!body) {
    return null;
  }

  const author = textFromSelectors([
    ".update-components-actor__name",
    ".feed-shared-actor__name",
    "article a[aria-label] span[aria-hidden='true']",
  ]);

  return {
    pageType: "post",
    url: window.location.href,
    title: author ? `Post by ${author}` : "LinkedIn Post",
    body: normalize(body),
    metadata: author ? { author } : undefined,
  };
}
