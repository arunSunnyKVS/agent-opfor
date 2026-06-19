# Engine TODO — make OPFOR load the restructured evaluators/suites

> Scope of THIS doc: the `core/` + `scripts/` changes required so the engine can read
> the new evaluator/suite tree. The folder restructure itself (moving/splitting/collapsing
> files under `evaluators/` and `suites/`) is done separately. **Until the items below land,
> the new tree will not load** — the current loaders assume a flat `.md` layout with `---`
> frontmatter fences and one inline `patterns:` block per file.
>
> Status: NOT STARTED. Target: next commit, after the file restructure is in.

## What changed in the tree (the inputs the engine must now accept)

1. Files are **`.yaml`, frontmatter-only** (no `---` fences, no markdown body). Body was never read.
2. Files live in **nested family folders** (`agent/injection/…`, `mcp/auth/…`), not flat.
3. High-growth checks use **directory form**: `…/prompt-injection/evaluator.yaml` + `patterns/*.yaml`.
4. `id` is canonical; **filename/folder is just a shard** (no longer `id === filename stem`).
5. **Standard suites are derived** from `standards:`; `suites/` holds only curated subsets.
6. New frontmatter fields in use: `types`, `scan_mode`, `applies_to_all_tools`, plus the
   already-modelled `surfaces`, `turn_mode`, `strategy`.

---

## A. File discovery: flat `.md` → recursive `.yaml` + directory form

