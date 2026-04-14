import type { BusinessProfile, ClientSnapshot, FaqEntry } from "../types/index.js";

function prefix(snapshot: ClientSnapshot): string {
  return snapshot.isReturning ? "Welcome back. " : "";
}

export function buildFaqReply(
  faq: FaqEntry,
  snapshot: ClientSnapshot,
  _profile: BusinessProfile,
  topicCount: number,
): string {
  const serviceContext = snapshot.lastServiceMention
    ? ` I still have ${snapshot.lastServiceMention} in mind from your earlier messages.`
    : "";
  const clarification =
    topicCount > 1
      ? " I answered the main part first, and you can send the other detail after this if needed."
      : "";

  return `${prefix(snapshot)}${faq.answer}${serviceContext}${faq.cta ? ` ${faq.cta}` : ""}${clarification}`.trim();
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
