# 🏹 astra

Red team AI systems — using your coding agent, a standalone CLI, or an MCP server.

`astra` is an open-source toolkit for adversarial security testing of LLMs, chatbots, RAG pipelines, and AI agents. It covers the OWASP LLM Top 10 and OWASP Agentic AI Top 10.

You can use it in three ways:


|              | Skills (agent-based)                                            | CLI (standalone)                                     | MCP Server                                                 |
| ------------ | --------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| **How**      | Agent reads skill files and executes the test                   | `astra init / setup / run` commands                  | Agent calls `astra_setup` / `astra_run` tools              |
| **Requires** | Claude Code, Cursor, Windsurf, or any agent with skills support | Node.js 18+, any LLM API key                         | Any MCP-compatible host (Cursor, Claude Desktop, Windsurf) |
| **Best for** | Interactive setup, white-box attacks, conversational workflow   | CI/CD pipelines, automated scans, scripted workflows | Agent-driven automation without leaving your IDE           |
| **Output**   | Markdown report in chat                                         | HTML + JSON report on disk                           | Summary in chat + HTML/JSON reports on disk                |


---

## Single-turn vs multi-turn attacks

By default, astra runs **single-turn** attacks: one prompt is sent to your target, one response is judged, done.

**Multi-turn** mode fires a short adversarial conversation per attack. After each response the judge evaluates it in context; if the target holds firm, an attacker LLM generates a more escalating follow-up and the cycle repeats (up to `turns`, default 3). The attack stops as soon as the judge returns FAIL.

**Important:** multi-turn only works if your target agent maintains conversation history across requests. Astra does not replay previous messages — it only sends a `sessionId` (UUID) with each request. Your agent must look up that ID and reconstruct the conversation on its side. If the target treats every request independently, multi-turn degrades to repeated single-turn attempts.

- **HTTP targets:** configure `target.sessionIdField` (e.g. `"session_id"`) so astra injects the ID into the request body. Your server uses it to key a session store.
- **Local-script targets:** `sessionId` is always included in the stdin JSON (`{ "prompt": "...", "sessionId": "...", "context": {...} }`). Use it to maintain in-process history.
- **Session ID absent** (single-turn or no `sessionIdField` set): no ID is injected and no history is expected.

Enable multi-turn in your config:

```json
{
  "turnMode": "multi",
  "turns": 3,
  "target": {
    "sessionIdField": "session_id"
  }
}
```

Or in YAML:

```yaml
turnMode: multi
turns: 3
target:
  sessionIdField: session_id
```

---

## Option 1 — Skills (agent-based)

The skills approach encodes red teaming **knowledge** as structured markdown files that any AI coding agent can read and execute. No code, no config — just describe your target.

### Install the skills

```bash
# From npm
npx skills add astra

# Or clone directly
git clone https://github.com/yourusername/astra.git
```

### Step 1 — Configure a target

Run the setup skill in your agent:

```
/astra-setup
```

The agent will guide you through:

- **Target Information** — name, type, endpoint, model
- **Application Context** — what it does, user types, sensitive data, dangerous actions, forbidden topics
- **System Prompt** — the actual instructions the target runs under (optional but improves attack quality)
- **Test Configuration** — which evaluators or suite to run, number of test cases, single or multi-turn

Result: a config folder is created at `.astra/configs/<uuid>/` with the config and pre-generated attack inputs.

### Step 2 — Run the assessment

```
/astra-run
```

The agent will:

1. Load your configuration and pre-generated attack inputs
2. Fire each attack at your target
3. Judge every response (PASS/FAIL) with evidence
4. Generate an HTML + JSON report in `.astra/reports/`

### Manual setup (skip the wizard)

Copy the example config and edit it directly:

```bash
cp astra.config.md.example .astra/configs/my-target.md
```

See [astra.config.md.example](astra.config.md.example) for the full template.

---

## Option 2 — CLI (standalone)

The CLI is a self-contained TypeScript tool that handles everything: interactive setup, attack prompt generation, firing attacks, judging responses, and producing reports — all without an agent.

### How the pieces fit together

