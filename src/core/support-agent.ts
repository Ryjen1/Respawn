import type { MessageAdapter } from "../adapters/message-adapter.js";
import {
  containsEscalationKeyword,
  detectFaqIntent,
  isLikelyComplexRequest,
} from "./intent-detection.js";
import { buildClientSnapshot } from "./client-context.js";
import { buildFaqReply, buildOwnerEscalationNotice } from "./response-builder.js";
import { applyContractions, stablePick } from "./response-style.js";
import type { AgentDecision, BusinessProfile, IncomingMessage } from "../types/index.js";

function isApprovedSender(sender: string, profile: BusinessProfile): boolean {
  return profile.approvedSenders === "*" || profile.approvedSenders.includes(sender);
}

function isOwnerCommand(message: IncomingMessage, ownerTarget: string): boolean {
  return message.sender === ownerTarget || message.chatId === ownerTarget;
}

export class RespawnSupportAgent {
  private paused = false;
  private readonly recentlyProcessed = new Map<string, number>();

  constructor(
    private readonly adapter: MessageAdapter,
    private readonly profile: BusinessProfile,
  ) {}

  async start() {
    await this.adapter.startWatching({
      onDirectMessage: async (message) => {
        await this.handleIncoming(message);
      },
      onError: (error) => {
        console.error("[Respawn] watcher error", error);
      },
    });
  }

  async stop() {
    await this.adapter.stopWatching();
    await this.adapter.close();
  }

  async handleIncoming(message: IncomingMessage): Promise<AgentDecision> {
    if (message.isFromMe) {
      return { kind: "ignore", reason: "Ignored own message" };
    }

    // Watchers can replay messages on startup (lookback). Avoid double-processing.
    if (this.isDuplicate(message)) {
      return { kind: "ignore", reason: "Duplicate message ignored" };
    }

    if (isOwnerCommand(message, this.profile.ownerTarget)) {
      return this.handleOwnerCommand(message);
    }

    if (this.paused) {
      return { kind: "ignore", reason: "Respawn is paused" };
    }

    if (!isApprovedSender(message.sender, this.profile)) {
      if (this.profile.unknownSenderPolicy === "ignore") {
        return { kind: "ignore", reason: "Unknown sender ignored by policy" };
      }
      const key = message.guid || message.id;
      const reply = stablePick(key, [
        "Thanks for reaching out — I’ll have the owner reply shortly.",
        "Thanks for reaching out. I’ll get the owner to reply shortly.",
        "Thanks for reaching out. The owner will reply soon.",
      ]);
      await this.adapter.send(message.chatId, reply);
      return { kind: "faq", replyText: reply, reason: "Unknown sender brief reply" };
    }

    const decision = await this.decide(message);

    if (decision.replyText) {
      await this.adapter.send(message.chatId, decision.replyText);
    }

    if (decision.ownerAlert) {
      await this.adapter.send(this.profile.ownerTarget, decision.ownerAlert);
    }

    return decision;
  }

  private isDuplicate(message: IncomingMessage): boolean {
    const guid = message.guid || message.id;
    if (!guid) return false;

    const now = Date.now();
    const windowMs = 60_000;

    // GC old entries
    for (const [key, ts] of this.recentlyProcessed) {
      if (now - ts > windowMs) this.recentlyProcessed.delete(key);
    }

    const existing = this.recentlyProcessed.get(guid);
    if (existing && now - existing < windowMs) return true;

    this.recentlyProcessed.set(guid, now);
    if (this.recentlyProcessed.size > 500) {
      // Trim oldest to prevent unbounded growth.
      const sorted = [...this.recentlyProcessed.entries()].sort((a, b) => a[1] - b[1]);
      for (const [key] of sorted.slice(0, 200)) this.recentlyProcessed.delete(key);
    }
    return false;
  }

