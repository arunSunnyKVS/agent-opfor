
import { getAudience } from "../service/api.service.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { RecipientInput, recipientSchema } from "../schema/recipient.schema.js";
import { capitalize } from "../utils/util.js";


export async function getRecipientFromName(input: RecipientInput): Promise<CallToolResult> {
    const { channel, name } = input;

    const audience = await getAudience(capitalize(name), channel.toLowerCase());

    if (!audience?.data?.length) {
        return {
            content: [{ type: "text", text: "Recipient not found" }]
        }
    }

    return {
        content: [{ type: "text", text: `Recipient ID for ${name} on ${channel}: ${audience.data[0][channel.toLowerCase()]}` }]
    }
}



export function registerFindRecipientTool(server: McpServer) {
    server.tool(
        "find_recipient",
        "Find a recipient's contact information by their name and channel",
        recipientSchema.shape,
        async (input) => {
            return getRecipientFromName(input);
        }
    )
}