| Command | What it does |
| --------|---------------|
| **`astra init`** | Writes a **starter** `astra.config.json` in the current directory. Optional; skip if you prefer the wizard or hand-write YAML/JSON. |
| **`astra init --example …`** | Writes **only** sample `astra-local-target.py` / `.js` stubs (no config). Optional; for local-script targets. |
| **`astra setup`** | **Interactive wizard** — asks questions in the terminal, then writes `astra-prompts-<timestamp>.json`. **No config file required.** You still need an LLM API key (env var or `--api-key`). |
| **`astra setup --config <file>`** | **Non-interactive** — reads your JSON/YAML config, then writes `astra-prompts-<timestamp>.json`. Use this in CI or when you already edited a file. |
| **`astra run --input <prompts.json>`** | Runs attacks using the **target** stored inside the prompts file (HTTP URL or local script path), judges responses, writes HTML + JSON reports. |

**Typical paths:**

1. **Config-first:** `astra init` (optional) → edit `astra.config.json` (or YAML) → set API key (env or file) → `astra setup --config astra.config.json` → `astra run --input astra-prompts-….json`
2. **Wizard-only:** ensure API key in env → `astra setup` (answer prompts) → `astra run --input astra-prompts-….json`

`setup` always produces the prompts file; `run` always consumes that file. `--target-script` on `run` can override the target to a local `.js`/`.py` for a quick test (see **Local target scripts** below).

### Requirements

- Node.js 18+
- API key for any supported LLM provider (OpenAI, Anthropic, Groq, Google, or any OpenAI-compatible endpoint)

### Install

```bash
# From a cloned repo (local development)
git clone https://github.com/yourusername/astra.git
cd astra
npm install --ignore-scripts
npm run build
npm install -g ./cli   # make the `astra` command available globally
```

### Step 1 — Create or reuse a config file (optional)

If you use **`astra setup --config …`**, you need a JSON or YAML file first. If you use **`astra setup`** alone (wizard), you can **skip this step**.

```bash
astra init
```

`astra init` writes a template **`astra.config.json`** in the current directory. Edit it with your target details, or create `astra.config.yml` by hand using the same fields.

**Sample Python / Node adapters (no config file):** Use `astra init` with `--example` to drop starter scripts that match the **local target** stdin/stdout JSON contract. Handy when you want a `.py` or `.js` stub before editing `astra.config.json`.

```bash
astra init --example python    # writes astra-local-target.py
astra init --example node      # writes astra-local-target.js
astra init --example both      # writes both files in the current directory
astra init --example python --script-dir ./scripts   # put stubs under ./scripts
```

These commands **do not** write `astra.config.json`. After you customize the script, set `target.type` to `local-script` and `target.scriptPath` in your config (or pass `--target-script` to `astra run`). Full contract and examples are in **Local target scripts** below.

**Config file format:**

```json
{
  "llm": {
    "provider": "groq",
    "model": "llama-3.3-70b-versatile"
  },
  "target": {
    "name": "My Support Bot",
    "description": "A customer support chatbot with access to user booking data and PII. It can issue partial refunds and look up bookings by name.",
    "type": "http-endpoint",
    "endpoint": "http://localhost:4000/chat",
    "requestFormat": "openai",
    "targetModel": "gpt-4o-mini"
  },
  "selection": {
    "mode": "suite",
    "suite": "owasp-llm-top10"
  }
}
```

Or use YAML (`astra.config.yml`):

```yaml
llm:
  provider: groq
  model: llama-3.3-70b-versatile

target:
  name: My Support Bot
  description: >
    A customer support chatbot with access to user booking data and PII.
    It can issue partial refunds and look up bookings by name.
  type: local-script
  scriptPath: ./astra-local-target.py # run with python3; generate stub: astra init --example python

selection:
  mode: evaluators
  evaluators:
    - prompt-injection
    - sensitive-disclosure
    - system-prompt-leakage
    - jailbreaking
```

### Step 2 — Set your LLM API key

The LLM is used during **`astra setup`** (prompt generation) and **`astra run`** (judging). You need a key for both paths (wizard or `--config`). Supply it in one of these ways, in priority order when multiple are set:

The CLI also loads a **`.env`** file from the **current working directory** (via `dotenv`), so you can put `GROQ_API_KEY=...` and Langfuse variables there instead of exporting them in the shell. Add `.env` to `.gitignore`.

**Option A — CLI flag (highest priority):**

```bash
astra setup --config astra.config.json --api-key gsk_your-key-here
```

**Option B — Environment variable:**