  private async decide(message: IncomingMessage): Promise<AgentDecision> {
    const history = await this.adapter.getMessages({
      chatId: message.chatId,
      limit: 10,
      excludeOwnMessages: false,
    });
    const snapshot = buildClientSnapshot(message, history, this.profile);
    const text = message.text?.trim() ?? "";
    const key = message.guid || message.id;

    if (message.attachments.length > 0) {
      return this.escalate(
        message,
        "Client sent an attachment",
        this.humanizeConfiguredReply(this.profile.handoffReply, snapshot.style),
      );
    }

    if (!text) {
      return this.escalate(
        message,
        "Empty or unsupported client message",
        this.humanizeConfiguredReply(this.profile.handoffReply, snapshot.style),
      );
    }

    if (containsEscalationKeyword(text, this.profile)) {
      return this.escalate(
        message,
        "Escalation keyword detected",
        this.humanizeConfiguredReply(this.profile.handoffReply, snapshot.style),
      );
    }

    if (isLikelyComplexRequest(text)) {
      return this.escalate(
        message,
        "Complex request detected",
        this.humanizeConfiguredReply(this.profile.handoffReply, snapshot.style),
      );
    }

    const intent = detectFaqIntent(text, this.profile);
    if (intent.faq && intent.confidence >= 0.24) {
      return {
        kind: "faq",
        replyText: buildFaqReply(intent.faq, snapshot, this.profile, intent.topicCount),
        reason: `FAQ match: ${intent.faq.id}`,
      };
    }

    if (text.length > 220) {
      return this.escalate(
        message,
        "Long ambiguous message needs human review",
        this.humanizeConfiguredReply(this.profile.handoffReply, snapshot.style),
      );
    }

    const fallback =
      snapshot.style.formality === "casual"
        ? stablePick(key, [
            "Quick one — is this about pricing, availability, booking, or delivery?",
            "Got you. Is this pricing, availability, booking, or delivery?",
            "Which one is it: pricing, availability, booking, or delivery?",
          ])
        : stablePick(key, [
            this.profile.fallbackReply,
            "Thanks for reaching out. Is this about pricing, availability, booking, or delivery?",
          ]);

    return {
      kind: "faq",
      replyText: snapshot.style.usesContractions ? applyContractions(fallback) : fallback,
      reason: "Fallback clarification",
    };
  }

  private async handleOwnerCommand(message: IncomingMessage): Promise<AgentDecision> {
    const text = (message.text ?? "").trim().toLowerCase();

    if (text === "pause respawn" || text === "pause") {
      this.paused = true;
      await this.adapter.send(message.chatId, "Respawn is paused. I will stop auto-replying until you resume.");
      return { kind: "faq", replyText: "Respawn is paused. I will stop auto-replying until you resume.", reason: "Owner paused agent" };
    }

    if (text === "resume respawn" || text === "resume") {
      this.paused = false;
      await this.adapter.send(message.chatId, "Respawn is live again.");
      return { kind: "faq", replyText: "Respawn is live again.", reason: "Owner resumed agent" };
    }

    if (text === "respawn status" || text === "status") {
      const statusReply = this.paused ? "Respawn is paused." : "Respawn is active.";
      await this.adapter.send(message.chatId, statusReply);
      return { kind: "faq", replyText: statusReply, reason: "Owner requested status" };
    }

    return { kind: "ignore", reason: "Owner message not treated as command" };
  }

  private humanizeConfiguredReply(text: string, style: { usesContractions: boolean }): string {
    return style.usesContractions ? applyContractions(text) : text;
  }

  private escalate(
    message: IncomingMessage,
    reason: string,
    clientReply: string,
  ): AgentDecision {
    return {
      kind: "escalate",
      replyText: clientReply,
      ownerAlert: buildOwnerEscalationNotice({
        businessName: this.profile.businessName,
        clientName: message.senderName ?? "Unknown client",
        clientTarget: message.sender,
        chatId: message.chatId,
        messageText: message.text ?? "",
        reason,
      }),
      reason,
    };
  }
}
