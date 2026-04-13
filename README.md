# netra-redteam

Red team AI systems using your coding agent. No SDK. No code. Just skills.

`netra-redteam` is an open-source skill package that teaches your AI coding agent how to security test LLMs, chatbots, RAG pipelines, and AI agents. Install the skills, describe your target, and let the agent handle the rest.

```
npx skills add netra-redteam
```

## How it works

Traditional red teaming tools make you write Python scripts, configure YAML files, and learn a framework. `netra-redteam` takes a different approach — it encodes red teaming **knowledge** as structured skill files that any AI coding agent can read and execute.

```
You:    "Red team my customer support chatbot at api.example.com/chat"
Agent:  reads skills → asks clarifying questions → selects framework
        → generates attacks → tests your system → reports vulnerabilities
```

Works with Claude Code, Cursor, Windsurf, and any agent that supports skills.

## Quick start

**1. Install the skills**

```bash
npx skills add netra-redteam
```

**2. (Optional) Create a config file**

```bash
cp netra-redteam/netra.config.yaml.example netra.config.yaml
```

```yaml
target:
  name: "My Chatbot"
  type: chatbot
  endpoint: "https://api.example.com/chat"
  method: POST
  headers:
    Authorization: "Bearer ${API_KEY}"
  body_template: '{"message": "{{prompt}}"}'
  response_path: "data.reply"

scope:
  framework: owasp-llm-top10
```

**3. Tell your agent to red team**

```
Red team my AI system using the netra-redteam skills
```

The agent reads the skills, asks what it needs to know, and runs a structured security assessment. If you have a config file, it uses that. If not, it asks you interactively.

## What it tests

The skill covers major AI/LLM vulnerability categories:

| Vulnerability | Severity | OWASP |
| --- | --- | --- |
| Prompt Injection | Critical | LLM01 |
| Insecure Output Handling | High | LLM02 |
| Training Data Poisoning | High | LLM03 |
| Denial of Service | Medium | LLM04 |
| Supply Chain Vulnerabilities | High | LLM05 |
| Sensitive Information Disclosure | Critical | LLM06 |
| Insecure Plugin Design | High | LLM07 |
| Excessive Agency | High | LLM08 |
| Overreliance | Medium | LLM09 |
| Model Theft | Medium | LLM10 |

Each vulnerability includes multiple attack patterns at basic, intermediate, and advanced difficulty levels.

## Frameworks

Choose a security framework and the skill maps it to the right vulnerability tests:

- **OWASP LLM Top 10** — the industry standard for LLM application security
- **MITRE ATLAS** — adversarial threat landscape for AI systems
- **EU AI Act** — compliance testing for high-risk AI systems (Article 9)

Or run a custom selection of specific vulnerability categories.

## Target types

Works against any AI system you can send text to:

- **Chatbots** — customer support, internal tools, consumer products
- **RAG pipelines** — retrieval-augmented generation systems
- **AI Agents** — tool-using agents with MCP, function calling, or plugin access
- **API endpoints** — any LLM-powered API
- **Raw LLMs** — test the model itself via provider APIs

## CI/CD

Run red team scans in your pipeline with a pre-configured `netra.config.yaml`:

```yaml
# .github/workflows/redteam.yml
- name: Red Team Scan
  run: |
    claude -p "Read the netra-redteam skill. Run a full scan using
    netra.config.yaml. Output JSON to results/report.json.
    Exit with failure if any critical vulnerabilities are found."
```

Set `ci.quiet: true` in your config to skip interactive prompts.

## What makes this different

| | netra-redteam | Code-based tools (DeepTeam, PyRIT, Garak) |
| --- | --- | --- |
| **Setup** | Install skills, talk to your agent | Write Python, configure callbacks, set API keys |
| **Runtime** | Your existing AI coding agent | Python/Node.js process |
| **Learning curve** | Describe your target in plain English | Learn the framework's API and config format |
| **Extensibility** | Write a markdown file | Write Python classes |
| **CI/CD** | Config file + headless agent | Config file + CLI runner |

## Project structure

```
netra-redteam/
├── SKILL.md                  ← Agent reads this first
├── vulnerabilities/          ← What to test for
│   ├── prompt-injection.md
│   ├── pii-leakage.md
│   └── ...
├── attacks/                  ← How to test
│   ├── prompt-injection/
│   │   ├── direct.md
│   │   ├── indirect.md
│   │   └── multi-turn.md
│   └── ...
├── frameworks/               ← Test suites mapped to standards
│   ├── owasp-llm-top10.md
│   ├── mitre-atlas.md
│   └── eu-ai-act.md
└── evaluators/               ← How to score results (open spec)
    ├── SPEC.md
    └── *.yaml
```

## Contributing

Contributions are welcome. The most impactful ways to help:

**Add a new vulnerability skill** — create a markdown file in `vulnerabilities/` and attack patterns in `attacks/`. See [AGENTS.md](AGENTS.md) for the file schemas.

**Add attack patterns** — more attack variations improve coverage. Each attack file describes a strategy the agent adapts to the target — not copy-paste prompts.

**Improve evaluators** — sharper evaluation criteria reduce false positives and false negatives.

**Test with different agents** — report how the skills perform across Claude Code, Cursor, Windsurf, and other agent runtimes.

## Netra Platform

For teams that need historical tracking, compliance reports, team dashboards, and continuous monitoring — [Netra](https://getnetra.ai) is the enterprise platform built on top of these open-source skills.

The skills work standalone. Netra is optional.

## License

Apache 2.0