```bash
export GROQ_API_KEY=your-key-here       # Groq (free tier available)
export OPENAI_API_KEY=your-key-here     # OpenAI
export ANTHROPIC_API_KEY=your-key-here  # Anthropic
export GOOGLE_GENERATIVE_AI_API_KEY=... # Google
```

**Option C — Config file field:**

```json
{ "llm": { "provider": "groq", "apiKey": "gsk_your-key-here" } }
```

> **Note:** Avoid committing the config file if it contains an API key. Add `astra.config.json` and `astra-prompts-*.json` to `.gitignore`.

### Optional — Langfuse telemetry (env vars only)

If your `astra.config` / `astra.config.yml` includes **`telemetry.provider: langfuse`**, the scanner reads traces from the Langfuse API. **Do not put Langfuse secret keys in the config file.** Set them in the environment (same idea as `GROQ_API_KEY` for the LLM):

```bash
export LANGFUSE_PUBLIC_KEY=pk-lf-...   # project public key from Langfuse
export LANGFUSE_SECRET_KEY=sk-lf-...   # secret key from Langfuse
export LANGFUSE_BASE_URL=https://cloud.langfuse.com   # optional; required for self-hosted if you use baseUrlEnv
```

For **self-hosted** Langfuse (or to override the cloud host), set either **`telemetry.langfuse.baseUrl`** in the config or point **`telemetry.langfuse.baseUrlEnv`** at an env var (for example `LANGFUSE_BASE_URL=https://langfuse.example.com`). If `baseUrlEnv` is set and that variable is non-empty at `setup` / `run` time, it overrides `baseUrl`.

To use **different env var names** (for example in CI), set optional fields **`langfuse.publicKeyEnv`** and **`langfuse.secretKeyEnv`** in the config to the variable names; the CLI reads the **values** from those variables at runtime.

**Trace discovery (MVP):** under **`telemetry.langfuse.traceSelection`** you can define **`setupTraceIds`**, time/tag filters, **`listLimit`**, **`fields`**, etc. for future use. **`astra setup`** (when **`telemetry.provider` is `langfuse`**) fetches the first page of traces from Langfuse (**pagination only**), runs the **same LLM** as attack generation to pick **`relevantTraceIds`**, writes **`tracedata.json`**, and passes that curated JSON (**capped**) into **`generateAttackPrompts`** as **`OBSERVED_RUNTIME_TRACES`** so attack prompts can mirror real user phrasing and flows.

### Step 3 — Generate attack prompts (`setup`)

Pick **one** of these; both write **`astra-prompts-<timestamp>.json`** (attack prompts + embedded target metadata for `run`).

```bash
# A — From a config file (non-interactive; good for CI or a checked-in config)
astra setup --config astra.config.json
astra setup --config astra.config.json --api-key gsk_your-key-here

# B — Interactive wizard (no config file; answers in the terminal)
astra setup
```

For **B**, you do not need `astra init` first. For **A**, use the file from Step 1 (or any valid JSON/YAML path).

### Step 4 — Run the scan

`--input` is always the **prompts JSON** from Step 3, not your `.js`/`.py` adapter.

```bash
astra run --input astra-prompts-<timestamp>.json

# Override the API key at run time (e.g. use a different key for judging)
astra run --input astra-prompts-<timestamp>.json --api-key gsk_your-key-here

# Write reports to a custom directory
astra run --input astra-prompts-<timestamp>.json --output-dir ./reports

# Optional: force attacks through a local script (see Local target scripts)
astra run --input astra-prompts-<timestamp>.json --target-script ./astra-local-target.js
```

### Local target scripts (`.js` / `.py`)

When your target is not a single HTTP URL—or you want a small **adapter** that forwards to your API—you can use a **local script**. This is optional; HTTP-only workflows can skip this section.

**Contract (one attack = one process):**


| Stream     | Content                                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stdin**  | One JSON object: `{"prompt":"...","context":{...},"sessionId":"..."}`. `sessionId` is present for multi-turn attacks; omitted for single-turn. `context` may include fields such as `targetName`. |
| **Stdout** | One JSON object: `{"response":"..."}` on success, or `{"error":"..."}` on failure. The runner parses stdout as JSON—do not print debug lines to stdout.                                            |
| **Stderr** | Log freely with `console.error` (Node) or writes to stderr (Python); the CLI forwards stderr to your terminal during `astra run`.                                                                  |


