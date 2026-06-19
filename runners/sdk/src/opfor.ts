import { execute } from "./execute.js";
import { report, type ReportBuilder } from "./report.js";
import type {
  OpforOptions,
  ExecuteOptions,
  ExecuteResults,
  AutoOptions,
  AutoResults,
} from "./types.js";

/**
 * Opfor SDK client class.
 *
 * Provides a stateful wrapper around the functional API for convenience.
 *
 * @example
 * ```typescript
 * const opfor = new Opfor({ apiKey: process.env.ANTHROPIC_API_KEY });
 *
 * const results = await opfor.execute({
 *   target: { url: "https://api.example.com/chat" },
 *   suite: "owasp-llm-top10",
 * });
 *
 * await opfor.report(results).html("./report.html");
 * ```
 */
export class Opfor {
  private readonly options: OpforOptions;

  constructor(options: OpforOptions = {}) {
    this.options = options;

    if (options.apiKey) {
      process.env.ANTHROPIC_API_KEY = options.apiKey;
    }
  }

  /**
   * Execute adversarial tests against a target.
   */
  async execute(options: Omit<ExecuteOptions, "apiKey">): Promise<ExecuteResults> {
    const fullOptions: ExecuteOptions = {
      ...options,
      apiKey: this.options.apiKey,
      attackerModel: options.attackerModel ?? this.options.attackerModel,
      judgeModel: options.judgeModel ?? this.options.judgeModel,
    };

    return execute(fullOptions);
  }

  /**
   * Run autonomous red-team testing against a target.
   *
   * Unlike `execute()` which runs predefined evaluators, `auto()` uses an
   * AI agent to autonomously discover and exploit vulnerabilities.
   *
   * @example
   * ```typescript
   * const results = await opfor.auto({
   *   target: { url: "https://api.example.com/chat" },
   *   objective: "Find jailbreaks and data leaks",
   *   limits: { budgetUsd: 5 },
   * });
   * ```
   */
  async auto(options: AutoOptions): Promise<AutoResults> {
    // Lazy import to avoid loading @anthropic-ai/claude-agent-sdk unless needed
    const { auto } = await import("./auto.js");
    return auto(options);
  }

  /**
   * Generate reports from execution results.
   */
  report(results: ExecuteResults): ReportBuilder {
    return report(results);
  }
}
