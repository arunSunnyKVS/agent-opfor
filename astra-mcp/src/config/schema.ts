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
  notes: z.string().optional(),
});

export type AstraMcpConfig = z.infer<typeof AstraMcpConfigSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

