/**
 * Sync root evaluators/suites into skills ... opfor-setup/_generated for skill installs
 * (npx skills add) that cannot read repo-root paths.
 *
 *   npm run sync:skills-evaluators          # write mirrors
 *   npm run sync:skills-evaluators -- --check   # exit 1 if mirrors are stale
 */

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GENERATED_DIRNAME,
  getEvaluatorsDir,
  getGeneratedEvaluatorsDir,
  getGeneratedSuitesDir,
  getSuitesDir,
  type EvaluatorCategory,
} from "../core/src/config/evaluatorsLayout.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CHECK_ONLY = process.argv.includes("--check");

const CATEGORIES: EvaluatorCategory[] = ["agent", "mcp"];

const GENERATED_README = `# Generated evaluator mirror

Do **not** edit files here. Author changes under repo root:

- \`evaluators/\${"{category}"}/\`
- \`suites/\${"{category}"}/\`

Then run:

\`\`\`bash
npm run sync:skills-evaluators
\`\`\`
`;

/**
 * Recursively list all files in a directory.
 */
async function listAllFiles(dir: string, baseDir?: string): Promise<string[]> {
  const base = baseDir ?? dir;
  const files: string[] = [];

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      files.push(...(await listAllFiles(fullPath, base)));
    } else {
      files.push(path.relative(base, fullPath));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Sync an entire directory tree (recursively).
 */
async function syncDirTree(
  srcDir: string,
  destDir: string,
  label: string
): Promise<{ written: number; stale: string[] }> {
  const stale: string[] = [];
  let written = 0;

  // Get all files from source
  const srcFiles = await listAllFiles(srcDir);
  const destFiles = new Set(await listAllFiles(destDir));

  for (const relPath of srcFiles) {
    const srcPath = path.join(srcDir, relPath);
    const destPath = path.join(destDir, relPath);
    const content = await readFile(srcPath, "utf8");

    let needsWrite = true;
    if (destFiles.has(relPath)) {
      try {
        const existing = await readFile(destPath, "utf8");
        if (hashContent(existing) === hashContent(content)) {
          needsWrite = false;
        } else {
          stale.push(path.relative(REPO_ROOT, destPath));
        }
      } catch {
        stale.push(path.relative(REPO_ROOT, destPath));
      }
    } else {
      stale.push(path.relative(REPO_ROOT, destPath));
    }

    if (!CHECK_ONLY && needsWrite) {
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, content, "utf8");
      written++;
    }
    destFiles.delete(relPath);
  }

  // Remove orphan files in destination
  for (const orphan of destFiles) {
    const orphanPath = path.join(destDir, orphan);
    stale.push(path.relative(REPO_ROOT, orphanPath));
    if (!CHECK_ONLY) {
      await rm(orphanPath, { force: true });
    }
  }

  if (!CHECK_ONLY) {
    console.log(
      `  ${label}: ${srcFiles.length} file(s) → ${path.relative(REPO_ROOT, destDir)} (${written} updated)`
    );
  }

  return { written, stale };
}

async function syncCategory(category: EvaluatorCategory): Promise<string[]> {
  const stale: string[] = [];
  const genRoot = path.join(
    REPO_ROOT,
    "skills",
    `${category === "mcp" ? "mcp" : "agent"}-redteaming`,
    "opfor-setup",
    GENERATED_DIRNAME
  );

  if (!CHECK_ONLY) {
    await mkdir(genRoot, { recursive: true });
    const readme = GENERATED_README.replace(/\{category\}/g, category);
    await writeFile(path.join(genRoot, "README.md"), readme, "utf8");
  }

  const ev = await syncDirTree(
    getEvaluatorsDir(category),
    getGeneratedEvaluatorsDir(category),
    `${category} evaluators`
  );
  const su = await syncDirTree(
    getSuitesDir(category),
    getGeneratedSuitesDir(category),
    `${category} suites`
  );
  stale.push(...ev.stale, ...su.stale);
  return stale;
}

async function removeLegacySkillDirs(): Promise<void> {
  const legacy = [
    path.join(REPO_ROOT, "skills/agent-redteaming/opfor-setup/evaluators"),
    path.join(REPO_ROOT, "skills/agent-redteaming/opfor-setup/suites"),
    path.join(REPO_ROOT, "skills/mcp-redteaming/opfor-setup/evaluators"),
    path.join(REPO_ROOT, "skills/mcp-redteaming/opfor-setup/suites"),
  ];
  for (const dir of legacy) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

async function cleanGeneratedDirs(): Promise<void> {
  for (const category of CATEGORIES) {
    const genRoot = path.join(
      REPO_ROOT,
      "skills",
      `${category === "mcp" ? "mcp" : "agent"}-redteaming`,
      "opfor-setup",
      GENERATED_DIRNAME
    );
    try {
      await rm(genRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

async function main(): Promise<void> {
  console.log(
    CHECK_ONLY ? "Checking skills _generated mirrors…" : "Syncing skills _generated mirrors…"
  );

  if (!CHECK_ONLY) {
    await removeLegacySkillDirs();
    await cleanGeneratedDirs();
  }

  const allStale: string[] = [];
  for (const category of CATEGORIES) {
    allStale.push(...(await syncCategory(category)));
  }

  if (CHECK_ONLY) {
    if (allStale.length > 0) {
      console.error(
        "\n✗ Generated skills mirrors are out of date. Run:\n\n  npm run sync:skills-evaluators\n"
      );
      for (const p of allStale.slice(0, 20)) {
        console.error(`  - ${p}`);
      }
      if (allStale.length > 20) console.error(`  … and ${allStale.length - 20} more`);
      process.exit(1);
    }
    console.log("\n✓ All skills _generated mirrors match repo root evaluators/suites.\n");
    return;
  }

  console.log("\n✓ Done. Edit evaluators/ and suites/ at repo root; re-run sync after changes.\n");
}

main().catch((e) => {
  console.error("sync-skills-evaluators failed:", e);
  process.exit(1);
});
