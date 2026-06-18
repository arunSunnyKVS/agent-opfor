/**
 * Ensures every evaluator YAML file loads via parseEvaluator.
 *
 * - Patterns: required (inline or in patterns/ directory), unless strategy: mcp-scanner
 * - ID uniqueness: globally unique across both categories
 * - ID-filename match: relaxed (warning only, not failure)
 *
 * Run: npm test --workspace=core
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { discoverEvaluatorFiles } from "../src/catalog/discoverEvaluators.js";
import { parseEvaluator, clearEvaluatorIndexCache } from "../src/evaluators/parseEvaluator.js";

// Track all IDs for uniqueness check
const seenIds = new Map<string, string>(); // id -> filePath

async function assertAllEvaluatorsParse(category: "agent" | "mcp"): Promise<void> {
  const discovered = await discoverEvaluatorFiles(category);
  assert.ok(discovered.length > 0, `expected evaluators in ${category}`);

  for (const d of discovered) {
    const spec = await parseEvaluator(d.filePath);

    // ID must be non-empty
    assert.ok(spec.id.length > 0, `${d.filePath}: id is required`);

    // Check ID uniqueness
    const existingPath = seenIds.get(spec.id);
    if (existingPath) {
      assert.fail(`Duplicate id "${spec.id}" in ${d.filePath} (also in ${existingPath})`);
    }
    seenIds.set(spec.id, d.filePath);

    // Patterns required unless mcp-scanner strategy
    if (spec.strategy !== "mcp-scanner") {
      assert.ok(spec.patterns.length > 0, `${d.filePath}: must have patterns`);
      for (const p of spec.patterns) {
        assert.ok(p.name.length > 0, `${d.filePath}: pattern name required`);
        assert.ok(p.template.length > 0, `${d.filePath}: pattern template required`);
      }
    }

    // ID-filename match is a warning, not a failure
    const dirName = path.basename(d.dirPath);
    if (spec.id !== dirName) {
      console.warn(`[warn] ${d.filePath}: id "${spec.id}" does not match directory "${dirName}"`);
    }
  }
}

test("agent evaluators parse via parseEvaluator", async () => {
  clearEvaluatorIndexCache();
  seenIds.clear();
  await assertAllEvaluatorsParse("agent");
});

test("mcp evaluators parse via parseEvaluator", async () => {
  // Don't clear seenIds - check uniqueness across both categories
  await assertAllEvaluatorsParse("mcp");
});
