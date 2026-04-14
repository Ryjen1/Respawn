import type {
  IncomingMessage,
  MessageQueryFilter,
  MessageSendResult,
  OutgoingMessageContent,
  WatchHandlers,
} from "../types/index.js";

export interface MessageAdapter {
  getMessages(filter?: MessageQueryFilter): Promise<IncomingMessage[]>;
  send(target: string, content: OutgoingMessageContent): Promise<MessageSendResult>;
  startWatching(handlers: WatchHandlers): Promise<void>;
  stopWatching(): Promise<void>;
  close(): Promise<void>;
}
