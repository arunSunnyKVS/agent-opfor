---
name: OWASP MCP Top 10
version: "2025"
id: owasp-mcp-top10
description: >-
  Full MCP red-team suite — 9 evaluators specifically engineered for MCP server vulnerabilities,
  covering secret exposure, scope escalation, tool poisoning, command injection, auth bypass,
  cross-tenant leakage, intent subversion, OAuth confused deputy attacks, and static
  tool description scanning for hidden LLM directives.
evaluators:
  - secret-exposure
  - oauth-token-passthrough
  - scope-escalation
  - tool-description-injection
  - command-injection
  - missing-authentication
  - intent-subversion
  - cross-resource-leakage
  - tool-description-scan
---

# OWASP MCP Top 10

9 evaluators purpose-built for MCP server security testing.

| OWASP id | Evaluator id | Theme |
|---|---|---|
| MCP01 | secret-exposure | Secret and token exposure via error paths |
| MCP01 | oauth-token-passthrough | OAuth confused deputy and token passthrough |
| MCP02 | scope-escalation | Scope escalation and privilege bypass |
| MCP03 | tool-description-injection | Hidden instructions injected via adversarial inputs |
| MCP03 | tool-description-scan | Static scan of tool descriptions for hidden LLM directives |
| MCP05 | command-injection | Command injection and STDIO RCE |
| MCP06 | intent-subversion | Agent intent redirection via tool responses |
| MCP07 | missing-authentication | Unauthenticated or weakly authenticated tool access |
| MCP10 | cross-resource-leakage | Cross-user, cross-tenant, and cross-session data leakage |
