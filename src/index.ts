#!/usr/bin/env node

import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { Command } from "commander";
import { registerSetupCommand } from "./commands/setup.js";
import { registerGenerateCommand } from "./commands/generate.js";
import { registerRunCommand } from "./commands/run.js";

loadDotenv();

function readVersion(): string {
  const pkgUrl = new URL("../package.json", import.meta.url);
  const pkg = JSON.parse(readFileSync(pkgUrl, "utf8")) as { version?: string };
  return pkg.version ?? "0.0.0";
}

const program = new Command();

program
  .name("astra")
  .description("Astra — security testing for MCP servers and AI agents")
  .version(readVersion(), "-v, --version", "Print version");

registerSetupCommand(program);
registerGenerateCommand(program);
registerRunCommand(program);

async function main(): Promise<void> {
  await program.parseAsync(process.argv);
}

/** True when this file is the entrypoint (`dist/index.js`) or `tsx src/index.ts`. */
function shouldRunCli(): boolean {
  const thisFile = fileURLToPath(import.meta.url);
  const entry = process.argv[1];
  const entry2 = process.argv[2];
  if (entry && path.resolve(entry) === thisFile) return true;
  // tsx: `tsx src/index.ts` puts the script at argv[2]
  if (entry2 && path.resolve(entry2) === thisFile) return true;
  return false;
}

if (shouldRunCli()) {
  main().catch((err: unknown) => {
    const message =
      err instanceof Error ? err.stack || err.message : String(err);
    console.error(message);
    process.exitCode = 1;
  });
}
