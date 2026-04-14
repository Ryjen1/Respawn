import type {
  IncomingMessage,
  MessageQueryFilter,
  MessageSendResult,
  OutgoingMessageContent,
  WatchHandlers,
} from "../types/index.js";
import type { MessageAdapter } from "./message-adapter.js";

function importPhoton(): Promise<any> {
  // Avoid a hard dependency on macOS-only modules during build/test on other platforms.
  // This keeps `pnpm run demo` working without installing Photon.
  // eslint-disable-next-line no-new-func
  return new Function('return import("@photon-ai/imessage-kit")')() as Promise<any>;
}

function mapMessage(message: IncomingMessage): IncomingMessage {
  return {
    ...message,
    date: new Date(message.date),
  };
}

export class PhotonMessageAdapter implements MessageAdapter {
  private sdk: any | null = null;

  private async getSdk() {
    if (this.sdk) return this.sdk;

    if (process.platform !== "darwin") {
      throw new Error(
        "Photon iMessage Kit requires macOS (Messages database access). Run Respawn in --mock mode on non-macOS, or test Photon mode on a Mac.",
      );
    }

    const photon = await importPhoton();
    this.sdk = new photon.IMessageSDK({
      debug: true,
      watcher: {
        pollInterval: 3000,
        unreadOnly: false,
        excludeOwnMessages: true,
        initialLookbackMs: 10000,
      },
    });
    return this.sdk;
  }

  private toPhotonMessageFilter(filter?: MessageQueryFilter): any | undefined {
    if (!filter) return undefined;
    const out: any = {};
    if (filter.limit != null) out.limit = filter.limit;
    if (filter.unreadOnly != null) out.unreadOnly = filter.unreadOnly;
    if (filter.sender) out.sender = filter.sender;
    if (filter.chatId) out.chatId = filter.chatId;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  async getMessages(filter?: MessageQueryFilter): Promise<IncomingMessage[]> {
    const sdk = await this.getSdk();
    const result = await sdk.getMessages(this.toPhotonMessageFilter(filter));
    const messages = Array.isArray(result) ? result : (result?.messages ?? []);
    return (messages as IncomingMessage[]).map((message) => mapMessage(message));
  }

  async send(target: string, content: OutgoingMessageContent): Promise<MessageSendResult> {
    const sdk = await this.getSdk();
    return sdk.send(target, content) as Promise<MessageSendResult>;
  }

  async startWatching(handlers: WatchHandlers): Promise<void> {
    const sdk = await this.getSdk();
    await sdk.startWatching({
      onMessage: handlers.onMessage,
      onDirectMessage: handlers.onDirectMessage,
      onGroupMessage: handlers.onGroupMessage,
      onError: handlers.onError,
    });
  }

  async stopWatching(): Promise<void> {
    const sdk = await this.getSdk();
    sdk.stopWatching();
  }

  async close(): Promise<void> {
    if (this.sdk) {
      await this.sdk.close();
      this.sdk = null;
    }
  }
}
