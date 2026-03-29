import type { ExtractedPayload, ProfileSection } from "../../shared/types";

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

function findComponentKeyFromSection(section: HTMLElement): string {
  const html = section.outerHTML;
  const match = html.match(/com\.linkedin\.sdui\.profile\.card[^\s"'<>]*/);
  return match?.[0] ?? "";
}

function collectProfileCardSections(): ProfileSection[] {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
  const results: ProfileSection[] = [];

  sections.forEach((section, index) => {
    const componentKey = findComponentKeyFromSection(section);
    if (!componentKey.startsWith("com.linkedin.sdui.profile.card")) {
      return;
    }

    const text = section.innerText?.replace(/\s+/g, " ").trim() ?? "";
    if (text.length < 40) {
      return;
    }

    results.push({
      id: `section-${index + 1}`,
      label: `Section ${results.length + 1}`,
      componentKey,
      text,
    });
  });

  return results;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 7000);
}

export function extractProfilePayload(): ExtractedPayload | null {
  const name = textFromSelectors(["h1", ".pv-text-details__left-panel h1"]);
  const profileSections = collectProfileCardSections();
  const stitched = profileSections
    .map((section) => `${section.label} (${section.componentKey})\n${section.text}`)
    .join("\n\n");

  if (!stitched) {
    return null;
  }

  return {
    pageType: "profile",
    url: window.location.href,
    title: name ? `${name}'s LinkedIn Profile` : "LinkedIn Profile",
    body: normalize(stitched),
    sections: profileSections,
    metadata: name ? { name } : undefined,
  };
}