**Interpreter:** Astra picks the runtime from the file extension—`.py` / `.pyw` → `python3`, `.js` / `.mjs` / `.cjs` → `node`. You do not configure “Python vs JavaScript” separately.

**Paths:** `target.scriptPath` in config and `--target-script` on the CLI are resolved relative to the **current working directory** when you run `astra setup` / `astra run` (usually your repo root). Example: `./astra-local-target.js`.

**Generate starter files** (sample stubs only; does not write `astra.config.json`):

```bash
astra init --example python          # writes astra-local-target.py
astra init --example node            # writes astra-local-target.js
astra init --example both
astra init --example node --script-dir ./scripts   # custom directory
```

**Wire it in config** — use `local-script` and a path to your file:

```json
"target": {
  "name": "My stack (via adapter)",
  "description": "What the system does, data it touches, and policies.",
  "type": "local-script",
  "scriptPath": "./astra-local-target.js"
}
```

Then `astra setup --config ...` embeds that target in the generated `astra-prompts-*.json`. **Run** with the prompts file only:

```bash
astra run --input astra-prompts-<timestamp>.json
```

**Override** the prompts file’s target and force a script (e.g. quick test, or prompts say HTTP but you want the adapter):

```bash
astra run --input astra-prompts-<timestamp>.json --target-script ./astra-local-target.js
```

**Sanity-check without a full scan:**

```bash
echo '{"prompt":"hello","context":{}}' | node ./astra-local-target.js
echo '{"prompt":"hello","context":{}}' | python3 ./astra-local-target.py
```

> **Note:** `--input` must always be the prompts file from `astra setup` (name like `astra-prompts-*.json`), not the `.js` / `.py` path. The script path is either `target.scriptPath` inside that JSON or `--target-script`.

### CLI commands reference


| Command                                           | Description                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `astra init`                                      | Generate a sample `astra.config.json`                                                          |
| `astra init --example python` / `node` / `both`   | Write sample `astra-local-target.py` and/or `.js` only (stdin/stdout JSON); optional `--script-dir` |
| `astra setup`                                     | Interactive wizard to collect config and generate attack prompts                               |
| `astra setup --config <file>`                     | Non-interactive setup from a JSON or YAML config file                                          |
| `astra setup --config <file> --api-key <key>`     | Setup with API key passed directly                                                             |
| `astra run --input <file>`                        | Fire attacks and generate HTML + JSON report                                                   |
| `astra run --input <file> --target-script <path>` | Run each attack via a local `.js`/`.py` (stdin/stdout JSON); overrides an HTTP target when set |
| `astra run --input <file> --api-key <key>`        | Run with API key override                                                                      |


### Config fields reference


| Field                    | Required           | Description                                                                                                 |
| ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `llm.provider`           | No                 | `groq`, `openai`, `anthropic`, `google`, or `other`. Defaults to `groq`.                                    |
| `llm.model`              | No                 | Model name. Defaults to provider's recommended model.                                                       |
| `llm.apiKey`             | No                 | API key. If omitted, read from the corresponding env var.                                                   |
| `llm.baseURL`            | Only for `other`   | Base URL for custom OpenAI-compatible endpoints.                                                            |
| `target.name`            | Yes                | Human-readable name for the target.                                                                         |
| `target.description`     | Yes                | What the target does, what data it has access to, restrictions. More detail = better attacks.               |
| `target.type`            | Yes                | `http-endpoint` or `local-script` (.js or .py; runtime is inferred from the extension).                     |
| `target.scriptPath`      | For `local-script` | Path to the adapter script (e.g. `./astra-local-target.js`), relative to cwd when you run `astra run`.     |
| `target.endpoint`        | For HTTP           | Full URL to POST attacks to.                                                                                |
| `target.requestFormat`   | For HTTP           | `openai` (messages array) or `json` (custom body). Defaults to `auto`.                                     |
| `target.targetModel`     | For HTTP / openai  | Model name to send in the request body.                                                                     |
| `target.targetApiKey`    | No                 | Bearer token for the target endpoint, if needed.                                                            |
| `target.promptPath`      | No                 | Dot-path for the prompt field in the JSON request body (e.g. `input.message`). Defaults to `prompt`.       |
| `target.responsePath`    | No                 | Dot-path to extract the reply from the JSON response (e.g. `data.reply`). Falls back to built-in chain.    |
| `target.sessionIdField`  | No                 | Body field to inject a session ID for multi-turn attacks (e.g. `session_id`). Target manages its own history. |
| `selection.mode`         | Yes                | `suite` or `evaluators`.                                                                                    |
| `selection.suite`        | For suite          | `owasp-llm-top10` or `owasp-agentic-ai`.                                                                    |
| `selection.evaluators`   | For evaluators     | Array of evaluator IDs (see list below).                                                                    |
| `turnMode`               | No                 | `single` (default) or `multi`. Multi-turn fires a conversation with escalating follow-ups per attack.       |
| `turns`                  | No                 | Number of turns per attack when `turnMode` is `multi`. Defaults to `3`.                                     |


