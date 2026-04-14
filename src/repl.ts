import readline from "node:readline";
import { MockMessageAdapter } from "./adapters/mock-adapter.js";
import { businessProfile as profile } from "./config/load-profile.js";
import { RespawnSupportAgent } from "./core/support-agent.js";

type Session = {
  sender: string;
  senderName: string;
  chatId: string;
};

function help() {
  console.log("Respawn REPL");
  console.log("Commands:");
  console.log("  /from <phone>         Set the simulated sender number");
  console.log("  /name <display name>  Set the simulated sender name");
  console.log("  /chat <target>        Set the chatId (default iMessage;<phone>)");
  console.log("  /owner                Switch sender to ownerTarget (tests pause/resume/status)");
  console.log("  /help                 Show help");
  console.log("  /quit                 Exit");
  console.log("");
  console.log("Type any message to simulate an incoming client iMessage.");
  console.log("");
}

function ensureChatId(session: Session) {
  if (!session.chatId || session.chatId.trim().length === 0) {
    session.chatId = `iMessage;${session.sender}`;
  }
}

async function main() {
  const session: Session = {
    sender: "+2348000000001",
    senderName: "Client",
    chatId: "iMessage;+2348000000001",
  };

  console.log(`Respawn for ${profile.businessName}`);
  console.log(`Owner target: ${profile.ownerTarget}`);
  console.log(`Sender: ${session.sender} (${session.senderName})`);
  console.log(`Chat: ${session.chatId}`);
  console.log("");
  help();

  let isClosing = false;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 100,
  });

  const adapter = new MockMessageAdapter({
    onOutgoing: (message) => {
      if (isClosing) return;
      const label = message.chatId === profile.ownerTarget ? "Owner DM" : "Client";
      console.log(`\n[Respawn -> ${label}] ${message.text ?? "[non-text]"}`);
      try {
        rl.prompt();
      } catch {
        // ignore prompt errors after close
      }
    },
  });
  const agent = new RespawnSupportAgent(adapter, profile);
  await agent.start();

  rl.setPrompt("> ");
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      if (!isClosing) rl.prompt();
      return;
    }

    try {
      if (input === "/quit" || input === "/exit") {
        isClosing = true;
        rl.close();
        return;
      }

      if (input === "/help") {
        help();
        if (!isClosing) rl.prompt();
        return;
      }

      if (input.startsWith("/from ")) {
        session.sender = input.slice("/from ".length).trim();
        ensureChatId(session);
        console.log(`Sender set to ${session.sender}`);
        if (!isClosing) rl.prompt();
        return;
      }

      if (input.startsWith("/name ")) {
        session.senderName = input.slice("/name ".length).trim();
        console.log(`Sender name set to ${session.senderName}`);
        if (!isClosing) rl.prompt();
        return;
      }

      if (input.startsWith("/chat ")) {
        session.chatId = input.slice("/chat ".length).trim();
        console.log(`Chat set to ${session.chatId}`);
        if (!isClosing) rl.prompt();
        return;
      }

      if (input === "/owner") {
        session.sender = profile.ownerTarget;
        session.senderName = profile.ownerName;
        session.chatId = profile.ownerTarget;
        console.log("Switched to owner context. Try: pause respawn, resume respawn, status");
        if (!isClosing) rl.prompt();
        return;
      }

      await adapter.simulateIncoming({
        sender: session.sender,
        senderName: session.senderName,
        chatId: session.chatId,
        text: input,
      });

      if (!isClosing) rl.prompt();
    } catch (error) {
      console.error("[repl error]", error);
      if (!isClosing) rl.prompt();
    }
  });

  rl.on("close", async () => {
    isClosing = true;
    await agent.stop();
    process.exitCode = 0;
  });
}

main().catch((error) => {
  console.error("[Respawn repl] fatal error", error);
  process.exitCode = 1;
});
