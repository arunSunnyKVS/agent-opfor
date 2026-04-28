import axios from "axios";
import { config } from "../config.js";

const headers = {
    Authorization: `Bearer ${config.API_KEY}`,
    "Content-Type": "application/json",
};

/**
 * Fetches audience information based on name and channel
 * @param name - The first name to search for
 * @param channel - The channel to filter by
 * @returns Audience data matching the search criteria
 * @throws Error if the request fails
 */
export async function getAudience(name: string, channel: string): Promise<any> {
    const url = `${config.API_BASE}/users?firstName=${name}&channel=${channel}`;
    const response = await axios.get(url, { headers, timeout: 30000 });
    return response.data;
}

/**
 * Sends a notification using Siren.
 *
 * @param params - Object containing notification parameters
 * @param params.channel - The channel type (EMAIL, SMS, SLACK, WHATSAPP)
 * @param params.channelProviderId - The ID of the channel provider - Twilio, Sendgrid, Meta etc
 * @param params.message - The message to include in the notification
 * @param params.recipientId - The recipient's identifier for the given channel
 * @param params.subject - Optional subject (only for EMAIL)
 * @returns The response data or null if the request fails
 */
export async function sendSirenNotification({
    channel,

    message,
    recipientId,
    subject,
}: {
    channel: string;
    message: string;
    recipientId: string;
    subject?: string;
}): Promise<any | null> {
    const templateVariables: Record<string, any> = {
        data: message,
    };

    if (channel === "EMAIL" && subject) {
        templateVariables["subject"] = subject;
    }

    const payload = {
        channel,
        templateVariables,
        templateId: config.TEMPLATE_ID, // TODO: need to be changed
        notifyVariables: {
            [channel.toLowerCase()]: recipientId,
        },
    };

    try {
        const url = `${config.API_BASE}/trigger`;
        const response = await axios.post(url, payload, { headers, timeout: 30000 });
        return response.data;
    } catch (error) {
        console.error("Error sending notification:", error);
        return null;
    }
}
