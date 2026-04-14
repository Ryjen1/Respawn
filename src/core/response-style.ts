import type { IncomingMessage, ResponseStyle } from "../types/index.js";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasAny(lower: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => lower.includes(phrase));
}

export function inferResponseStyle(messages: readonly IncomingMessage[]): ResponseStyle {
  const ownerSamples = messages
    .filter((message) => message.isFromMe && typeof message.text === "string" && message.text.trim().length > 0)
    .slice(-6);

  const sample = ownerSamples.length > 0
    ? ownerSamples
    : messages
        .filter((message) => typeof message.text === "string" && message.text.trim().length > 0)
        .slice(-6);

  const joined = sample.map((message) => message.text ?? "").join(" ");
  const lower = joined.toLowerCase();

  const formalMarkers = ["regards", "sincerely", "dear ", "kindly", "please find"];
  const casualMarkers = [
    "hey",
    "yo",
    "yep",
    "nah",
    "lol",
    "gonna",
    "wanna",
    "no worries",
    "gotcha",
    "sure thing",
  ];

  const usesContractions =
    /(\bi['’]m\b|\bi['’]ll\b|\bi['’]ve\b|\bcan['’]t\b|\bdon['’]t\b|\bwon['’]t\b)/i.test(joined) ||
    hasAny(lower, ["gonna", "wanna", "gotcha", "no worries"]);

  const usesExclamation = joined.includes("!");
  const usesGreeting = hasAny(lower, ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]);

  let formality: ResponseStyle["formality"] = "neutral";
  if (hasAny(lower, formalMarkers)) formality = "formal";
  else if (hasAny(lower, casualMarkers)) formality = "casual";

  const lengths = sample.map((message) => (message.text ?? "").trim().length);
  const avgLen = average(lengths);

  let brevity: ResponseStyle["brevity"] = "medium";
  if (avgLen > 0 && avgLen < 70) brevity = "short";
  else if (avgLen >= 160) brevity = "long";

  return {
    formality,
    brevity,
    usesContractions,
    usesExclamation,
    usesGreeting,
  };
}

export function applyContractions(text: string): string {
  return text
    .replace(/\bI will\b/g, "I'll")
    .replace(/\bI have\b/g, "I've")
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bdo not\b/gi, "don't")
    .replace(/\bcan not\b/gi, "can't")
    .replace(/\bwill not\b/gi, "won't");
}

export function stablePick(key: string, options: readonly string[]): string {
  if (options.length === 0) return "";
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const idx = Math.abs(hash) % options.length;
  return options[idx]!;
}

