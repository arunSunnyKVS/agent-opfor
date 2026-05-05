#!/usr/bin/env node

// Load `.env` from cwd (and defaults per dotenv) so GROQ_API_KEY, LANGFUSE_*, etc.
// work without exporting in the shell. Matches unified `astra` CLI behaviour.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
loadDotenv();

import type { Command } from "commander";
import { Command as Commander } from "commander";
import { registerSetupCommand } from "./commands/setup.js";
import { registerRunCommand } from "./commands/run.js";
import { registerInitCommand } from "./commands/init.js";
import { buildEmptyAgentSetupConfig, collectAgentSetupConfigInteractive } from "./wizard/unifiedSetupWizard.js";
import { generateAgentAttacksFromConfig } from "./commands/setup.js";
import { runAgentAttacksFromFile } from "./commands/run.js";

/** Registers legacy `init`, `setup`, and `run` on the given Commander program. */
export function registerAgentCli(program: Command): void {
  registerInitCommand(program);
  registerSetupCommand(program);
  registerRunCommand(program);
}

export { buildEmptyAgentSetupConfig, collectAgentSetupConfigInteractive };
export { generateAgentAttacksFromConfig, runAgentAttacksFromFile };

function buildProgram(): Command {
  const program = new Commander();

  program
    .name("astra")
    .description("Astra CLI — AI security scanner")
    .version("0.1.0");

  registerAgentCli(program);

  return program;
}

async function main(argv: string[]): Promise<void> {
  const program = buildProgram();
  await program.parseAsync(argv);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main(process.argv).catch((err: unknown) => {
    const message =
      err instanceof Error ? err.stack || err.message : String(err);
    console.error(message);
    process.exitCode = 1;
  });
}
