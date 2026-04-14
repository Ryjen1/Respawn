import type { BusinessProfile, ClientSnapshot, IncomingMessage } from "../types/index.js";

function inferLastServiceMention(
  messages: readonly IncomingMessage[],
  profile: BusinessProfile,
): string | null {
  const haystack = messages
    .filter((message) => !message.isFromMe)
    .map((message) => message.text ?? "")
    .join(" ")
    .toLowerCase();

  const match = profile.services.find((service) =>
    haystack.includes(service.name.toLowerCase()),
  );
  return match?.name ?? null;
}

export function buildClientSnapshot(
  currentMessage: IncomingMessage,
  history: readonly IncomingMessage[],
  profile: BusinessProfile,
): ClientSnapshot {
  const priorMessages = history.filter(
    (message) => message.chatId === currentMessage.chatId && message.id !== currentMessage.id,
  );

  return {
    isReturning: priorMessages.length > 0,
    lastServiceMention: inferLastServiceMention(priorMessages, profile),
    priorMessages,
  };
}
