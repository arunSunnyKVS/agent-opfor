# `astra`

**Open-source AI red teaming:** one **`astra`** CLI published as **`@astra/mcp`** — test **MCP servers** (connects for real, drives **`tools/call`**, judges responses, writes **HTML + JSON** reports) and test **LLMs/agents** (endpoints, suites, judges, reports). Same package, two testing modes.

[![License](https://img.shields.io/badge/license-Apache_2.0-444441?style=flat&labelColor=3d3d3a)](LICENSE)
[![CLI](https://img.shields.io/badge/focus-MCP_%26_agents-185FA5?style=flat&labelColor=3d3d3a)](#what-each-mode-tests)

## Who this is for

- **MCP server authors** — regression-test tool behavior (scope, validation, errors) before release.
- **Security reviewers** — reproducible runs: fixed attack plans, logged requests/responses, LLM-as-judge verdicts per call.
- **Agent / LLM builders** — interactive setup and scans against HTTP or scripted targets (evaluators under `src/agent/skills/`).

## Quick start

From the repository root:

```bash
npm install
npm run build
```

The binary is **`astra`** (`npx astra …`). The workflow is always:

- **`astra setup`** → creates a timestamped config under **`.astra/configs/…`**
- **`astra generate`** → creates a timestamped attacks file under **`.astra/attacks/…`**
- **`astra run`** → executes attacks and writes reports under **`.astra/reports/…`**

Example:

```bash
export OPENAI_API_KEY=...
npx astra setup
npx astra generate --config .astra/configs/astra-config-...json
npx astra run --attacks .astra/attacks/astra-attacks-...json
```

More options and flags: [`src/agent/docs/cli.md`](src/agent/docs/cli.md).

## What it does today

| Step | Command | Role |
|---|---|---|
| Configure | `astra setup` | Interactive wizard; writes config under `.astra/configs/…` (choose MCP or agent). |
| Plan | `astra generate` | Generates attacks under `.astra/attacks/…` from config (or runs setup first). |
| Execute | `astra run` | Runs attacks; writes HTML/JSON reports under `.astra/reports/…`. |

## What each mode tests

**MCP mode** — Coverage is whatever your **suite** includes. The default **`owasp-mcp-top10`** suite ties evaluator ids (scope, SSRF, tool-description issues, etc.) to generated attacks — see **`skills/astra-setup/suites/`** and **`skills/astra-setup/evaluators/`**. The report summarizes results **per evaluator** and **per attack** (tool name, arguments, response, verdict).

**Agent mode** — Suites and evaluators are defined under **`src/agent/skills/`** (e.g. **`owasp-llm-top10`**, **`owasp-agentic-ai`**). Same idea: markdown-defined evaluators composed into suites.

## MCP tools in the IDE (optional)

To expose red-team tools inside Cursor or Claude Desktop (chat-driven **`astra_setup`** / **`astra_run`**), build the repo and wire your MCP client to the **`astra-agent-mcp`** binary from workspace **`@astra/agent-mcp-server`**. See [**`src/agent/docs/mcp.md`**](src/agent/docs/mcp.md).

## Contributing

1. **MCP mode** — new or tighter **`skills/astra-setup/evaluators/<id>.md`**; suites in **`skills/astra-setup/suites/`**.  
2. **Agent mode** — evaluators and suites under **`src/agent/skills/`**.

## Security disclosure

Use **Astra only on servers and applications you own or are authorized to test.** Publish a root **`SECURITY.md`** if you need a coordinated disclosure policy for this package.

## License

Apache 2.0 — [LICENSE](LICENSE).

## Package

Published npm name: **`@astra/mcp`**. CLI binary: **`astra`** — **`astra setup|generate|run`**.
