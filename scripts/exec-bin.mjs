import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function findBin(binName) {
  const candidates = [
    path.resolve(process.cwd(), "node_modules", ".bin", binName),
    path.resolve(process.cwd(), "..", "node_modules", ".bin", binName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function main() {
  const [binName, ...args] = process.argv.slice(2);
  if (!binName) {
    console.error("Usage: node scripts/exec-bin.mjs <bin> [...args]");
    process.exitCode = 2;
    return;
  }

  const binPath = findBin(binName);
  if (!binPath) {
    console.error(`Missing executable: ${binName}`);
    console.error("Fix:");
    console.error("- Run `pnpm install` in this folder, or");
    console.error("- Run `pnpm install` at the repo root (so ../node_modules exists), or");
    console.error("- Use a writable pnpm store: `pnpm install --store-dir /tmp/pnpm-store`");
    process.exitCode = 127;
    return;
  }

  const child = spawn(binPath, args, { stdio: "inherit" });
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}

main();

