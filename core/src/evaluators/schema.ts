/**
 * Evaluator/Suite YAML contract (Zod).
 * Used by runtime parseEvaluator and validation scripts.
 */
import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const SurfaceSchema = z.enum(["agent", "browser", "mcp"]);

export const TurnModeSchema = z.enum(["single", "multi"]);

/** Registered engine strategies for evaluators that need more than static patterns. */
export const StrategySchema = z.enum([
  "declarative-patterns",
  "adaptive-multi-turn",
  "mcp-scanner",
]);

export const PatternSchema = z.object({
  name: z.string().min(1),
  template: z.string().min(1),
  judge_hint: z.string().optional(),
});

export const StandardsRecordSchema = z.record(z.string().min(1), z.string().min(1));

export type StandardsMap = Record<string, string>;

export const EvaluatorFrontmatterSchema = z
  .object({
    schema_version: z.number().optional(),
    id: z.string().min(1),
    name: z.string().min(1),
    severity: SeveritySchema,
    standards: StandardsRecordSchema.optional(),
    pass_criteria: z.string().min(1),
    fail_criteria: z.string().min(1),
    description: z.string().optional(),
    // Patterns optional - can come from patterns/ directory for directory-form
    patterns: z.array(PatternSchema).optional(),
    judge_hint: z.string().optional(),
    // Also allow camelCase judgeHint variant
    judgeHint: z.string().optional(),
    surfaces: z.array(SurfaceSchema).optional(),
    turn_mode: TurnModeSchema.optional(),
    strategy: StrategySchema.optional(),
    // New fields from restructure
    types: z.array(z.string()).optional(),
    scan_mode: z.enum(["source_code", "tool_description"]).optional(),
    applies_to_all_tools: z.boolean().optional(),
    metric_threshold: z.number().optional(),
    untestable_reason: z.string().optional(),
    // Dependency chain for multi-phase evaluators
    depends_on: z.union([z.string(), z.array(z.string())]).optional(),
    // MCP-specific fields
    mcp_top_10: z.string().optional(),
    judge_needs_llm: z.boolean().optional(),
  })
  .strict(); // Strict mode - unknown keys error instead of being ignored

export type EvaluatorFrontmatter = z.infer<typeof EvaluatorFrontmatterSchema>;

export const SuiteFrontmatterSchema = z
  .object({
    id: z.string().min(1),
    evaluators: z.array(z.string().min(1)).min(1),
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

export type SuiteFrontmatter = z.infer<typeof SuiteFrontmatterSchema>;
