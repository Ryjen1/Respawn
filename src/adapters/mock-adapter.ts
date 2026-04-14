import type {
  IncomingMessage,
  MessageQueryFilter,
  MessageSendResult,
  OutgoingMessageContent,
  WatchHandlers,
} from "../types/index.js";
import type { MessageAdapter } from "./message-adapter.js";

function makeGuid() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toText(content: OutgoingMessageContent): string {
  if (typeof content === "string") return content;
  return content.text ?? "[non-text message]";
}

export class MockMessageAdapter implements MessageAdapter {
  constructor(
    private readonly options?: {
      onOutgoing?: (message: IncomingMessage) => void;
    },
  ) {}

  private handlers: WatchHandlers = {};
  private readonly history: IncomingMessage[] = [];

  async getMessages(filter?: MessageQueryFilter): Promise<IncomingMessage[]> {
    const limit = filter?.limit ?? 20;
    return this.history
      .filter((message) => {
        if (filter?.sender && message.sender !== filter.sender) return false;
        if (filter?.chatId && message.chatId !== filter.chatId) return false;
        if (filter?.excludeOwnMessages && message.isFromMe) return false;
        if (filter?.unreadOnly && message.isRead) return false;
        return true;
      })
      .slice(-limit);
  }

  async send(target: string, content: OutgoingMessageContent): Promise<MessageSendResult> {
    const message: IncomingMessage = {
      id: makeGuid(),
      guid: makeGuid(),
      text: toText(content),
      sender: "owner@respawn.local",
      senderName: "Respawn",
      chatId: target,
      isGroupChat: target.startsWith("chat"),
      isFromMe: true,
      isRead: true,
      service: "iMessage",
      attachments: [],
      date: new Date(),
    };

    this.history.push(message);
    this.options?.onOutgoing?.(message);
    return { sentAt: message.date, message };
  }

  async startWatching(handlers: WatchHandlers): Promise<void> {
    this.handlers = handlers;
  }

  async stopWatching(): Promise<void> {
    this.handlers = {};
  }

  async close(): Promise<void> {
    this.handlers = {};
  }

  async simulateIncoming(
    partial: Pick<IncomingMessage, "sender" | "chatId"> &
      Partial<Omit<IncomingMessage, "sender" | "chatId">>,
  ): Promise<void> {
    const message: IncomingMessage = {
      id: partial.id ?? makeGuid(),
      guid: partial.guid ?? makeGuid(),
      text: partial.text ?? null,
      sender: partial.sender,
      senderName: partial.senderName ?? null,
      chatId: partial.chatId,
      isGroupChat: partial.isGroupChat ?? false,
      isFromMe: partial.isFromMe ?? false,
      isRead: partial.isRead ?? false,
      service: partial.service ?? "iMessage",
      attachments: partial.attachments ?? [],
      date: partial.date ?? new Date(),
    };

    this.history.push(message);
    await this.handlers.onMessage?.(message);
    if (message.isGroupChat) {
      await this.handlers.onGroupMessage?.(message);
    } else {
      await this.handlers.onDirectMessage?.(message);
    }
  }
}
