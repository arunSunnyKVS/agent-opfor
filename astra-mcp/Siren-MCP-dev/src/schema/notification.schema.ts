import { z } from "zod";

export const notificationSchema = z.object({
    channel: z.string().describe("The channel to send the notification to [EMAIL, SMS, SLACK, WHATSAPP, DISCORD]"),
    message: z
        .string()
        .describe("The message to send (For channel WHATSAPP, dont include new-line/tab characters or more than 4 consecutive spaces)"),
    recipientId: z.string().describe("The recipient Id to send the notification to"),
    subject: z.string().optional().describe("The subject of the notification (only for email)"),
});

export type NotificationInput = z.infer<typeof notificationSchema>;
