#!/usr/bin/env node
/**
 * Minimal stdio MCP server for local smoke tests (single `echo` tool).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "astra-echo-fixture",
  version: "0.0.1",
});

server.tool(
  "echo",
  "Echo back a message (fixture for Astra MCP scanner tests).",
  { message: z.string().describe("Text to echo") },
  async ({ message }) => ({
    content: [{ type: "text", text: `echo:${message}` }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
