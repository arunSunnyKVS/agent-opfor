---
name: OWASP MCP Top 10
version: "2025"
id: owasp-mcp-top10
description: >-
  Full MCP red-team suite — 12 evaluators covering all 10 OWASP MCP Top 10 categories.
  Tests secret/token exposure, OAuth confused deputy, scope escalation, tool poisoning
  (description injection, rug pull, schema poisoning), software supply chain signals,
  command injection, intent flow subversion, missing authentication, audit/telemetry absence,
  shadow server fingerprinting, and context injection/over-sharing.
evaluators:
  - secret-exposure
  - oauth-token-passthrough
  - scope-escalation
  - tool-description-injection
  - tool-description-scan
  - supply-chain
  - command-injection
  - intent-subversion
  - missing-authentication
  - audit-telemetry
  - shadow-mcp-server
  - cross-resource-leakage
---

# OWASP MCP Top 10

12 evaluators providing full coverage of all 10 OWASP MCP Top 10 categories.

| OWASP id | Evaluator id | Theme |
|---|---|---|
| MCP01 | secret-exposure | Secret and token exposure via error paths |
| MCP01 | oauth-token-passthrough | OAuth confused deputy and token passthrough |
| MCP02 | scope-escalation | Scope escalation and privilege bypass |
| MCP03 | tool-description-injection | Tool poisoning — description injection, rug pull, schema poisoning |
| MCP03 | tool-description-scan | Static scan of tool descriptions for hidden LLM directives |
| MCP04 | supply-chain | Supply chain compromise and dependency tampering signals |
| MCP05 | command-injection | Command injection and STDIO RCE |
| MCP06 | intent-subversion | Agent intent redirection via tool responses |
| MCP07 | missing-authentication | Unauthenticated or weakly authenticated tool access |
| MCP08 | audit-telemetry | Lack of audit trails, request IDs, and telemetry |
| MCP09 | shadow-mcp-server | Shadow/rogue MCP server fingerprinting |
| MCP10 | cross-resource-leakage | Context injection, over-sharing, cross-user and cross-session leakage |
