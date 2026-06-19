/**
 * Opfor SDK - Adversarial testing for AI systems
 *
 * @packageDocumentation
 */

// Class-based API
export { Opfor } from "./opfor.js";

// Functional API
export { execute } from "./execute.js";
export { auto } from "./auto.js";
export { report, type ReportBuilder } from "./report.js";
export { listSuites, listEvaluators } from "./catalog.js";

// Types
export type {
  // Execute options & results
  ExecuteOptions,
  ExecuteResults,
  ProgressEvent,

  // Target configuration
  TargetConfig,
  HttpTargetConfig,
  LocalScriptTargetConfig,
  McpTargetConfig,

  // Model configuration
  ModelConfig,
  ModelSpec,

  // Strategy
  StrategyConfig,

  // Results
  Finding,
  AttackResult,
  EvaluatorResult,

  // Opfor class
  OpforOptions,

  // Catalog
  SuiteInfo,
  EvaluatorInfo,
  ListEvaluatorsOptions,

  // Autonomous mode
  AutoOptions,
  AutoTargetConfig,
  AutoModelsConfig,
  AutoLimitsConfig,
  AutoResults,
  AutoFinding,
  AutoTurn,
  AutoProgressEvent,

  // Re-exports from core
  TelemetryConfig,
  LlmConfig,
  ProviderName,
  Effort,
} from "./types.js";
