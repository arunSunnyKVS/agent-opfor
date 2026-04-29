import { z } from "zod";

/** One step in a multi-turn attack chain. */
export const AttackStepSchema = z.object({
  toolName: z.string().min(1),
  toolArguments: z.record(z.string(), z.any()).default({}),
  /** Optional delay in milliseconds to wait before executing this step. */
  delayMs: z.number().int().nonnegative().optional(),
});

export type AttackStep = z.infer<typeof AttackStepSchema>;

/** One concrete red-team attempt against the MCP surface (LLM-generated, validated). */
export const AttackScenarioSchema = z.object({
  id: z.string().min(1),
  evaluatorId: z.string().min(1),
  patternName: z.string().nullish().transform((v) => v ?? undefined),
  summary: z.string().min(1),
  /** Single-step: tool the harness should try to drive (backward-compat). */
  suggestedToolName: z.string().nullish().transform((v) => v ?? undefined),
  suggestedToolArguments: z.record(z.string(), z.any()).nullish().transform((v) => v ?? undefined),
  /** Multi-step chain. If present, takes priority over suggestedToolName/Arguments. */
  steps: z.array(AttackStepSchema).optional(),
});

export const AttackPlanSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  transport: z.enum(["stdio", "url"]),
  suiteId: z.string(),
  serverSummary: z.string(),
  toolsDigest: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      inputSchema: z.record(z.string(), z.any()).optional(),
    })
  ),
  attacks: z.array(AttackScenarioSchema),
});

export type AttackPlan = z.infer<typeof AttackPlanSchema>;
export type AttackScenario = z.infer<typeof AttackScenarioSchema>;

/** Extra replay hints attached when writing the plan (not LLM-generated). */
export type AttackReplayHints = {
  stdio?: { toolsListLine: string; toolsCallLine?: string };
  http?: { toolsListCurl: string; toolsCallCurl?: string };
};

export type AttackScenarioWithReplay = AttackScenario & { replay: AttackReplayHints };

export type AttackPlanWritten = Omit<AttackPlan, "attacks"> & {
  attacks: AttackScenarioWithReplay[];
};
