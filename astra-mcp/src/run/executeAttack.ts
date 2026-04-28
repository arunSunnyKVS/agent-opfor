import type { McpConnectedClient } from "../mcp/createClient.js";
import type { AttackExecutionResult } from "./types.js";
import type { AttackScenarioWithReplay } from "../attacks/planSchema.js";

export async function executeAttack(
  mcp: McpConnectedClient,
  attack: AttackScenarioWithReplay
): Promise<AttackExecutionResult> {
  const toolName = attack.suggestedToolName ?? "(none)";
  const toolArguments = (attack.suggestedToolArguments ?? {}) as Record<string, unknown>;

  const base: Omit<AttackExecutionResult, "rawToolResponse"> = {
    attackId: attack.id,
    evaluatorId: attack.evaluatorId,
    toolName,
    toolArguments,
  };

  if (!attack.suggestedToolName) {
    return { ...base, rawToolResponse: "", toolError: "no suggestedToolName in attack" };
  }

  // Description scan mode: return the embedded tool description as the "response"
  // without making an actual tool call — the judge will analyze it for hidden instructions.
  if (toolArguments._astra_scan === "tool_description") {
    const description = String(toolArguments._tool_description ?? "(no description)");
    return {
      ...base,
      rawToolResponse: JSON.stringify({
        content: [{ type: "text", text: description }],
        _scan_mode: "tool_description",
      }),
    };
  }

  try {
    const result = await mcp.client.callTool({
      name: toolName,
      arguments: toolArguments,
    });
    return { ...base, rawToolResponse: JSON.stringify(result, null, 2) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Strip axios/SDK noise — keep only the first meaningful line
    const clean = msg.split("\n")[0].replace(/^Error:\s*/i, "").slice(0, 200);
    return { ...base, rawToolResponse: "", toolError: clean };
  }
}
