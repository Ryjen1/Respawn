export type MessageService = "iMessage" | "SMS" | "RCS";

export interface Attachment {
  filename?: string | null;
  mimeType?: string | null;
  path?: string | null;
}

export interface IncomingMessage {
  id: string;
  guid: string;
  text: string | null;
  sender: string;
  senderName: string | null;
  chatId: string;
  isGroupChat: boolean;
  isFromMe: boolean;
  isRead: boolean;
  service: MessageService;
  attachments: readonly Attachment[];
  date: Date;
}

export type OutgoingMessageContent =
  | string
  | {
      text?: string;
      images?: string[];
      files?: string[];
    };

export interface MessageQueryFilter {
  sender?: string;
  chatId?: string;
  limit?: number;
  unreadOnly?: boolean;
  excludeOwnMessages?: boolean;
}

export interface MessageSendResult {
  sentAt: Date;
  message?: IncomingMessage;
}

export interface WatchHandlers {
  onMessage?: (message: IncomingMessage) => void | Promise<void>;
  onDirectMessage?: (message: IncomingMessage) => void | Promise<void>;
  onGroupMessage?: (message: IncomingMessage) => void | Promise<void>;
  onError?: (error: Error) => void;
}

export interface ServiceOffering {
  name: string;
  startingPrice: string;
  duration?: string;
}

export interface FaqEntry {
  id: string;
  label: string;
  keywords: string[];
  answer: string;
  cta?: string;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  ownerTarget: string;
  approvedSenders: string[] | "*";
  unknownSenderPolicy: "reply-briefly" | "ignore";
  handoffReply: string;
  fallbackReply: string;
  escalationKeywords: string[];
  services: ServiceOffering[];
  faqs: FaqEntry[];
}

export interface ClientSnapshot {
  isReturning: boolean;
  lastServiceMention: string | null;
  priorMessages: IncomingMessage[];
  style: ResponseStyle;
}

export interface ResponseStyle {
  formality: "casual" | "neutral" | "formal";
  brevity: "short" | "medium" | "long";
  usesContractions: boolean;
  usesExclamation: boolean;
  usesGreeting: boolean;
}

export interface IntentMatch {
  faq: FaqEntry | null;
  confidence: number;
  topicCount: number;
  keywordHits: string[];
}

export interface AgentDecision {
  kind: "faq" | "escalate" | "ignore";
  replyText?: string;
  ownerAlert?: string;
  reason: string;
}
