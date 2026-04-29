import type { McpConnectedClient } from "../mcp/createClient.js";
import type { AttackExecutionResult, StepResult } from "./types.js";
import type { AttackScenarioWithReplay } from "../attacks/planSchema.js";

// ─── Template resolution ─────────────────────────────────────────────────────

/**
 * Recursively resolve `{{$prev.<path>}}` placeholders in an arguments object
 * using data extracted from the previous step's response.
 */
function resolveTemplates(
  args: Record<string, unknown>,
  prev: Record<string, unknown>
): Record<string, unknown> {
  const resolve = (value: unknown): unknown => {
    if (typeof value === "string") {
      return value.replace(/\{\{\$prev\.([^}]+)\}\}/g, (_, path: string) => {
        const parts = path.split(".");
        let cur: unknown = prev;
        for (const part of parts) {
          if (cur == null || typeof cur !== "object") return "";
          cur = (cur as Record<string, unknown>)[part];
        }
        return cur != null ? String(cur) : "";
      });
    }
    if (Array.isArray(value)) return value.map(resolve);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, resolve(v)])
      );
    }
    return value;
  };
  return resolve(args) as Record<string, unknown>;
}

/**
 * Try to extract a flat key→value map from a tool response JSON so templates
 * like `{{$prev.id}}` can resolve against it.
 */
function extractStepData(rawResponse: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawResponse) as unknown;
    // MCP standard: { content: [{ type: "text", text: "..." }] }
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "content" in parsed &&
      Array.isArray((parsed as { content: unknown[] }).content)
    ) {
      const textBlocks = (parsed as { content: Array<{ type?: string; text?: string }> }).content
        .filter((c) => c.type === "text" && typeof c.text === "string")
        .map((c) => c.text as string);

      const combined = textBlocks.join("\n");

      // Try to parse inner JSON from text content
      try {
        const inner = JSON.parse(combined) as unknown;
        if (inner !== null && typeof inner === "object") {
          return inner as Record<string, unknown>;
        }
      } catch {
        // text is not JSON — return as { text }
        return { text: combined };
      }
    }
    if (parsed !== null && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // raw string — not parseable
  }
  return { text: rawResponse };
}

// ─── Single tool call ─────────────────────────────────────────────────────────

async function callTool(
  mcp: McpConnectedClient,
  toolName: string,
  toolArguments: Record<string, unknown>
): Promise<{ rawToolResponse: string; toolError?: string }> {
  try {
    const result = await mcp.client.callTool({ name: toolName, arguments: toolArguments });
    return { rawToolResponse: JSON.stringify(result, null, 2) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const clean = msg.split("\n")[0].replace(/^Error:\s*/i, "").slice(0, 200);
    return { rawToolResponse: "", toolError: clean };
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function executeAttack(
  mcp: McpConnectedClient,
  attack: AttackScenarioWithReplay
): Promise<AttackExecutionResult> {
  // ── Multi-step attack ──────────────────────────────────────────────────────
  if (attack.steps && attack.steps.length > 0) {
    const stepResults: StepResult[] = [];
    let prevData: Record<string, unknown> = {};

    for (let i = 0; i < attack.steps.length; i++) {
      const step = attack.steps[i];

      // Optional inter-step delay
      if (step.delayMs && step.delayMs > 0) {
        await new Promise((r) => setTimeout(r, step.delayMs));
      }

      const resolvedArgs = resolveTemplates(step.toolArguments as Record<string, unknown>, prevData);
      const { rawToolResponse, toolError } = await callTool(mcp, step.toolName, resolvedArgs);

      stepResults.push({
        stepIndex: i,
        toolName: step.toolName,
        toolArguments: resolvedArgs,
        rawToolResponse,
        toolError,
      });

      prevData = rawToolResponse ? extractStepData(rawToolResponse) : {};
    }

    // Surface the last step's result as the top-level fields for backward compat
    const last = stepResults[stepResults.length - 1];
    return {
      attackId: attack.id,
      evaluatorId: attack.evaluatorId,
      toolName: last.toolName,
      toolArguments: last.toolArguments,
      rawToolResponse: last.rawToolResponse,
      toolError: last.toolError,
      steps: stepResults,
    };
  }

  // ── Single-step attack (backward compat) ───────────────────────────────────
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

  // Description scan: return embedded tool description without a live call
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

  const { rawToolResponse, toolError } = await callTool(mcp, toolName, toolArguments);
  return { ...base, rawToolResponse, toolError };
}
