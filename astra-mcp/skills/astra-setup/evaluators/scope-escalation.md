---
schema_version: 1
id: scope-escalation
name: Scope Escalation and Privilege Bypass
severity: high
owasp: MCP02
mcp_top_10: MCP02
description: >-
  Tests whether the MCP server enforces access boundaries on individual tool calls. Even when
  a server advertises read-only or limited-scope tools, it may fail to validate that the
  requested operation stays within the declared scope. Attackers send over-privileged arguments
  — admin resource IDs, write operations via read endpoints, path traversal, cross-user data
  requests — and check if the server silently allows them.
pass_criteria: |-
  - Server rejects requests that exceed the tool's declared scope with a clear authorization error
  - Read-only tools reject write-like arguments (create, delete, update operations)
  - Path-based tools reject traversal sequences (../, /etc/, /root/)
  - User-scoped tools reject requests for other users' data
  - Admin-only operations return 403 when called without admin context
  - Error messages confirm scope violation without leaking internal details
fail_criteria: |-
  - Server returns data from resources outside the declared scope
  - A read tool silently performs a write when write-like arguments are passed
  - Path traversal succeeds and returns files outside the intended directory
  - Tool returns another user's data when called with a different user's ID
  - Admin operations succeed when no admin credentials are present
  - Server applies scope checks inconsistently across different tools
judge_needs_llm: true
applies_to_all_tools: true
patterns:
  - name: Over-Scoped Request
    template: |-
      You are a security researcher testing an MCP server for scope escalation and privilege bypass (MCP02).

      ATTACK BACKGROUND:
      MCP servers declare what their tools do, but they don't always enforce those boundaries at
      the execution level. Common failures:
      - A "read file" tool that doesn't restrict which files can be read
      - A "get user" tool that doesn't verify the requester owns that user ID
      - A "search" tool that includes results from other tenants
      - A "create" tool that accepts admin-level resource types when only user-level is declared
      - Numeric ID tools that accept 0, -1, or MAX_INT to access special/admin records
      - Tools that trust client-supplied scope parameters (e.g. "role=admin" in request body)

      ESCALATION TECHNIQUES by tool type:
      - File/path tools: "../../etc/passwd", "/root/.ssh/id_rsa", "/proc/self/environ"
      - User/account tools: id=0 (root), id=1 (first admin), id=999999 (out of range), id="admin"
      - Repo/resource tools: reference names like "private-repo", "../other-user/repo", "."
      - Scope/permission tools: pass scope="admin", role="superuser", permissions=["*"]
      - Write via read: pass arguments that imply mutation (delete=true, overwrite=true, mode="w")

      AVAILABLE TOOLS (from tools/list):
      {{tool_list_json}}

      YOUR TASK:
      For each tool, identify what kind of resource it accesses and what the natural scope boundary
      is. Then generate a payload that attempts to cross that boundary. Think about:
      - What resource does this tool touch? (files, users, repos, database records?)
      - What would be "out of scope" for this tool? (other users' data, admin resources, system files?)
      - What argument value would cross that boundary in the most realistic way?

      OUTPUT FORMAT — respond with a JSON array only, no other text:
      [
        {
          "tool_name": "<exact tool name>",
          "jsonrpc_payload": {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
              "name": "<exact tool name>",
              "arguments": { "<param>": "<over-scoped value>" }
            },
            "id": 1
          },
          "judge_hint": "<Describe what a scope violation looks like for this specific tool. E.g. 'FAIL if response contains /etc/passwd content, any file outside the workspace, or root-owned files. PASS if response is a 403 or path-not-allowed error.'>"
        }
      ]

      Generate one entry per tool with the most relevant scope-crossing argument.

---
