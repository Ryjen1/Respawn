# Respawn

Respawn is a 24/7 iMessage support agent for solo businesses. It answers repeated client questions instantly, hands complex cases to the owner, and keeps routine support from eating the day.

## What is in this folder

- `src/core/support-agent.ts`: routing logic for FAQ replies, escalation, and owner commands
- `src/config/business-profile.json`: editable business FAQ and policy config
- `src/adapters/mock-adapter.ts`: local demo transport that works without macOS
- `src/adapters/photon-adapter.ts`: Photon-backed adapter shaped around the public `IMessageSDK` API
- `src/index.ts`: boot entrypoint for mock mode now and Photon mode later

## Test status

- Includes a built-in mock demo and REPL for local iteration (`pnpm run demo`, `pnpm run repl`).
- The macOS transport layer is implemented against Photon iMessage Kit's public `IMessageSDK` surface and is ready to run on a Mac with Messages + the required permissions.

## How the real integration maps to Photon

Respawn is built around Photon methods documented in the public README:

- `startWatching({ onDirectMessage, onMessage, onError })`
- `getMessages(filter?)`
- `send(target, content)`
- `stopWatching()`
- `close()`

Photon source:

- https://github.com/photon-hq/imessage-kit

## Editing the fake business

If you do not have a real business yet, keep using the demo profile and swap the content later:

- business name
- owner target
- services
- FAQ answers
- escalation keywords

All of that lives in `src/config/business-profile.json`.

## Running the mock demo

From the repo root:

```bash
pnpm exec tsx respawn/src/index.ts --mock
```

Portable alternative:

```bash
cd respawn
pnpm install
pnpm run demo
```

## Interactive local "chat" test (no Mac needed)

This is a simple REPL that simulates incoming iMessages and shows Respawn's replies plus any owner handoff DM.

```bash
cd respawn
pnpm install
pnpm run repl
```

## Running on a Mac later

1. Install dependencies inside `respawn/`
2. Sign into Messages on macOS
3. Grant Full Disk Access to the terminal or IDE
4. If Node install has SQLite issues, install Xcode Command Line Tools or use Bun
5. Replace `ownerTarget` in `business-profile.json` with your real iMessage target
6. Run the Photon mode entrypoint

Node (macOS):

```bash
cd respawn
pnpm install
pnpm run build
node dist/index.js --photon
```

Bun (macOS):

```bash
cd respawn
bun install
bun run src/index.ts --photon
```

## macOS verification checklist

- Start Respawn in Photon mode: `node dist/index.js --photon`
- Text the Mac's iMessage account from another device:
  - Ask a clear FAQ ("price?", "availability?") and confirm an instant reply
  - Send an urgent/custom request and confirm:
    - client receives the holding reply
    - owner receives the handoff DM with context
- Test owner commands from the owner thread:
  - `pause respawn`, confirm no more auto-replies
  - `resume respawn`, confirm auto-replies return

## Current MVP behavior

- answers common FAQ topics like price, availability, booking, delivery, and refunds
- adapts reply tone and brevity from recent thread history (so it reads less like a bot)
- escalates urgent, long, complex, or attachment-heavy messages
- sends the owner a structured private handoff note
- supports owner commands like `pause respawn`, `resume respawn`, and `status`