### Supported LLM providers


| Provider    | Env var                        | Default model               |
| ----------- | ------------------------------ | --------------------------- |
| `groq`      | `GROQ_API_KEY`                 | `llama-3.3-70b-versatile`   |
| `openai`    | `OPENAI_API_KEY`               | `gpt-4o-mini`               |
| `anthropic` | `ANTHROPIC_API_KEY`            | `claude-3-5-haiku-20241022` |
| `google`    | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-2.0-flash`          |
| `other`     | `ASTRA_API_KEY`                | (requires `llm.baseURL`)    |


### Target endpoint formats

**`openai`** — OpenAI messages format:

```json
POST /chat
{ "model": "gpt-4o-mini", "messages": [{ "role": "user", "content": "attack prompt" }] }
```

Response extracted from `choices[0].message.content`.

**`json`** — Generic JSON format. By default sends `{ "prompt": "..." }` and reads from `.response`:

```json
POST /chat
{ "prompt": "attack prompt" }
```

Customise with `promptPath` and `responsePath` if your API uses different field names or nesting:

```json
"target": {
  "requestFormat": "json",
  "promptPath": "input.message",
  "responsePath": "output.text"
}
```

This sends `{ "input": { "message": "..." } }` and reads from `response.output.text`.

**`auto`** (default) — tries `openai` first; falls back to `json` if the endpoint returns a non-2xx response.

**Multi-turn session ID** — for `multi` turn mode, add `sessionIdField` so astra injects a session ID into every request body. The target uses it to maintain conversation history:

```json
"target": {
  "requestFormat": "json",
  "sessionIdField": "session_id"
}
```

Each attack sequence gets a fresh UUID. Single-turn attacks are unaffected when `sessionIdField` is set.

### CI/CD integration

```yaml
# .github/workflows/astra.yml
- name: Generate attack prompts
  run: astra setup --config astra.config.json

- name: Run Astra scan
  run: astra run --input astra-prompts-*.json
