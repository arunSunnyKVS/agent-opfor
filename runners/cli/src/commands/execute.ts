import type { Command } from "commander";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { log } from "../../../../core/dist/lib/logger.js";
import { runAll } from "../../../../core/dist/execute/runAll.js";
import { writeReport } from "../../../../core/dist/report/buildReport.js";
import type { RunConfig, Effort } from "../../../../core/dist/execute/types.js";
import { DEFAULT_CONFIG_PATH } from "./setup.js";

export function registerExecuteCommand(program: Command): void {
  program
    .command("execute")
    .description(
      "Generate attacks and run them against the configured target (requires setup first)"
    )
    .option("--config <path>", "Path to opfor.config.json", DEFAULT_CONFIG_PATH)
    .option("--effort <level>", "Override effort level: medium | hard")
    .option("--turns <n>", "Override turns per attack (1 = single turn)")
    .option("--output <dir>", "Directory for HTML + JSON reports", ".")
    .option("--env <path>", "Path to .env file to load")
    .action(
      async (opts: {
        config: string;
        effort?: string;
        turns?: string;
        output: string;
        env?: string;
      }) => {
        if (opts.env) {
          const { config: loadDotenv } = await import("dotenv");
          loadDotenv({ path: path.resolve(opts.env) });
        }

        const configPath = path.resolve(opts.config);
        let runConfig: RunConfig;

        try {
          const raw = await readFile(configPath, "utf8");
          runConfig = JSON.parse(raw) as RunConfig;
        } catch {
          log.error(`Cannot read config at ${configPath}. Run \`opfor setup\` first.`);
          process.exitCode = 1;
          return;
        }

        // CLI overrides
        if (opts.effort) {
          const eff = opts.effort.trim().toLowerCase() as Effort;
          if (eff !== "medium" && eff !== "hard") {
            log.error("--effort must be 'medium' or 'hard'");
            process.exitCode = 1;
            return;
          }
          runConfig = { ...runConfig, effort: eff };
        }
        if (opts.turns) {
          const n = parseInt(opts.turns, 10);
          if (!Number.isFinite(n) || n < 1) {
            log.error("--turns must be a positive integer");
            process.exitCode = 1;
            return;
          }
          runConfig = { ...runConfig, turns: n };
        }

        log.info(`\nOpfor Execute`);
        log.info(`  Target : ${runConfig.target.name} (${runConfig.target.kind})`);
        log.info(`  Effort : ${runConfig.effort}`);
        log.info(`  Turns  : ${runConfig.turns}`);
        log.info(`  Attack : ${runConfig.attackLlm.provider}/${runConfig.attackLlm.model}`);
        if (runConfig.judgeLlm) {
          log.info(`  Judge  : ${runConfig.judgeLlm.provider}/${runConfig.judgeLlm.model}`);
        }
        log.info("");

        const report = await runAll(runConfig, {
          onProgress: (event) => {
            if (event.type === "evaluator_start") {
              log.info(`\n▶ ${event.evaluatorName}`);
            } else if (event.type === "attack_done") {
              const icon = event.verdict === "PASS" ? "✓" : event.verdict === "FAIL" ? "✗" : "⚠";
              process.stdout.write(` ${icon}`);
            }
          },
        });

        log.info("\n\nWriting report...");
        const outputDir = path.resolve(opts.output);
        const { html, json } = await writeReport(report, outputDir);

        const { summary } = report;
        log.info(
          `\nResults: ${summary.passed} passed, ${summary.failed} failed, ${summary.errors} errors`
        );
        log.info(`Safety score: ${summary.safetyScore}%`);
        log.success(`\nReport: ${html}`);
        log.info(`   JSON: ${json}`);

        if (summary.failed > 0) process.exitCode = 1;
      }
    );
}
