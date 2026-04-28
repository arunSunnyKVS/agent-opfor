import { z } from "zod";

export const recipientSchema = z.object({
    channel: z.string().describe("The channel to send the notification to [EMAIL, SMS, SLACK, WHATSAPP, DISCORD]"),
    name: z.string().describe("The name of the user to find"),
});


export type RecipientInput = z.infer<typeof recipientSchema>;