
import "dotenv/config";
import { validateConfig } from "./config.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getRecipientFromName, registerFindRecipientTool } from "./tools/recipient.tool.js";
import { registerSendNotificationTool } from "./tools/notification.tool.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";


async function startMCPServer(): Promise<McpServer> {
  const server = new McpServer({
      name: "siren-mcp",
      version: "1.0.0",
  });

  // Add all tools
  registerFindRecipientTool(server);
  registerSendNotificationTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);  

  return server;
}

async function main() {
  validateConfig();
  await startMCPServer();
}
  
main().catch((error) => {
  console.error("Fatal error in main(): ", error);
  process.exit(1);
})