import type { BusinessProfile, IntentMatch } from "../types/index.js";

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\w\s]/g, " ");
}

export function detectFaqIntent(text: string, profile: BusinessProfile): IntentMatch {
  const normalized = normalize(text);
  const ranked = profile.faqs
    .map((faq) => {
      const keywordHits = faq.keywords.filter((keyword) =>
        normalized.includes(keyword.toLowerCase()),
      );
      const confidence = Math.min(0.95, keywordHits.length * 0.24 + (faq.label === "Booking" && normalized.includes("book") ? 0.12 : 0));
      return { faq, confidence, keywordHits };
    })
    .filter((entry) => entry.keywordHits.length > 0)
    .sort((left, right) => right.confidence - left.confidence);

  if (ranked.length === 0) {
    return {
      faq: null,
      confidence: 0,
      topicCount: 0,
      keywordHits: [],
    };
  }

  return {
    faq: ranked[0]?.faq ?? null,
    confidence: ranked[0]?.confidence ?? 0,
    topicCount: ranked.length,
    keywordHits: ranked.flatMap((entry) => entry.keywordHits),
  };
}

export function containsEscalationKeyword(text: string, profile: BusinessProfile): boolean {
  const normalized = normalize(text);
  return profile.escalationKeywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function isLikelyComplexRequest(text: string): boolean {
  const normalized = normalize(text);
  return (
    normalized.length > 420 ||
    normalized.includes("can you customize") ||
    normalized.includes("custom package") ||
    normalized.includes("something different") ||
    normalized.includes("need help with my order") ||
    normalized.includes("not happy")
  );
}