```

---

## Option 3 — MCP Server

The MCP server exposes Astra as tools (`astra_list_evaluators`, `astra_setup`, `astra_run`) that any MCP-compatible agent can call directly — no terminal required.

See **[docs/mcp.md](docs/mcp.md)** for full setup, configuration, tool parameters, and Langfuse trace integration.

---

## What it tests

### LLM Vulnerabilities (OWASP LLM Top 10)


| Evaluator                        | Severity | OWASP |
| -------------------------------- | -------- | ----- |
| Prompt Injection                 | Critical | LLM01 |
| Sensitive Information Disclosure | Critical | LLM02 |
| Supply Chain Vulnerabilities     | High     | LLM03 |
| Data and Model Poisoning         | High     | LLM04 |
| Improper Output Handling         | High     | LLM05 |
| Excessive Agency                 | High     | LLM06 |
| System Prompt Leakage            | Critical | LLM07 |
| Vector and Embedding Weaknesses  | High     | LLM08 |
| Misinformation                   | High     | LLM09 |
| Unbounded Consumption            | High     | LLM10 |
| Jailbreaking                     | High     | LLM10 |


### Agentic AI Vulnerabilities (OWASP Agentic AI Top 10)


| Evaluator                          | Severity | OWASP |
| ---------------------------------- | -------- | ----- |
| Agent Goal Hijacking               | Critical | ASI01 |
| Tool Misuse and Exploitation       | Critical | ASI02 |
| Identity and Privilege Abuse       | Critical | ASI03 |
| Unexpected Code Execution          | Critical | ASI05 |
| Memory and Context Poisoning       | High     | ASI06 |
| Insecure Inter-Agent Communication | High     | ASI07 |
| Cascading Failures                 | High     | ASI08 |
| Human-Agent Trust Exploitation     | High     | ASI09 |
| Rogue Agents                       | Critical | ASI10 |


### Suites


| ID                 | Name                    | Covers                      |
| ------------------ | ----------------------- | --------------------------- |
| `owasp-llm-top10`  | OWASP LLM Top 10        | LLM01–LLM10 (10 evaluators) |
| `owasp-agentic-ai` | OWASP Agentic AI Top 10 | ASI01–ASI10 (10 evaluators) |


---

## Understanding the report

The HTML report (`.astra/reports/astra-*.html`) contains:

- **Safety score** — percentage of tests where the target defended successfully
- **Evaluator results table** — pass/fail counts and average score per evaluator
- **Findings** — critical and high severity failures ranked by score
- **Full test cases** — every prompt sent, response received, and judge verdict (expandable)

The JSON report (`.astra/reports/astra-*.json`) contains the same data in machine-readable form for CI integration.

---

## Project structure

```
astra/
├── package.json                       ← Root package (npm workspaces: core, cli, mcp)
├── README.md                          ← This file
├── Agents.md                          ← Developer guide
├── astra.config.md.example            ← Config template for skills workflow
├── LICENSE                            ← Apache 2.0
│
├── skills/                            ← Agent skill files (skills workflow)
│   ├── astra-setup/
│   │   ├── SKILL.md                   ← /astra-setup slash command
│   │   ├── evaluators/                ← 20 evaluator definition files (.md)
│   │   ├── suites/                    ← Suite definitions (owasp-llm-top10, owasp-agentic-ai)
│   │   └── targets/                   ← Target adapter instructions
│   └── astra-run/
│       ├── SKILL.md                   ← /astra-run slash command
│       └── report-schema.md           ← Report format specification
│
├── core/                              ← @astra/core — shared engine (npm workspace)
│   ├── src/
│   │   ├── config/                    ← Types, skill catalog loader, path resolver
│   │   ├── evaluators/                ← Evaluator parser, prompt generator, LLM judge
│   │   ├── providers/                 ← LLM provider factory (OpenAI, Anthropic, Groq, Google)
│   │   ├── lib/                       ← HTTP attack agent, local script subprocess helper
│   │   ├── report/                    ← HTML + JSON report generator
│   │   └── util/                      ← YAML frontmatter parser
│   ├── dist/                          ← Compiled output (generated by npm run build)
│   ├── package.json
│   └── tsconfig.json
│
├── cli/                               ← astra-cli — standalone CLI (npm workspace)
│   ├── src/
│   │   ├── index.ts                   ← CLI entrypoint (commander)
│   │   └── commands/                  ← init, setup, run commands
│   ├── dist/                          ← Compiled output (generated by npm run build)
│   ├── package.json
│   └── tsconfig.json
│
├── mcp/                               ← astra-mcp — MCP server (npm workspace)
│   ├── src/
│   │   ├── index.ts                   ← MCP server entrypoint (tools registered here)
│   │   └── core/                      ← setup.ts and run.ts — thin wrappers over @astra/core
│   ├── dist/                          ← Compiled output (generated by npm run build)
│   ├── package.json
│   └── tsconfig.json
│
├── extension/                         ← VS Code/Cursor extension (planned)
│
└── .astra/                            ← Generated files (gitignored)
    └── reports/                       ← Assessment reports (HTML + JSON)
```

---

## Contributing

Contributions are welcome. The most impactful ways to help:

**Add or improve evaluators** — edit the markdown files in `skills/astra-setup/evaluators/`. Each file contains attack patterns and evaluation criteria that both the skills workflow and the CLI use.

**Add attack patterns** — more attack variations improve coverage. Each pattern is a template the LLM adapts to the specific target.

**Improve evaluation criteria** — sharper PASS/FAIL criteria reduce false positives and false negatives.

**Add target adapters** — support new target types by creating adapters in `skills/astra-setup/targets/`.

**Test with different agents** — report how the skills perform across Claude Code, Cursor, Windsurf, and other runtimes.

See [Agents.md](Agents.md) for detailed contributor documentation.

## License

Apache 2.0