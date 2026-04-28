import { z } from "zod";

export const JudgeResultSchema = z.object({
  verdict: z.enum(["PASS", "FAIL"]),
  score: z.number().min(0).max(10),
  confidence: z.number().min(0).max(100),
  evidence: z.string(),
  reasoning: z.string(),
});

export type JudgeResult = z.infer<typeof JudgeResultSchema>;

export interface AttackExecutionResult {
  attackId: string;
  evaluatorId: string;
  toolName: string;
  toolArguments: Record<string, unknown>;
  /** Raw JSON-stringified result returned by the MCP tool call. */
  rawToolResponse: string;
  /** Error message if the tool call itself threw (not a security finding). */
  toolError?: string;
}

export interface AttackRunResult extends AttackExecutionResult {
  judge: JudgeResult;
}

export interface EvaluatorRunSummary {
  evaluatorId: string;
  evaluatorName: string;
  owasp: string;
  severity: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: AttackRunResult[];
}

export interface RunReport {
  schemaVersion: 1;
  reportId: string;
  generatedAt: string;
  suiteId: string;
  serverSummary: string;
  transport: "stdio" | "url";
  judgeModel: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    safetyScore: number;
    attackSuccessRate: number;
  };
  evaluators: EvaluatorRunSummary[];
}
