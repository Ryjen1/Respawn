import { MockMessageAdapter } from "./adapters/mock-adapter.js";
import { PhotonMessageAdapter } from "./adapters/photon-adapter.js";
import { businessProfile as profile } from "./config/load-profile.js";
import { RespawnSupportAgent } from "./core/support-agent.js";

function logBanner() {
  console.log(`Respawn for ${profile.businessName}`);
  console.log("Mode: mock demo");
  console.log("----------------------------------------");
}

async function runMockDemo() {
  const adapter = new MockMessageAdapter();
  const agent = new RespawnSupportAgent(adapter, profile);

  await agent.start();
  logBanner();

  await adapter.simulateIncoming({
    sender: "+2348000000001",
    senderName: "Ada",
    chatId: "iMessage;+2348000000001",
    text: "Hi, what is your price for a brand shoot?",
  });

  await adapter.simulateIncoming({
    sender: "+2348000000001",
    senderName: "Ada",
    chatId: "iMessage;+2348000000001",
    text: "Also do you cover Yaba in Lagos?",
  });

  await adapter.simulateIncoming({
    sender: "+2348000000002",
    senderName: "Tomi",
    chatId: "iMessage;+2348000000002",
    text: "Can you customize a package for a rush event tomorrow? It is urgent.",
  });

  const history = await adapter.getMessages({ excludeOwnMessages: false, limit: 50 });
  for (const message of history) {
    const author = message.isFromMe ? "Respawn" : message.senderName ?? message.sender;
    console.log(`[${message.chatId}] ${author}: ${message.text ?? "[attachment]"}`);
  }

  await agent.stop();
}

async function main() {
  const useMock = process.argv.includes("--mock") || !process.argv.includes("--photon");

  if (useMock) {
    await runMockDemo();
    return;
  }

  const adapter = new PhotonMessageAdapter();
  const agent = new RespawnSupportAgent(adapter, profile);
  await agent.start();
  console.log("Respawn is watching iMessage traffic through Photon.");
}

main().catch((error) => {
  console.error("[Respawn] fatal error", error);
  process.exitCode = 1;
});
