import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { buildEvaluatorIndex } from "./discoverEvaluators.js";
import type { EvaluatorCriteria } from "../run/judge.js";
import { resolveStandardsFromFrontmatter } from "../evaluators/standards.js";

// Cached index
let evaluatorIndex: Map<string, { filePath: string }> | null = null;

async function getIndex(): Promise<Map<string, { filePath: string }>> {
  if (!evaluatorIndex) {
    evaluatorIndex = await buildEvaluatorIndex();
  }
  return evaluatorIndex;
}

export async function loadEvaluatorCriteria(evaluatorId: string): Promise<EvaluatorCriteria> {
  const index = await getIndex();
  const discovered = index.get(evaluatorId);

  if (!discovered) {
    throw new Error(`Evaluator "${evaluatorId}" not found`);
  }

  const raw = await readFile(discovered.filePath, "utf8");
  const doc = parseYaml(raw) as Record<string, unknown>;
  const standards = resolveStandardsFromFrontmatter(doc);

  return {
    id: typeof doc.id === "string" ? doc.id : evaluatorId,
    name: typeof doc.name === "string" ? doc.name : evaluatorId,
    ...(standards ? { standards } : {}),
    severity: typeof doc.severity === "string" ? doc.severity : "high",
    passCriteria: typeof doc.pass_criteria === "string" ? doc.pass_criteria : "",
    failCriteria: typeof doc.fail_criteria === "string" ? doc.fail_criteria : "",
    judgeInstructions:
      typeof doc.judge_instructions === "string" ? doc.judge_instructions : undefined,
  };
}

/** Clear cached index (for tests). */
export function clearCriteriaCache(): void {
  evaluatorIndex = null;
}
