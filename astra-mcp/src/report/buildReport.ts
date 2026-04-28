import { randomUUID } from "node:crypto";
import type { AttackRunResult, EvaluatorRunSummary, RunReport } from "../run/types.js";
import type { AttackPlanWritten } from "../attacks/planSchema.js";
import type { ModelConfig } from "../config/schema.js";

function modelLabel(model: ModelConfig): string {
  return `${model.provider}/${model.model}`;
}

export function buildReport(args: {
  plan: AttackPlanWritten;
  results: AttackRunResult[];
  runModel: ModelConfig;
}): RunReport {
  const { plan, results, runModel } = args;

  // Group results by evaluatorId
  const byEvaluator = new Map<string, AttackRunResult[]>();
  for (const r of results) {
    const existing = byEvaluator.get(r.evaluatorId) ?? [];
    existing.push(r);
    byEvaluator.set(r.evaluatorId, existing);
  }

  // Pull evaluator metadata from the plan's attacks (it's the only source available here)
  const evaluatorIds = [...new Set(plan.attacks.map((a) => a.evaluatorId))];

  const evaluators: EvaluatorRunSummary[] = evaluatorIds.map((id) => {
    const evalResults = byEvaluator.get(id) ?? [];
    const passed = evalResults.filter((r) => r.judge.verdict === "PASS").length;
    const failed = evalResults.length - passed;
    return {
      evaluatorId: id,
      evaluatorName: id,
      owasp: "",
      severity: "",
      total: evalResults.length,
      passed,
      failed,
      passRate: evalResults.length > 0 ? Math.round((passed / evalResults.length) * 100) : 0,
      results: evalResults,
    };
  });

  const total = results.length;
  const passed = results.filter((r) => r.judge.verdict === "PASS").length;
  const failed = total - passed;

  return {
    schemaVersion: 1,
    reportId: `astra-mcp-${randomUUID().slice(0, 8)}`,
    generatedAt: new Date().toISOString(),
    suiteId: plan.suiteId,
    serverSummary: plan.serverSummary,
    transport: plan.transport,
    judgeModel: modelLabel(runModel),
    summary: {
      total,
      passed,
      failed,
      safetyScore: total > 0 ? Math.round((passed / total) * 100) : 0,
      attackSuccessRate: total > 0 ? Math.round((failed / total) * 100) : 0,
    },
    evaluators,
  };
}

/** Merge evaluator metadata (name, owasp, severity) into an already-built report. */
export function enrichReportWithCriteria(
  report: RunReport,
  criteriaMap: Map<string, { name: string; owasp: string; severity: string }>
): RunReport {
  return {
    ...report,
    evaluators: report.evaluators.map((e) => {
      const meta = criteriaMap.get(e.evaluatorId);
      return meta
        ? { ...e, evaluatorName: meta.name, owasp: meta.owasp, severity: meta.severity }
        : e;
    }),
  };
}
