
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { notificationSchema, NotificationInput } from "../schema/notification.schema.js";
import { sendSirenNotification } from "../service/api.service.js";


export async function sendNotification(input: NotificationInput): Promise<CallToolResult> {
    const { channel, message, recipientId, subject } = input;

    const result = await sendSirenNotification({
      channel, message, subject, recipientId
    });

    if (!result) {
      return {
        content: [{ type: "text", text: "Unable to send notification." }]
      };
    }

    return {
      content: [{ type: "text", text: "Notification sent successfully" }]
    };
}


export function registerSendNotificationTool(server: McpServer) {
    server.tool(
        "send_notification",
        "Send a notification to the user",
        notificationSchema.shape,
        async (input) => {
            return sendNotification(input);
        }
    )
}