| Site                                                                          | Today                                                 | Change                                                                                                                                       |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [loadEvaluatorCatalog.ts:68](../core/src/catalog/loadEvaluatorCatalog.ts#L68) | `readdir(evalDir).filter(.md)` (flat)                 | recursive walk; accept `.yaml`; skip `patterns/` and `_shared/`; on a dir containing `evaluator.yaml`, treat as one directory-form evaluator |
| [loadEvaluatorCatalog.ts:44](../core/src/catalog/loadEvaluatorCatalog.ts#L44) | suite scan flat `.md`                                 | recursive/flat `.yaml` over the new `suites/` layout                                                                                         |
| [evaluators.parse.test.ts:19](../core/tests/evaluators.parse.test.ts#L19)     | flat `readdir().filter(.md)`                          | recursive + `.yaml` + directory form                                                                                                         |
| [validate-skills.ts:40,253,260,271](../scripts/validate-skills.ts#L40)        | several flat `.md` scans + `basename(f,".md")` id-set | recursive + `.yaml` + directory form                                                                                                         |
| [sync-skills-evaluators.ts:44](../scripts/sync-skills-evaluators.ts#L44)      | flat `.md` mirror                                     | recursive + `.yaml`, OR retire in favour of the `catalog.json` bundle (see §G)                                                               |

Recommend a single shared `discoverEvaluatorFiles(category)` helper so every site walks the
tree the same way, instead of five independent `readdir` calls.

## B. Parse pure-YAML files (no `---` fences)

[`splitYamlFrontmatter`](../core/src/util/yamlFrontmatter.ts#L2) returns `null` when the file
doesn't start with `---`. A pure `.yaml` file has no fences, so every caller throws today.

- Add a loader that: if path ends `.yaml` → `parseYaml(wholeFile)`; if `.md` → existing split
  (keep `.md` support for pattern bodies / back-comat, or drop once migration is complete).
- Update callers: [parseEvaluator.ts:87](../core/src/evaluators/parseEvaluator.ts#L87),
  [loadEvaluatorCriteria.ts:12](../core/src/catalog/loadEvaluatorCriteria.ts#L12),
  [loadEvaluatorPatterns.ts:22](../core/src/catalog/loadEvaluatorPatterns.ts#L22),
  [loadEvaluatorCatalog.ts:48,73](../core/src/catalog/loadEvaluatorCatalog.ts#L48).

## C. Stop building paths from `id + ".md"` (id no longer maps to a path)

Folder is a shard and ext is `.yaml`, so `join(dir, ${id}.md)` is invalid. Build an
**id → filepath index** once from the recursive scan (§A) and resolve through it.

- [parseEvaluator.ts:113](../core/src/evaluators/parseEvaluator.ts#L113) `loadBuiltinEvaluator` → `${id}.md`
- [loadEvaluatorCriteria.ts:11](../core/src/catalog/loadEvaluatorCriteria.ts#L11) → `${id}.md` **and hardcoded `getEvaluatorsDir("mcp")`** (T8 bug: ignores surface)
- [loadEvaluatorPatterns.ts:20](../core/src/catalog/loadEvaluatorPatterns.ts#L20) → `${id}.md` **and hardcoded `getEvaluatorsDir("mcp")`** (same bug)

Fix the hardcoded-`mcp` surface in the same pass (loader must resolve from the evaluator's
own surface, not always mcp).

## D. Directory-form loader (rubric + patterns/)

When a path is a directory with `evaluator.yaml`: read the rubric there, then glob
`patterns/*.yaml` and merge each `{name, template}` into `spec.patterns`. A directory-form
evaluator with zero pattern files is an error.

- [parseEvaluator.ts:49](../core/src/evaluators/parseEvaluator.ts#L49) currently throws if inline
  `patterns` is empty — relax so patterns may come from `patterns/*.yaml`, but still require
  non-empty _after merge_ (except `strategy: mcp-scanner`).
- Reference implementation already exists in the sample repo's `build-skill-catalog.ts`
  (`readPatternFiles` + `collectEvaluators` walk) — port that logic.

## E. Schema reconciliation (T8) — [schema.ts](../core/src/evaluators/schema.ts)

- `patterns`: make **required unless `strategy: mcp-scanner`** (today `.optional()` at L39 but
  the runtime + parse test demand non-empty — they disagree).
- Replace **`.passthrough()` (L45) with `.strict()`** so misspelled keys error instead of vanishing.
- Model the new/used fields explicitly: `types: string[]`, `scan_mode: 'source_code'`,
  `applies_to_all_tools: boolean`, `metric_threshold`, `untestable_reason`. (`surfaces`,
  `turn_mode`, `strategy`, `judge_hint` already modelled.)
- `schema_version` is being dropped from files — keep it `.optional()` so old files don't break,
  or remove once migration is complete.

## F. Suite derivation (T5) + suites layout

- **Algorithm** — add `deriveStandardSuites(evaluators)` in
  [loadEvaluatorCatalog.ts](../core/src/catalog/loadEvaluatorCatalog.ts): for each _accepted_
  standard scheme present in `standards:`, build one suite whose members are every evaluator
  carrying a tag in that scheme. → `owasp-llm-top10` (from `owasp-llm`, grouped by LLM id),
  `owasp-mcp-top10` (`owasp-mcp`), `owasp-agentic-ai` (`owasp-agentic`), `eu-ai-act-bias`
  (`eu-ai-act`), `atlas` (`atlas`). Curated suites are read from files; standard suites are
  **never stored**, only derived — so they can't drift from the evaluators.
- **Two call sites for the one function:**
  1. **Engine / CLI (dev checkout):** call `deriveStandardSuites()` **at load time** — the standard
     suites exist in memory; nothing is written to disk.
  2. **Installed Agent Skill (static folder, no build step on the user's machine):** the
     `build:catalog` step (see §J) **must run the same derivation and bake the derived suites into
     `catalog.json`**, because the skill can't derive at runtime. The committed bundle therefore
     carries: every evaluator (single-file + directory-form normalized) + curated suites + the
     derived standard suites. This is the link between §F and §J.
- `suites/` now holds **only curated subsets**, split per surface: `suites/agent/` (quick-smoke,
  pre-deploy-critical, harmful-content, output-trust-and-safety) and `suites/mcp/` (mcp-smoke).
  The old `suites/agent/owasp-*.md` and `suites/mcp/owasp-*.md` are deleted by the restructure.
- Layout decision: **per-surface** `suites/{agent,mcp}` (a suite runs against one target — agent
  OR mcp server — so it is surface-homogeneous; mirrors `evaluators/`).
  [`getSuitesDir(category)`](../core/src/config/evaluatorsLayout.ts#L22) already returns
  `suites/{agent|mcp}` — **keep it as-is**; just point the suite scan at `.yaml` files in it.
  (Derived standard suites are likewise per-surface: `owasp-llm-top10`/`owasp-agentic-ai`/
  `eu-ai-act-bias` are agent, `owasp-mcp-top10` is mcp.)

## G. `surfaces: [agent, mcp]` consumption (T9 de-dup)

The 10 duplicated `mcp-*` agent evaluators collapse into the mcp surface; dual-surface ones use
`surfaces: [agent, mcp]`. Confirm the runner includes a single mcp-surface file in an agent run
when `surfaces` contains `agent` (today selection is by directory/category). Adjust selection to
honour `surfaces` rather than just the folder.

## H. ATLAS validation on by default (T8)

[loadEvaluatorCatalog.ts:38](../core/src/catalog/loadEvaluatorCatalog.ts#L38) only validates ATLAS
ids when `OPFOR_VALIDATE_ATLAS=1`. Turn on by default (allow opt-out).

## I. Identity test relax (T6)

[evaluators.parse.test.ts:25](../core/tests/evaluators.parse.test.ts#L25) asserts
`spec.id === filename stem`. Change to: assert **globally unique `id`** across both surfaces;
filename-matches-id becomes a lint **warning**, not a failure (so reorg/sharding is safe).

## J. Skill mirror / catalog (T4 — related, optional this commit)

`sync-skills-evaluators.ts` mirrors the flat `.md` tree into `_generated/`; it will break on the
new tree. Either update it to the recursive `.yaml` walk, or adopt the sample repo's approach:
replace the file-by-file mirror with a single `catalog.json` per skill (`build:catalog`), git-ignore
`_generated/`, and gate staleness in CI. Out of strict evaluators/suites scope — track but can defer.

- **`build:catalog` must include the derived standard suites** (run `deriveStandardSuites()` from §F
  during the build) so the installed skill ships OWASP/MCP/ATLAS/EU-AI-Act suites without a runtime
  derive step. Bundle contents = normalized evaluators + curated suites + derived standard suites.

## K. Fixture runner (T7 — separate workstream)

`scripts/run-fixtures.ts` (new) runs each co-located `<id>.test.yaml` through the real judge and
blocks the PR on a wrong verdict. Four kinds: `response | transcript | artifact | metric`
(see new `SCHEMA.md`).

**Status update:** the fixtures themselves are now **authored** — 91 of 93 evaluators ship a
co-located `<id>.test.yaml` (77 `response`, 12 `artifact`, 2 `metric`); `memory-inject-plant` and
`memory-inject-trigger` are intentionally left out (cross-session chains — need `untestable_reason`

- CODEOWNERS per SCHEMA). These are **authored-but-NOT-yet-validated**: no runner/judge exists yet,
  so a subtly inverted fixture is currently undetectable. Building `run-fixtures.ts` (which actually
  executes them and proves the judge discriminates) is the remaining work here.

---

## Suggested order

1. §B + §C + §A (loader can find & read the new files at all) — unblocks everything.
2. §D (directory form) — unblocks `prompt-injection/`.
3. §E (schema strict + required patterns) — turns silent drift into errors.
4. §F (suite derivation) — restores the OWASP/MCP suites that the restructure deleted.
5. §G, §H, §I — correctness/safety.
6. §J, §K — mirror/catalog and the fixture gate (can trail).
