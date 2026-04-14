import type { BusinessProfile, ClientSnapshot, FaqEntry } from "../types/index.js";
import { applyContractions, looksRepeated, pickVariant } from "./response-style.js";

function prefix(snapshot: ClientSnapshot): string {
  if (!snapshot.isReturning) return "";

  const key = snapshot.priorMessages.at(-1)?.guid ?? snapshot.priorMessages.at(-1)?.id ?? "returning";
  if (snapshot.style.formality === "formal") {
    return pickVariant(key, ["Welcome back. ", "Welcome back - happy to help. ", "Good to hear from you again. "], snapshot.priorMessages);
  }
  if (snapshot.style.formality === "casual") {
    return pickVariant(
      key,
      ["Hey again. ", "Good to hear from you again. ", "Hey, welcome back. ", ""],
      snapshot.priorMessages,
    );
  }
  return pickVariant(
    key,
    ["Welcome back. ", "Good to have you back. ", "Nice to hear from you again. ", ""],
    snapshot.priorMessages,
  );
}

export function buildFaqReply(
  faq: FaqEntry,
  snapshot: ClientSnapshot,
  _profile: BusinessProfile,
  topicCount: number,
): string {
  const key = snapshot.priorMessages.at(-1)?.guid ?? snapshot.priorMessages.at(-1)?.id ?? faq.id;

  const alreadyAnswered = looksRepeated(snapshot.priorMessages, faq.answer);

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

  const softenerBase =
    snapshot.style.formality === "casual"
      ? ["", "", "Sure thing. ", "Got you. ", "Yep. ", "No problem. "]
      : snapshot.style.formality === "formal"
        ? ["", "", "Certainly. ", "Of course. "]
        : ["", "", "Of course. ", "Happy to help. "];

  const softener = pickVariant(key, softenerBase, snapshot.priorMessages);

  if (alreadyAnswered) {
    const lead = pickVariant(
      key,
      snapshot.style.formality === "casual"
        ? ["Still the same: ", "Yep - ", "Same as earlier: ", ""]
        : ["Still the same: ", "As mentioned earlier, ", ""],
      snapshot.priorMessages,
    );
    const repeat = `${lead}${faq.answer}${faq.cta && snapshot.style.brevity !== "short" ? ` ${faq.cta}` : ""}`.trim();
    return snapshot.style.usesContractions ? applyContractions(repeat) : repeat;
  }

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
