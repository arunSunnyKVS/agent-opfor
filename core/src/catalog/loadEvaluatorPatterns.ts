import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import { buildEvaluatorIndex, discoverPatternFiles } from "./discoverEvaluators.js";
import path from "node:path";

export interface EvaluatorPattern {
  name: string;
  template: string;
  judgeHint?: string;
}

export interface EvaluatorDoc {
  id: string;
  name: string;
  patterns: EvaluatorPattern[];
}

// Cached index
let evaluatorIndex: Map<string, { filePath: string; dirPath: string }> | null = null;

async function getIndex(): Promise<Map<string, { filePath: string; dirPath: string }>> {
  if (!evaluatorIndex) {
    evaluatorIndex = await buildEvaluatorIndex();
  }
  return evaluatorIndex;
}

export async function loadEvaluatorDoc(evaluatorId: string): Promise<EvaluatorDoc> {
  const index = await getIndex();
  const discovered = index.get(evaluatorId);

  if (!discovered) {
    throw new Error(`Evaluator "${evaluatorId}" not found`);
  }

  const raw = await readFile(discovered.filePath, "utf8");
  const doc = parseYaml(raw) as Record<string, unknown>;

  const id = typeof doc.id === "string" && doc.id.trim() ? doc.id.trim() : evaluatorId;
  const name = typeof doc.name === "string" ? doc.name : id;

  // Get patterns - inline or from patterns/ directory
  const patterns: EvaluatorPattern[] = [];

  // Check for inline patterns
  const patternsRaw = doc.patterns;
  if (Array.isArray(patternsRaw)) {
    for (const p of patternsRaw) {
      if (!p || typeof p !== "object") continue;
      const rec = p as Record<string, unknown>;
      const n = typeof rec.name === "string" ? rec.name : "";
      const t = typeof rec.template === "string" ? rec.template : "";
      const h = typeof rec.judge_hint === "string" ? rec.judge_hint : undefined;
      if (n && t) patterns.push({ name: n, template: t, judgeHint: h });
    }
  }

  // If no inline patterns, look in patterns/ directory
  if (patterns.length === 0) {
    const evaluatorDir = path.dirname(discovered.filePath);
    const patternFiles = await discoverPatternFiles(evaluatorDir);

    for (const pf of patternFiles) {
      try {
        const patternContent = await readFile(pf.filePath, "utf8");
        const patternDoc = parseYaml(patternContent) as Record<string, unknown>;
        const n = typeof patternDoc.name === "string" ? patternDoc.name.trim() : pf.name;
        const t = typeof patternDoc.template === "string" ? patternDoc.template.trim() : "";
        const h =
          typeof patternDoc.judge_hint === "string" ? patternDoc.judge_hint.trim() : undefined;
        if (t) patterns.push({ name: n, template: t, judgeHint: h });
      } catch {
        // Skip unparseable pattern files
      }
    }
  }

  return { id, name, patterns };
}

/** Clear cached index (for tests). */
export function clearPatternsCache(): void {
  evaluatorIndex = null;
}
