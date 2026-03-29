import { extractPostPayload } from "./extractors/postExtractor";
import { extractProfilePayload } from "./extractors/profileExtractor";
import type { ExtractedPayload, PageType } from "../shared/types";

function detectPageType(url: string): PageType {
  if (!url.includes("linkedin.com")) {
    return "unsupported";
  }
  if (/linkedin\.com\/(feed\/update|posts\/|pulse\/)/.test(url)) {
    return "post";
  }
  if (/linkedin\.com\/in\//.test(url)) {
    return "profile";
  }

  // Fallback for LinkedIn SPA routes that don't expose stable URL patterns.
  if (document.querySelector(".feed-shared-update-v2")) {
    return "post";
  }
  if (document.querySelector(".pv-top-card") || document.querySelector("main section h1")) {
    return "profile";
  }
  return "unsupported";
}

function extractByType(pageType: PageType): ExtractedPayload | null {
  if (pageType === "post") {
    return extractPostPayload();
  }
  if (pageType === "profile") {
    return extractProfilePayload();
  }
  return null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "EXTRACT_LINKEDIN_CONTENT") {
    return;
  }

  const detectedPageType = detectPageType(window.location.href);
  const preferredType = message?.preferredType as PageType | undefined;
  const pageType =
    preferredType && preferredType !== "unsupported" ? preferredType : detectedPageType;

  if (!window.location.href.includes("linkedin.com")) {
    sendResponse({
      error:
        "Bu sayfa desteklenmiyor. LinkedIn post veya profil sayfasında tekrar dene.",
    });
    return;
  }

  if (pageType === "unsupported") {
    sendResponse({
      error:
        "Bu sayfa desteklenmiyor. LinkedIn post veya profil sayfasında tekrar dene.",
    });
    return;
  }

  const payload = extractByType(pageType);
  if (!payload) {
    sendResponse({
      error:
        `Secilen '${pageType}' modunda icerik okunamadi. LinkedIn arayuzu degismis olabilir, sayfayi yenileyip tekrar dene.`,
    });
    return;
  }

  sendResponse({ payload });
});
