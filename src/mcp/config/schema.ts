import { z } from "zod";

export const ProviderNameSchema = z.enum(["openai", "anthropic", "groq", "google", "other"]);
export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const ModelConfigSchema = z.object({
  provider: ProviderNameSchema,
  model: z.string().min(1),
  apiKeyEnv: z.string().min(1).optional(),
  baseURL: z.string().url().optional(),
});

export const McpServerStdioConfigSchema = z.object({
  transport: z.literal("stdio"),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  cwd: z.string().min(1).optional(),
  env: z.record(z.string(), z.string()).default({}),
});

export const McpServerUrlConfigSchema = z.object({
  transport: z.literal("url"),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).default({}),
});

export const McpServerConfigSchema = z.discriminatedUnion("transport", [
  McpServerStdioConfigSchema,
  McpServerUrlConfigSchema,
]);

export const AstraMcpConfigSchema = z.object({
  schemaVersion: z.literal(2),
  server: McpServerConfigSchema,
  models: z.object({
    setup: ModelConfigSchema,
    run: ModelConfigSchema,
  }),
  /** "single" (default) fires one attack per scenario; "multi" runs adaptive multi-turn red-teaming. */
  turnMode: z.enum(["single", "multi"]).optional(),
  /** Number of adaptive turns per attack when turnMode is "multi" (default 3). */
  turns: z.number().int().min(2).max(10).optional(),
  notes: z.string().optional(),
  /** Free-form instructions for the attacker LLM: real resource IDs, attack focus areas, known weaknesses, domain context, etc. High priority. */
  attackerInstructions: z.string().optional(),
});

export type AstraMcpConfig = z.infer<typeof AstraMcpConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

/** MCP scanner block inside unified `astra.config.json` (schemaVersion 3) — same fields as root MCP config minus `schemaVersion`. */
export const McpScannerSectionSchema = AstraMcpConfigSchema.omit({ schemaVersion: true });
export type McpScannerSection = z.infer<typeof McpScannerSectionSchema>;

export const AstraConfigFileV3Schema = z.object({
  schemaVersion: z.literal(3),
  mcp: McpScannerSectionSchema.optional(),
  /** Agent scan settings (`astra setup --agent` / `astra generate --config`) — parsed as `SetupConfigFile` in the CLI. */
  agent: z.record(z.string(), z.unknown()).optional(),
});

export type AstraConfigFileV3 = z.infer<typeof AstraConfigFileV3Schema>;

/**
 * Resolve MCP scanner settings from unified **`astra.config.json`** (`schemaVersion: 3`, `"mcp"` section).
 */
export function extractMcpScannerConfig(raw: unknown): AstraMcpConfig {
  if (raw === null || typeof raw !== "object") {
    throw new Error("Config must be a JSON object");
  }
  const o = raw as Record<string, unknown>;

  if (o.schemaVersion !== 3) {
    throw new Error('MCP commands expect schemaVersion 3 with an "mcp" section (run `astra setup --mcp`).');
  }
  if (!o.mcp || typeof o.mcp !== "object") {
    throw new Error('No MCP scanner settings: add an "mcp" section (run `astra setup --mcp`).');
  }
  const merged = { schemaVersion: 2 as const, ...(o.mcp as object) };
  const parsed = AstraMcpConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid "mcp" section: ${msg}`);
  }
  return parsed.data;
}

