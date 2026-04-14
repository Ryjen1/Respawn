import type { BusinessProfile, ClientSnapshot, FaqEntry } from "../types/index.js";
import { applyContractions, stablePick } from "./response-style.js";

function prefix(snapshot: ClientSnapshot): string {
  if (!snapshot.isReturning) return "";

  const key = snapshot.priorMessages.at(-1)?.guid ?? snapshot.priorMessages.at(-1)?.id ?? "returning";
  if (snapshot.style.formality === "formal") return "Welcome back. ";
  if (snapshot.style.formality === "casual") {
    return stablePick(key, ["Hey again. ", "Good to hear from you again. ", "Hey — welcome back. "]);
  }
  return stablePick(key, ["Welcome back. ", "Good to have you back. ", "Nice to hear from you again. "]);
}

export function buildFaqReply(
  faq: FaqEntry,
  snapshot: ClientSnapshot,
  _profile: BusinessProfile,
  topicCount: number,
): string {
  const key = snapshot.priorMessages.at(-1)?.guid ?? snapshot.priorMessages.at(-1)?.id ?? faq.id;

  const serviceContext =
    snapshot.style.brevity === "short"
      ? ""
      : snapshot.lastServiceMention
    ? ` I still have ${snapshot.lastServiceMention} in mind from your earlier messages.`
    : "";
  const clarification =
    snapshot.style.brevity === "short"
      ? ""
      : topicCount > 1
      ? " I answered the main part first, and you can send the other detail after this if needed."
      : "";

  const softener =
    snapshot.style.formality === "casual"
      ? stablePick(key, ["", "", "Sure thing. ", "Got you. "])
      : snapshot.style.formality === "formal"
        ? stablePick(key, ["", "", "Certainly. "])
        : stablePick(key, ["", "", "Of course. "]);

  const base = `${softener}${prefix(snapshot)}${faq.answer}${serviceContext}${faq.cta ? ` ${faq.cta}` : ""}${clarification}`.trim();
  return snapshot.style.usesContractions ? applyContractions(base) : base;
}

export function buildOwnerEscalationNotice(args: {
  businessName: string;
  clientName: string;
  clientTarget: string;
  chatId: string;
  messageText: string;
  reason: string;
}): string {
  return [
    `[Respawn handoff] ${args.businessName}`,
    `Client: ${args.clientName} (${args.clientTarget})`,
    `Chat: ${args.chatId}`,
    `Reason: ${args.reason}`,
    `Message: ${args.messageText || "[non-text message]"}`,
  ].join("\n");
}
